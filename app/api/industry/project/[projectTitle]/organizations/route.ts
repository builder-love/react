// app/api/industry/project/[projectTitle]/organizations/route.ts
import { getVercelOidcToken } from '@vercel/functions/oidc';
import { ExternalAccountClient } from 'google-auth-library';
import { NextRequest, NextResponse } from 'next/server';

// Environment variable checks (ensure these are available)
const GCP_PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER;
const GCP_WORKLOAD_IDENTITY_POOL_ID = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
const GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;
const GCP_SERVICE_ACCOUNT_EMAIL = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
const CLOUD_RUN_URL = process.env.CLOUD_RUN_URL;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ projectTitle: string }> } // Or { params: { projectTitle: string } } depending on Next.js version
) {
  const resolvedParams = await context.params; // For Next.js 15+
  // const { projectTitle: projectTitleUrlEncoded } = context.params; // For older Next.js versions
  const projectTitleUrlEncoded = resolvedParams.projectTitle;


  // --- Environment Variable Check ---
  if (
    !GCP_PROJECT_NUMBER ||
    !GCP_WORKLOAD_IDENTITY_POOL_ID ||
    !GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID ||
    !GCP_SERVICE_ACCOUNT_EMAIL ||
    !CLOUD_RUN_URL
  ) {
    console.error("Missing required GCP/Cloud Run environment variables for OIDC integration (organizations).");
    return NextResponse.json(
      { message: 'Internal server configuration error: Missing OIDC or Backend URL variables.' },
      { status: 500 }
    );
  }

  if (!projectTitleUrlEncoded) {
    return NextResponse.json({ message: 'Project title parameter is required for organizations.' }, { status: 400 });
  }

  // Construct the FastAPI endpoint URL for fetching top organizations
  const fastApiTargetEndpoint = `${CLOUD_RUN_URL}/api/projects/${projectTitleUrlEncoded}/top_organizations`;
  // console.log(`Constructed FastAPI endpoint for organizations: ${fastApiTargetEndpoint}`);

  try {
    // --- Authentication Logic (copied and adapted from your existing route) ---
    // console.log("Initializing ExternalAccountClient for impersonation (organizations).");
    const impersonationClient = ExternalAccountClient.fromJSON({
        type: 'external_account',
        audience: `//iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${GCP_WORKLOAD_IDENTITY_POOL_ID}/providers/${GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID}`,
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
        token_url: 'https://sts.googleapis.com/v1/token',
        service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${GCP_SERVICE_ACCOUNT_EMAIL}:generateAccessToken`,
        subject_token_supplier: {
          getSubjectToken: async () => {
            const token = await getVercelOidcToken();
            if (!token) {
                throw new Error("Vercel OIDC token for impersonation was null or undefined (organizations).");
            }
            return token;
          },
        },
    });

    if (!impersonationClient) {
        throw new Error('Failed to initialize ExternalAccountClient for impersonation (organizations).');
    }

    // console.log("Requesting impersonated service account access token (organizations)...");
    const saAccessTokenResponse = await impersonationClient.getAccessToken();
    const saAccessToken = saAccessTokenResponse?.token;

    if (!saAccessToken) {
        throw new Error('Failed to obtain impersonated service account access token (organizations).');
    }
    // console.log("Impersonated service account access token received (organizations).");

    // console.log(`Requesting ID token for audience ${CLOUD_RUN_URL} using SA access token (organizations).`);
    const idTokenResponse = await fetch(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${GCP_SERVICE_ACCOUNT_EMAIL}:generateIdToken`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${saAccessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            audience: CLOUD_RUN_URL,
            includeEmail: true
        }),
    });

    if (!idTokenResponse.ok) {
      const errorText = await idTokenResponse.text();
      console.error("Failed to generate ID token for Cloud Run (organizations). Status:", idTokenResponse.status, "Response:", errorText);
      throw new Error(`Failed to generate ID token for Cloud Run (organizations): ${idTokenResponse.statusText} - ${errorText}`);
    }

    const idTokenResult = await idTokenResponse.json();
    const cloudRunIdToken = idTokenResult.token;

    if (!cloudRunIdToken) {
      throw new Error('ID token for Cloud Run was not present in the generateIdToken response (organizations).');
    }
    // console.log("Cloud Run ID token received (organizations).");

    // --- Make the GET request to your FastAPI Cloud Run API ---
    // console.log(`Making GET request to FastAPI endpoint: ${fastApiTargetEndpoint} with ID Token (organizations)`);
    const apiResponse = await fetch(fastApiTargetEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cloudRunIdToken}`,
        'Content-Type': 'application/json',
      },
    });

    // --- Handle the response from FastAPI ---
    if (!apiResponse.ok) {
        let errorData = null;
        let rawErrorText = '';
        try {
          rawErrorText = await apiResponse.text();
          errorData = JSON.parse(rawErrorText);
        } catch { /* Error response was not JSON */ }
        const errorMessage = errorData?.detail || errorData?.message || rawErrorText || `FastAPI backend error (organizations)! status: ${apiResponse.status} ${apiResponse.statusText}`;
        console.error(`Cloud Run (FastAPI) organizations request for '${projectTitleUrlEncoded}' failed:`, errorMessage);
        return NextResponse.json({ message: errorMessage }, { status: apiResponse.status });
      }

      const data = await apiResponse.json();
      // console.log(`Received organizations data from Cloud Run (FastAPI) for '${projectTitleUrlEncoded}':`, data);
      return NextResponse.json(data, { status: 200 });

  } catch (error: unknown) {
    console.error(`Error in /api/industry/project/[projectTitle]/organizations route for '${projectTitleUrlEncoded}':`, error);
    if (error instanceof Error) {
        // console.error("Error stack for organizations route:", error.stack);
    }
    const message = error instanceof Error ? error.message : "An unexpected error occurred while fetching project organizations.";
    return NextResponse.json({ message }, { status: 500 });
  }
}