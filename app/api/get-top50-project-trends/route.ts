// app/api/get-top50-project-trends/route.ts
import { getVercelOidcToken } from '@vercel/functions/oidc';
// Only need ExternalAccountClient for now
import { ExternalAccountClient } from 'google-auth-library';
import { NextRequest, NextResponse } from 'next/server';
import { decodeJwt } from 'jose';

// environment variable checks and interface
const GCP_PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER;
const GCP_WORKLOAD_IDENTITY_POOL_ID = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
const GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;
const GCP_SERVICE_ACCOUNT_EMAIL = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
const CLOUD_RUN_URL = process.env.CLOUD_RUN_URL; // Your Cloud Run service URL

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(req: NextRequest) {
  if (!GCP_PROJECT_NUMBER || !GCP_WORKLOAD_IDENTITY_POOL_ID || !GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID || !GCP_SERVICE_ACCOUNT_EMAIL || !CLOUD_RUN_URL) {
    console.error("Missing required GCP/Cloud Run environment variables for OIDC");
    return NextResponse.json({ message: 'Internal server configuration error: Missing OIDC variables.' }, { status: 500 });
  }
  console.log("All environment variables are set.");

  try {
    // --- Step 1: Get Impersonated Service Account Access Token ---
    console.log("Initializing ExternalAccountClient for impersonation");
    const impersonationClient = ExternalAccountClient.fromJSON({
        type: 'external_account',
        audience: `//iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${GCP_WORKLOAD_IDENTITY_POOL_ID}/providers/${GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID}`,
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
        token_url: 'https://sts.googleapis.com/v1/token',
        // This URL gets the ACCESS token for the SA
        service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${GCP_SERVICE_ACCOUNT_EMAIL}:generateAccessToken`,
        subject_token_supplier: {
          getSubjectToken: async () => {
            console.log("Requesting Vercel OIDC token for impersonation");
            const token = await getVercelOidcToken();
            console.log("Vercel OIDC token received for impersonation");
             try {
              if (token) {
                const decodedPayload = decodeJwt(token);
                console.log("Decoded Vercel OIDC Token Payload for impersonation:", JSON.stringify(decodedPayload, null, 2));
              } else {
                console.log("getVercelOidcToken returned null or undefined");
              }
            } catch (decodeError) {
              console.error("Failed to decode Vercel OIDC token:", decodeError);
            }
            return token;
          },
        },
    });

    if (!impersonationClient) {
        throw new Error('Failed to initialize ExternalAccountClient');
    }

    console.log("Requesting impersonated access token...");
    // This gets the SA's ACCESS token (scopes define what the token can be used for)
    const saAccessTokenResponse = await impersonationClient.getAccessToken();
    const saAccessToken = saAccessTokenResponse?.token;

    if (!saAccessToken) {
        throw new Error('Failed to obtain impersonated service account access token.');
    }
    console.log("Impersonated access token received.");

    // --- Step 2: Use SA Access Token to generate ID Token for Cloud Run ---
    console.log(`Requesting ID token for audience ${CLOUD_RUN_URL} using SA access token.`);
    const idTokenResponse = await fetch(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${GCP_SERVICE_ACCOUNT_EMAIL}:generateIdToken`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${saAccessToken}`, // Authenticate this call *as the service account*
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            audience: CLOUD_RUN_URL, // Specify the target audience (your Cloud Run URL)
            includeEmail: true // Optional: include SA email in the ID token
        }),
    });

    if (!idTokenResponse.ok) {
      const errorText = await idTokenResponse.text();
      console.error("Failed to generate ID token. Status:", idTokenResponse.status, "Response:", errorText);
      throw new Error(`Failed to generate ID token: ${idTokenResponse.statusText}`);
    }

    const idTokenResult = await idTokenResponse.json();
    const cloudRunIdToken = idTokenResult.token;

    if (!cloudRunIdToken) {
      throw new Error('ID token was not present in the generateIdToken response.');
    }
    console.log("Cloud Run ID token received.");

    // --- Step 3: Make the request to your Cloud Run API using the ID Token ---
    console.log("Making request to Cloud Run API with generated ID Token");
    const apiResponse = await fetch(CLOUD_RUN_URL + '/projects/top50-trend', { // Ensure this path is correct
      headers: {
        'Authorization': `Bearer ${cloudRunIdToken}`, // Use the Cloud Run-specific ID token
        'Content-Type': 'application/json',
      },
    });

    // --- Step 4: Handle the response (same as before) ---
    if (!apiResponse.ok) {
        let errorData = null;
        let rawErrorText = '';
        try {
          rawErrorText = await apiResponse.text(); // Get raw text first
          console.error("Raw Cloud Run error response:", rawErrorText);
          errorData = JSON.parse(rawErrorText); // Then try to parse
        } catch (jsonError) {
          console.error("Could not parse error response from Cloud Run API as JSON:", jsonError);
        }
        // Use detailed message from JSON if available, otherwise raw text or status
        const errorMessage = errorData?.detail || errorData?.message || rawErrorText || `HTTP error! status: ${apiResponse.status} ${apiResponse.statusText}`;
        console.error("Cloud Run API request failed:", errorMessage);
        return NextResponse.json({ message: errorMessage }, { status: apiResponse.status });
      }

      const data = await apiResponse.json();
      return NextResponse.json(data, { status: 200 });

  } catch (error: unknown) {
    console.error("Error in API route:", error);
    if (error instanceof Error) {
        console.error("Error stack:", error.stack);
    }
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message }, { status: 500 });
  }
}