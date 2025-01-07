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
import type { StarsDataItem, ForksDataItem } from './types';
import top100StarsData from './data/top_100_by_stargaze.json';
import top100ForksData from './data/top_100_forked_projects.json';

const HomePage: React.FC = () => {
  // const [windowWidth, setWindowWidth] = useState(0);

  // useEffect(() => {
  //   const handleResize = () => {
  //     setWindowWidth(window.innerWidth);
  //   };

  //   if (typeof window !== 'undefined') {
  //     setWindowWidth(window.innerWidth);
  //     window.addEventListener('resize', handleResize);
  //     return () => window.removeEventListener('resize', handleResize);
  //   }
  // }, []);

  const chartDataStars: StarsDataItem[] = useMemo(() => {
    const formattedData = Object.entries(top100StarsData.project_name).map(
      ([index, name]) => ({
        name: name as string,
        stars: top100StarsData.project_stargaze_count[
          index as keyof typeof top100StarsData.project_stargaze_count
        ] as number,
        forks: top100StarsData.project_repo_count[
          index as keyof typeof top100StarsData.project_repo_count
        ] as number,
      })
    );
    return formattedData;
  }, []);

  const chartDataForks: ForksDataItem[] = useMemo(() => {
    return top100ForksData.map((item) => ({
      name: item.project_name,
      forks: item.fork_count,
    }));
  }, []);

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
          <ResponsiveContainer width="100%" height={2500}>
            <BarChart
              data={chartDataStars}
              margin={{
                top: 40,
                right: 30,
                left: 120,
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
                width={150}
                interval={0}
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
        </div>

        {/* Forks Chart */}
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-4 text-center">By Forks</h3>
          <ResponsiveContainer width="100%" height={2500}>
            <BarChart
              data={chartDataForks}
              margin={{
                top: 40,
                right: 30,
                left: 120,
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
                width={150}
                interval={0}
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
        </div>
      </div>
    </div>
  );
};

export default HomePage;