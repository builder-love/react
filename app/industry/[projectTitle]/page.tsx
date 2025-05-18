// app/industry/[projectTitle]/page.tsx
"use client"; // If using useEffect for fetching, otherwise can be Server Component

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation'; // For Client Components
import { Card, Spinner, Alert, Button, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from 'flowbite-react';
import { HiInformationCircle } from 'react-icons/hi';
import { TopProjects } from '@/app/types';
import { formatNumberWithCommas } from '@/app/utilities/formatters';

const ProjectDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const projectTitleUrlEncoded = params.projectTitle as string; // projectTitle comes from the folder name [projectTitle]

  const [project, setProject] = useState<TopProjects | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectTitleUrlEncoded) {
      const fetchProjectDetails = async () => {
        setIsLoading(true);
        setError(null);
        try {
          // The projectTitleUrlEncoded is already encoded from the URL
          const response = await fetch(`/api/industry/project/${projectTitleUrlEncoded}`);
          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || `Failed to fetch project details (status: ${response.status})`);
          }
          const data: TopProjects = await response.json();
          setProject(data);
        } catch (err: Error | unknown) {
          console.error("Fetch project detail error:", err);
          setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
          setIsLoading(false);
        }
      };
      fetchProjectDetails();
    } else {
      setIsLoading(false);
      setError("Project title not found in URL.");
    }
  }, [projectTitleUrlEncoded]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="xl" /> Loading project details...</div>;
  }

  if (error) {
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
            <span>Project data could not be loaded.</span>
        </Alert>
        <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
      </div>
    );
  }

  // Helper to format labels and values
  const renderDetailRow = (label: string, value: string | number | null | undefined, isNumber: boolean = true) => {
    let displayValue = 'N/A';
    if (value !== null && value !== undefined) {
      displayValue = isNumber && typeof value === 'number' ? formatNumberWithCommas(value) : String(value);
    }
    return (
      <TableRow>
        <TableCell className="font-medium text-gray-900 dark:text-white whitespace-nowrap">{label}</TableCell>
        <TableCell>{displayValue}</TableCell>
      </TableRow>
    );
  };

  const formatPercentage = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return `${(value * 100).toFixed(2)}%`;
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Button onClick={() => router.push('/industry')} className="mb-6 print:hidden"> {/* Hide button when printing */}
        &larr; Back to Search
      </Button>
      <Card>
        <h1 className="text-3xl font-bold mb-2">{project.project_title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Latest Data: {new Date(project.latest_data_timestamp).toLocaleString()}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <h2 className="text-xl font-semibold mb-3">Key Ranks & Scores</h2>
            <Table striped>
              <TableBody className="divide-y">
                {renderDetailRow("Overall Project Rank", project.project_rank)}
                {renderDetailRow("Rank Category", project.project_rank_category, false)}
                {renderDetailRow("Quartile Bucket", project.quartile_bucket)}
                {renderDetailRow("Weighted Score Index", project.weighted_score_index?.toFixed(4), false)}
                {renderDetailRow("Weighted Score SMA", project.weighted_score_sma?.toFixed(4), false)}
                {renderDetailRow("Prior 4 Weeks Weighted Score", project.prior_4_weeks_weighted_score?.toFixed(4), false)}
              </TableBody>
            </Table>
          </Card>
          <Card>
            <h2 className="text-xl font-semibold mb-3">Activity Metrics</h2>
             <Table striped>
              <TableBody className="divide-y">
                {renderDetailRow("Contributors", project.contributor_count)}
                {renderDetailRow("Repositories", project.repo_count)}
                {renderDetailRow("Commits (All Time)", project.commit_count)}
                {renderDetailRow("Stars", project.stargaze_count)}
                {renderDetailRow("Forks", project.fork_count)}
                {renderDetailRow("Watchers", project.watcher_count)}
                {renderDetailRow("Original Ratio (Not Fork)", project.is_not_fork_ratio?.toFixed(4), false)}
              </TableBody>
            </Table>
          </Card>
        </div>
         <Card className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Rank Changes (Last 4 Weeks)</h2>
            <Table striped>
                <TableBody className="divide-y">
                    {renderDetailRow("Prior Rank (4 Weeks Ago)", project.prior_4_weeks_project_rank)}
                    {renderDetailRow("Absolute Rank Change", project.absolute_project_rank_change_over_4_weeks)}
                    {renderDetailRow("Rank of Rank Change", project.rank_of_project_rank_change_over_4_weeks)}
                </TableBody>
            </Table>
        </Card>
         <Card>
            <h2 className="text-xl font-semibold mb-3">4-Week Percentage Changes</h2>
            <Table striped>
                <TableHead>
                    <TableHeadCell>Metric</TableHeadCell>
                    <TableHeadCell>% Change</TableHeadCell>
                </TableHead>
                <TableBody className="divide-y">
                    {renderDetailRow("Contributors % Change", formatPercentage(project.contributor_count_pct_change_over_4_weeks), false)}
                    {renderDetailRow("Forks % Change", formatPercentage(project.fork_count_pct_change_over_4_weeks), false)}
                    {renderDetailRow("Stars % Change", formatPercentage(project.stargaze_count_pct_change_over_4_weeks), false)}
                    {renderDetailRow("Commits % Change", formatPercentage(project.commit_count_pct_change_over_4_weeks), false)}
                    {renderDetailRow("Watchers % Change", formatPercentage(project.watcher_count_pct_change_over_4_weeks), false)}
                    {renderDetailRow("Original Ratio % Change", formatPercentage(project.is_not_fork_ratio_pct_change_over_4_weeks), false)}
                </TableBody>
            </Table>
        </Card>
      </Card>
    </div>
  );
};

export default ProjectDetailPage;