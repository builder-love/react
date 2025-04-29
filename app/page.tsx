'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback
} from 'react';
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
  report_date: string;
  [projectTitle: string]: number | string;
}

// Simple color generation function
const generateColors = (count: number): string[] => {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const hue = (i * (360 / count)) % 360;
    colors.push(`hsl(${hue}, 70%, 50%)`);
  }
  return colors;
};

const HomePage: React.FC = () => {
  const [apiData, setApiData] = useState<TopProjectsTrendsData[]>([]);
  const [projectTitles, setProjectTitles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // --- Fetch Data ---
  useEffect(() => {
    const fetchData = async () => {
      // Reset states for fetch cycle
      setIsLoading(true);
      setError(null);
      setApiData([]); // Clear previous data
      setProjectTitles([]);

      try {
        console.log("Fetching project trends data from API route..."); // Log start
        const response = await fetch('/api/get-top50-project-trends');

        // *** Log HTTP Status ***
        console.log("API Response Status:", response.status, response.statusText);

        if (!response.ok) {
          let errorDetail = `HTTP error! status: ${response.status}`;
          try {
            const errorData = await response.json();
            console.error("API Error Data:", errorData); // Log error response body
            errorDetail = errorData.message || errorDetail;
          } catch (jsonError) {
             console.error("Error parsing JSON error response:", jsonError);
          }
          throw new Error(errorDetail);
        }

        const fetchedData: TopProjectsTrendsData[] = await response.json();

        // *** LOG RAW API DATA HERE ***
        console.log("Raw API Data Received:", fetchedData);
        // Check if it's an array and if it has items
        if (!Array.isArray(fetchedData)) {
          console.error("API did not return an array!");
          throw new Error("Invalid data format received from API.");
        }
        console.log(`Received ${fetchedData.length} items from API.`);


        setApiData(fetchedData); // Store raw data

        const uniqueTitles = [...new Set(fetchedData.map(item => item.project_title))];
        // *** LOG UNIQUE TITLES ***
        console.log("Extracted Project Titles:", uniqueTitles);
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
        console.log("Finished fetching data, loading set to false."); // Log end fetch
      }
    };

    fetchData();
  }, []); // Runs once on mount

  // --- Data Transformation ---
  const chartData = useMemo(() => {
    // *** LOG START OF TRANSFORMATION ***
    console.log("Starting data transformation (useMemo)...", { apiDataLength: apiData.length });

    if (!apiData || apiData.length === 0) {
        console.log("Transformation skipped: apiData is empty.");
        return []; // Ensure it returns empty array if no apiData
    }

    const groupedData: Record<string, FormattedLineChartData> = {};
    apiData.forEach(item => {
      const { report_date, project_title, weighted_score_index } = item;
      if (!report_date || !project_title || weighted_score_index === undefined || weighted_score_index === null) {
          console.warn("Skipping item with missing data:", item);
          return; // Skip items with missing essential data
      }
      if (!groupedData[report_date]) {
        groupedData[report_date] = { report_date };
      }
      groupedData[report_date][project_title] = weighted_score_index;
    });

    const sortedData = Object.values(groupedData).sort((a, b) =>
      new Date(a.report_date).getTime() - new Date(b.report_date).getTime()
    );

    // *** LOG TRANSFORMED DATA ***
    console.log("Data transformation complete. Transformed Data:", sortedData);
    return sortedData;
  }, [apiData]);

  // Generate colors
  const projectColors = useMemo(() => {
      const colors = generateColors(projectTitles.length);
      const colorMap = projectTitles.reduce((acc, title, index) => {
          acc[title] = colors[index % colors.length];
          return acc;
      }, {} as Record<string, string>);
      // *** LOG PROJECT COLORS ***
      console.log("Generated Project Colors Map:", colorMap);
      return colorMap;
  }, [projectTitles]);

  // Date Formatting
  const formatDateTick = useCallback((tickItem: string): string => { // Wrap in useCallback
    try {
      const date = new Date(tickItem + 'T00:00:00Z');
      if (isNaN(date.getTime())) return tickItem;
      return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', timeZone: 'UTC' });
    } catch (e) {
      console.error("Error formatting date tick:", tickItem, e);
      return tickItem;
    }
  }, []); // No dependencies needed


  // *** LOG BEFORE RENDER CHECK ***
  console.log("Preparing to render. States:", { isLoading, error, chartDataLength: chartData.length, projectTitlesLength: projectTitles.length });

  // --- Render Logic ---
  if (isLoading) {
    console.log("RENDERING: Loading state");
    return <div className="text-center p-10">Loading data...</div>;
  }

  if (error) {
    console.log("RENDERING: Error state -", error);
    return <div className="text-center p-10 text-red-500">Error loading data: {error}</div>;
  }

  // Explicit check for chartData length *after* loading and error checks
  if (!chartData || chartData.length === 0) {
     console.log("RENDERING: No chart data available state (chartData is empty or null)");
     // Add extra info here
     console.log("State when chartData is empty:", { isLoading, error, apiDataLength: apiData.length, projectTitlesLength: projectTitles.length });
     return <div className="text-center p-10">No data available to display the chart.</div>;
  }

  // Explicit check for project titles needed to render lines
   if (!projectTitles || projectTitles.length === 0) {
     console.log("RENDERING: No project titles available state (projectTitles is empty or null)");
     console.log("State when projectTitles is empty:", { isLoading, error, apiDataLength: apiData.length, chartDataLength: chartData.length });
     return <div className="text-center p-10">Data loaded, but no projects found to display lines.</div>;
  }

  console.log("RENDERING: Attempting to render LineChart component...");
  return (
    <div className="p-6">
      <div className="flex justify-center w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Project Weighted Score Index Trends Over Time
        </h2>
      </div>
      <div className="w-full">
        <ResponsiveContainer width="100%" height={600}>
          <LineChart
            data={chartData} // Data should be [{ report_date: '...', ProjectA: 10, ProjectB: 20 }, ...]
            margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#555" />
            <XAxis
              dataKey="report_date"
              type="category"
              tickFormatter={formatDateTick}
              angle={-45}
              textAnchor="end"
              height={60}
              interval="preserveStartEnd"
            />
            <YAxis
              type="number"
              domain={['auto', 'auto']}
              tickFormatter={(value: number) => value.toLocaleString()}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#222', color: '#f5f5f5', border: 'none', borderRadius: '4px' }}
              formatter={(value: number, name: string) => [value === null || value === undefined ? 'N/A' : value.toLocaleString(), name]} // Handle null/undefined values in tooltip
              labelFormatter={(label: string) => `Date: ${formatDateTick(label)}`}
            />
            <Legend layout="horizontal" verticalAlign="top" align="center" wrapperStyle={{ paddingTop: '20px' }} />

            {/* Render Lines - Check if projectTitles is populated */}
            {projectTitles.map((title) => {
                 // *** LOG LINE RENDERING ATTEMPT ***
                 console.log(`Rendering Line for: ${title}, Color: ${projectColors[title]}`);
                 return (
                    <Line
                        key={title}
                        type="monotone"
                        dataKey={title} // This MUST match keys in chartData objects
                        stroke={projectColors[title] || '#8884d8'}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6 }}
                        connectNulls={true} // Important for gaps in data
                        name={title}
                    />
                );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default HomePage;