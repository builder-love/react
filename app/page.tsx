'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  MouseEvent
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
  Label,
} from 'recharts';
import chroma from 'chroma-js';
import type { TopProjectsTrendsData, FormattedLineChartData } from './types';
import { Payload } from 'recharts/types/component/DefaultLegendContent';

// Chroma.js color generation function
const generateColors = (count: number): string[] => {
  if (count === 0) return []; // Handle edge case

  const colors: string[] = [];
  // Adjust saturation and lightness for desired look (0-1 range)
  const saturation = 0.75;
  const lightness = 0.5;

  for (let i = 0; i < count; i++) {
    // Distribute hues evenly around the color wheel (0-360 degrees)
    const hue = (i * (360 / count)) % 360;
    // Create HSL color with chroma, then convert to hex string
    colors.push(chroma.hsl(hue, saturation, lightness).hex());
  }
  return colors;

};

const HomePage: React.FC = () => {
  const [apiData, setApiData] = useState<TopProjectsTrendsData[]>([]);
  const [projectTitles, setProjectTitles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // --- STATE FOR LEGEND HOVER EFFECT ---
  const [lineOpacity, setLineOpacity] = useState<Record<string, number>>({});

  // --- Initialize lineOpacity state when projectTitles are loaded ---
  useEffect(() => {
    if (projectTitles.length > 0) {
      const initialOpacity = projectTitles.reduce((acc, title) => {
        acc[title] = 1; // Start with all lines fully opaque
        return acc;
      }, {} as Record<string, number>);
      setLineOpacity(initialOpacity);
      console.log("Initialized line opacity state:", initialOpacity);
    }
  }, [projectTitles]); // Dependency on projectTitles

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

        // Check if it's an array and if it has items
        if (!Array.isArray(fetchedData)) {
          console.error("API did not return an array!");
          throw new Error("Invalid data format received from API.");
        }
        console.log(`Received ${fetchedData.length} items from API.`);


        setApiData(fetchedData); // Store raw data

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
        console.log("Finished fetching data, loading set to false."); // Log end fetch
      }
    };

    fetchData();
  }, []); // Runs once on mount

  // --- Data Transformation ---
  const chartData = useMemo(() => {

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
      return colorMap;
  }, [projectTitles]);

  // Date Formatting
  const formatDateTick = useCallback((tickItem: string): string => {
    try {
      // Assuming tickItem is a string representing a date, potentially like 'YYYY-MM-DD'
      // or the format seen in your screenshot 'MM-DDTHH:mm:ssZ'.
      // new Date() should handle these standard formats.
      const date = new Date(tickItem);

      // Check if the date object is valid
      if (isNaN(date.getTime())) {
          console.warn("Invalid date encountered in tickFormatter:", tickItem);
          return tickItem; // Return original string if parsing fails
      }

      // Format to 'mmm-dd-yyyy' using UTC methods to align with 'Z' timezone indicator if present
      // Get the abbreviated month name (e.g., 'Apr')
      const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
      // Get the zero-padded day (e.g., '05', '27')
      const day = date.getUTCDate().toString().padStart(2, '0');
      // Get the full year (e.g., '2025')
      const year = date.getUTCFullYear();

      // Combine parts with hyphens
      return `${month}-${day}-${year}`;

    } catch (e) {
      console.error("Error formatting date tick:", tickItem, e);
      return tickItem; // Fallback to original tick value on error
    }
  }, []); // No dependencies needed

  // --- LEGEND HOVER HANDLERS ---
  const handleMouseEnter = useCallback(
    (_data: Payload, _index: number, _event: MouseEvent<Element>) => {
      if (_data.dataKey) {
        const dataKey = String(_data.dataKey);
        setLineOpacity((prevOpacity) => ({
          ...prevOpacity,
          ...Object.keys(prevOpacity).reduce((acc, key) => ({
            ...acc,
            [key]: key === dataKey ? 1 : 0.2
          }), {})
        }));
      }
    },
    []
  );
  
  const handleMouseLeave = useCallback(
    (_data: Payload, _index: number, _event: MouseEvent<Element>) => {
      setLineOpacity((prevOpacity) => (
        Object.keys(prevOpacity).reduce((acc, key) => ({
          ...acc,
          [key]: 1
        }), {})
      ));
    },
    []
  );


  // --- Render Logic ---
  if (isLoading) {
    return <div className="text-center p-10">Loading data...</div>;
  }

  if (error) {
    return <div className="text-center p-10 text-red-500">Error loading data: {error}</div>;
  }

  // Explicit check for chartData length *after* loading and error checks
  if (!chartData || chartData.length === 0) {
     console.log("RENDERING: No chart data available state (chartData is empty or null)");
     return <div className="text-center p-10">No data available to display the chart.</div>;
  }

  // Explicit check for project titles needed to render lines
   if (!projectTitles || projectTitles.length === 0) {
     console.log("RENDERING: No project titles available state (projectTitles is empty or null)");
     return <div className="text-center p-10">Data loaded, but no projects found to display lines.</div>;
  }

  console.log("RENDERING: Attempting to render LineChart component...");
  return (
    <div className="p-6">
      <div className="flex justify-center w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Top 50 Blockchain Projects by Development Activity
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
            >
            <Label
            value="Weighted Score" // The text for the label
            angle={-90} // Rotate the label to be vertical
            position="insideLeft" // Position it inside the chart area, to the left of the axis line
            style={{ textAnchor: 'middle', fill: '#f5f5f5' }} // Style to match your theme (using tooltip color)
            // You might need to adjust the chart's left margin if the label feels cramped
            // offset={10} // Optional: Adjust offset if needed
            />
            </YAxis>
            <Tooltip
            // Keep existing labelFormatter and formatter
            labelFormatter={(label: string) => `Date: ${formatDateTick(label)}`}
            formatter={(value: number, name: string) => [
              value === null || value === undefined ? 'N/A' : value.toLocaleString(),
              name
            ]}
            // Modify contentStyle
            contentStyle={{
              backgroundColor: '#222',
              color: '#f5f5f5',
              border: 'none',
              borderRadius: '4px',
              padding: '10px', // Add some padding

              // --- Add these styles ---
              maxHeight: '350px', // Adjust max height as needed (e.g., '60vh')
              overflowY: 'auto',  // Enable vertical scrollbar when content exceeds max height
              // Optional: Style the scrollbar (browser support varies)
              scrollbarWidth: 'thin', // For Firefox
              scrollbarColor: '#888 #333', // For Firefox (thumb track)
            }}
            // Optional: Add styles for Webkit scrollbars (Chrome, Safari, Edge)
            // You might need to target '.recharts-tooltip-wrapper' or a custom class via CSS
            // .recharts-tooltip-wrapper::-webkit-scrollbar { width: 6px; }
            // .recharts-tooltip-wrapper::-webkit-scrollbar-track { background: #333; }
            // .recharts-tooltip-wrapper::-webkit-scrollbar-thumb { background-color: #888; border-radius: 3px; }
          />
            <Legend 
              layout="horizontal" 
              verticalAlign="top" 
              align="center" 
              wrapperStyle={{ paddingTop: '20px' }} 
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            />
            {/* Render Lines - Apply opacity from state */}
            {projectTitles.map((title) => {
                 // Get opacity from state, default to 1 if state not yet initialized
                 const currentOpacity = lineOpacity[title] !== undefined ? lineOpacity[title] : 1;
                 // console.log(`Rendering line ${title} with opacity: ${currentOpacity}`); // Debugging

                 return (
                    <Line
                        key={title}
                        type="monotone"
                        dataKey={title}
                        stroke={projectColors[title] || '#8884d8'}
                        strokeWidth={2} // Or adjust dynamically: isHovered ? 4 : 2
                        strokeOpacity={currentOpacity} // <-- Apply opacity from state
                        dot={false}
                        activeDot={{ r: 6 }}
                        connectNulls={true}
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