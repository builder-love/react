// app/industry/[projectTitle]/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Spinner, Alert, Button, ListGroup, ListGroupItem } from 'flowbite-react';
import { HiInformationCircle, HiLink } from 'react-icons/hi';
import { TopProjects, ProjectOrganizationData, ProjectTrendsData } from '@/app/types';
import { formatNumberWithCommas } from '@/app/utilities/formatters';
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

// Helper component for consistent metric display in new cards
const MetricDisplayBox = ({ title, value, className }: { title: string, value: string | number | undefined | null, className?: string }) => (
  <div className={`text-center p-2 ${className}`}>
    <p className="text-2xl font-bold text-gray-900 dark:text-white">
      {value !== null && value !== undefined ? String(value) : 'N/A'}
    </p>
    <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
  </div>
);


const ProjectDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const projectTitleUrlEncoded = params.projectTitle as string;

  const [project, setProject] = useState<TopProjects | null>(null);
  const [organizations, setOrganizations] = useState<ProjectOrganizationData[]>([]);
  const [projectTrends, setProjectTrends] = useState<ProjectTrendsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [isLoadingTrends, setIsLoadingTrends] = useState(true);
  const [trendsError, setTrendsError] = useState<string | null>(null);

  useEffect(() => {
    if (projectTitleUrlEncoded) {
      const fetchProjectData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/industry/project/${projectTitleUrlEncoded}`);
          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || `Failed to fetch project details (status: ${response.status})`);
          }
          const data: TopProjects = await response.json();
          setProject(data);
        } catch (err: Error | unknown) {
          console.error("Fetch project detail error:", err);
          setError(err instanceof Error ? err.message : 'An unknown error occurred fetching project details.');
        } finally {
          setIsLoading(false);
        }
      };

      const fetchOrganizationData = async () => {
        setIsLoadingOrgs(true);
        setOrgError(null);
        try {
          const response = await fetch(`/api/industry/project/${projectTitleUrlEncoded}/organizations`);
          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || `Failed to fetch project organizations (status: ${response.status})`);
          }
          const data: ProjectOrganizationData[] = await response.json();
          setOrganizations(data);
        } catch (err: unknown) {
          console.error("Fetch project organizations error:", err);
          setOrgError(err instanceof Error ? err.message : 'An unknown error occurred fetching organizations.');
          setOrganizations([]);
        } finally {
          setIsLoadingOrgs(false);
        }
      };

      const fetchProjectTrendsData = async () => {
        setIsLoadingTrends(true);
        setTrendsError(null);
        try {
          const response = await fetch(`/api/industry/project/${projectTitleUrlEncoded}/trends`);
          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || `Failed to fetch project trends (status: ${response.status})`);
          }
          const data: ProjectTrendsData[] = await response.json();
          const formattedData = data.map(d => ({
            ...d,
            report_date: new Date(d.report_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          })).sort((a, b) => new Date(a.report_date).getTime() - new Date(b.report_date).getTime());
          setProjectTrends(formattedData);
        } catch (err: unknown) {
          console.error("Fetch project trends error:", err);
          setTrendsError('Trend data could not be loaded. Please try again later.');
          setProjectTrends([]);
        } finally {
          setIsLoadingTrends(false);
        }
      };

      fetchProjectData();
      fetchOrganizationData();
      fetchProjectTrendsData();

    } else {
      setIsLoading(false);
      setIsLoadingOrgs(false);
      setIsLoadingTrends(false);
      setError("Project title not found in URL.");
    }
  }, [projectTitleUrlEncoded]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="xl" /> Loading project details...</div>;
  }

  if (error && !project) {
    return (
      <div className="container mx-auto p-4">
        <Alert color="failure" icon={HiInformationCircle}>
          <span>Error loading project: {error}</span>
        </Alert>
        <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
      </div>
    );
  }

  if (!project) {
    return (
       <div className="container mx-auto p-4">
        <Alert color="warning" icon={HiInformationCircle}>
            <span>Project data could not be loaded or project not found.</span>
        </Alert>
        <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
      </div>
    );
  }

  const formatPercentage = (value: number | null | undefined, addPlusSign: boolean = false) => {
    if (value === null || value === undefined) return 'N/A';
    const percentage = (value * 100).toFixed(2);
    return addPlusSign && value > 0 ? `+${percentage}%` : `${percentage}%`;
  };

  const renderTrendChart = (
    title: string,
    data: ProjectTrendsData[],
    lines: { dataKey: keyof ProjectTrendsData; stroke: string; name: string; yAxisId?: string }[],
    yAxisLabelValue?: string,
    yAxisRankLabelValue?: string
  ) => {
    const hasRankAxis = lines.some(line => line.yAxisId === 'right');
    const leftMargin = yAxisLabelValue ? 50 : 25;
    const rightMargin = yAxisRankLabelValue && hasRankAxis ? 50 : 25;

    return (
      <Card className="mb-6">
        <h2 className="text-xl font-semibold mb-3">{title}</h2>
        {isLoadingTrends && (
          <div className="flex justify-center items-center h-64"><Spinner /> Loading trend data...</div>
        )}
        {trendsError && !isLoadingTrends && (
          <Alert color="failure" icon={HiInformationCircle}>
            <span>{trendsError}</span>
          </Alert>
        )}
        {!isLoadingTrends && !trendsError && projectTrends.length === 0 && (
          <Alert color="info">No trend data available for {title.toLowerCase()}.</Alert>
        )}
        {!isLoadingTrends && !trendsError && projectTrends.length > 0 && (
          <div style={{ width: '100%', height: 300 }} className="text-xs">
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 5, right: rightMargin, left: leftMargin, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="report_date" />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(value) => formatNumberWithCommas(value as number)}
                  label={yAxisLabelValue ? { value: yAxisLabelValue, angle: -90, position: 'insideLeft', dx: -25, fill: '#6b7280', style: { textAnchor: 'middle', fontSize: '0.8rem' } } : undefined}
                  width={80}
                />
                {hasRankAxis && yAxisRankLabelValue && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(value) => formatNumberWithCommas(value as number)}
                    label={{ value: yAxisRankLabelValue, angle: -90, position: 'insideRight', dx: 25, fill: '#6b7280', style: { textAnchor: 'middle', fontSize: '0.8rem' } }}
                    width={80}
                  />
                )}
                <Tooltip formatter={(value: number | string) => typeof value === 'number' ? formatNumberWithCommas(value) : value} />
                <Legend />
                {lines.map(line => (
                  <Line
                    key={line.dataKey as string}
                    type="monotone"
                    dataKey={line.dataKey}
                    stroke={line.stroke}
                    name={line.name}
                    yAxisId={line.yAxisId || "left"}
                    dot={false}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    );
  };

  const formatScore = (score: number | null | undefined, multiplyBy100 = false, decimalPlaces = 1): string => {
    if (score === null || score === undefined) return 'N/A';
    const value = multiplyBy100 ? score * 100 : score;
    return value.toFixed(decimalPlaces);
  };


  return (
    <div className="container mx-auto p-4 md:p-8">
      <Button onClick={() => router.push('/industry')} className="mb-6 print:hidden">
        &larr; Back to Search
      </Button>

      <Card className="mb-6"> {/* Main project details card */}
        <div className="flex justify-between items-start mb-2">
          <div>
            <h1 className="text-3xl font-bold">{project.project_title}</h1>
            <p className="text-md text-gray-700 dark:text-gray-300 mt-1">
              Category: <span className="font-semibold">{project.project_rank_category || 'N/A'}</span>
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-right whitespace-nowrap">
            Latest Data:<br />{new Date(project.latest_data_timestamp).toLocaleString()}
          </p>
        </div>

        <Card className="mt-6 mb-6">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-semibold">Explore Repositories</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1 mb-4">
                    View detailed information about repositories associated with {project.project_title}.
                    </p>
                </div>
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    Repo Count: {formatNumberWithCommas(project.repo_count ?? 0)}
                </p>
            </div>
            <Button
              as={Link}
              href={`/industry/${projectTitleUrlEncoded}/repos`}
              color="alternative"
              className="w-full sm:w-auto"
            >
              View Repositories &rarr;
            </Button>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                    <MetricDisplayBox
                        title="Weighted Score"
                        value={formatScore(project.weighted_score_index)}
                    />
                    <MetricDisplayBox
                        title="Weighted Score (Simple Moving Average)"
                        value={formatScore(project.weighted_score_sma, true)}
                    />
                    <MetricDisplayBox
                        className="sm:col-span-2 flex flex-col items-center justify-center"
                        title="Prior 4 Wks Weighted Score"
                        value={formatScore(project.prior_4_weeks_weighted_score, true)}
                    />
                </div>
            </Card>
        </div>

        <Card className="mb-6">
            <h2 className="text-xl font-semibold mb-4">All Time Activity Metrics (4wk. % Change)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <MetricDisplayBox
                    title="Contributors"
                    value={`${formatNumberWithCommas(project.contributor_count)} (${formatPercentage(project.contributor_count_pct_change_over_4_weeks, true)})`}
                />
                <MetricDisplayBox
                    title="Commits (All Time)"
                    value={`${formatNumberWithCommas(project.commit_count)} (${formatPercentage(project.commit_count_pct_change_over_4_weeks, true)})`}
                />
                <MetricDisplayBox
                    title="Stars"
                    value={`${formatNumberWithCommas(project.stargaze_count)} (${formatPercentage(project.stargaze_count_pct_change_over_4_weeks, true)})`}
                />
                <MetricDisplayBox
                    title="Forks"
                    value={`${formatNumberWithCommas(project.fork_count)} (${formatPercentage(project.fork_count_pct_change_over_4_weeks, true)})`}
                />
                 <MetricDisplayBox
                    title="Watchers"
                    value={`${formatNumberWithCommas(project.watcher_count)} (${formatPercentage(project.watcher_count_pct_change_over_4_weeks, true)})`}
                />
                <MetricDisplayBox
                    title="Original Ratio (Not Fork)"
                    value={`${project.is_not_fork_ratio?.toFixed(4)} (${formatPercentage(project.is_not_fork_ratio_pct_change_over_4_weeks, true)})`}
                />
            </div>
        </Card>


        {projectTrends.length > 0 && <h2 className="text-2xl font-bold mt-8 mb-4 text-center md:text-left text-gray-800 dark:text-white">Metric Trends Over Time</h2>}

        {renderTrendChart(
            "Contributor Count",
            projectTrends,
            [{ dataKey: "contributor_count", stroke: "#8884d8", name: "Contributors" }],
            "Contributors"
        )}

        {renderTrendChart(
            "Stargaze Count",
            projectTrends,
            [{ dataKey: "stargaze_count", stroke: "#82ca9d", name: "Stars" }],
            "Stars"
        )}

        {renderTrendChart(
            "Fork Count",
            projectTrends,
            [{ dataKey: "fork_count", stroke: "#ffc658", name: "Forks" }],
            "Forks"
        )}

        {renderTrendChart(
            "Commit Count",
            projectTrends,
            [{ dataKey: "commit_count", stroke: "#0088FE", name: "Commits" }],
            "Commits"
        )}
      </Card>


      {/* Top Organizations Section */}
      <Card className="mt-6">
        <h2 className="text-2xl font-semibold mb-4">Top Associated Organizations</h2>
        {isLoadingOrgs && (
          <div className="flex justify-center items-center py-4">
            <Spinner size="md" />
            <span className="ml-2">Loading organizations...</span>
          </div>
        )}
        {orgError && !isLoadingOrgs && (
          <Alert color="failure" icon={HiInformationCircle}>
            <span>Error loading organizations: {orgError}</span>
          </Alert>
        )}
        {!isLoadingOrgs && !orgError && organizations.length === 0 && (
          <Alert color="info" icon={HiInformationCircle}>
            <span>No associated organizations found for this project.</span>
          </Alert>
        )}
        {!isLoadingOrgs && !orgError && organizations.length > 0 && (
          <ListGroup className="space-y-3">
            {organizations.map((org, index) => (
              <ListGroupItem key={org.project_organization_url || index} className="p-3 border rounded-lg dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="mb-2 sm:mb-0">
                    {org.project_organization_url ? (
                      <a
                        href={org.project_organization_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center"
                      >
                        {org.project_organization_url}
                        <HiLink className="ml-1 w-4 h-4" />
                      </a>
                    ) : (
                      <span className="text-gray-500">URL not available</span>
                    )}
                  </div>
                  <div className="flex space-x-4 text-sm text-gray-600 dark:text-gray-400">
                    <span><strong>Rank:</strong> {org.org_rank ?? 'N/A'}</span>
                    <span><strong>Category:</strong> {org.org_rank_category ?? 'N/A'}</span>
                  </div>
                </div>
              </ListGroupItem>
            ))}
          </ListGroup>
        )}
      </Card>
    </div>
  );
};

export default ProjectDetailPage;