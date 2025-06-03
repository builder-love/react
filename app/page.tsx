// app/page.tsx

'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  ChangeEvent
} from 'react';
import Image from 'next/image';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
} from 'recharts';
import type { Payload } from 'recharts/types/component/DefaultTooltipContent';
import chroma from 'chroma-js';
import type { EnhancedTopProjectsTrendsData, FormattedLineChartData } from './types';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import ProjectLegendCheckboxes from './utilities/LegendCheckboxes';

// --- Define Metric Options ---
const metricOptions = [
  { label: 'Weighted Score Index', value: 'weighted_score_index' },
  { label: 'Commit Count', value: 'commit_count' },
  { label: 'Repo Count', value: 'repo_count' },
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
  'repo_count',
  'fork_count',
  'stargaze_count',
  'contributor_count',
  'watcher_count'
]);

const generateColors = (count: number): string[] => {
  if (count === 0) return [];
  const colors: string[] = [];
  const saturation = 0.75;
  const lightness = 0.5;
  for (let i = 0; i < count; i++) {
    const hue = (i * (360 / count)) % 360;
    colors.push(chroma.hsl(hue, saturation, lightness).hex());
  }
  return colors;
};

const useIsMobile = (breakpoint = 768): boolean => {
  const [isMobileView, setIsMobileView] = useState(false);
  useEffect(() => {
    const checkScreenSize = () => setIsMobileView(window.innerWidth < breakpoint);
    if (typeof window !== 'undefined') {
      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, [breakpoint]);
  return isMobileView;
};

const Page: React.FC = () => {
  const [apiData, setApiData] = useState<EnhancedTopProjectsTrendsData[]>([]);
  const [projectTitles, setProjectTitles] = useState<string[]>([]); // All unique project titles from API
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lineOpacity, setLineOpacity] = useState<Record<string, number>>({});
  const [selectedMetric, setSelectedMetric] = useState<string>(metricOptions[0].value);
  const isMobile = useIsMobile();
  const [visibleProjects, setVisibleProjects] = useState<Set<string>>(new Set());
  const [topNFilter, setTopNFilter] = useState<number>(10); // State for Top N filter, default 25

  useEffect(() => {
    if (projectTitles.length > 0) {
      const initialOpacity = projectTitles.reduce((acc, title) => {
        acc[title] = 1; return acc;
      }, {} as Record<string, number>);
      setLineOpacity(initialOpacity);
    }
  }, [projectTitles]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/get-top50-project-trends');
        if (!response.ok) {
          let errorDetail = `HTTP error! status: ${response.status}`;
          try { const errorData = await response.json(); errorDetail = errorData.message || errorDetail; }
          catch (_jsonError) { console.error("Failed to parse API error response:", _jsonError); }
          throw new Error(errorDetail);
        }
        const fetchedData: EnhancedTopProjectsTrendsData[] = await response.json();
        if (!Array.isArray(fetchedData)) throw new Error("Invalid data format received from API.");
        setApiData(fetchedData);
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

  // Define the sorter function for tooltip items
  const tooltipItemSorter = (item: Payload<ValueType, NameType>): number => {
    const value = Number(item.value);
    return typeof value === 'number' && isFinite(value) ? -value : 0; // Negative for descending order
  };

  const sortedProjectTitlesByLatestScore = useMemo(() => {
    if (!apiData || apiData.length === 0) return []; // Return empty array if no data
    const latestDate = apiData.reduce((max, p) => (p.report_date > max ? p.report_date : max), apiData[0]?.report_date || '');
    if (!latestDate) return projectTitles; // Fallback to unsorted if no date

    const projectsWithScores = projectTitles.map(title => {
      const latestEntryForProject = apiData
        .filter(item => item.project_title === title && item.report_date === latestDate)
        .sort((a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime())[0];
      return { title: title, score: latestEntryForProject?.weighted_score_index ?? -Infinity };
    });
    projectsWithScores.sort((a, b) => b.score - a.score);
    return projectsWithScores.map(p => p.title);
  }, [apiData, projectTitles]);

  const topNFilteredTitles = useMemo(() => {
    return sortedProjectTitlesByLatestScore.slice(0, topNFilter);
  }, [sortedProjectTitlesByLatestScore, topNFilter]);

  const currentDisplayableTitles = useMemo(() => {
    // Show all topNFilteredTitles.
    // this used to limit mobile to 10 items
    return topNFilteredTitles;;
  }, [topNFilteredTitles]);

  useEffect(() => {
    // Initialize visibleProjects based on what's currently displayable in the legend.
    // This ensures all items in the new list are selected when topNFilter or mobile status changes.
    setVisibleProjects(new Set(currentDisplayableTitles));
  }, [currentDisplayableTitles]);

  const chartData = useMemo(() => {
    if (!apiData || apiData.length === 0) return [];
    const groupedData: Record<string, FormattedLineChartData> = {};
    apiData.forEach(item => {
      const { report_date, project_title } = item;
      let metricValue = item[selectedMetric];
      if (typeof metricValue === 'string' && metricValue.trim() !== '') {
        const num = parseFloat(metricValue);
        metricValue = isNaN(num) ? null : num;
      } else if (typeof metricValue !== 'number') {
        metricValue = null;
      }
      if (!groupedData[report_date]) groupedData[report_date] = { report_date };
      if (project_title) {
        groupedData[report_date][project_title] = metricValue === undefined ? null : metricValue;
      }
    });
    const allDates = Object.keys(groupedData);
    // Use all known project titles (from the initial full list) to ensure all potential keys are present
    const allFetchedProjectTitles = [...new Set(apiData.map(item => item.project_title))].filter(Boolean);
    allDates.forEach(date => {
      allFetchedProjectTitles.forEach(title => {
        if (!(title in groupedData[date])) groupedData[date][title] = null;
      });
    });
    return Object.values(groupedData).sort((a, b) =>
      new Date(a.report_date).getTime() - new Date(b.report_date).getTime()
    );
  }, [apiData, selectedMetric]); // Removed projectTitles dependency, relies on apiData for all titles.

  const currentMetricLabel = useMemo(() => {
    return metricOptions.find(opt => opt.value === selectedMetric)?.label || 'Selected Metric';
  }, [selectedMetric]);

  const projectColors = useMemo(() => {
    // Generate colors for ALL originally fetched project titles to maintain consistency
    const colors = generateColors(projectTitles.length);
    return projectTitles.reduce((acc, title, index) => {
      acc[title] = colors[index % colors.length]; return acc;
    }, {} as Record<string, string>);
  }, [projectTitles]);

  const formatDateTick = useCallback((tickItem: string): string => {
    try {
      const date = new Date(tickItem);
      if (isNaN(date.getTime())) return tickItem;
      if (isMobile) return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' });
      const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
      const day = date.getUTCDate().toString().padStart(2, '0');
      const year = date.getUTCFullYear();
      return `${month}-${day}-${year}`;
    } catch (_e) {
      console.error("Error formatting date tick:", _e);
      return tickItem;
    }
  }, [isMobile]);

  const handleLegendItemMouseEnter = useCallback((hoveredTitle: string) => {
    if (!visibleProjects.has(hoveredTitle)) return;
    setLineOpacity(_currentOpacities => {
      const newOpacities: Record<string, number> = {};
      projectTitles.forEach(title => { // Iterate over all project titles
        if (visibleProjects.has(title)) {
            newOpacities[title] = title === hoveredTitle ? 1 : 0.2;
        } else {
            newOpacities[title] = 1;
        }
      });
      return newOpacities;
    });
  }, [projectTitles, visibleProjects]);


  const handleLegendItemMouseLeave = useCallback(() => {
    setLineOpacity(_currentOpacities => {
      const newOpacities: Record<string, number> = {};
      projectTitles.forEach(title => newOpacities[title] = 1);
      return newOpacities;
    });
  }, [projectTitles]);


  const handleToggleProject = useCallback((projectTitle: string) => {
    setVisibleProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectTitle)) newSet.delete(projectTitle);
      else newSet.add(projectTitle);
      return newSet;
    });
  }, []);

  const handleSelectAllProjects = useCallback(() => {
    // Selects all projects currently displayable in the legend
    setVisibleProjects(new Set(currentDisplayableTitles));
  }, [currentDisplayableTitles]);

  const handleClearAllProjects = useCallback(() => {
    setVisibleProjects(new Set());
  }, []);

  const titlesToActuallyPlot = useMemo(() => {
    // Filter based on currentDisplayableTitles (respects Top N and mobile) AND visibleProjects (checkbox state)
    return currentDisplayableTitles.filter(title => visibleProjects.has(title));
  }, [currentDisplayableTitles, visibleProjects]);

  const handleDownloadCSV = useCallback(() => {
    if (!chartData || chartData.length === 0 || !titlesToActuallyPlot || titlesToActuallyPlot.length === 0) {
      alert("No data available to download for the selected projects."); return;
    }
    const sanitize = (val: string | number | null | undefined): string => {
      let str = String(val ?? '');
      if (['=', '+', '-', '@'].some(char => str.startsWith(char))) str = `'${str}`;
      str = str.replace(/"/g, '""');
      if (str.includes(',') || str.includes('\n') || str.includes('"')) str = `"${str}"`;
      return str;
    };
    const headers = ['report_date', 'project_title', selectedMetric].join(',');
    const rows = chartData.flatMap(row =>
      titlesToActuallyPlot.map(title => {
        return [sanitize(row.report_date), sanitize(title), sanitize(row[title])].join(',');
      })
    );
    if (rows.length === 0) {
        alert("No data points for the selected projects and metric to download.");
        return;
    }
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `project_trends_${selectedMetric}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [chartData, titlesToActuallyPlot, selectedMetric]);

  const handleMetricChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedMetric(event.target.value);
  }, []);

  const formatYAxisTick = useCallback((value: unknown): string => {
    if (typeof value !== 'number' || !isFinite(value)) return String(value ?? '');
    if (percentMetrics.has(selectedMetric)) return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
    if (integerMetrics.has(selectedMetric)) return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
    if (selectedMetric === 'weighted_score_index') return new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
    return value.toLocaleString('en-US');
  }, [selectedMetric]);

  const { maxValue, minValue } = useMemo(() => {
    if (!chartData || chartData.length === 0 || titlesToActuallyPlot.length === 0) {
      return { maxValue: 1, minValue: 0 };
    }
    let maxVal = -Infinity, minVal = Infinity;
    let hasNumericData = false;
    chartData.forEach(row => {
      titlesToActuallyPlot.forEach(title => {
        const val = row[title];
        if (typeof val === 'number' && isFinite(val)) {
          if (val > maxVal) maxVal = val;
          if (val < minVal) minVal = val;
          hasNumericData = true;
        }
      });
    });

    if (!hasNumericData) return { maxValue: 1, minValue: 0 };

    if (maxVal === minVal) {
      const buffer = percentMetrics.has(selectedMetric) ? 0.01 : Math.max(1, Math.abs(maxVal * 0.1));
      return { maxValue: maxVal + buffer, minValue: minVal - buffer };
    }
    const range = maxVal - minVal;
    const padding = percentMetrics.has(selectedMetric) ? 0 : Math.max(range * 0.05, Math.abs(maxVal * 0.01), Math.abs(minVal * 0.01), 0.1);

    return {
        maxValue: maxVal + padding,
        minValue: minVal - padding < 0 && minVal >= 0 && !percentMetrics.has(selectedMetric) ? 0 : minVal - padding
    };
  }, [chartData, titlesToActuallyPlot, selectedMetric]);

  const dynamicYLabelOffset = useMemo(() => {
    const baseDesktopOffset = -35, baseMobileOffset = -25;
    let offset = isMobile ? baseMobileOffset : baseDesktopOffset;
    const isPercent = percentMetrics.has(selectedMetric);
    let representativeValueForLengthCheck = maxValue;
    if (isPercent && maxValue > 1) representativeValueForLengthCheck = 1;
    else if (isPercent && maxValue === 0 && minValue === 0) representativeValueForLengthCheck = 0;

    if (isPercent) {
      const formattedTick = formatYAxisTick(representativeValueForLengthCheck);
      if (formattedTick.length > 6 ) offset -= isMobile ? 10 : 15;
      else offset -= isMobile ? 5 : 10;
    } else {
      const formattedTick = formatYAxisTick(representativeValueForLengthCheck);
      const numChars = formattedTick.replace(/[^0-9.,-]/g, '').length;
      if (numChars < 4) { /* base */ }
      else if (numChars < 7) offset -= (isMobile ? 8 : 12);
      else if (numChars < 10) offset -= (isMobile ? 12 : 20);
      else offset -= (isMobile ? 15 : 25);
    }
    return offset;
  }, [maxValue, minValue, selectedMetric, formatYAxisTick, isMobile]);

  if (isLoading) return <div className="flex justify-center items-center h-screen"><div className="text-center p-4 md:p-10">Loading data...</div></div>;
  if (error) return <div className="flex justify-center items-center h-screen"><div className="text-center p-4 md:p-10 text-red-500">Error: {error}</div></div>;

  const noDataForSelectedMetric = chartData.length === 0;
  const noProjectsFetched = projectTitles.length === 0 && !isLoading;
  const noProjectsSelectedForPlotting = titlesToActuallyPlot.length === 0;

  if (noProjectsFetched) {
    return <div className="flex justify-center items-center h-screen"><div className="text-center p-4 md:p-10">No projects found to display.</div></div>;
  }

  const chartMainTitle = `Top ${topNFilter} Blockchain Projects`;

  // Condition for when no data is available for the selected metric
  if (noDataForSelectedMetric && !isLoading && projectTitles.length > 0) { // Added projectTitles.length > 0 to ensure legend controls show if projects exist
    return (
        <div className="p-2 sm:p-4 md:p-6">
            {/* Header: Title ONLY */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full mb-4 md:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-center sm:text-left">
                    {chartMainTitle}
                    {!isMobile && " by Development Activity"}
                </h2>
                {/* Download button removed from here */}
            </div>

            {/* Legend Checkboxes and Top N Filter */}
            {projectTitles.length > 0 && (
                <ProjectLegendCheckboxes
                  displayableProjectTitles={currentDisplayableTitles}
                  visibleProjects={visibleProjects}
                  onToggleProject={handleToggleProject}
                  projectColors={projectColors}
                  onItemMouseEnter={handleLegendItemMouseEnter}
                  onItemMouseLeave={handleLegendItemMouseLeave}
                  onSelectAll={handleSelectAllProjects}
                  onClearAll={handleClearAllProjects}
                  topNFilter={topNFilter}
                  onTopNFilterChange={setTopNFilter}
                  maxColumnCount={isMobile ? 2 : 7}
                  isMobile={isMobile}
                />
            )}

            {/* No Data Message for Chart Area */}
            <div className="flex justify-center items-center text-gray-400" style={{ height: isMobile ? '400px' : '600px', minHeight: '300px' }}>
                <p className="text-xl">No data available for: {currentMetricLabel}.</p>
            </div>

            {/* Controls below chart: Download Button (left) & Metric Selector (right) */}
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 mb-6 gap-4 sm:gap-2 px-1">
              {/* Download Button */}
              <button
                onClick={handleDownloadCSV}
                disabled={true} // Always disabled in this specific no-data-for-metric view
                className={`w-full sm:w-auto px-3 py-2 sm:px-4 bg-blue-600 text-white rounded opacity-50 cursor-not-allowed`}
              >
                {isMobile ? "Download CSV" : "Download Chart Data"}
              </button>

              {/* Metric Selector */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
                <label htmlFor="metric-select-bottom" className="hidden sm:inline text-sm text-gray-400">Chart Metric:</label>
                <select
                  id="metric-select-bottom"
                  value={selectedMetric}
                  onChange={handleMetricChange}
                  className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 sm:min-w-[200px] md:min-w-[250px]"
                  disabled={isLoading || noProjectsFetched} // Keep this disable logic
                >
                  {metricOptions.map(option => (
                    <option key={option.value} value={option.value}> {option.label} </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Explanation Section */}
            <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-600 px-1">
                <h3 className="text-md sm:text-lg font-semibold mb-2 text-gray-200">How is weighted score calculated?</h3>
                {/* ... p content ... */}
            </div>
        </div>
    );
  }

  // Main return when data is available for plotting (or no projects are selected for plotting)
  return (
    <div className="p-2 sm:p-4 md:p-6">
      {/* Header: Title ONLY */}
      <div className="flex flex-col sm:flex-row justify-start items-center gap-4 w-full mb-4 md:mb-6"> {/* Changed to justify-start */}
        <h2 className="text-xl sm:text-2xl font-bold text-center sm:text-left">
          {chartMainTitle}
          {!isMobile && " by Development Activity"}
        </h2>
      </div>

      {projectTitles.length > 0 && (
        <ProjectLegendCheckboxes
          displayableProjectTitles={currentDisplayableTitles}
          visibleProjects={visibleProjects}
          onToggleProject={handleToggleProject}
          projectColors={projectColors}
          onItemMouseEnter={handleLegendItemMouseEnter}
          onItemMouseLeave={handleLegendItemMouseLeave}
          onSelectAll={handleSelectAllProjects}
          onClearAll={handleClearAllProjects}
          topNFilter={topNFilter}
          onTopNFilterChange={setTopNFilter}
          maxColumnCount={isMobile ? 2 : 7}
          isMobile={isMobile}
        />
      )}

      <div className="w-full">
        {noProjectsSelectedForPlotting && !noDataForSelectedMetric ? (
          <div
            className="flex items-center justify-center text-gray-500"
            style={{ height: isMobile ? '400px' : '600px', minHeight: '300px' }}
          >
            <p className="text-2xl">fight FUD, with love</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={isMobile ? 400 : 500}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: isMobile ? 10 : 30, left: isMobile ? 5 : Math.abs(dynamicYLabelOffset) + (isMobile ? 15 : 25) , bottom: isMobile ? 70 : 35 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#555" />
              <XAxis
                dataKey="report_date" type="category" tickFormatter={formatDateTick}
                angle={isMobile ? -60 : -45} textAnchor="end"
                height={isMobile ? 80 : 50}
                interval={isMobile ? Math.max(0, Math.floor(chartData.length / (isMobile && chartData.length > 10 ? 5 : 3)) -1) : "preserveStartEnd"}
                tick={{ fontSize: isMobile ? 9 : 12 }}
              />
              <YAxis
                type="number"
                domain={[minValue, maxValue]}
                allowDataOverflow={false}
                tickFormatter={formatYAxisTick}
                tick={{ fontSize: isMobile ? 10 : 12 }}
              >
                <Label
                  value={currentMetricLabel} angle={-90} position="insideLeft"
                  style={{ textAnchor: 'middle', fill: '#f5f5f5', fontSize: isMobile ? '11px' : '14px' }}
                  offset={dynamicYLabelOffset}
                />
              </YAxis>
              <Tooltip
                contentStyle={{ backgroundColor: '#222', color: '#f5f5f5', border: 'none', borderRadius: '4px', fontSize: isMobile ? '11px' : '12px' }}
                formatter={(
                  value: ValueType,
                  name: NameType,
                  itemPayload: { color?: string; payload?: FormattedLineChartData }
                ) => {
                    if (!visibleProjects.has(String(name))) {
                        return null;
                    }
                    let fValue: string;
                    const vNum = Number(value); // value here is item.value from the tooltip payload
                    if (value === null || value === undefined || (typeof vNum === 'number' && !isFinite(vNum)) ) { // Check for non-finite numbers too
                        return [<span key={`${String(name)}-val`} style={{color: itemPayload?.color || '#ccc'}}>N/A</span>, name];
                    }
                    // No need to check typeof vNum !== 'number' again if already handled
                    if (percentMetrics.has(selectedMetric)) fValue = new Intl.NumberFormat('en-US', {style:'percent', minimumFractionDigits:1, maximumFractionDigits:1}).format(vNum);
                    else if (integerMetrics.has(selectedMetric)) fValue = new Intl.NumberFormat('en-US', {maximumFractionDigits:0}).format(vNum);
                    else if (selectedMetric === 'weighted_score_index') fValue = new Intl.NumberFormat('en-US', {minimumFractionDigits:1, maximumFractionDigits:1}).format(vNum);
                    else fValue = vNum.toLocaleString ? vNum.toLocaleString('en-US') : String(vNum);
                    return [<span key={`${String(name)}-val`} style={{color: itemPayload?.color || '#8884d8'}}>{fValue}</span>, name];
                  }
                }
                labelFormatter={(label: string) => `Date: ${formatDateTick(label)}`}
                // ADD THESE TWO PROPS:
                itemSorter={tooltipItemSorter}
                filterNull={false} // Ensures items with null values are passed to sorter and formatter
              />
              {titlesToActuallyPlot.map((title) => (
                <Line
                  key={title} type="monotone" dataKey={title}
                  stroke={projectColors[title] || '#8884d8'}
                  strokeWidth={isMobile ? 1.5 : 2}
                  strokeOpacity={lineOpacity[title] ?? 1}
                  dot={isMobile ? false : { r: 1, strokeWidth: 1 }}
                  activeDot={{ r: isMobile ? 4 : 6 }}
                  connectNulls={true} name={title}
                  isAnimationActive={!isMobile}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Controls below chart: Download Button (left) & Metric Selector (right) */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 mb-6 gap-4 sm:gap-2 px-1">
        {/* Download Button */}
        <button
          onClick={handleDownloadCSV}
          disabled={noProjectsSelectedForPlotting || chartData.length === 0} // Simplified and robust disabled condition
          className={`w-full sm:w-auto px-3 py-2 sm:px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-150 ease-in-out ${
            (noProjectsSelectedForPlotting || chartData.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isMobile ? "Download CSV" : "Download Chart Data"}
        </button>

        {/* Metric Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
          <label htmlFor="metric-select-bottom" className="hidden sm:inline text-sm text-gray-400">Chart Metric:</label>
          <select
            id="metric-select-bottom"
            value={selectedMetric}
            onChange={handleMetricChange}
            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 sm:min-w-[200px] md:min-w-[250px]"
            disabled={isLoading || noProjectsFetched}
          >
            {metricOptions.map(option => (
              <option key={option.value} value={option.value}> {option.label} </option>
            ))}
          </select>
        </div>
      </div>

      {/* Explanation Section - CORRECTED */}
      <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-600 px-1">
        <h3 className="text-md sm:text-lg font-semibold mb-2 text-gray-200">
          How is weighted score calculated?
        </h3>
        {/* Changed the outer p to a div */}
        <div className="text-xs sm:text-sm text-gray-400 leading-relaxed">
          {/* Wrapped text blocks in p tags and removed <br/><br/> */}
          <p>
            The Weighted Score is calculated weekly to rank blockchain projects based on GitHub development activity and community engagement metrics. Here&apos;s the process:
          </p>
          <p>
            1. Data Collection: Gathers both all-time counts and recent (4-week percentage) changes for repo-specific key metrics like Commits, Forks, Stargazers, Contributors, and Watchers. It also includes an originality metric.
          </p>
          <p>
            2. Any missing values are filled from the previous non-missing value. This is why sometimes the trend apears to be flat.
          </p>
          <p>
            3. Repo metrics are rolled up to the project level. Some projects, like Ethereum have many sub-ecosystems.
          </p>
          <p>
            4. Normalization: For each metric, every project&apos;s value is compared to all other projects within the same week and scaled to a value between 0 and 1.
          </p>
          <p>
            5. Weighting: These normalized scores are multiplied by specific weights:
          </p>
          {/* These divs are now valid children of the outer div */}
          <div className="pl-4">
            - Major All-Time Metrics (12.5% each): Commits, Forks, Stars, Contributors.
          </div>
          <div className="pl-4">
            - Major Recent Change Metrics (10% each): 4-week change in Commits, Forks, Stars, Contributors.
          </div>
          <div className="pl-4 mb-2"> {/* Added mb-2 here for a little space before the next paragraph if needed, or rely on paragraph margin */}
            - Minor Metrics (2.5% each): All-time Watchers, All-time Originality Ratio, 4-week change in Watchers, 4-week change in Originality Ratio.
          </div>
          <p>
            6. Summation: The weighted, normalized scores for all metrics are added together to get a final weighted_score between 0 and 1.
          </p>
          <p>
            7. Index Conversion: The &quot;Weighted Score Index&quot; shown in the chart is simply this weighted_score multiplied by 100.
          </p>
          <p>
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
          </p>
          <p>
            Note: the crypto-ecosystems data architecture was updated in April 2025. The new architecture more easily allows for aggregating sub-ecosystem repos to top level project. The impact is a big spike in weighted score, and input metric values for top ecosystems, like Ethereum who have a lot of sub-ecosystems. These trends will smooth out over time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Page;