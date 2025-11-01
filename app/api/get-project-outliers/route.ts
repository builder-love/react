// app/api/get-project-outliers/route.ts
import { getVercelOidcToken } from '@vercel/functions/oidc';
// Only need ExternalAccountClient for now
import { ExternalAccountClient } from 'google-auth-library';
import { NextRequest, NextResponse } from 'next/server';
// import { decodeJwt } from 'jose'; // Keep for debugging Vercel tokens if needed

// set timeout to 60 seconds
export const maxDuration = 60;

// --- Environment Variable Configuration ---
const API_BASE_URL = process.env.API_BASE_URL;
const API_AUTH_MODE = process.env.API_AUTH_MODE || 'OIDC_WORKLOAD_IDENTITY'; // Default to OIDC
const TARGET_CLOUD_RUN_AUDIENCE = process.env.CLOUD_RUN_URL; // Needed for OIDC; note var name in vercel is cloud_run_url, here we make it generic since the app can be run locally too
const API_KEY_VALUE = process.env.API_KEY;

// GCP variables for OIDC (only used if API_AUTH_MODE is OIDC_WORKLOAD_IDENTITY)
const GCP_PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER;
const GCP_WORKLOAD_IDENTITY_POOL_ID = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
const GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;
const GCP_SERVICE_ACCOUNT_EMAIL = process.env.GCP_SERVICE_ACCOUNT_EMAIL;

// construct the full api path. 
// even though the metrics are currently in the path, we reconstruct to ensure the path is properly constructed
export async function GET(req: NextRequest) {
  console.log("Current process.env.API_AUTH_MODE:", process.env.API_AUTH_MODE);

  // check if API_BASE_URL is set
  if (!API_BASE_URL) {
    console.error("Missing API_BASE_URL environment variable.");
    return NextResponse.json({ message: 'Internal server configuration error: API endpoint not configured.' }, { status: 500 });
  }

  // Get query parameters from the incoming request
  const searchParams = req.nextUrl.searchParams;
  const metric = searchParams.get('metric');
  const limit = searchParams.get('limit');
  const include_forks = searchParams.get('include_forks');

  // Validate that the required 'metric' parameter exists
  if (!metric) {
    return NextResponse.json({ message: 'Metric parameter is required.' }, { status: 400 });
  }

  // validate the limit parameter exists and is a number
  if (limit && isNaN(Number(limit))) {
    return NextResponse.json({ message: 'Limit parameter must be a number.' }, { status: 400 });
  }

  // validate the include_forks parameter exists and is a boolean
  if (include_forks && include_forks !== 'true' && include_forks !== 'false') {
    return NextResponse.json({ message: 'Include forks parameter must be a boolean.' }, { status: 400 });
  }

  // Set up request headers
  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (API_KEY_VALUE) {
    requestHeaders['X-API-Key'] = API_KEY_VALUE;
  } else {
    console.error("Application API Key (API_KEY_VALUE) is not set!");
  }

  // Construct the full API path with parameters
  const finalApiUrl = new URL(`${API_BASE_URL}/projects/outliers`);
  finalApiUrl.searchParams.append('metric', metric);
  finalApiUrl.searchParams.append('limit', limit || '5'); // Default to 5 if not provided
  if (include_forks) {
    finalApiUrl.searchParams.append('include_forks', include_forks);
  }

  try {
    // --- Authentication Strategy ---
    if (API_AUTH_MODE === 'OIDC_WORKLOAD_IDENTITY') {
      console.log("Using OIDC Workload Identity authentication.");
      if (!GCP_PROJECT_NUMBER || !GCP_WORKLOAD_IDENTITY_POOL_ID || !GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID || !GCP_SERVICE_ACCOUNT_EMAIL || !TARGET_CLOUD_RUN_AUDIENCE) {
        console.error("Missing required GCP/Cloud Run environment variables for OIDC.");
        return NextResponse.json({ message: 'Internal server configuration error: Missing OIDC variables.' }, { status: 500 });
      }
      console.log("All OIDC environment variables are set for OIDC authentication.");

      // --- Step 1: Get Impersonated Service Account Access Token ---
      console.log("Initializing ExternalAccountClient for impersonation");
      const impersonationClient = ExternalAccountClient.fromJSON({
          type: 'external_account',
          audience: `//iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${GCP_WORKLOAD_IDENTITY_POOL_ID}/providers/${GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID}`,
          subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
          token_url: 'https://sts.googleapis.com/v1/token',
          service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${GCP_SERVICE_ACCOUNT_EMAIL}:generateAccessToken`,
          subject_token_supplier: {
            getSubjectToken: async () => {
              console.log("Requesting Vercel OIDC token for impersonation");
              const token = await getVercelOidcToken(); // This is Vercel-specific
              // Optional: Decode for debugging if needed
              // try { 
              //   if (token) { 
              //     const decodedPayload = decodeJwt(token);
              //     console.log("Decoded Vercel OIDC Token Payload for impersonation:", JSON.stringify(decodedPayload, null, 2)); 
              //   }
              // } catch (decodeError) { 
              //   console.error("Failed to decode Vercel OIDC token:", decodeError); 
              // }
              if (!token) {
                console.warn("getVercelOidcToken returned null or undefined. This is expected if not running on Vercel. OIDC flow may fail if not on Vercel or if subject token isn't supplied by other means.");
              }
              return token;
            },
          },
      });

      console.log("Requesting impersonated access token...");
      const saAccessTokenResponse = await impersonationClient!.getAccessToken();
      const saAccessToken = saAccessTokenResponse?.token;
      if (!saAccessToken) {
        throw new Error('Failed to obtain impersonated service account access token.');
      }
      console.log("Impersonated access token received.");

      // --- Step 2: Use SA Access Token to generate ID Token for Cloud Run ---
      console.log(`Requesting ID token for audience ${TARGET_CLOUD_RUN_AUDIENCE} using SA access token.`);
      const idTokenResponse = await fetch(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${GCP_SERVICE_ACCOUNT_EMAIL}:generateIdToken`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${saAccessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ audience: TARGET_CLOUD_RUN_AUDIENCE, includeEmail: true }),
      });

      if (!idTokenResponse.ok) {
        const errorText = await idTokenResponse.text();
        console.error("Failed to generate ID token. Status:", idTokenResponse.status, "Response:", errorText);
        throw new Error(`Failed to generate ID token: ${idTokenResponse.statusText} - ${errorText}`);
      }
      const idTokenResult = await idTokenResponse.json();
      const cloudRunIdToken = idTokenResult.token;
      if (!cloudRunIdToken) {
        throw new Error('ID token was not present in the generateIdToken response.');
      }
      console.log("Cloud Run ID token received.");
      requestHeaders['Authorization'] = `Bearer ${cloudRunIdToken}`;

    } else if (API_AUTH_MODE === 'LOCAL_API_KEY') {
      console.log("Using local API key authentication.");
      console.log("X-API-Key header already set for local API key authentication.");
    } else if (API_AUTH_MODE === 'NONE') {
      console.log("Using no client-side authentication as per API_AUTH_MODE=NONE.");
      // No specific auth headers added; API is expected to be open or use other auth (e.g., network)
    } else {
      console.error(`Invalid API_AUTH_MODE: ${API_AUTH_MODE}`);
      return NextResponse.json({ message: 'Internal server configuration error: Invalid API authentication mode.' }, { status: 500 });
    }

    // --- Make the request to your configured API ---
    console.log(`Making request to ${finalApiUrl} with auth mode: ${API_AUTH_MODE}`);
    const apiResponse = await fetch(finalApiUrl, { headers: requestHeaders });

    // --- Handle the response ---
    if (!apiResponse.ok) {
        let errorData = null;
        let rawErrorText = '';
        try {
          rawErrorText = await apiResponse.text(); // Get raw text first
          console.error("Raw API error response:", rawErrorText);
          errorData = JSON.parse(rawErrorText); // Then try to parse
        } catch (jsonError) {
          console.warn("Could not parse error response from API as JSON:", jsonError);
        }
        // Use detailed message from JSON if available, otherwise raw text or status
        const errorMessage = errorData?.detail || errorData?.message || rawErrorText || `HTTP error! status: ${apiResponse.status} ${apiResponse.statusText}`;
        console.error("API request failed:", errorMessage);
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