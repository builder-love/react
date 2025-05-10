'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
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
import { Payload as RechartsLegendPayload } from 'recharts/types/component/DefaultLegendContent';
import Image from 'next/image';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

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

    // Ensure window is defined (for SSR/Next.js)
    if (typeof window !== 'undefined') {
      checkScreenSize(); // Initial check
      window.addEventListener('resize', checkScreenSize);
      return () => window.removeEventListener('resize', checkScreenSize);
    }
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

  // --- Initialize lineOpacity state when all projectTitles are loaded ---
  useEffect(() => {
    if (projectTitles.length > 0) {
      const initialOpacity = projectTitles.reduce((acc, title) => {
        acc[title] = 1;
        return acc;
      }, {} as Record<string, number>);
      setLineOpacity(initialOpacity);
      // console.log("Initialized line opacity state for all projects:", initialOpacity);
    }
  }, [projectTitles]); // Dependency on the full list of projectTitles

  // --- Fetch Data ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      // setApiData([]); // Clear previous data if re-fetching, but not projectTitles yet
      // setProjectTitles([]);
      try {
        const response = await fetch('/api/get-top50-project-trends');
        if (!response.ok) {
          let errorDetail = `HTTP error! status: ${response.status}`;
          try {
            const errorData = await response.json();
            errorDetail = errorData.message || errorDetail;
          } catch (_jsonError) { console.error("Failed to parse API error response:", _jsonError); }
          throw new Error(errorDetail);
        }
        const fetchedData: EnhancedTopProjectsTrendsData[] = await response.json();
        if (!Array.isArray(fetchedData)) {
          throw new Error("Invalid data format received from API.");
        }
        setApiData(fetchedData);

        // Set all unique project titles once from the fetched data
        // This list is used for color generation and opacity state keys.
        const uniqueTitles = [...new Set(fetchedData.map(item => item.project_title))].filter(Boolean);
        setProjectTitles(uniqueTitles);

      } catch (err: unknown) {
        let message = 'An unknown error occurred';
        if (err instanceof Error) message = err.message;
        else message = String(err) || message;
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- Determine Ranked Project Titles (for Top 10 selection) ---
  const sortedProjectTitlesByLatestScore = useMemo(() => {
    if (!apiData || apiData.length === 0) {
      return projectTitles; // Fallback to fetched order if no data for ranking
    }

    // Find the latest report date in the dataset
    const latestDate = apiData.reduce((max, p) => (p.report_date > max ? p.report_date : max), apiData[0].report_date);

    // Get projects with their latest weighted_score_index
    const projectsWithScores = projectTitles.map(title => {
      const latestEntryForProject = apiData
        .filter(item => item.project_title === title && item.report_date === latestDate)
        .sort((a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime())[0]; // Should be unique by date

      return {
        title: title,
        score: latestEntryForProject?.weighted_score_index ?? -Infinity, // Default score for sorting if not found
      };
    });

    // Sort by score descending
    projectsWithScores.sort((a, b) => b.score - a.score);

    return projectsWithScores.map(p => p.title);
  }, [apiData, projectTitles]);

  // --- Determine Titles to Render based on device and ranking ---
  const titlesToRender = useMemo(() => {
    if (isMobile) {
      return sortedProjectTitlesByLatestScore.slice(0, 10);
    }
    return sortedProjectTitlesByLatestScore; // Show all (sorted) on desktop
  }, [isMobile, sortedProjectTitlesByLatestScore]);

  // --- Data Transformation for Chart (uses ALL fetched apiData, but chart will only render lines for titlesToRender) ---
  const chartData = useMemo(() => {
    // console.log(`Transforming data for selected metric: ${selectedMetric}`);
    if (!apiData || apiData.length === 0) {
      // console.log("Transformation skipped: apiData is empty.");
      return [];
    }
    const groupedData: Record<string, FormattedLineChartData> = {};
    apiData.forEach(item => {
      const { report_date, project_title } = item;
      let metricValue = item[selectedMetric]; // Dynamic access to selected metric

      // Attempt to convert to number if it's a string that represents a number
      // and ensure it's not an empty string that would become 0
      if (typeof metricValue === 'string' && metricValue.trim() !== '') {
        const num = parseFloat(metricValue);
        metricValue = isNaN(num) ? null : num; // If not a valid number, treat as null
      } else if (typeof metricValue !== 'number') {
        // If it's not a number and not a string we could parse, set to null
        // (handles undefined, empty strings, other non-numeric types)
        metricValue = null;
      }
      // If it was already a number, it remains a number.
      // If it was undefined, it becomes null.

      if (!groupedData[report_date]) {
           groupedData[report_date] = { report_date };
       }
      // Ensure project_title is valid before using as a key
      if (project_title) {
        if (metricValue === undefined) {
             groupedData[report_date][project_title] = null;
        } else {
             groupedData[report_date][project_title] = metricValue;
        }
      }
    });

    // Ensure all *globally known* project titles have an entry for each date,
    // so connectNulls can work correctly even if a project temporarily has no data for the selected metric.
     const allDates = Object.keys(groupedData);
     allDates.forEach(date => {
       projectTitles.forEach(title => { // Iterate over the full list of titles
           if (!(title in groupedData[date])) {
               groupedData[date][title] = null;
           }
       });
     });

    const sortedData = Object.values(groupedData).sort((a, b) =>
      new Date(a.report_date).getTime() - new Date(b.report_date).getTime()
    );
    // console.log("Data transformation complete. Transformed Data Sample:", sortedData.slice(0, 2));
    return sortedData;
  }, [apiData, selectedMetric, projectTitles]); // projectTitles dependency ensures all projects are processed

   // --- Get Current Metric Label for Y-Axis ---
   const currentMetricLabel = useMemo(() => {
    return metricOptions.find(opt => opt.value === selectedMetric)?.label || 'Selected Metric';
  }, [selectedMetric]);

  // Generate colors based on ALL unique project titles to maintain consistency
  const projectColors = useMemo(() => {
    const colors = generateColors(projectTitles.length); // Use full list
    const colorMap = projectTitles.reduce((acc, title, index) => {
        acc[title] = colors[index % colors.length];
        return acc;
    }, {} as Record<string, string>);
    return colorMap;
}, [projectTitles]); // Use full list

  // --- Date Formatting that accomodates mobile ---
  const formatDateTick = useCallback((tickItem: string): string => {
    try {
      const date = new Date(tickItem);
      if (isNaN(date.getTime())) return tickItem;
      if (isMobile) {
        return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' });
      }
      const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
      const day = date.getUTCDate().toString().padStart(2, '0');
      const year = date.getUTCFullYear();
      return `${month}-${day}-${year}`;
    } catch (_e) { console.error("Error formatting date tick:", tickItem, _e); return tickItem; }
  }, [isMobile]);

  // --- LEGEND HOVER HANDLERS ---
  const handleMouseEnter = useCallback(
    (data: RechartsLegendPayload, _index: number /*, event: React.MouseEvent<SVGElement> */) => {
      // The 'data' object here is the one from Recharts Legend payload.
      // It should have a 'dataKey' property.
      const dataKey = data.dataKey ? String(data.dataKey) : null;
  
      if (dataKey) {
        setLineOpacity(prev => {
          const newOpacity = { ...prev };
          Object.keys(newOpacity).forEach(k => {
            newOpacity[k] = k === dataKey ? 1 : 0.2;
          });
          return newOpacity;
        });
      }
    },
    []
  );
  
  const handleMouseLeave = useCallback(
    (_data: RechartsLegendPayload, _index: number /*, event: React.MouseEvent<SVGElement> */) => {
      // We don't use data, index, or event here but include them for type compatibility
      setLineOpacity(prev => {
        const newOpacity = { ...prev };
        Object.keys(newOpacity).forEach(k => {
          newOpacity[k] = 1;
        });
        return newOpacity;
      });
    },
    []
  );
  

   // --- CSV Download Handler (Updated to use selected metric label) ---
   const handleDownloadCSV = useCallback(() => {
    if (!chartData || chartData.length === 0 || !titlesToRender || titlesToRender.length === 0) { // Use titlesToRender for check
        alert("No data available to download.");
        return;
    }
    const sanitizeForCSV = (value: string | number | null | undefined): string => {
        let strValue = String(value ?? '');
        if (['=', '+', '-', '@'].some(char => strValue.startsWith(char))) strValue = `'${strValue}`;
        strValue = strValue.replace(/"/g, '""');
        if (strValue.includes(',') || strValue.includes('\n') || strValue.includes('"')) strValue = `"${strValue}"`;
        return strValue;
    };
    const currentMetricHeader = selectedMetric;
    const headers = ['report_date', 'project_title', currentMetricHeader].join(',');
    const dataRows: string[] = [];
    chartData.forEach(row => {
        const reportDate = row.report_date;
        titlesToRender.forEach(projectTitle => { // Iterate over titlesToRender for CSV
            const score = row[projectTitle];
            const csvRow = [
                sanitizeForCSV(reportDate),
                sanitizeForCSV(projectTitle),
                sanitizeForCSV(score)
            ].join(',');
            dataRows.push(csvRow);
        });
    });
    const csvContent = [headers, ...dataRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        const dateStamp = new Date().toISOString().split('T')[0];
        const filename = `project_trends_${selectedMetric}_${dateStamp}.csv`;
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } else {
        alert("CSV download failed.");
    }
}, [chartData, titlesToRender, selectedMetric]); // Use titlesToRender

  // --- Dropdown Change Handler ---
  const handleMetricChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedMetric(event.target.value);
}, []);

  // --- Dynamic Y-Axis Tick Formatter ---
  const formatYAxisTick = useCallback((value: unknown): string => {
    if (typeof value !== 'number' || !isFinite(value)) return value !== undefined && value !== null ? String(value) : '';
    if (percentMetrics.has(selectedMetric)) return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
    if (integerMetrics.has(selectedMetric)) return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
    if (selectedMetric === 'weighted_score_index') return new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
    return value.toLocaleString ? value.toLocaleString('en-US') : String(value);
  }, [selectedMetric]);

  const { maxValue, minValue } = useMemo(() => {
    if (!chartData || chartData.length === 0 || !titlesToRender || titlesToRender.length === 0) return { maxValue: 0, minValue: 0 };
    let maxVal = -Infinity; let minVal = Infinity;
    chartData.forEach(row => {
        titlesToRender.forEach(title => { // Use titlesToRender for calc
            const value = row[title];
            if (typeof value === 'number' && isFinite(value)) {
                if (value > maxVal) maxVal = value;
                if (value < minVal) minVal = value;
            }
        });
    });
    return { maxValue: maxVal === -Infinity ? 0 : maxVal, minValue: minVal === Infinity ? 0 : minVal };
  }, [chartData, titlesToRender]); // Use titlesToRender

  // --- Dynamic Y-Label Offset that accomodates mobile ---
  const dynamicYLabelOffset = useMemo(() => {
    console.log('[dynamicYLabelOffset] Inputs:', { maxValue, minValue, selectedMetric, isMobile });
  
    const baseDesktopOffset = -35; const baseMobileOffset = -25;
    let offset = isMobile ? baseMobileOffset : baseDesktopOffset;
    console.log('[dynamicYLabelOffset] Initial offset:', offset);
  
    const isPercent = percentMetrics.has(selectedMetric);
    console.log('[dynamicYLabelOffset] isPercent:', isPercent);
  
    if (isPercent) {
        const maxFormatted = formatYAxisTick(maxValue);
        const minFormatted = formatYAxisTick(minValue);
        console.log('[dynamicYLabelOffset] Percent metrics - maxFormatted:', maxFormatted, 'minFormatted:', minFormatted);
        if (maxFormatted.length > 7 || minFormatted.length > 7) {
            offset -= isMobile ? 15 : 20;
        } else {
            offset -= isMobile ? 10 : 15;
        }
    } else {
        let formattedMaxMagnitude: string;
        if (integerMetrics.has(selectedMetric)) {
            formattedMaxMagnitude = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(maxValue);
        } else if (selectedMetric === 'weighted_score_index') {
            formattedMaxMagnitude = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(maxValue);
        } else {
            // Ensure maxValue is a number before calling toLocaleString if it could be something else
            formattedMaxMagnitude = typeof maxValue === 'number' ? maxValue.toLocaleString('en-US') : String(maxValue);
        }
        console.log('[dynamicYLabelOffset] Non-percent - formattedMaxMagnitude:', formattedMaxMagnitude);
  
        const numDigits = formattedMaxMagnitude.replace(/[^0-9]/g, '').length;
        console.log('[dynamicYLabelOffset] Non-percent - numDigits:', numDigits);
  
        if (numDigits < 4) { /* offset remains base */ }
        else if (numDigits < 7) offset -= (isMobile ? 10 : 15);
        else if (numDigits < 10) offset -= (isMobile ? 15 : 25);
        else offset -= (isMobile ? 20 : 30);
    }
    console.log('[dynamicYLabelOffset] Final offset:', offset);
    return offset;
  }, [maxValue, minValue, selectedMetric, formatYAxisTick, isMobile]);

   // --- Render Logic ---
   if (isLoading) return <div className="text-center p-4 md:p-10">Loading data...</div>;
   if (error) return <div className="text-center p-4 md:p-10 text-red-500">Error: {error}</div>;
 
   const noDataForChart = !chartData || chartData.length === 0;
   const noProjectsToDisplay = !titlesToRender || titlesToRender.length === 0;
 
   if (noDataForChart && noProjectsToDisplay) return <div className="text-center p-4 md:p-10">No data available to display the chart.</div>;
   if (noProjectsToDisplay) return <div className="text-center p-4 md:p-10">Data loaded, but no projects found to display.</div>;
   if (noDataForChart) {
     if (selectedMetric !== metricOptions[0].value) return <div className="text-center p-4 md:p-10">No data for: {currentMetricLabel}.</div>;
     return <div className="text-center p-4 md:p-10">No time-series data found for selected projects.</div>;
   }

  // --- ADJUST NUMBER OF projectTitles LINES FOR MOBILE ---
  // top 10) on mobile for clarity.
  // filter projectTitles here based on isMobile.
  const yAxisWidthValue = isMobile && dynamicYLabelOffset < -35 ? Math.abs(dynamicYLabelOffset) + 15 : undefined;
  console.log('[YAxis Width Debug] isMobile:', isMobile, 'dynamicYLabelOffset:', dynamicYLabelOffset, 'Calculated YAxis Width:', yAxisWidthValue);


  return (
    <div className="p-2 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full mb-4 md:mb-6">
         <h2 className="text-xl sm:text-2xl font-bold text-center sm:text-left">
            {isMobile ? "Top 10 Blockchain Projects" : "Top Blockchain Projects"}
            { !isMobile && " by Development Activity" }
          </h2>
         <button
           onClick={handleDownloadCSV}
           disabled={noDataForChart || noProjectsToDisplay}
           className={`w-full sm:w-auto px-3 py-2 sm:px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-150 ease-in-out ${ (noDataForChart || noProjectsToDisplay) ? 'opacity-50 cursor-not-allowed' : '' }`}
         >
            {isMobile ? "Download CSV" : "Download Chart Data"}
         </button>
      </div>

       <div className="w-full">
         <ResponsiveContainer width="100%" height={isMobile ? 400 : 600}>
           <LineChart
             data={chartData}
            margin={{ top: 5, right: isMobile ? 10 : 30, left: isMobile ? 5 : dynamicYLabelOffset < -40 ? 70 : 60, bottom: isMobile ? 70 : 50 }}
           >
             <CartesianGrid strokeDasharray="3 3" stroke="#555" />
             <XAxis
                 dataKey="report_date" type="category" tickFormatter={formatDateTick}
                 angle={isMobile ? -60 : -45} textAnchor="end"
                 height={isMobile ? 80 : 60}
                 interval={isMobile ? Math.max(0, Math.floor(chartData.length / (chartData.length > 10 ? 5: 3) ) -1) : "preserveStartEnd"} // Fewer ticks on mobile, ensure at least a few.
                 tick={{ fontSize: isMobile ? 9 : 12 }} // smaller font for mobile XAxis ticks
             />
              <YAxis
                type="number" domain={['auto', 'auto']} tickFormatter={formatYAxisTick}
                tick={{ fontSize: isMobile ? 10 : 12 }}
              >
                <Label
                  value={currentMetricLabel} angle={-90} position="insideLeft"
                  style={{ textAnchor: 'middle', fill: '#f5f5f5', fontSize: isMobile ? '11px': '14px' }}
                  offset={dynamicYLabelOffset}
                />
              </YAxis>
             <Tooltip
                 contentStyle={{ backgroundColor: '#222', color: '#f5f5f5', border: 'none', borderRadius: '4px', fontSize: isMobile ? '11px': '12px' }}
                 formatter={(
                    value: ValueType, // Value of the data point
                    name: NameType,   // Name of the data series (project_title)
                    // props is one item from the Tooltip's payload array
                    // Each item in this array typically has a 'color' property
                    itemPayload: { color?: string; payload?: unknown /* other properties */ }
                 ) => {
                     let formattedValue: string;
                     const valueNum = Number(value);

                     if (value === null || value === undefined) { // Handle nulls explicitly first
                        return [<span key={`${String(name)}-tooltip-value`} style={{ color: itemPayload.color || '#ccc' }}>N/A</span>, name];
                     }

                     if (typeof valueNum !== 'number' || !isFinite(valueNum)) {
                         formattedValue = String(value);
                     } else if (percentMetrics.has(selectedMetric)) {
                         formattedValue = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(valueNum);
                     } else if (integerMetrics.has(selectedMetric)) {
                         formattedValue = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(valueNum);
                     } else if (selectedMetric === 'weighted_score_index') {
                         formattedValue = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(valueNum);
                     } else {
                         formattedValue = valueNum.toLocaleString ? valueNum.toLocaleString('en-US') : String(valueNum);
                     }

                     // Use itemPayload.color directly
                     const color = itemPayload.color || '#8884d8'; // Fallback color if needed

                     return [
                        <span key={`${String(name)}-tooltip-value`} style={{ color: color }}>{formattedValue}</span>,
                        name
                     ];
                 }}
                 labelFormatter={(label: string) => `Date: ${formatDateTick(label)}`}
             />
            {/* Show legend on desktop, but only for titlesToRender if you want it to match the chart */}
             {!isMobile && (
                <Legend
                    layout="horizontal" verticalAlign="top" align="center"
                    wrapperStyle={{ paddingTop: '20px', paddingBottom: '10px', overflowX: 'auto', whiteSpace: 'nowrap', maxWidth: '100%'}}
                    onMouseEnter={handleMouseEnter} // Recharts type issue with MouseEvent vs React.MouseEvent
                    onMouseLeave={handleMouseLeave}
                    payload={titlesToRender.map(title => ({ // Ensure legend matches rendered lines
                        value: title,
                        type: "line",
                        id: title,
                        color: projectColors[title] || '#8884d8',
                        dataKey: title // Important for hover effects to work
                    }))}
                />
             )}

            {titlesToRender.map((title) => { // Iterate over titlesToRender
                 const currentOpacity = lineOpacity[title] !== undefined ? lineOpacity[title] : 1;
                 return (
                    <Line
                        key={title} type="monotone" dataKey={title}
                        stroke={projectColors[title] || '#8884d8'}
                        strokeWidth={isMobile ? 1.5 : 2}
                        strokeOpacity={currentOpacity}
                        dot={isMobile ? false : { r: 1, strokeWidth: 1 }}
                        activeDot={{ r: isMobile ? 4 : 6 }}
                        connectNulls={true} name={title}
                        isAnimationActive={!isMobile}
                    />
                );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-end items-stretch sm:items-center mt-4 mb-6 px-1 sm:pr-4 md:pr-8 gap-2">
          <label htmlFor="metric-select" className="mb-1 sm:mb-0 sm:mr-2 self-start sm:self-center text-sm text-gray-400">Chart Metric:</label>
          <select
              id="metric-select" value={selectedMetric} onChange={handleMetricChange}
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 w-full sm:w-auto"
              disabled={isLoading}
          >
              {metricOptions.map(option => (
                  <option key={option.value} value={option.value}> {option.label} </option>
              ))}
          </select>
      </div>

      <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-600 px-1">
        <h3 className="text-md sm:text-lg font-semibold mb-2 text-gray-200">
          How is weighted score calculated?
        </h3>
        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
          The Weighted Score is calculated weekly to rank blockchain projects based on GitHub development activity and community engagement metrics. Here&apos;s the process:
          <br/><br/>
          1. Data Collection: Gathers both all-time counts and recent (4-week percentage) changes for repo-specific key metrics like Commits, Forks, Stargazers, Contributors, and Watchers. It also includes an originality metric.
          <br/><br/>
          2. Any missing values are filled from the previous non-missing value. This is why sometimes the trend apears to be flat.
          <br/><br/>
          3. Repo metrics are rolled up to the project level. Some projects, like Ethereum have many sub-ecosystems.
          <br/><br/>
          4. Normalization: For each metric, every project&apos;s value is compared to all other projects within the same week and scaled to a value between 0 and 1.
          <br/><br/>
          5. Weighting: These normalized scores are multiplied by specific weights:
          <div className="pl-4">
            - Major All-Time Metrics (12.5% each): Commits, Forks, Stars, Contributors.
          </div>
          <div className="pl-4">
            - Major Recent Change Metrics (10% each): 4-week change in Commits, Forks, Stars, Contributors.
          </div>
          <div className="pl-4 mb-2">
            - Minor Metrics (2.5% each): All-time Watchers, All-time Originality Ratio, 4-week change in Watchers, 4-week change in Originality Ratio.
          </div>
          6. Summation: The weighted, normalized scores for all metrics are added together to get a final weighted_score between 0 and 1.
          <br/><br/>
          7. Index Conversion: The &quot;Weighted Score Index&quot; shown in the chart is simply this weighted_score multiplied by 100.
          <br/><br/>
          Primary source for project-to-repo mapping is Electric Capital Crypto Ecosystems {' '}
          <a
            href="https://github.com/electric-capital/crypto-ecosystems" target="_blank" rel="noopener noreferrer"
            className="inline-block align-middle hover:underline"
          >
            <Image
              src="/electric_capital_logo_transparent.png" alt="Electric Capital Crypto Ecosystems Logo Link"
              width={isMobile ? 200 : 371} height={isMobile ? 17 : 32}
              className="inline-block h-3 sm:h-4 w-auto align-middle"
            />
          </a>
          <br/><br/>
          Note: the crypto-ecosystems data architecture was up in April 2025. The new architecture more easily allows for aggregating sub-ecosystem repos to top level project. The impact is a big spike in weighted score, and input metric values for top ecosystems, like Ethereum who have a lot of sub-ecosystems. These trends will smooth out over time.
        </p>
      </div>
    </div>
  );
};

export default HomePage;