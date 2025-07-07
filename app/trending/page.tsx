// app/trending/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, Spinner, ToggleSwitch } from 'flowbite-react';
import { HiFire } from 'react-icons/hi';
import { ProjectOutliersLeaderboardEntry, ProjectOutliersLeaderboardCardProps } from '../types';

// Helper to format numbers with commas
const formatNumber = (num: number | null) => {
  if (num === null) return 'N/A';
  return new Intl.NumberFormat('en-US').format(num);
};

// Helper to format percentage change
const formatPctChange = (num: number | null) => {
    if (num === null) return 'N/A';
    const sign = num > 0 ? '+' : '';
    const percentage = num * 100;
  
    // Use Intl.NumberFormat to add commas and control decimal places
    const formattedNumber = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(percentage);
  
    return `${sign}${formattedNumber}%`;
  };

  const ProjectOutliersLeaderboardCard: React.FC<ProjectOutliersLeaderboardCardProps> = ({ 
    title, metric: _metric, metricLabel, isLoading, data, 
    // props for the toggle
    showToggle = false, 
    toggleState = false, 
    onToggleChange = () => {} 
}) => (
    <Card>
        <div className="mb-4 flex items-center justify-between">
            <h5 className="text-xl font-bold leading-none text-gray-900 dark:text-white">{title}</h5>
            {/* Conditionally render the toggle switch */}
            {showToggle && (
                <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Include Forks</span>
                    <ToggleSwitch checked={toggleState} onChange={onToggleChange} />
                </div>
            )}
        </div>
        <div className="flow-root">
        {isLoading ? (
            <div className="flex justify-center items-center h-48">
            <Spinner size="xl" />
            </div>
        ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((item) => (
                <li key={item.project_title} className="py-3 sm:py-4">
                <div className="flex items-center space-x-4">
                    <div className="min-w-0 flex-1">
                    <Link
                        href={`/industry/${encodeURIComponent(item.project_title)}`}
                        className="truncate text-sm font-medium text-blue-600 hover:underline dark:text-blue-500"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {item.project_title}
                    </Link>
                    <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                        {`${metricLabel}: ${formatNumber(item.current_value)} (Prev: ${formatNumber(item.previous_value)})`}
                    </p>
                    </div>
                    <div className={`inline-flex items-center text-base font-semibold ${item.pct_change && item.pct_change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatPctChange(item.pct_change)}
                    </div>
                </div>
                </li>
            ))}
            </ul>
        )}
        </div>
    </Card>
    );


// --- Main Page Component ---
export default function TrendingPage() {
  // State for the data
  const [commitData, setCommitData] = useState<ProjectOutliersLeaderboardEntry[]>([]);
  const [contributorData, setContributorData] = useState<ProjectOutliersLeaderboardEntry[]>([]);
  const [otherData, setOtherData] = useState<Record<string, ProjectOutliersLeaderboardEntry[]>>({});
  
  // State for the toggles (default is false, not including forks)
  const [includeCommitForks, setIncludeCommitForks] = useState(false);
  const [includeContributorForks, setIncludeContributorForks] = useState(false);
  
  const [loadingStates, setLoadingStates] = useState({
    commit_count: true,
    contributor_count: true,
    fork_count: true,
    stargaze_count: true,
    repo_count: true,
    watcher_count: true,
    is_not_fork_ratio: true,
  });

  // Reusable fetch function
  const fetchDataForMetric = async (metric: string, includeForks: boolean = false) => {
      const res = await fetch(`/api/get-project-outliers?metric=${metric}&limit=5&include_forks=${includeForks}`);
      if (!res.ok) throw new Error(`Failed to fetch ${metric}`);
      return res.json();
  };

  // Effect for Commit Change card (triggers when its toggle changes)
  useEffect(() => {
      const fetchCommitData = async () => {
          setLoadingStates(prev => ({ ...prev, commit_count: true }));
          try {
              const data = await fetchDataForMetric('commit_count', includeCommitForks);
              setCommitData(data);
          } catch (error) {
              console.error("Failed to load commit data:", error);
          } finally {
              setLoadingStates(prev => ({ ...prev, commit_count: false }));
          }
      };
      fetchCommitData();
  }, [includeCommitForks]);

  // Effect for Contributor Change card (triggers when its toggle changes)
  useEffect(() => {
      const fetchContributorData = async () => {
          setLoadingStates(prev => ({ ...prev, contributor_count: true }));
          try {
              const data = await fetchDataForMetric('contributor_count', includeContributorForks);
              setContributorData(data);
          } catch (error) {
              console.error("Failed to load contributor data:", error);
          } finally {
              setLoadingStates(prev => ({ ...prev, contributor_count: false }));
          }
      };
      fetchContributorData();
  }, [includeContributorForks]);

  // Effect for all other cards (runs once on mount)
  useEffect(() => {
      const fetchOtherData = async () => {
          const metricsToFetch = ['fork_count', 'stargaze_count', 'repo_count', 'watcher_count', 'is_not_fork_ratio'];
          try {
              const promises = metricsToFetch.map(async (metric) => {
                  const data = await fetchDataForMetric(metric);
                  return { [metric]: data };
              });
              const results = await Promise.all(promises);
              const dataMap = results.reduce((acc, current) => ({ ...acc, ...current }), {});
              setOtherData(dataMap);
          } catch (error) {
              console.error("Failed to load other leaderboard data:", error);
          } finally {
              // Set loading to false for each of these metrics
              setLoadingStates(prev => ({
                  ...prev,
                  fork_count: false,
                  stargaze_count: false,
                  repo_count: false,
                  watcher_count: false,
                  is_not_fork_ratio: false,
              }));
          }
      };
      fetchOtherData();
  }, []); // Empty dependency array means this runs only once

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center mb-6">
        <HiFire className="w-8 h-8 mr-2 text-orange-500" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Trending Projects</h1>
      </div>

      {/* Step 3: Update isLoading prop for each card */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ProjectOutliersLeaderboardCard 
          title="Commit Change" metric="commit_count" metricLabel="Commits" data={commitData} 
          isLoading={loadingStates.commit_count} // Use specific loading state
          showToggle={true} toggleState={includeCommitForks} onToggleChange={setIncludeCommitForks} 
        />
        <ProjectOutliersLeaderboardCard 
          title="Contributor Change" metric="contributor_count" metricLabel="Contributors" data={contributorData} 
          isLoading={loadingStates.contributor_count} // Use specific loading state
          showToggle={true} toggleState={includeContributorForks} onToggleChange={setIncludeContributorForks}
        />
        <ProjectOutliersLeaderboardCard title="Fork Change" metric="fork_count" metricLabel="Forks" data={otherData['fork_count'] || []} isLoading={loadingStates.fork_count} />
        <ProjectOutliersLeaderboardCard title="Stargaze Change" metric="stargaze_count" metricLabel="Stars" data={otherData['stargaze_count'] || []} isLoading={loadingStates.stargaze_count} />
        <ProjectOutliersLeaderboardCard title="Repo Count Change" metric="repo_count" metricLabel="Repos" data={otherData['repo_count'] || []} isLoading={loadingStates.repo_count} />
        <ProjectOutliersLeaderboardCard title="Watcher Change" metric="watcher_count" metricLabel="Watchers" data={otherData['watcher_count'] || []} isLoading={loadingStates.watcher_count} />
        <ProjectOutliersLeaderboardCard title="Original Ratio Change" metric="is_not_fork_ratio" metricLabel="Ratio" data={otherData['is_not_fork_ratio'] || []} isLoading={loadingStates.is_not_fork_ratio} />
      </div>
    </div>
  );
}