'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { LanguageItem, Payload, TooltipProps } from '../types';
import languageData from '../data/top_languages_all_repos.json';

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

const LanguagesPage: React.FC = () => {
  const [topLanguages, setTopLanguages] = useState<LanguageItem[]>([]);

  useEffect(() => {
    setTopLanguages(languageData);
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
  }: {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
    index: number;
    name: string;
  }) => {
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
          style={{ fontSize: '14px' }}
        >
          {`${name}: ${(percent * 100).toFixed(0)}%`}
        </text>
      );
    } else {
      return null;
    }
  };

  const CustomTooltip: React.FC<TooltipProps> = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as LanguageItem; // Cast payload to LanguageItem
      return (
        <div className="bg-gray-800 text-white p-2 rounded-md shadow-md">
          <p className="label font-bold">{`${payload[0].name}`}</p>
          <p className="intro">
            {`Bytes: ${data.bytes.toLocaleString()}`}
          </p>
          <p className="intro">{`Dominance: ${(data.byte_dominance * 100).toFixed(
            2
          )}%`}</p>
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
      {/* Language Distribution Chart */}
      <div className="mt-20">
        <h3 className="text-2xl font-bold mb-4 text-center">
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

export default LanguagesPage;