// app/api/get-top-forks/route.ts
// import { google } from 'googleapis';
import { getVercelOidcToken } from '@vercel/functions/oidc';
import { ExternalAccountClient } from 'google-auth-library';
import { NextRequest, NextResponse } from 'next/server';

// Environment variables needed for the google-auth-library with OIDC
const GCP_PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER;
const GCP_WORKLOAD_IDENTITY_POOL_ID = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
const GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;
const GCP_SERVICE_ACCOUNT_EMAIL = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
// Get the Cloud Run service URL from an environment variable.
const CLOUD_RUN_URL = process.env.CLOUD_RUN_URL;

// Define an interface for your data item (similar to Pydantic in FastAPI)
interface TopForkData {
  project_title: string;
  latest_data_timestamp: string;
  forks: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(req: NextRequest) {
  // --- Input Validation ---
  if (!GCP_PROJECT_NUMBER || !GCP_WORKLOAD_IDENTITY_POOL_ID || !GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID || !GCP_SERVICE_ACCOUNT_EMAIL || !CLOUD_RUN_URL) {
    console.error("Missing required GCP/Cloud Run environment variables for OIDC");
    return NextResponse.json({ message: 'Internal server configuration error: Missing OIDC variables.' }, { status: 500 });
    }

  try {
    // Initialize the External Account Client
    // This client handles exchanging the Vercel OIDC token for Google Cloud credentials
    // by interacting with Google's Secure Token Service (STS).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authClient = new (ExternalAccountClient as any).fromJSON({
        type: 'external_account',
        audience: `//iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${GCP_WORKLOAD_IDENTITY_POOL_ID}/providers/${GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID}`,
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
        token_url: 'https://sts.googleapis.com/v1/token',
        credential_source: { // Use credential_source instead of subject_token_supplier
            // Provide the function to get the Vercel OIDC token
            factoryReset: false, // Typically false for this use case
            getSubjectToken: getVercelOidcToken,
        },
        // Specify the service account to impersonate to get the final token
        service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${GCP_SERVICE_ACCOUNT_EMAIL}:generateIdToken`,
        // We ask directly for an ID token here, targeting our Cloud Run service
        additional_claims: { // Use additional_claims to specify the ID token audience
           audience: CLOUD_RUN_URL,
        }
    });

    // Obtain the ID token using the configured ExternalAccountClient
    // The ExternalAccountClient handles the STS exchange and impersonation
    // to generate the required ID token with the specified audience.
    const idToken = await authClient.fetchIdToken(CLOUD_RUN_URL); // Re-confirm audience

    // 4. Make the request to your Cloud Run API.
    const apiResponse = await fetch(CLOUD_RUN_URL + '/projects/top-forks', {
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!apiResponse.ok) {
      let errorData = null;
      try {
        errorData = await apiResponse.json();
      } catch (jsonError) {
        // If the response isn't valid JSON, use the status text
        console.error("Could not parse error response from Cloud Run API as JSON:", jsonError);
      }
      const errorMessage = errorData?.detail || `HTTP error! status: ${apiResponse.status} ${apiResponse.statusText}`;
      console.error("Cloud Run API request failed:", errorMessage);
      return NextResponse.json({ message: errorMessage }, { status: apiResponse.status });
    }

    const data: TopForkData= await apiResponse.json();
    return NextResponse.json(data, { status: 200 });

  } catch (error: unknown) { // Catch unknown type for better error handling
    console.error("Error in API route:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message }, { status: 500 });
  }
}