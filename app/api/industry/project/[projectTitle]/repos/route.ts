// app/api/industry/project/[projectTitle]/repos/route.ts
import { getVercelOidcToken } from '@vercel/functions/oidc';
import { ExternalAccountClient } from 'google-auth-library';
import { NextRequest, NextResponse } from 'next/server';

// --- Environment Variable Configuration ---
const API_BASE_URL = process.env.API_BASE_URL;
const API_AUTH_MODE = process.env.API_AUTH_MODE || 'OIDC_WORKLOAD_IDENTITY'; // Default to OIDC
const TARGET_CLOUD_RUN_AUDIENCE = process.env.CLOUD_RUN_URL; // Audience for OIDC ID token generation
const API_KEY_VALUE = process.env.API_KEY; // The actual X-API-Key value

// GCP variables for OIDC (only used if API_AUTH_MODE is OIDC_WORKLOAD_IDENTITY)
const GCP_PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER;
const GCP_WORKLOAD_IDENTITY_POOL_ID = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
const GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;
const GCP_SERVICE_ACCOUNT_EMAIL = process.env.GCP_SERVICE_ACCOUNT_EMAIL;

export async function GET(
  request: NextRequest, // Use 'request' to access searchParams
  context: { params: Promise<{ projectTitle: string }> }
) {
  const resolvedParams = await context.params;
  const projectTitleUrlEncoded = resolvedParams.projectTitle;

  // --- Environment Variable Checks ---
  if (!API_BASE_URL) {
    console.error("Missing API_BASE_URL environment variable.");
    return NextResponse.json({ message: 'Internal server configuration error: API endpoint not configured.' }, { status: 500 });
  }
  if (!API_KEY_VALUE) {
    console.error("Application API Key (API_KEY environment variable) is not set!");
    return NextResponse.json({ message: 'Internal server configuration error: Application API Key is missing.' }, { status: 500 });
  }
  if (!projectTitleUrlEncoded) {
    return NextResponse.json({ message: 'Project title parameter is required.' }, { status: 400 });
  }

  // --- Initialize Request Headers ---
  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY_VALUE, // Add the X-API-Key for FastAPI application-level auth
  };

  // Get query parameters from the NextRequest
  const { searchParams } = new URL(request.url);

  // Create a payload object for the post request
  const payload = {
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: parseInt(searchParams.get('limit') || '10', 10),
    search: searchParams.get('search') || null,
    sort_by: searchParams.get('sort_by') || 'repo_rank',
    sort_order: searchParams.get('sort_order') || 'asc',
  };

  // build final api url without query params
  const finalApiUrl = `${API_BASE_URL}/api/projects/${projectTitleUrlEncoded}/repos`;

  // console.log(`Constructed FastAPI endpoint for repos: ${fastApiTargetEndpoint}`);

  try {
    // --- Authentication Strategy for Cloud Run IAM (if applicable) ---
    if (API_AUTH_MODE === 'OIDC_WORKLOAD_IDENTITY') {
      console.log(`Using OIDC Workload Identity authentication for ${finalApiUrl}.`);
      if (!GCP_PROJECT_NUMBER || !GCP_WORKLOAD_IDENTITY_POOL_ID || !GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID || !GCP_SERVICE_ACCOUNT_EMAIL || !TARGET_CLOUD_RUN_AUDIENCE) {
        console.error("Missing required GCP/Cloud Run environment variables for OIDC.");
        return NextResponse.json({ message: 'Internal server configuration error: Missing OIDC variables.' }, { status: 500 });
      }
      console.log("All OIDC environment variables are set for OIDC authentication.");

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
              console.warn("getVercelOidcToken returned null or undefined. This is expected if not running on Vercel or if the Vercel OIDC token generation failed.");
            }
            return token;
          },
        },
      });

      const saAccessTokenResponse = await impersonationClient!.getAccessToken();
      const saAccessToken = saAccessTokenResponse?.token;
      if (!saAccessToken) {
        throw new Error('Failed to obtain impersonated service account access token.');
      }

      const idTokenResponse = await fetch(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${GCP_SERVICE_ACCOUNT_EMAIL}:generateIdToken`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${saAccessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience: TARGET_CLOUD_RUN_AUDIENCE, includeEmail: true }),
      });

      if (!idTokenResponse.ok) {
        const errorText = await idTokenResponse.text();
        console.error("Failed to generate ID token for Cloud Run. Status:", idTokenResponse.status, "Response:", errorText);
        throw new Error(`Failed to generate ID token: ${idTokenResponse.statusText} - ${errorText}`);
      }
      const idTokenResult = await idTokenResponse.json();
      const cloudRunIdToken = idTokenResult.token;
      if (!cloudRunIdToken) {
        throw new Error('ID token was not present in the generateIdToken response.');
      }
      requestHeaders['Authorization'] = `Bearer ${cloudRunIdToken}`; // Add IAM token
      console.log("Cloud Run ID token (IAM) and X-API-Key headers are set.");

    } else if (API_AUTH_MODE === 'LOCAL_API_KEY') {
      console.log(`Using X-API-Key authentication for ${finalApiUrl} (no Cloud Run IAM token).`);
    } else if (API_AUTH_MODE === 'NONE') {
      console.log(`Making request to ${finalApiUrl} with no additional auth headers from this route (X-API-Key still sent if API_KEY_VALUE is present).`);
    } else {
      console.error(`Invalid API_AUTH_MODE: ${API_AUTH_MODE}`);
      return NextResponse.json({ message: 'Internal server configuration error: Invalid API authentication mode.' }, { status: 500 });
    }

    // --- Make the request to your FastAPI backend ---
    console.log(`Making request to ${finalApiUrl} with auth mode: ${API_AUTH_MODE}`);
    
    // make the request as a post with the payload in the body
    const apiResponse = await fetch(finalApiUrl, {
      method: 'POST', // Use POST method
      headers: requestHeaders, // Your existing headers, including all auth tokens
      body: JSON.stringify(payload), // Send the data as a JSON string in the body
    });

    // --- Handle the response ---
    if (!apiResponse.ok) {
      let errorData = null;
      let rawErrorText = '';
      try {
        rawErrorText = await apiResponse.text();
        console.error("Raw API error response:", rawErrorText);
        errorData = JSON.parse(rawErrorText);
      } catch (jsonError) {
        console.warn("Could not parse error response from API as JSON:", jsonError);
      }
      const errorMessage = errorData?.detail || errorData?.message || rawErrorText || `HTTP error! status: ${apiResponse.status} ${apiResponse.statusText}`;
      console.error(`Request to '${finalApiUrl}' failed:`, errorMessage);
      return NextResponse.json({ message: errorMessage }, { status: apiResponse.status });
    }

    const data = await apiResponse.json();
    return NextResponse.json(data, { status: 200 });

  } catch (error: unknown) {
    console.error(`Error in /repos route for '${projectTitleUrlEncoded}':`, error);
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
    }
    const message = error instanceof Error ? error.message : "Unexpected error fetching project repositories.";
    console.error(`Error in /repos route for '${projectTitleUrlEncoded}':`, error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
