// app/api/get-top-forks/route.ts
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

// Define an interface for your data item (similar to Pydantic in FastAPI)
interface TopForkData {
  project_title: string;
  latest_data_timestamp: string;
  forks: number;
}

export async function GET(_req: NextRequest) {
  try {
    // 1. Create a GoogleAuth instance.
    const auth = new google.auth.GoogleAuth({
        // No keyFile needed! We're using Workload Identity Federation + ADC
        scopes: 'https://www.googleapis.com/auth/cloud-platform'
    });

    // 2. Get the Cloud Run service URL from an environment variable.
    const cloudRunUrl = process.env.CLOUD_RUN_URL;
    if (!cloudRunUrl) {
        console.error("CLOUD_RUN_URL environment variable not set.");
        return NextResponse.json({ message: 'Internal server configuration error.' }, { status: 500 });
    }

    // 3. Obtain an ID token. Set the `targetAudience` to your Cloud Run URL.
    const client = await auth.getIdTokenClient(cloudRunUrl);
    const idToken = await client.idTokenProvider.fetchIdToken(cloudRunUrl);

    // 4. Make the request to your Cloud Run API.
    const apiResponse = await fetch(cloudRunUrl + '/projects/top-forks', {
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