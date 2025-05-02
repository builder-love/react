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

   // --- CSV Download Handler ---
   const handleDownloadCSV = useCallback(() => {
    if (!chartData || chartData.length === 0 || !projectTitles || projectTitles.length === 0) {
      console.warn("Cannot download CSV: No data available.");
      alert("No data available to download."); // Optional: User feedback
      return;
    }

    // Sanitize data for CSV Injection (basic example)
    const sanitizeForCSV = (value: string | number | null | undefined): string => {
      let strValue = String(value ?? ''); // Handle null/undefined -> empty string
      // If value starts with '=', '+', '-', or '@', prepend a single quote
      if (['=', '+', '-', '@'].some(char => strValue.startsWith(char))) {
        strValue = `'${strValue}`;
      }
      // Basic double quote escaping: replace all double quotes with two double quotes
      strValue = strValue.replace(/"/g, '""');
      // If the value contains a comma, newline, or double quote, enclose in double quotes
      if (strValue.includes(',') || strValue.includes('\n') || strValue.includes('"')) {
        strValue = `"${strValue}"`;
      }
      return strValue;
    };

    // 1. Create Header Row
    const headers = ['report_date', ...projectTitles].map(sanitizeForCSV).join(',');

    // 2. Create Data Rows
    const dataRows = chartData.map(row => {
      // Start with the sanitized date
      const dateValue = sanitizeForCSV(row.report_date);
      // Map each project title to its value in the current row, sanitize, handle missing values
      const projectValues = projectTitles.map(title => {
        const value = row[title]; // Access value using title as key
        return sanitizeForCSV(value); // Sanitize, handles null/undefined via sanitizeForCSV
      }).join(',');
      return `${dateValue},${projectValues}`; // Combine date and project values
    });

    // 3. Combine Headers and Rows
    const csvContent = [headers, ...dataRows].join('\n');

    // 4. Create Blob and Trigger Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) { // Check if HTML5 download attribute is supported
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      // Generate filename (e.g., project_trends_data_2025-05-02.csv)
      const dateStamp = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `project_trends_data_${dateStamp}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url); // Clean up the object URL
      console.log("CSV download triggered.");
    } else {
      console.error("CSV download failed: Browser does not support the download attribute.");
      alert("CSV download failed: Your browser doesn't support this feature.");
    }
  }, [chartData, projectTitles]); // Dependencies: chartData and projectTitles

   // --- Render Logic ---
   if (isLoading) {
    return <div className="text-center p-10">Loading data...</div>;
  }

  if (error) {
    return <div className="text-center p-10 text-red-500">Error loading data: {error}</div>;
  }

  // Check AFTER loading/error checks
  const noDataAvailable = !chartData || chartData.length === 0;
  const noProjectsAvailable = !projectTitles || projectTitles.length === 0;

  if (noDataAvailable && noProjectsAvailable) {
      console.log("RENDERING: No chart data or project titles available.");
      return <div className="text-center p-10">No data available to display the chart.</div>;
  }
  if (noProjectsAvailable) {
      console.log("RENDERING: No project titles available state (projectTitles is empty or null)");
      return <div className="text-center p-10">Data loaded, but no projects found to display lines.</div>;
  }
   // If only chartData is missing but projects exist (less likely with current logic, but safe check)
  if (noDataAvailable) {
       console.log("RENDERING: No chart data available state (chartData is empty or null)");
       return <div className="text-center p-10">Projects loaded, but no time-series data found.</div>;
  }

  console.log("RENDERING: Attempting to render LineChart component...");
  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 w-full mb-6">
         {/* Title */}
         <h2 className="text-2xl font-bold text-center md:text-left">
            Top 50 Blockchain Projects by Development Activity
          </h2>
         {/* Download Button */}
         <button
           onClick={handleDownloadCSV}
           disabled={noDataAvailable || noProjectsAvailable} // Disable if no data/projects
           className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-150 ease-in-out ${ (noDataAvailable || noProjectsAvailable) ? 'opacity-50 cursor-not-allowed' : '' }`}
         >
            Download CSV
         </button>
      </div>

      {/* Chart Area */}
      <div className="w-full">
        <ResponsiveContainer width="100%" height={600}>
          <LineChart /* ... rest of LineChart props remain the same ... */
           data={chartData}
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
            <YAxis /* ... YAxis props ... */
              type="number"
              domain={['auto', 'auto']}
              tickFormatter={(value: number) => value.toLocaleString()}
            >
                <Label /* ... YAxis Label props ... */
                   value="Weighted Score Index" // Updated Label Text
                   angle={-90}
                   position="insideLeft"
                   style={{ textAnchor: 'middle', fill: '#f5f5f5' }}
                   offset={-5} // Adjust offset if needed
                />
            </YAxis>
            <Tooltip /* ... Tooltip props ... */
              contentStyle={{ backgroundColor: '#222', color: '#f5f5f5', border: 'none', borderRadius: '4px' }}
              formatter={(value: number, name: string) => [value === null || value === undefined ? 'N/A' : value.toLocaleString(), name]}
              labelFormatter={(label: string) => `Date: ${formatDateTick(label)}`}
            />
            <Legend /* ... Legend props ... */
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
      </div> {/* End Chart Area div */}
      {/* --- START: Weighted Score Explanation Section --- */}
      <div className="mt-8 pt-6 border-t border-gray-600"> {/* Add margin, padding, and a top border */}
        <h3 className="text-lg font-semibold mb-2 text-gray-200"> {/* Heading style */}
          How is weighted score calculated?
        </h3>
        <p className="text-gray-400 text-sm">
          The Weighted Score is calculated weekly to rank blockchain projects based on GitHub development activity and community engagement metrics. Here&apos;s the process:
          <br/><br/>
          1. Data Collection: Gathers both all-time counts and recent (4-week percentage) changes for repo-specific key metrics like Commits, Forks, Stargazers, Contributors, and Watchers. It also includes an originality metric.
          <br/><br/>
          2. Repo metrics are rolled up to the project level. Some projects, like Ethereum have many sub-ecosystems.
          <br/><br/>
          3. Normalization: For each metric, every project&apos;s value is compared to all other projects within the same week and scaled to a value between 0 and 1.
          <br/><br/>
          4. Weighting: These normalized scores are multiplied by specific weights:
          <br/>
            - Major All-Time Metrics (12.5% each): Commits, Forks, Stars, Contributors.
          <br/>
            - Major Recent Change Metrics (10% each): 4-week change in Commits, Forks, Stars, Contributors.
          <br/>
            - Minor Metrics (2.5% each): All-time Watchers, All-time Originality Ratio, 4-week change in Watchers, 4-week change in Originality Ratio.
          <br/><br/>
          5. Summation: The weighted, normalized scores for all metrics are added together to get a final weighted_score between 0 and 1.
          <br/><br/>
          6. Index Conversion: The &quot;Weighted Score Index&quot; shown in the chart is simply this weighted_score multiplied by 100.
          <br/><br/>
          Primary source for project-to-repo mapping is Electric Capital Crypto Ecosystems {' '} {/* Add a space before the image link */}
          <a
            href="https://github.com/electric-capital/crypto-ecosystems"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block align-middle" // Crucial for alignment
          >
            <img
              src="/electric_capital_logo_transparent.png"
              alt="Electric Capital Crypto Ecosystems Logo Link"
              // Adjust size to fit nicely inline, e.g., h-4 or h-5
              className="inline-block h-4 w-auto align-middle" // Ensure inline and adjust size/vertical alignment
            />
          </a>
        </p>
      </div>
      {/* --- END: Weighted Score Explanation Section --- */}
    </div>
  );
};

export default HomePage;