// app/api/industry/project/[projectTitle]/repos/route.ts
import { getVercelOidcToken } from '@vercel/functions/oidc';
import { ExternalAccountClient } from 'google-auth-library';
import { NextRequest, NextResponse } from 'next/server';

const GCP_PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER;
const GCP_WORKLOAD_IDENTITY_POOL_ID = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
const GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;
const GCP_SERVICE_ACCOUNT_EMAIL = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
const CLOUD_RUN_URL = process.env.CLOUD_RUN_URL;

export async function GET(
  request: NextRequest, // Use 'request' to access searchParams
  context: { params: Promise<{ projectTitle: string }> }
) {
  const resolvedParams = await context.params;
  const projectTitleUrlEncoded = resolvedParams.projectTitle;

  if (
    !GCP_PROJECT_NUMBER ||
    !GCP_WORKLOAD_IDENTITY_POOL_ID ||
    !GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID ||
    !GCP_SERVICE_ACCOUNT_EMAIL ||
    !CLOUD_RUN_URL
  ) {
    console.error("Missing required GCP/Cloud Run OIDC environment variables (repos).");
    return NextResponse.json(
      { message: 'Internal server configuration error.' },
      { status: 500 }
    );
  }

  if (!projectTitleUrlEncoded) {
    return NextResponse.json({ message: 'Project title parameter is required.' }, { status: 400 });
  }

  // Get query parameters from the NextRequest
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || '1';
  const limit = searchParams.get('limit') || '10';
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sort_by') || 'repo_rank'; // Default sort
  const sortOrder = searchParams.get('sort_order') || 'asc';   // Default order

  // Construct the FastAPI endpoint URL with query parameters
  let fastApiTargetEndpoint = `${CLOUD_RUN_URL}/api/projects/${projectTitleUrlEncoded}/repos?page=${page}&limit=${limit}&sort_by=${sortBy}&sort_order=${sortOrder}`;
  if (search) {
    fastApiTargetEndpoint += `&search=${encodeURIComponent(search)}`;
  }

  // console.log(`Constructed FastAPI endpoint for repos: ${fastApiTargetEndpoint}`);

  try {
    const impersonationClient = ExternalAccountClient.fromJSON({ /* ... your existing config ... */
        type: 'external_account',
        audience: `//iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${GCP_WORKLOAD_IDENTITY_POOL_ID}/providers/${GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID}`,
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
        token_url: 'https://sts.googleapis.com/v1/token',
        service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${GCP_SERVICE_ACCOUNT_EMAIL}:generateAccessToken`,
        subject_token_supplier: {
          getSubjectToken: async () => {
            const token = await getVercelOidcToken();
            if (!token) throw new Error("Vercel OIDC token (repos) was null.");
            return token;
          },
        },
    });

    if (!impersonationClient) {
      throw new Error('Failed to initialize ExternalAccountClient for impersonation.');
    }

    const saAccessTokenResponse = await impersonationClient.getAccessToken();
    const saAccessToken = saAccessTokenResponse?.token;
    if (!saAccessToken) throw new Error('Failed to obtain SA access token (repos).');

    const idTokenResponse = await fetch(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${GCP_SERVICE_ACCOUNT_EMAIL}:generateIdToken`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${saAccessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience: CLOUD_RUN_URL, includeEmail: true }),
    });

    if (!idTokenResponse.ok) {
      const errorText = await idTokenResponse.text();
      throw new Error(`Failed to generate ID token for Cloud Run (repos): ${idTokenResponse.statusText} - ${errorText}`);
    }
    const idTokenResult = await idTokenResponse.json();
    const cloudRunIdToken = idTokenResult.token;
    if (!cloudRunIdToken) throw new Error('ID token for Cloud Run (repos) not present.');

    const apiResponse = await fetch(fastApiTargetEndpoint, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${cloudRunIdToken}`, 'Content-Type': 'application/json' },
    });

    if (!apiResponse.ok) {
        const errorData = await apiResponse.json().catch(() => ({ message: `FastAPI backend error (repos)! status: ${apiResponse.status}` }));
        console.error(`Cloud Run (FastAPI) repos request for '${projectTitleUrlEncoded}' failed:`, errorData.message || errorData.detail);
        return NextResponse.json({ message: errorData.message || errorData.detail || 'Backend error' }, { status: apiResponse.status });
    }

    const data = await apiResponse.json();
    return NextResponse.json(data, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error fetching project repositories.";
    console.error(`Error in /repos route for '${projectTitleUrlEncoded}':`, error);
    return NextResponse.json({ message }, { status: 500 });
  }
}