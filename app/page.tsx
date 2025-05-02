'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  MouseEvent,
  ChangeEvent
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
import type { TopProjectsTrendsData, EnhancedTopProjectsTrendsData, FormattedLineChartData } from './types';
import { Payload } from 'recharts/types/component/DefaultLegendContent';
import Image from 'next/image';

// --- Define Metric Options ---
// Map user-friendly labels to the actual data keys expected from the API
const metricOptions = [
  { label: 'Weighted Score Index', value: 'weighted_score_index' },
  { label: 'Commit Count', value: 'commit_count' },
  { label: 'Fork Count', value: 'fork_count' },
  { label: 'Stargazer Count', value: 'stargaze_count' },
  { label: 'Contributor Count', value: 'contributor_count' },
  { label: 'Watcher Count', value: 'watcher_count' },
  { label: 'Not-Fork Ratio', value: 'is_not_fork_ratio' }, 
  { label: '4wk Change Commit Count', value: 'commit_count_pct_change_over_4_weeks' },
  { label: '4wk Change Fork Count', value: 'fork_count_pct_change_over_4_weeks' },
  { label: '4wk Change Stargazer Count', value: 'stargaze_count_pct_change_over_4_weeks' },
  { label: '4wk Change Contributor Count', value: 'contributor_count_pct_change_over_4_weeks' },
  { label: '4wk Change Watcher Count', value: 'watcher_count_pct_change_over_4_weeks' },
  { label: '4wk Change Not-Fork Ratio', value: 'is_not_fork_ratio_pct_change_over_4_weeks' },
];

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
  // Use the enhanced type for apiData state
  const [apiData, setApiData] = useState<EnhancedTopProjectsTrendsData[]>([]);
  const [projectTitles, setProjectTitles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lineOpacity, setLineOpacity] = useState<Record<string, number>>({});

  // --- STATE FOR SELECTED METRIC ---
  const [selectedMetric, setSelectedMetric] = useState<string>(metricOptions[0].value); // Default to first option's value

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

         // Cast to the enhanced type
         const fetchedData: EnhancedTopProjectsTrendsData[] = await response.json();

        // Check if it's an array and if it has items
        if (!Array.isArray(fetchedData)) {
          console.error("API did not return an array!");
          throw new Error("Invalid data format received from API.");
        }
        console.log(`Received ${fetchedData.length} items from API.`);


        setApiData(fetchedData); // Store raw data

         // Get unique project titles (only needs to be done once)
         const uniqueTitles = [...new Set(fetchedData.map(item => item.project_title))].filter(Boolean); // Filter out potential null/empty titles
         setProjectTitles(uniqueTitles);

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

   // --- Data Transformation (Now depends on selectedMetric) ---
   const chartData = useMemo(() => {
    console.log(`Transforming data for selected metric: ${selectedMetric}`);
    if (!apiData || apiData.length === 0) {
      console.log("Transformation skipped: apiData is empty.");
      return [];
    }

    const groupedData: Record<string, FormattedLineChartData> = {};

    apiData.forEach(item => {
      const { report_date, project_title } = item;
      // --- Dynamically access the selected metric's value ---
      const metricValue = item[selectedMetric];

      // Basic validation for core fields and the *selected* metric
      if (!report_date || !project_title || metricValue === undefined /* Allow 0 */) {
          // Only warn if the *selected* metric is missing, allow others to be absent
          // console.warn(`Skipping item - missing data for metric '${selectedMetric}':`, item);
          // We still need the date entry, just might have nulls for some projects
          // Let connectNulls handle it in the chart, but ensure date entry exists
          if (!groupedData[report_date]) {
               groupedData[report_date] = { report_date };
           }
           // Assign null if value is missing for this specific project/metric/date combo
           groupedData[report_date][project_title] = null;
          // return; // Don't skip the whole date entry
      } else {
           if (!groupedData[report_date]) {
               groupedData[report_date] = { report_date };
           }
            // Store the value of the currently selected metric
           groupedData[report_date][project_title] = metricValue;
      }


    });

    // Ensure all projects exist as keys for all dates, filling with null if necessary
     const allDates = Object.keys(groupedData);
     allDates.forEach(date => {
       projectTitles.forEach(title => {
           if (!(title in groupedData[date])) {
               groupedData[date][title] = null; // Assign null if project has no data for this date/metric
           }
       });
     });


    const sortedData = Object.values(groupedData).sort((a, b) =>
      new Date(a.report_date).getTime() - new Date(b.report_date).getTime()
    );

    console.log("Data transformation complete. Transformed Data:", sortedData.slice(0, 5)); // Log first 5 rows
    return sortedData;

  }, [apiData, selectedMetric, projectTitles]); // Add selectedMetric and projectTitles as dependencies

   // --- Get Current Metric Label for Y-Axis ---
   const currentMetricLabel = useMemo(() => {
    return metricOptions.find(opt => opt.value === selectedMetric)?.label || 'Selected Metric';
}, [selectedMetric]);

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

   // --- CSV Download Handler (Updated to use selected metric label) ---
   const handleDownloadCSV = useCallback(() => {
    // ... (rest of the function is mostly the same)
       if (!chartData || chartData.length === 0 || !projectTitles || projectTitles.length === 0) {
           console.warn("Cannot download CSV: No data available.");
           alert("No data available to download.");
           return;
       }

       const sanitizeForCSV = (value: string | number | null | undefined): string => {
           let strValue = String(value ?? ''); // Handle null/undefined -> empty string
           if (['=', '+', '-', '@'].some(char => strValue.startsWith(char))) {
               strValue = `'${strValue}`;
           }
           strValue = strValue.replace(/"/g, '""');
           if (strValue.includes(',') || strValue.includes('\n') || strValue.includes('"')) {
               strValue = `"${strValue}"`;
           }
           return strValue;
       };

       // 1. Create Header Row (Use current metric label)
       const currentMetricHeader = selectedMetric; // Use the actual data key for the header
       const headers = ['report_date', 'project_title', currentMetricHeader]
           // .map(sanitizeForCSV) // Sanitizing these specific headers isn't strictly necessary
           .join(',');

       // 2. Create Data Rows (remains the same logic as long format)
       const dataRows: string[] = [];
       chartData.forEach(row => {
           const reportDate = row.report_date;
           projectTitles.forEach(projectTitle => {
               const score = row[projectTitle]; // This score is already the selected metric's value
               const csvRow = [
                   sanitizeForCSV(reportDate),
                   sanitizeForCSV(projectTitle),
                   sanitizeForCSV(score)
               ].join(',');
               dataRows.push(csvRow);
           });
       });

       // 3. Combine Headers and Rows
       const csvContent = [headers, ...dataRows].join('\n');

       // 4. Create Blob and Trigger Download
       const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
       const link = document.createElement('a');
       if (link.download !== undefined) {
           const url = URL.createObjectURL(blob);
           const dateStamp = new Date().toISOString().split('T')[0];
           // Make filename dynamic based on metric
           const filename = `project_trends_${selectedMetric}_${dateStamp}.csv`;
           link.setAttribute('href', url);
           link.setAttribute('download', filename);
           link.style.visibility = 'hidden';
           document.body.appendChild(link);
           link.click();
           document.body.removeChild(link);
           URL.revokeObjectURL(url);
       } else {
           console.error("CSV download failed: Browser does not support the download attribute.");
           alert("CSV download failed: Your browser doesn't support this feature.");
       }

  }, [chartData, projectTitles, selectedMetric]); // Add selectedMetric dependency

  // --- Dropdown Change Handler ---
  const handleMetricChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
       setSelectedMetric(event.target.value);
       console.log("Metric changed to:", event.target.value);
  }, []);

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
    // Be more specific if a metric was selected but yielded no chart data
    if (selectedMetric !== metricOptions[0].value) {
        return <div className="text-center p-10">No data available for the selected metric: {currentMetricLabel}.</div>;
    }
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
            Download Chart Data
         </button>
      </div>
       {/* Chart Area */}
       <div className="w-full">
         <ResponsiveContainer width="100%" height={600}>
           <LineChart
             data={chartData} // Data now dynamically reflects selectedMetric
             margin={{ top: 5, right: 30, left: 20, bottom: 50 }} // Adjust left margin if Y-label gets long
           >
             <CartesianGrid strokeDasharray="3 3" stroke="#555" />
             <XAxis
                // ... (XAxis props - no changes needed)
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
               domain={['auto', 'auto']} // Keep auto domain for different metric scales
               tickFormatter={(value: number) => value.toLocaleString()} // Format ticks
             >
                {/* Dynamic Y-Axis Label */}
               <Label
                 value={currentMetricLabel} // Use dynamic label
                 angle={-90}
                 position="insideLeft"
                 style={{ textAnchor: 'middle', fill: '#f5f5f5' }}
                 // offset={-5} // May need adjustment based on label length
               />
             </YAxis>
             <Tooltip
                // ... (Tooltip props - no changes needed, maybe adjust formatter if needed for non-numeric?)
                 contentStyle={{ backgroundColor: '#222', color: '#f5f5f5', border: 'none', borderRadius: '4px' }}
                 formatter={(value, name) => { // Value might not always be number
                     const formattedValue = (value === null || value === undefined)
                        ? 'N/A'
                        : typeof value === 'number' ? value.toLocaleString() : String(value);
                    return [formattedValue, name];
                 }}
                 labelFormatter={(label: string) => `Date: ${formatDateTick(label)}`}
             />
             <Legend
                // ... (Legend props - no changes needed)
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
      {/* --- START: Metric Selector Dropdown --- */}
      {/* Position this div where the red square was */}
      <div className="flex justify-end mt-4 mb-6 pr-4 md:pr-8"> {/* Adjust padding/margin as needed */}
          <label htmlFor="metric-select" className="mr-2 self-center text-sm text-gray-400">Chart Metric:</label>
          <select
              id="metric-select"
              value={selectedMetric}
              onChange={handleMetricChange}
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2"
              disabled={isLoading} // Disable while loading
          >
              {metricOptions.map(option => (
                  <option key={option.value} value={option.value}>
                      {option.label}
                  </option>
              ))}
          </select>
      </div>
      {/* --- END: Metric Selector Dropdown --- */}
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
            <Image
              src="/electric_capital_logo_transparent.png" // Path relative to the 'public' directory
              alt="Electric Capital Crypto Ecosystems Logo Link"
              width={371} 
              height={32}
              className="inline-block h-4 w-auto align-middle"
            />
          </a>
        </p>
      </div>
      {/* --- END: Weighted Score Explanation Section --- */}
    </div>
  );
};

export default HomePage;