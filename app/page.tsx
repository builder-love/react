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
import type { EnhancedTopProjectsTrendsData, FormattedLineChartData } from './types';
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

// formatting for the y axis labels
const percentMetrics = new Set([
  'is_not_fork_ratio', 
  'commit_count_pct_change_over_4_weeks',
  'fork_count_pct_change_over_4_weeks',
  'stargaze_count_pct_change_over_4_weeks',
  'contributor_count_pct_change_over_4_weeks',
  'watcher_count_pct_change_over_4_weeks',
  'is_not_fork_ratio_pct_change_over_4_weeks'
]);

const integerMetrics = new Set([
  'commit_count',
  'fork_count',
  'stargaze_count',
  'contributor_count',
  'watcher_count'
]);

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

// --- hook for mobile view - screen size ---
const useIsMobile = (breakpoint = 768): boolean => { // Tailwind's 'md' breakpoint
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileView(window.innerWidth < breakpoint);
    };

    checkScreenSize(); // Initial check
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, [breakpoint]);

  return isMobileView;
};

const HomePage: React.FC = () => {
  // Use the enhanced type for apiData state
  const [apiData, setApiData] = useState<EnhancedTopProjectsTrendsData[]>([]);
  const [projectTitles, setProjectTitles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lineOpacity, setLineOpacity] = useState<Record<string, number>>({});
  const [selectedMetric, setSelectedMetric] = useState<string>(metricOptions[0].value); // state for selected metric; efault to first option's value
  const isMobile = useIsMobile(); // Use the mobile hook

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

      if (project_title === 'Ethereum' && report_date.startsWith('2025-04-27')) {
        console.log('Processing:', report_date, project_title, selectedMetric, metricValue);
      }

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

  // --- Date Formatting that accomodates mobile ---
  const formatDateTick = useCallback((tickItem: string): string => {
    try {
      const date = new Date(tickItem);
      if (isNaN(date.getTime())) return tickItem;

      // Shorter format for mobile, more detailed for desktop
      if (isMobile) {
        // Example: "Apr '25" or just "04/27"
        return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' });
      }
      const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
      const day = date.getUTCDate().toString().padStart(2, '0');
      const year = date.getUTCFullYear();
      return `${month}-${day}-${year}`;
    } catch (e) {
      return tickItem;
    }
  }, [isMobile]); // isMobile dependency

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

  // --- Dynamic Y-Axis Tick Formatter ---
  const formatYAxisTick = useCallback((value: unknown): string => {
    if (typeof value !== 'number' || !isFinite(value)) {
      return value !== undefined && value !== null ? String(value) : '';
    }

    if (percentMetrics.has(selectedMetric)) {
      return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      }).format(value);
    }

    if (integerMetrics.has(selectedMetric)) {
      return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 0
      }).format(value);
    }

    if (selectedMetric === 'weighted_score_index') {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      }).format(value);
    }

    return value.toLocaleString
      ? value.toLocaleString('en-US')
      : String(value);
  }, [selectedMetric]);

  // begin y axis label offset calculation

  // Get the max/min values for the currently selected metric in the chart data
  // We need both max and min now to gauge the potential width of formatted labels
  const { maxValue, minValue } = useMemo(() => {
    if (!chartData || chartData.length === 0) return { maxValue: 0, minValue: 0 };

    let maxVal = -Infinity;
    let minVal = Infinity;

    chartData.forEach(row => {
        projectTitles.forEach(title => {
            const value = row[title]; // Access the metric value for the project
            // Ensure it's a number before comparing
            if (typeof value === 'number' && isFinite(value)) {
                if (value > maxVal) maxVal = value;
                if (value < minVal) minVal = value;
            }
        });
    });

    // Return 0 if no valid numbers found
    return {
        maxValue: maxVal === -Infinity ? 0 : maxVal,
        minValue: minVal === Infinity ? 0 : minVal
    };
  }, [chartData, projectTitles]); // Recalculate when chartData or projectTitles change

  // --- Dynamic Y-Label Offset that accomodates mobile ---
  const dynamicYLabelOffset = useMemo(() => {
    const baseDesktopOffset = -35; // Starting point for desktop
    const baseMobileOffset = -25;  // Starting point for mobile (less space)

    let offset = isMobile ? baseMobileOffset : baseDesktopOffset;

    const isPercent = percentMetrics.has(selectedMetric);

    if (isPercent) {
        const maxFormatted = formatYAxisTick(maxValue);
        const minFormatted = formatYAxisTick(minValue);
        if (maxFormatted.length > 7 || minFormatted.length > 7) { // More lenient for mobile
           offset -= isMobile ? 15 : 20;
        } else {
           offset -= isMobile ? 10 : 15;
        }
        return offset;
    }

    let formattedMaxMagnitude: string;
    if (integerMetrics.has(selectedMetric)) {
         formattedMaxMagnitude = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(maxValue);
    } else if (selectedMetric === 'weighted_score_index') {
         formattedMaxMagnitude = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(maxValue);
    } else {
         formattedMaxMagnitude = maxValue.toLocaleString('en-US');
    }

    const numDigits = formattedMaxMagnitude.replace(/[^0-9]/g, '').length;

    if (numDigits < 4) {
        return offset; // Use base
    } else if (numDigits < 7) {
        return offset - (isMobile ? 10 : 15);
    } else if (numDigits < 10) {
        return offset - (isMobile ? 15 : 25);
    } else {
        return offset - (isMobile ? 20 : 30);
    }
  }, [maxValue, minValue, selectedMetric, formatYAxisTick, isMobile]); // isMobile dependency

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
  // --- ADJUST NUMBER OF LINES FOR MOBILE ---
  // top 10) on mobile for clarity.
  // filter projectTitles here based on isMobile.
  const displayedProjectTitles = isMobile ? projectTitles.slice(0, 10) : projectTitles;
  return (
    // Adjusted padding for the main container
    <div className="p-2 sm:p-4 md:p-6">
      {/* Header: Title and Download Button - Flex column on mobile */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full mb-4 md:mb-6">
         <h2 className="text-xl sm:text-2xl font-bold text-center sm:text-left">
            Top Blockchain Projects
            { !isMobile && " by Development Activity" } {/* Shorter title for mobile */}
          </h2>
         <button
           onClick={handleDownloadCSV}
           disabled={noDataAvailable || noProjectsAvailable}
           className={`w-full sm:w-auto px-3 py-2 sm:px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-150 ease-in-out ${ (noDataAvailable || noProjectsAvailable) ? 'opacity-50 cursor-not-allowed' : '' }`}
         >
            {isMobile ? "Download CSV" : "Download Chart Data"} {/* Shorter button text */}
         </button>
      </div>

       {/* Chart Area */}
       <div className="w-full">
         {/* Adjust height for mobile */}
         <ResponsiveContainer width="100%" height={isMobile ? 400 : 600}>
           <LineChart
             data={chartData}
             // Adjust margins for mobile, especially left and bottom
             margin={{
                top: 5,
                right: isMobile ? 10 : 30,
                left: isMobile ? 5 : dynamicYLabelOffset < -40 ? 70 : 60, // Dynamic left based on Y label needs more space
                bottom: isMobile ? 70 : 50 // Increased bottom margin for angled labels on mobile
            }}
           >
             <CartesianGrid strokeDasharray="3 3" stroke="#555" />
             <XAxis
                 dataKey="report_date"
                 type="category"
                 tickFormatter={formatDateTick}
                 angle={isMobile ? -60 : -45} // Steeper angle for mobile if needed
                 textAnchor="end"
                 height={isMobile ? 80 : 60} // More height for labels on mobile
                 interval={isMobile ? Math.max(0, Math.floor(chartData.length / 5) -1) : "preserveStartEnd"} // Show fewer ticks on mobile
                 tick={{ fontSize: isMobile ? 10 : 12 }} // Smaller font for mobile ticks
             />
             <YAxis
               type="number"
               domain={['auto', 'auto']}
               tickFormatter={formatYAxisTick}
               tick={{ fontSize: isMobile ? 10 : 12 }} // Smaller font for mobile ticks
               width={isMobile && dynamicYLabelOffset < -35 ? Math.abs(dynamicYLabelOffset) + 10 : undefined} // Explicit width for YAxis if label is very wide on mobile
             >
               <Label
                 value={currentMetricLabel}
                 angle={-90}
                 position="insideLeft"
                 style={{ textAnchor: 'middle', fill: '#f5f5f5', fontSize: isMobile ? '12px': '14px' }}
                 offset={dynamicYLabelOffset}
               />
             </YAxis>
             <Tooltip
                 contentStyle={{ backgroundColor: '#222', color: '#f5f5f5', border: 'none', borderRadius: '4px', fontSize: '12px' }}
                 formatter={(value, name) => {
                     if (value === null || value === undefined) return ['N/A', name];
                     let formattedValue: string;
                     if (typeof value !== 'number' || !isFinite(value)) {
                          formattedValue = String(value);
                     }
                     else if (percentMetrics.has(selectedMetric)) {
                         formattedValue = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
                     } else if (integerMetrics.has(selectedMetric)) {
                         formattedValue = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
                     } else if (selectedMetric === 'weighted_score_index') {
                          formattedValue = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
                     } else {
                         formattedValue = value.toLocaleString('en-US');
                     }
                    return [formattedValue, name];
                 }}
                 labelFormatter={(label: string) => `Date: ${formatDateTick(label)}`} // Use the same formatter
             />
             {/* Hide legend on mobile or use a more compact version if Recharts supports it easily,
                 otherwise, users can rely on tooltips. For simplicity, let's hide it on mobile. */}
             {!isMobile && (
                <Legend
                    layout="horizontal"
                    verticalAlign="top"
                    align="center"
                    wrapperStyle={{ paddingTop: '20px', paddingBottom: '10px', overflowX: 'auto', whiteSpace: 'nowrap' }} // Allow horizontal scroll if needed
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    // Consider a custom legend for mobile if absolutely necessary
                />
             )}

            {displayedProjectTitles.map((title) => {
                 const currentOpacity = lineOpacity[title] !== undefined ? lineOpacity[title] : 1;
                 return (
                    <Line
                        key={title}
                        type="monotone"
                        dataKey={title}
                        stroke={projectColors[title] || '#8884d8'}
                        strokeWidth={isMobile ? 1.5 : 2} // Thinner lines on mobile
                        strokeOpacity={currentOpacity}
                        dot={isMobile ? false : { r: 1 }} // Smaller/no dots on mobile
                        activeDot={{ r: isMobile ? 4 : 6 }}
                        connectNulls={true}
                        name={title}
                        isAnimationActive={!isMobile} // Disable animation on mobile for performance
                    />
                );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Metric Selector Dropdown - Full width on mobile */}
      <div className="flex flex-col sm:flex-row sm:justify-end items-stretch sm:items-center mt-4 mb-6 px-1 sm:pr-4 md:pr-8 gap-2">
          <label htmlFor="metric-select" className="mb-1 sm:mb-0 sm:mr-2 self-start sm:self-center text-sm text-gray-400">Chart Metric:</label>
          <select
              id="metric-select"
              value={selectedMetric}
              onChange={handleMetricChange}
              // Tailwind classes for better mobile appearance
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 w-full sm:w-auto"
              disabled={isLoading}
          >
              {metricOptions.map(option => (
                  <option key={option.value} value={option.value}>
                      {option.label}
                  </option>
              ))}
          </select>
      </div>

      {/* Weighted Score Explanation Section - Adjust text size and padding */}
      <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-600 px-1">
        <h3 className="text-md sm:text-lg font-semibold mb-2 text-gray-200">
          How is weighted score calculated?
        </h3>
        {/* Reduce text size slightly for mobile if needed using sm:text-sm */}
        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
          The Weighted Score is calculated weekly... (rest of your explanation)
          <br/><br/>
          {/* ... ensure all parts of your explanation are readable ... */}
          Primary source for project-to-repo mapping is Electric Capital Crypto Ecosystems {' '}
          <a
            href="https://github.com/electric-capital/crypto-ecosystems"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block align-middle hover:underline" // Added hover:underline
          >
            <Image
              src="/electric_capital_logo_transparent.png"
              alt="Electric Capital Crypto Ecosystems Logo Link"
              width={isMobile ? 200 : 371} // Smaller logo on mobile
              height={isMobile ? 17 : 32} // Maintain aspect ratio
              className="inline-block h-3 sm:h-4 w-auto align-middle" // Adjust size for mobile
            />
          </a>
          <br/><br/>
          Note: the crypto-ecosystems data architecture was up in April 2025. The new architecture more easily allows for aggregating sub-ecosystem repos to top level project. The impact is a big spike in weighted score, and input metric values for top ecosystems, like Ethereum who have a lot of sub-ecosystems. These trends will smooth out over time. 
        </p>
      </div>
      {/* --- END: Weighted Score Explanation Section --- */}
    </div>
  );
};

export default HomePage;