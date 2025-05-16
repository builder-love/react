// app/api/industry/project/[projectTitle]/route.ts
import { getVercelOidcToken } from '@vercel/functions/oidc';
import { ExternalAccountClient } from 'google-auth-library';
import { NextRequest, NextResponse } from 'next/server'; // Make sure NextRequest is imported

// Environment variable checks
const GCP_PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER;
const GCP_WORKLOAD_IDENTITY_POOL_ID = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
const GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;
const GCP_SERVICE_ACCOUNT_EMAIL = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
const CLOUD_RUN_URL = process.env.CLOUD_RUN_URL;

export async function GET(
    _request: NextRequest, // First argument is NextRequest (prefix with _ if unused)
    // For Next.js 15, params is a Promise
    context: { params: Promise<{ projectTitle: string }> }
  ) {
    // Await the resolution of params
    const resolvedParams = await context.params;
    const projectTitleUrlEncoded = resolvedParams.projectTitle;

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

  if (!projectTitleUrlEncoded) {
    return NextResponse.json({ message: 'Project title parameter is required.' }, { status: 400 });
  }

  const fastApiTargetEndpoint = `${CLOUD_RUN_URL}/api/v1/projects/details_from_top_projects/${projectTitleUrlEncoded}`;

  try {
    // --- Authentication and Fetch Logic (same as before) ---
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
                throw new Error("Vercel OIDC token for impersonation was null or undefined.");
            }
            return token;
          },
        },
    });

    if (!impersonationClient) {
        throw new Error('Failed to initialize ExternalAccountClient for impersonation.');
    }

    const saAccessTokenResponse = await impersonationClient.getAccessToken();
    const saAccessToken = saAccessTokenResponse?.token;

    if (!saAccessToken) {
        throw new Error('Failed to obtain impersonated service account access token.');
    }

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
      console.error("Failed to generate ID token for Cloud Run. Status:", idTokenResponse.status, "Response:", errorText);
      throw new Error(`Failed to generate ID token for Cloud Run: ${idTokenResponse.statusText} - ${errorText}`);
    }

    const idTokenResult = await idTokenResponse.json();
    const cloudRunIdToken = idTokenResult.token;

    if (!cloudRunIdToken) {
      throw new Error('ID token for Cloud Run was not present in the generateIdToken response.');
    }

    const apiResponse = await fetch(fastApiTargetEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cloudRunIdToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!apiResponse.ok) {
        let errorData = null;
        let rawErrorText = '';
        try {
          rawErrorText = await apiResponse.text();
          errorData = JSON.parse(rawErrorText);
        } catch { /* Error response was not JSON */ }
        const errorMessage = errorData?.detail || errorData?.message || rawErrorText || `FastAPI backend error! status: ${apiResponse.status} ${apiResponse.statusText}`;
        console.error(`Cloud Run (FastAPI) project details request for '${projectTitleUrlEncoded}' failed:`, errorMessage);
        return NextResponse.json({ message: errorMessage }, { status: apiResponse.status });
      }

      const data = await apiResponse.json();
      return NextResponse.json(data, { status: 200 });

  } catch (error: unknown) {
    console.error(`Error in /api/industry/project/[projectTitle] route for '${projectTitleUrlEncoded}':`, error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred while fetching project details.";
    return NextResponse.json({ message }, { status: 500 });
  }
}