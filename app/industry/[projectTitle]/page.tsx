// app/industry/[projectTitle]/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Spinner, Alert, Button, ListGroup, ListGroupItem, ToggleSwitch } from 'flowbite-react';
import { HiInformationCircle, HiLink } from 'react-icons/hi';
import { TopProjects, ProjectOrganizationData, ProjectTrendsData } from '@/app/types';
import { formatNumberWithCommas, formatYAxisTickValue, formatPercentage } from '@/app/utilities/formatters';
import Link from 'next/link';
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

// useIsMobile hook definition
const useIsMobile = (breakpoint = 768): boolean => {
  const [isMobileView, setIsMobileView] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkScreenSize = () => setIsMobileView(window.innerWidth < breakpoint);
      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, [breakpoint]);
  return isMobileView;
};

// Helper component for consistent metric display
const MetricDisplayBox = ({
  title,
  value,
  changeText,
  className 
}: {
  title: string;
  value: string | number | undefined | null;
  changeText?: string;
  className?: string;
}) => (
  <div className={`text-center p-2 ${className}`}>
    <div className="text-2xl font-bold text-gray-900 dark:text-white">
      {value !== null && value !== undefined ? String(value) : 'N/A'}
    </div>
    <div className="text-xs text-gray-500 dark:text-gray-400">{title}</div>
    {changeText && (
      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
        {changeText}
      </div>
    )}
  </div>
);

const ProjectDetailPage = () => {
  const isMobile = useIsMobile();
  const router = useRouter();
  const params = useParams();
  const projectTitleUrlEncoded = params.projectTitle as string;

  // --- State Management ---
  const [project, setProject] = useState<TopProjects | null>(null);
  const [organizations, setOrganizations] = useState<ProjectOrganizationData[]>([]);
  const [projectTrends, setProjectTrends] = useState<ProjectTrendsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Single, global toggle state for the entire page
  const [includeForks, setIncludeForks] = useState(false);

  // --- Consolidated Data Fetching ---
  useEffect(() => {
    if (projectTitleUrlEncoded) {
      const fetchAllData = async () => {
        setIsLoading(true);
        setError(null);

        try {
          // Fetch all data concurrently based on the toggle state
          const [projectResponse, trendsResponse, orgsResponse] = await Promise.all([
            fetch(`/api/industry/project/${projectTitleUrlEncoded}?include_forks=${includeForks}`),
            fetch(`/api/industry/project/${projectTitleUrlEncoded}/trends?include_forks=${includeForks}`),
            fetch(`/api/industry/project/${projectTitleUrlEncoded}/organizations`)
          ]);

          // Process project details
          if (!projectResponse.ok) {
            const errData = await projectResponse.json();
            throw new Error(errData.message || `Failed to fetch project details`);
          }
          const projectData: TopProjects = await projectResponse.json();
          setProject(projectData);

          // Process trends data
          if (!trendsResponse.ok) {
            const errData = await trendsResponse.json();
            throw new Error(errData.message || `Failed to fetch project trends`);
          }
          const trendsData: ProjectTrendsData[] = await trendsResponse.json();
          const formattedTrends = trendsData.map(d => ({
            ...d,
            report_date: new Date(d.report_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          })).sort((a, b) => new Date(a.report_date).getTime() - new Date(b.report_date).getTime());
          setProjectTrends(formattedTrends);

          // Process organization data
          if (!orgsResponse.ok) {
            const errData = await orgsResponse.json();
            throw new Error(errData.message || `Failed to fetch organizations`);
          }
          const orgsData: ProjectOrganizationData[] = await orgsResponse.json();
          setOrganizations(orgsData);

        } catch (err: unknown) {
          console.error("Data fetching error:", err);
          setError(err instanceof Error ? err.message : 'An unknown error occurred.');
          // Clear data on error to avoid showing stale info
          setProject(null);
          setProjectTrends([]);
          setOrganizations([]);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchAllData();
    }
  }, [projectTitleUrlEncoded, includeForks]); // Re-fetches all data when toggle changes

  const renderTrendChart = (
    title: string,
    data: ProjectTrendsData[],
    lines: { dataKey: keyof ProjectTrendsData; stroke: string; name: string; yAxisId?: string }[],
    yAxisLabelValue?: string,
    yAxisRankLabelValue?: string
  ) => {
    // ... (This function remains unchanged)
    const hasRankAxis = lines.some(line => line.yAxisId === 'right');
    const yAxisTickWidth = isMobile ? 45 : 70;
    const yAxisLabelFontSizeDesktop = '0.8rem';
    const yAxisLabelDxLeftDesktop = -20; 
    const yAxisLabelFontSizeMobile = '0.55rem'; 
    const yAxisLabelDxRightMobile = 8;
    const chartLeftMargin = isMobile ? 5 : (yAxisLabelValue ? 45 : 25); 
    const chartRightMargin = isMobile ? (yAxisRankLabelValue && hasRankAxis ? 15 : 5) : (yAxisRankLabelValue && hasRankAxis ? 45 : 25);
    const axisTickFontSize = isMobile ? '0.55rem' : '0.75rem';
    const xAxisHeight = isMobile ? 40 : 40;
    const xAxisDy = isMobile ? 3 : 2;
    const chartTopBottomMargin = isMobile ? 2 : 5;
    const legendFontSize = isMobile ? '0.6rem' : '0.8rem';
    const tooltipFontSize = isMobile ? '0.6rem' : '0.8rem';

    return (
      <Card className="mb-6">
        <h2 className="text-xl font-semibold mb-3">{title}</h2>
        {projectTrends.length > 0 && (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: chartTopBottomMargin, right: chartRightMargin, left: chartLeftMargin, bottom: chartTopBottomMargin }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="report_date" tick={{ fontSize: axisTickFontSize }} angle={-35} textAnchor="end" height={xAxisHeight} dy={xAxisDy} interval={"preserveStartEnd"} />
                <YAxis yAxisId="left" tickFormatter={(tickValue) => formatYAxisTickValue(tickValue, isMobile)} label={(!isMobile && yAxisLabelValue) ? { value: yAxisLabelValue, angle: -90, position: 'insideLeft', dx: yAxisLabelDxLeftDesktop, fill: '#6b7280', style: { textAnchor: 'middle', fontSize: yAxisLabelFontSizeDesktop } } : undefined} width={yAxisTickWidth} tick={{ fontSize: axisTickFontSize }} allowDecimals={false} />
                {hasRankAxis && yAxisRankLabelValue && (
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(tickValue) => formatYAxisTickValue(tickValue, isMobile)} label={yAxisRankLabelValue ? { value: yAxisRankLabelValue, angle: -90, position: 'insideRight', dx: isMobile ? yAxisLabelDxRightMobile : 20, fill: '#6b7280', style: { textAnchor: 'middle', fontSize: isMobile ? yAxisLabelFontSizeMobile : yAxisLabelFontSizeDesktop } } : undefined} width={yAxisTickWidth} tick={{ fontSize: axisTickFontSize }} allowDecimals={false} />
                )}
                <Tooltip formatter={(value: number | string) => typeof value === 'number' ? formatNumberWithCommas(value) : value} labelStyle={{ fontSize: tooltipFontSize }} itemStyle={{ fontSize: tooltipFontSize }} />
                <Legend wrapperStyle={{ fontSize: legendFontSize, paddingTop: (isMobile && xAxisHeight > 20) ? 5 : 0 }} />
                {lines.map(line => (
                  <Line key={line.dataKey as string} type="monotone" dataKey={line.dataKey} stroke={line.stroke} name={line.name} yAxisId={line.yAxisId || "left"} dot={isMobile ? false : {r: 1}} strokeWidth={isMobile ? 1.5 : 2} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {projectTrends.length === 0 && !isLoading && (
          <Alert color="info">No trend data available for {title.toLowerCase()}.</Alert>
        )}
      </Card>
    );
  };

  const formatScore = (score: number | null | undefined, multiplyBy100 = false, decimalPlaces = 1): string => {
    if (score === null || score === undefined) return 'N/A';
    const value = multiplyBy100 ? score * 100 : score;
    return value.toFixed(decimalPlaces);
  };

  if (isLoading && !project) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="xl" /> Loading project details...</div>;
  }

  if (error) {
    return (
      <div className="w-full p-4">
        <Alert color="failure" icon={HiInformationCircle}><span>Error: {error}</span></Alert>
        <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
      </div>
    );
  }
  
  if (!project) {
    return (
       <div className="w-full p-4">
        <Alert color="warning" icon={HiInformationCircle}><span>Project data could not be loaded or project not found.</span></Alert>
        <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="w-full p-4 md:p-8 relative">
      {/* Loading overlay for re-fetches */}
      {isLoading && project && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center z-10 rounded-lg">
          <Spinner size="xl" />
        </div>
      )}

      <Card className="mb-6 pt-6 sm:pt-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2">
          <div className="w-full sm:w-auto mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold">{project.project_title}</h1>
            <p className="text-md text-gray-700 dark:text-gray-300 mt-1">
              Category: <span className="font-semibold">{project.project_rank_category || 'N/A'}</span>
            </p>
            <p className="text-md text-gray-700 dark:text-gray-300 mt-1">
              Repo Count: <span className="font-semibold">{formatNumberWithCommas(project.repo_count ?? 0)}</span>
            </p>
            <Link
              href={`/industry/${projectTitleUrlEncoded}/repos`}
              className="text-sm italic text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mt-1 block"
            >
              view repos
            </Link>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 text-right whitespace-nowrap sm:ml-4 flex-shrink-0">
            <p>Latest Data:<br />{new Date(project.latest_data_timestamp).toLocaleString()}</p>
            <div className="flex items-center justify-end space-x-2 mt-2">
                <span className="text-sm font-medium">Include Fork History</span>
                <ToggleSwitch checked={includeForks} onChange={setIncludeForks} disabled={isLoading} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 mt-6 items-start">
            <Card>
                <h2 className="text-xl font-semibold mb-4 text-center md:text-left">Project Ranking</h2>
                <div className="grid grid-cols-2 gap-4">
                    <MetricDisplayBox title="Overall Project Rank" value={formatNumberWithCommas(project.project_rank)} />
                    <MetricDisplayBox title="Quartile Bucket" value={project.quartile_bucket} />
                    <MetricDisplayBox title="Prior Rank (4 Wks Ago)" value={formatNumberWithCommas(project.prior_4_weeks_project_rank)} />
                    <MetricDisplayBox title="Absolute Rank Change" value={formatNumberWithCommas(project.absolute_project_rank_change_over_4_weeks)} />
                </div>
            </Card>
            <Card>
                <h2 className="text-xl font-semibold mb-4 text-center md:text-left">Builder Activity Score</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <MetricDisplayBox title="Weighted Score" value={formatScore(project.weighted_score_index)} />
                    <MetricDisplayBox title="Prior 4 Wks Weighted Score" value={formatScore(project.prior_4_weeks_weighted_score, true)} />
                </div>
            </Card>
        </div>

        <Card className="mb-6">
            <h2 className="text-xl font-semibold mb-4">All Time Activity Metrics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <MetricDisplayBox title="Contributors" value={formatNumberWithCommas(project.contributor_count)} changeText={`4wk Change: ${formatPercentage(project.contributor_count_pct_change_over_4_weeks, true)}`} />
                <MetricDisplayBox title="Commits (All Time)" value={formatNumberWithCommas(project.commit_count)} changeText={`4wk Change: ${formatPercentage(project.commit_count_pct_change_over_4_weeks, true)}`} />
                <MetricDisplayBox title="Stars" value={formatNumberWithCommas(project.stargaze_count)} changeText={`4wk Change: ${formatPercentage(project.stargaze_count_pct_change_over_4_weeks, true)}`} />
                <MetricDisplayBox title="Forks" value={formatNumberWithCommas(project.fork_count)} changeText={`4wk Change: ${formatPercentage(project.fork_count_pct_change_over_4_weeks, true)}`} />
                <MetricDisplayBox title="Watchers" value={formatNumberWithCommas(project.watcher_count)} changeText={`4wk Change: ${formatPercentage(project.watcher_count_pct_change_over_4_weeks, true)}`} />
                <MetricDisplayBox title="Original Ratio (Not Fork)" value={project.is_not_fork_ratio?.toFixed(4)} changeText={`4wk Change: ${formatPercentage(project.is_not_fork_ratio_pct_change_over_4_weeks, true)}`} />
            </div>
        </Card>

        <h2 className="text-2xl font-bold mt-8 mb-4 text-center md:text-left text-gray-800 dark:text-white">Metric Trends Over Time</h2>
        
        {renderTrendChart( "Repo Count", projectTrends, [{ dataKey: "repo_count", stroke: "#00C49F", name: "Repos" }], "Repos" )}
        {renderTrendChart( "Contributor Count", projectTrends, [{ dataKey: "contributor_count", stroke: "#8884d8", name: "Contributors" }], "Contributors" )}
        {renderTrendChart( "Stargaze Count", projectTrends, [{ dataKey: "stargaze_count", stroke: "#82ca9d", name: "Stars" }], "Stars" )}
        {renderTrendChart( "Fork Count", projectTrends, [{ dataKey: "fork_count", stroke: "#ffc658", name: "Forks" }], "Forks" )}
        {renderTrendChart( "Commit Count", projectTrends, [{ dataKey: "commit_count", stroke: "#0088FE", name: "Commits" }], "Commits" )}
      </Card>

      <Card className="mt-6">
        <h2 className="text-2xl font-semibold mb-4">Top Associated Organizations</h2>
        {organizations.length > 0 ? (
          <ListGroup className="space-y-3">
            {organizations.map((org, index) => (
              <ListGroupItem key={org.project_organization_url || index} className="p-3 border rounded-lg dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="mb-2 sm:mb-0">
                    {org.project_organization_url ? (
                      <a href={org.project_organization_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center" > {org.project_organization_url} <HiLink className="ml-1 w-4 h-4" /> </a>
                    ) : ( <span className="text-gray-500">URL not available</span> )}
                  </div>
                  <div className="flex space-x-4 text-sm text-gray-600 dark:text-gray-400">
                    <span><strong>Rank:</strong> {org.org_rank ?? 'N/A'}</span>
                    <span><strong>Category:</strong> {org.org_rank_category ?? 'N/A'}</span>
                  </div>
                </div>
              </ListGroupItem>
            ))}
          </ListGroup>
        ) : (
          <Alert color="info" icon={HiInformationCircle}> <span>No associated organizations found for this project.</span> </Alert>
        )}
      </Card>

      {project && (
        <div className="block sm:hidden text-center text-xs text-gray-500 dark:text-gray-400 mt-8 mb-4">
          <p>Latest Data Updated:</p>
          <p>{new Date(project.latest_data_timestamp).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
};

export default ProjectDetailPage;