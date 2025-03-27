"use client"; // Mark this as a Client Component

import React from 'react';
import { useState, useEffect } from 'react';
import type { TopForkData } from '../types';

export default function EconomicsPage() {
  const [topForks, setTopForks] = useState<TopForkData[]>([]); // Initialize as empty array
  const [isLoading, setIsLoading] = useState<boolean>(true);    // State for loading status
  const [error, setError] = useState<string | null>(null);     // State for errors

  useEffect(() => {
    // Define the async function to fetch data
    const fetchData = async () => {
      setIsLoading(true); // Start loading
      setError(null);    // Clear previous errors

      try {
        // Fetch data from YOUR Next.js API route
        console.log("Fetching data from API route");
        const response = await fetch('/api/get-top-forks');

        if (!response.ok) {
          // Try to get a more specific error message from the API response
          let errorDetail = `HTTP error! status: ${response.status}`;
          try {
            const errorData = await response.json();
            errorDetail = errorData.message || errorDetail;
          } catch (jsonError) {
            // Ignore if the error response wasn't JSON
            console.error("Error parsing JSON:", jsonError);
          }
          throw new Error(errorDetail);
        }

        const data: TopForkData[] = await response.json();
        setTopForks(data); // Update state with fetched data

      } catch (err: unknown) { // Catch as unknown
        let message = 'An unknown error occurred'; // Default message
        if (err instanceof Error) {
          // If it's an Error object, we can safely access .message
          message = err.message;
          console.error("Fetching error:", err); // Log the full error object
        } else {
          // If it's something else (e.g., a string was thrown), log it directly
          console.error("Unexpected error type:", err);
          // Optionally convert non-Error types to string for the message
          message = String(err) || 'Failed to fetch data due to an unexpected error type';
        }
        setError(message); // Set the error state with the determined message
      } finally {
        setIsLoading(false); // Stop loading, regardless of success or error
      }
    };

    fetchData(); // Call the fetch function when the component mounts

  },[]); // Empty dependency array means this effect runs only once on mount

  // --- Render the component based on state ---

  if (isLoading) {
    return <div className="p-4">Loading top forked projects...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error loading data: {error}</div>;
  }

  if (topForks.length === 0) {
    return <div className="p-4">No projects found.</div>;
  }

  // Display the data
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Top 100 Forked Projects</h1>
      <ul className="list-disc pl-5">
        {topForks.map((project) => (
          <li key={project.project_title} className="mb-2">
            <strong className="font-semibold">{project.project_title}</strong>: {project.forks} forks
            <span className="text-sm text-gray-500 ml-2">
              (Last Updated: {new Date(project.latest_data_timestamp).toLocaleDateString()}) {/* Basic date formatting */}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}




// placeholder
// const EconomicsPage: React.FC = () => {
//   return (
//     <div className="p-6">
//       <h1 className="text-2xl font-bold text-blue-500 mb-4">Economic Activity by Developer Framework</h1>
//       <p>Value secured, value transacted, and value exploited across developer frameworks.</p>
//       <br/>
//       <p>Not ready for production. Soon.</p> 
//     </div>
//   );
// };

// export default EconomicsPage;