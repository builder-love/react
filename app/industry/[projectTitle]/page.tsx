// app/industry/[projectTitle]/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Spinner, Alert, Button, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, ListGroup, ListGroupItem } from 'flowbite-react'; 
import { HiInformationCircle, HiLink } from 'react-icons/hi'; 
import { TopProjects, ProjectOrganizationData } from '@/app/types';
import { formatNumberWithCommas } from '@/app/utilities/formatters';
import Link from 'next/link';

const ProjectDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const projectTitleUrlEncoded = params.projectTitle as string;

  const [project, setProject] = useState<TopProjects | null>(null);
  const [organizations, setOrganizations] = useState<ProjectOrganizationData[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true); // Separate loading state for orgs
  const [orgError, setOrgError] = useState<string | null>(null); // Separate error state for orgs

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
        } catch (err: Error | unknown) {
          console.error("Fetch project organizations error:", err);
          setOrgError(err instanceof Error ? err.message : 'An unknown error occurred fetching organizations.');
          setOrganizations([]); // Clear organizations on error
        } finally {
          setIsLoadingOrgs(false);
        }
      };

      fetchProjectData();
      fetchOrganizationData(); // Fetch organizations data

    } else {
      setIsLoading(false);
      setIsLoadingOrgs(false);
      setError("Project title not found in URL.");
    }
  }, [projectTitleUrlEncoded]);

  // Main content loading spinner
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="xl" /> Loading project details...</div>;
  }

  // Main content error
  if (error && !project) { // Only show main error if project data itself failed
    return (
      <div className="container mx-auto p-4">
        <Alert color="failure" icon={HiInformationCircle}>
          <span>Error loading project: {error}</span>
        </Alert>
        <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
      </div>
    );
  }

  // Project not found or main data issue
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
      <Button onClick={() => router.push('/industry')} className="mb-6 print:hidden">
        &larr; Back to Search
      </Button>
      <Card className="mb-6"> {/* Main project details card */}
        <h1 className="text-3xl font-bold mb-2">{project.project_title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Latest Data: {new Date(project.latest_data_timestamp).toLocaleString()}
        </p>

        {/* Link to Repositories Page */}
        {project && ( // Only show if project data is loaded
          <Card className="mt-6">
            <h2 className="text-xl font-semibold mb-3">Explore Repositories</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              View detailed information about repositories associated with {project.project_title}.
            </p>
            <Button
              as={Link}
              href={`/industry/${projectTitleUrlEncoded}/repos`}
              color="alternative"
            >
              View Repositories &rarr;
            </Button>
          </Card>
        )}

        {/* ... existing grid for Key Ranks & Activity Metrics ... */}
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
         <Card className="mb-6"> {/* Ensure this card closes before the new one */}
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
      </Card> {/* End of main project details card */}


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