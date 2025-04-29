'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, 
  Line,      
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TopProjectsTrendsData } from './types'; 

// Define a type for the transformed data structure suitable for the LineChart
interface FormattedLineChartData {
  report_date: string; // The X-axis value
  [projectTitle: string]: number | string; // Dynamically add project titles as keys with score as value
}

// Simple color generation function (we might want a more sophisticated one for 50 colors)
const generateColors = (count: number): string[] => {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate HSL colors with varying hue
    const hue = (i * (360 / count)) % 360;
    colors.push(`hsl(${hue}, 70%, 50%)`);
  }
  return colors;
};


const HomePage: React.FC = () => {
  // --- State Hooks ---
  // State for the raw API data
  const [apiData, setApiData] = useState<TopProjectsTrendsData[]>([]);
  // State for unique project titles found in the data
  const [projectTitles, setProjectTitles] = useState<string[]>([]);
  // State for loading status
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // State for error messages
  const [error, setError] = useState<string | null>(null);

  // --- Fetch Data ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      setProjectTitles([]); // Reset titles on new fetch

      try {
        console.log("Fetching project trends data from API route");
        const response = await fetch('/api/get-top50-project-trends'); // Vercel API route

        if (!response.ok) {
          let errorDetail = `HTTP error! status: ${response.status}`;
          try {
            const errorData = await response.json();
            errorDetail = errorData.message || errorDetail;
          } catch (jsonError) {
             console.error("Error parsing JSON error response:", jsonError);
          }
          throw new Error(errorDetail);
        }

        const fetchedData: TopProjectsTrendsData[] = await response.json();
        setApiData(fetchedData); // Store raw data

        // Extract unique project titles right after fetch
        const uniqueTitles = [...new Set(fetchedData.map(item => item.project_title))];
        setProjectTitles(uniqueTitles); // Store unique titles for line rendering


      } catch (err: unknown) {
        let message = 'An unknown error occurred fetching project trends data';
        if (err instanceof Error) {
          message = err.message;
          console.error("Fetching project trends error:", err);
        } else {
          console.error("Unexpected project trends error type:", err);
          message = String(err) || message;
        }
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []); // Runs once on mount

  // --- Data Transformation ---
  // Use useMemo to transform data only when apiData changes
  const chartData = useMemo(() => {
    if (!apiData.length) return [];

    // Group data by report_date
    const groupedData: Record<string, FormattedLineChartData> = {};

    apiData.forEach(item => {
      const { report_date, project_title, weighted_score_index } = item;

      if (!groupedData[report_date]) {
        groupedData[report_date] = { report_date }; // Initialize object for this date
      }

      // Add the project's score for this date
      // Ensure project_title is a valid key (e.g., handle special characters if necessary)
      groupedData[report_date][project_title] = weighted_score_index;
    });

    // Convert the grouped object into an array and sort by date
    const sortedData = Object.values(groupedData).sort((a, b) =>
      new Date(a.report_date).getTime() - new Date(b.report_date).getTime()
    );

    return sortedData;
  }, [apiData]); // Dependency: re-run only if apiData changes

  // Generate colors based on the number of unique projects
  const projectColors = useMemo(() => {
      const colors = generateColors(projectTitles.length);
      return projectTitles.reduce((acc, title, index) => {
          acc[title] = colors[index % colors.length]; // Use modulo for safety if colors < titles
          return acc;
      }, {} as Record<string, string>);
  }, [projectTitles]);


  // --- Render Logic ---
  if (isLoading) {
    return <div className="text-center p-10">Loading data...</div>;
  }

  if (error) {
    return <div className="text-center p-10 text-red-500">Error loading data: {error}</div>;
  }

  if (!chartData.length) {
    return <div className="text-center p-10">No data available to display the chart.</div>;
  }

  // --- Date Formatting for XAxis ---
  const formatDateTick = (tickItem: string): string => {
    // Example: Convert 'YYYY-MM-DD' to 'MM/DD'
    try {
      const date = new Date(tickItem + 'T00:00:00Z'); // Treat as UTC to avoid timezone issues
      if (isNaN(date.getTime())) return tickItem; // Return original if invalid
      return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', timeZone: 'UTC' });
    } catch (e) {
      return tickItem; // Fallback
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-center w-full">
        {/* Adjusted title to reflect the new chart */}
        <h2 className="text-2xl font-bold mb-6 text-center">
          Project Weighted Score Index Trends Over Time
        </h2>
      </div>
      <div className="w-full">
        <ResponsiveContainer width="100%" height={600}>
          <>
            <LineChart
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 50,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#555" /> {/* Slightly visible grid */}
              <XAxis
                dataKey="report_date"
                type="category" // Dates are categories here
                tickFormatter={formatDateTick} // Format dates on the axis
                angle={-45} // Angle labels to prevent overlap
                textAnchor="end" // Align angled labels correctly
                height={60} // Allocate height for angled labels
                interval="preserveStartEnd" // Show first and last, maybe skip some in between
                // Consider adding tick={{ fontSize: 10 }} if labels are still too crowded
              />
              <YAxis
                type="number" // Score is a number
                domain={['auto', 'auto']} // Let Recharts determine the scale
                tickFormatter={(value: number) => value.toLocaleString()} // Format large numbers
                // You can add a label to the Y-axis if needed:
                // label={{ value: 'Weighted Score Index', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#222', color: '#f5f5f5', border: 'none', borderRadius: '4px' }}
                formatter={(value: number, name: string) => [value.toLocaleString(), name]} // Format value in tooltip
                labelFormatter={(label: string) => `Date: ${formatDateTick(label)}`} // Format date label in tooltip
              />
              <Legend layout="horizontal" verticalAlign="top" align="center" wrapperStyle={{ paddingTop: '20px' }} />

              {/* Dynamically render a Line for each project */}
              {projectTitles.map((title) => (
                <Line
                  key={title}
                  type="monotone" // Smooth line, alternatives: 'linear', 'step', etc.
                  dataKey={title} // This MUST match the keys in your chartData objects
                  stroke={projectColors[title] || '#8884d8'} // Use generated color, fallback
                  strokeWidth={2}
                  dot={false} // Hide dots for cleaner look with many lines
                  activeDot={{ r: 6 }} // Show a larger dot on hover
                  connectNulls={true} // Connect line segments even if there's a missing data point
                  name={title} // Name shown in Legend and Tooltip
                />
              ))}
            </LineChart>
          </>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default HomePage;