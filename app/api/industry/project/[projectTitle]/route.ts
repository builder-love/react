// app/api/industry/project/[projectTitle]/route.ts
import { getVercelOidcToken } from '@vercel/functions/oidc';
import { ExternalAccountClient } from 'google-auth-library';
import { NextRequest, NextResponse } from 'next/server';
// import { decodeJwt } from 'jose';

// Environment variable checks
const GCP_PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER;
const GCP_WORKLOAD_IDENTITY_POOL_ID = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
const GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;
const GCP_SERVICE_ACCOUNT_EMAIL = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
const CLOUD_RUN_URL = process.env.CLOUD_RUN_URL; // Your Cloud Run service URL (FastAPI backend)

export async function GET(
    request: NextRequest,
    context: { params: { projectTitle: string } } // Correct way to receive context with params
  ) {
    const { params } = context; // Destructure params from context
    const projectTitleUrlEncoded = params.projectTitle;

  // --- Environment Variable Check ---
  if (
    !GCP_PROJECT_NUMBER ||
    !GCP_WORKLOAD_IDENTITY_POOL_ID ||
    !GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID ||
    !GCP_SERVICE_ACCOUNT_EMAIL ||
    !CLOUD_RUN_URL
  ) {
    console.error("Missing required GCP/Cloud Run environment variables for OIDC integration.");
    return NextResponse.json(
      { message: 'Internal server configuration error: Missing OIDC or Backend URL variables.' },
      { status: 500 }
    );
  }
  // console.log("All environment variables for OIDC and Cloud Run URL are set for project details.");


  if (!projectTitleUrlEncoded) {
    return NextResponse.json({ message: 'Project title parameter is required.' }, { status: 400 });
  }

  // Construct the correct FastAPI endpoint URL for fetching project details
  // This should match the endpoint defined in your FastAPI app: /api/v1/projects/details_from_top_projects/{project_title_url_encoded}
  const fastApiTargetEndpoint = `${CLOUD_RUN_URL}/api/projects/details_from_top_projects/${projectTitleUrlEncoded}`;
  // Note: projectTitleUrlEncoded is already encoded if it came from the URL path.
  // If you were constructing it from a raw string here, you would use encodeURIComponent(rawProjectTitle).
  // console.log(`Constructed FastAPI endpoint for project details: ${fastApiTargetEndpoint}`);

  try {
    // --- Step 1: Get Impersonated Service Account Access Token ---
    // console.log("Initializing ExternalAccountClient for impersonation.");
    const impersonationClient = ExternalAccountClient.fromJSON({
        type: 'external_account',
        audience: `//iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${GCP_WORKLOAD_IDENTITY_POOL_ID}/providers/${GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID}`,
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
        token_url: 'https://sts.googleapis.com/v1/token',
        service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${GCP_SERVICE_ACCOUNT_EMAIL}:generateAccessToken`,
        subject_token_supplier: {
          getSubjectToken: async () => {
            // console.log("Requesting Vercel OIDC token for impersonation.");
            const token = await getVercelOidcToken();
            // console.log("Vercel OIDC token received for impersonation (token exists):", !!token);
            // Optional: Decode and log for debugging
            // try {
            //   if (token) {
            //     const decodedPayload = decodeJwt(token);
            //     console.log("Decoded Vercel OIDC Token Payload for impersonation:", JSON.stringify(decodedPayload, null, 2));
            //   } else {
            //     console.log("getVercelOidcToken returned null or undefined for impersonation.");
            //   }
            // } catch (decodeError) {
            //   console.error("Failed to decode Vercel OIDC token for impersonation:", decodeError);
            // }
            if (!token) { // Important check
                throw new Error("Vercel OIDC token for impersonation was null or undefined.");
            }
            return token;
          },
        },
    });

    if (!impersonationClient) {
        throw new Error('Failed to initialize ExternalAccountClient for impersonation.');
    }

    // console.log("Requesting impersonated service account access token...");
    const saAccessTokenResponse = await impersonationClient.getAccessToken();
    const saAccessToken = saAccessTokenResponse?.token;

    if (!saAccessToken) {
        throw new Error('Failed to obtain impersonated service account access token.');
    }
    // console.log("Impersonated service account access token received.");

    // --- Step 2: Use SA Access Token to generate ID Token for Cloud Run ---
    // console.log(`Requesting ID token for audience ${CLOUD_RUN_URL} using SA access token.`);
    const idTokenResponse = await fetch(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${GCP_SERVICE_ACCOUNT_EMAIL}:generateIdToken`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${saAccessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            audience: CLOUD_RUN_URL, // Target audience is your Cloud Run (FastAPI) service
            includeEmail: true
        }),
    });

    if (!idTokenResponse.ok) {
      const errorText = await idTokenResponse.text();
      console.error("Failed to generate ID token for Cloud Run. Status:", idTokenResponse.status, "Response:", errorText);
      throw new Error(`Failed to generate ID token for Cloud Run: ${idTokenResponse.statusText} - ${errorText}`);
    }

    const idTokenResult = await idTokenResponse.json();
    const cloudRunIdToken = idTokenResult.token;

    if (!cloudRunIdToken) {
      throw new Error('ID token for Cloud Run was not present in the generateIdToken response.');
    }
    // console.log("Cloud Run ID token received.");

    // --- Step 3: Make the GET request to your FastAPI Cloud Run API using the ID Token ---
    // console.log(`Making GET request to FastAPI endpoint: ${fastApiTargetEndpoint} with ID Token`);
    const apiResponse = await fetch(fastApiTargetEndpoint, { // Use the correctly constructed URL
      method: 'GET', // This endpoint in FastAPI is a GET request
      headers: {
        'Authorization': `Bearer ${cloudRunIdToken}`,
        'Content-Type': 'application/json', // Usually not needed for GET but doesn't hurt
      },
    });

    // --- Step 4: Handle the response from FastAPI ---
    if (!apiResponse.ok) {
        let errorData = null;
        let rawErrorText = '';
        try {
          rawErrorText = await apiResponse.text();
          // console.error(`Raw Cloud Run (FastAPI) error response for project ${projectTitleUrlEncoded}:`, rawErrorText);
          errorData = JSON.parse(rawErrorText);
        } catch (jsonError) {
          console.error(`Could not parse error response from Cloud Run (FastAPI) for project ${projectTitleUrlEncoded} as JSON:`, jsonError);
        }
        const errorMessage = errorData?.detail || errorData?.message || rawErrorText || `FastAPI backend error! status: ${apiResponse.status} ${apiResponse.statusText}`;
        console.error(`Cloud Run (FastAPI) project details request for '${projectTitleUrlEncoded}' failed:`, errorMessage);
        return NextResponse.json({ message: errorMessage }, { status: apiResponse.status });
      }

      const data = await apiResponse.json();
      // console.log(`Received project details data for '${projectTitleUrlEncoded}' from Cloud Run (FastAPI):`, data);
      return NextResponse.json(data, { status: 200 });

  } catch (error: unknown) {
    console.error(`Error in /api/industry/project/[projectTitle] route for '${projectTitleUrlEncoded}':`, error);
    if (error instanceof Error) {
        // console.error("Error stack for project details route:", error.stack);
    }
    const message = error instanceof Error ? error.message : "An unexpected error occurred while fetching project details.";
    return NextResponse.json({ message }, { status: 500 });
  }
}