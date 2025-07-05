// app/trending/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, Spinner } from 'flowbite-react';
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

const ProjectOutliersLeaderboardCard: React.FC<ProjectOutliersLeaderboardCardProps> = ({ title, metric: _metric, metricLabel, isLoading, data }) => (
  <Card>
    <div className="mb-4 flex items-center justify-between">
      <h5 className="text-xl font-bold leading-none text-gray-900 dark:text-white">{title}</h5>
      <a href="#" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-500">
        View all
      </a>
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
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{item.project_title}</p>
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
  const [commitData, setCommitData] = useState<ProjectOutliersLeaderboardEntry[]>([]);
  const [forkData, setForkData] = useState<ProjectOutliersLeaderboardEntry[]>([]);
  const [stargazeData, setStargazeData] = useState<ProjectOutliersLeaderboardEntry[]>([]);
  const [contributorData, setContributorData] = useState<ProjectOutliersLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const metrics = [
          { name: 'commit_count', setter: setCommitData },
          { name: 'fork_count', setter: setForkData },
          { name: 'stargaze_count', setter: setStargazeData },
          { name: 'contributor_count', setter: setContributorData },
        ];

        // Fetch all leaderboard data in parallel
        await Promise.all(
          metrics.map(async (metric) => {
            const res = await fetch(`/api/get-project-outliers?metric=${metric.name}&limit=5`);
            if (!res.ok) throw new Error(`Failed to fetch ${metric.name}`);
            const data: ProjectOutliersLeaderboardEntry[] = await res.json();
            metric.setter(data);
          })
        );
      } catch (error) {
        console.error("Failed to load leaderboard data:", error);
        // Optionally set an error state here
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center mb-6">
        <HiFire className="w-8 h-8 mr-2 text-orange-500" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Trending Projects</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ProjectOutliersLeaderboardCard title="Commit Change" metric="commit_count" metricLabel="Commits" data={commitData} isLoading={isLoading} />
        <ProjectOutliersLeaderboardCard title="Fork Change" metric="fork_count" metricLabel="Forks" data={forkData} isLoading={isLoading} />
        <ProjectOutliersLeaderboardCard title="Stargaze Change" metric="stargaze_count" metricLabel="Stars" data={stargazeData} isLoading={isLoading} />
        <ProjectOutliersLeaderboardCard title="Contributor Change" metric="contributor_count" metricLabel="Contributors" data={contributorData} isLoading={isLoading} />
      </div>
    </div>
  );
}