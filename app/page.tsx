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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { StarsDataItem, ForksDataItem, LanguageItem } from './types';
import top100StarsData from './data/top_100_by_stargaze.json';
import top100ForksData from './data/top_100_forked_projects.json';
import languageData from './data/top_languages_all_repos.json';

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#AF19FF',
  '#FF4500',
  '#808000',
  '#800080',
  '#008080',
];

const RADIAN = Math.PI / 180;

const HomePage: React.FC = () => {
  const [topLanguages, setTopLanguages] = useState<LanguageItem[]>([]);

  useEffect(() => {
    // Directly assign the imported JSON data to the state
    setTopLanguages(languageData);
  }, []);

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

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    index,
    name,
  }: any) => {
    const radius = outerRadius + 20; // Adjust the radius to position the label outside the pie
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    const dominance = percent * 100;
    if (dominance >= 3) {
      return (
        <text
          x={x}
          y={y}
          fill="white"
          textAnchor={x > cx ? 'start' : 'end'}
          dominantBaseline="central"
        >
          {`${name}: ${(percent * 100).toFixed(0)}%`}
        </text>
      );
    } else {
      return null;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 text-white p-2 rounded-md shadow-md">
          <p className="label font-bold">{`${payload[0].name}`}</p>
          <p className="intro">{`Bytes: ${payload[0].payload.bytes.toLocaleString()}`}</p>
          <p className="intro">{`Dominance: ${(
            payload[0].payload.byte_dominance * 100
          ).toFixed(2)}%`}</p>
        </div>
      );
    }

    return null;
  };

  // Calculate total bytes
  const totalBytes = useMemo(() => {
    return topLanguages.reduce((sum, lang) => sum + lang.bytes, 0);
  }, [topLanguages]);

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

      {/* Language Distribution Chart */}
      <div className="mt-20">
        <h3 className="text-xl font-bold mb-4 text-center">
          Language Dominance - Entire Crypto Industry
        </h3>
        <ResponsiveContainer width="100%" height={500}>
          <PieChart>
            <Pie
              data={topLanguages}
              cx="50%"
              cy="50%"
              labelLine={true}
              label={renderCustomizedLabel}
              outerRadius={200}
              fill="#8884d8"
              dataKey="bytes"
              nameKey="language_name"
            >
              {topLanguages.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Callout Field */}
        <div className="flex justify-center">
          <p className="text-md text-gray-400 text-center mt-2">
            {totalBytes.toLocaleString()} bytes and counting
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;