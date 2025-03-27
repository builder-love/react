'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TopStarsData, TopForkData } from './types';

const HomePage: React.FC = () => {
  // --- State Hooks for Data ---
  // Use ForksDataItem for the chart data state
  const [chartDataForks, setChartDataForks] = useState<TopForkData[]>([]);
  const [isLoadingForks, setIsLoadingForks] = useState<boolean>(true); // Specific loading state
  const [errorForks, setErrorForks] = useState<string | null>(null); // Specific error state

  // Use StarsDataItem for the chart data state
  const [chartDataStars, setChartDataStars] = useState<TopStarsData[]>([]);
  const [isLoadingStars, setIsLoadingStars] = useState<boolean>(true); // Specific loading state
  const [errorStars, setErrorStars] = useState<string | null>(null); // Specific error state

  // --- Fetch Forks Data ---
  useEffect(() => {
    const fetchForksData = async () => {
      setIsLoadingForks(true);
      setErrorForks(null);

      try {
        console.log("Fetching top forks data from API route");
        const response = await fetch('/api/get-top-forks'); // Your Vercel API route

        if (!response.ok) {
          let errorDetail = `HTTP error! status: ${response.status}`;
          try {
            const errorData = await response.json();
            errorDetail = errorData.message || errorDetail;
          } catch (jsonError) {
             console.error("Error parsing JSON error response:", jsonError);
          }
          throw new Error(errorDetail);
        }

        const apiData: TopForkData[] = await response.json();

        // *** Data Transformation ***
        const formattedChartData = apiData.map(item => ({
            name: item.project_title,
            forks: item.forks,
            project_title: item.project_title,
            latest_data_timestamp: item.latest_data_timestamp
        }));

        setChartDataForks(formattedChartData); // Set the transformed data

      } catch (err: unknown) {
        let message = 'An unknown error occurred fetching fork data';
        if (err instanceof Error) {
          message = err.message;
          console.error("Fetching forks error:", err);
        } else {
          console.error("Unexpected forks error type:", err);
          message = String(err) || message;
        }
        setErrorForks(message);
      } finally {
        setIsLoadingForks(false);
      }
    };

    fetchForksData();
  }, []); // Runs once on mount

  // --- Fetch Stars Data ---
  useEffect(() => {
    const fetchStarsData = async () => {
      setIsLoadingStars(true);
      setErrorStars(null);

      try {
        console.log("Fetching top stars data from API route");
        const response = await fetch('/api/get-top-stars'); // Your Vercel API route

        if (!response.ok) {
          let errorDetail = `HTTP error! status: ${response.status}`;
          try {
            const errorData = await response.json();
            errorDetail = errorData.message || errorDetail;
          } catch (jsonError) {
             console.error("Error parsing JSON error response:", jsonError);
          }
          throw new Error(errorDetail);
        }

        const apiData: TopStarsData[] = await response.json();

        // *** Data Transformation ***
        const formattedChartData = apiData.map(item => ({
            name: item.project_title,
            stars: item.stars,
            project_title: item.project_title,
            latest_data_timestamp: item.latest_data_timestamp
        }));

        setChartDataStars(formattedChartData); // Set the transformed data

      } catch (err: unknown) {
        let message = 'An unknown error occurred fetching stars data';
        if (err instanceof Error) {
          message = err.message;
          console.error("Fetching stars error:", err);
        } else {
          console.error("Unexpected stars error type:", err);
          message = String(err) || message;
        }
        setErrorStars(message);
      } finally {
        setIsLoadingStars(false);
      }
    };

    fetchStarsData();
  }, []); // Runs once on mount

  const formatYAxisLabel = (name: string) => {
    if (name.length > 15) {
      return name.substring(0, 15) + '...';
    }
    return name;
  };

  return (
    <div className="p-6">
      <div className="flex justify-center w-full">
        <h2 className="text-2xl font-bold mb-4 text-center">
          Top 100 Projects
        </h2>
      </div>
      <div className="flex flex-col md:flex-row gap-8">
        {/* Stars Chart */}
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-4 text-center">By Stars</h3>
          {isLoadingStars ? (
            <div className="text-center p-10">Loading stars data...</div>
          ) : errorStars ? (
            <div className="text-center p-10 text-red-500">Error loading stars: {errorStars}</div>
          ) : chartDataStars.length > 0 ? (
          <ResponsiveContainer width="100%" height={2500}>
            <BarChart
              data={chartDataStars}
              margin={{
                top: 40,
                right: 10,
                left: 10,
                bottom: 5,
              }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="transparent" />
              <XAxis
                type="number"
                tickFormatter={(value: number) => value.toLocaleString()}
                domain={[0, 'dataMax']}
                orientation="top"
              />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 12 }}
                width={120}
                interval={0}
                tickFormatter={formatYAxisLabel}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  value.toLocaleString(),
                  name,
                ]}
                contentStyle={{ backgroundColor: '#222', color: '#f5f5f5' }}
              />
              <Legend
                payload={[
                  {
                    value: 'Repo Stargaze Count',
                    type: 'rect',
                    id: 'repo-stargaze-count-legend',
                    color: '#8884d8',
                  },
                ]}
                wrapperStyle={{ bottom: 0 }}
              />
              <Bar dataKey="stars" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
          ) : (
            <div className="text-center p-10">No stars data available.</div>
          )}
        </div>

        {/* Forks Chart */}
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-4 text-center">By Forks</h3>
          {isLoadingForks ? (
            <div className="text-center p-10">Loading forks data...</div>
          ) : errorForks ? (
            <div className="text-center p-10 text-red-500">Error loading forks: {errorForks}</div>
          ) : chartDataForks.length > 0 ? (
          <ResponsiveContainer width="100%" height={2500}>
            <BarChart
              data={chartDataForks}
              margin={{
                top: 40,
                right: 10,
                left: 10,
                bottom: 5,
              }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="transparent" />
              <XAxis
                type="number"
                tickFormatter={(value: number) => value.toLocaleString()}
                domain={[0, 'dataMax']}
                orientation="top"
              />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 12 }}
                width={120}
                interval={0}
                tickFormatter={formatYAxisLabel}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  value.toLocaleString(),
                  name,
                ]}
                contentStyle={{ backgroundColor: '#222', color: '#f5f5f5' }}
              />
              <Legend
                payload={[
                  {
                    value: 'Repo Fork Count',
                    type: 'rect',
                    id: 'repo-fork-count-legend',
                    color: '#82ca9d',
                  },
                ]}
                wrapperStyle={{ bottom: 0 }}
              />
              <Bar dataKey="forks" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
          ) : (
            <div className="text-center p-10">No fork data available.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;