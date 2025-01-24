'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { LanguageItem, TooltipProps } from '../types';
import languageData from '../data/top_languages_all_repos.json';
import otherLanguagesData from '../data/other_languages_repos.json';

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
  const [otherLanguages, setOtherLanguages] = useState<LanguageItem[]>([]);
  const [showOtherLanguages, setShowOtherLanguages] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setTopLanguages(
      languageData.map((item) => ({
        language_name: item.language_name,
        bytes: item.bytes,
        byte_dominance: item.byte_dominance,
      }))
    );
    setOtherLanguages(
      otherLanguagesData.map((item) => ({
        language_name: item.language_name,
        bytes: item.sum_bytes_by_language,
        byte_dominance: item.byte_dominance,
      }))
    );
  }, []);

  const checkIsMobile = () => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth < 768);
    }
  };

  useEffect(() => {
    checkIsMobile();

    const handleResize = () => {
      checkIsMobile();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    outerRadius,
    percent,
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
    const dominance = percent * 100;
    // Apply different logic for mobile and desktop
    if (isMobile && dominance <= 5) {
      return null; // Hide on mobile if dominance is less than or equal to 5%
    } else if (!isMobile && dominance <= 2) {
      return null; // Hide on desktop if dominance is less than or equal to 2%
    }

    const radius = isMobile ? outerRadius + 1 : outerRadius + 20; // Adjust the radius to position the label outside the pie
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (isMobile) {
      return (
        <text
          x={x}
          y={y}
          fill="white"
          textAnchor={x > cx ? 'start' : 'end'}
          dominantBaseline="central"
          style={{ fontSize: '12px' }}
        >
          <tspan x={x} dy="1.2em">{name}</tspan>
          <tspan x={x} dy="1.2em">({(percent * 100).toFixed(0)}%)</tspan>
        </text>
      );
    }

    // Render name and percentage outside for desktop
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
  };

  const CustomTooltip: React.FC<TooltipProps> = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as LanguageItem;
      return (
        <div className="bg-gray-800 text-white p-2 rounded-md shadow-md">
          <p className="label font-bold">{`${payload[0].name}`}</p>
          <p className="intro">
            {`Bytes: ${data.bytes.toLocaleString()}`}
          </p>
          <p className="intro">{`Dominance: ${(
            data.byte_dominance * 100
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

  // Toggle function
  const toggleOtherLanguages = () => {
    setShowOtherLanguages(!showOtherLanguages);
  };

  return (
    <div className="p-6">
      {/* Language Distribution Chart */}
      <div className="mt-20">
        <h3 className="text-2xl font-bold mb-4 text-center">
          Language Dominance - Entire Crypto Industry
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={topLanguages}
              cx="50%"
              cy="50%"
              labelLine={!isMobile}
              label={renderCustomizedLabel}
              outerRadius="80%"
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
        {/* Other Languages Toggle */}
        <div className="flex justify-center mt-4">
          <button
            onClick={toggleOtherLanguages}
            className="text-blue-500 hover:underline focus:outline-none"
          >
            {showOtherLanguages ? 'Hide Other' : 'View Other'}
          </button>
        </div>
        {/* Other Languages (Conditional) */}
        {showOtherLanguages && (
          <div className="flex justify-center mt-2">
            <p className="text-xs text-gray-400 text-center">
              {otherLanguages.map((lang, index) => (
                <React.Fragment key={lang.language_name}>
                  {lang.language_name} ({((lang.byte_dominance || 0) * 100).toFixed(2)}%)
                  {index < otherLanguages.length - 1 && ', '}
                </React.Fragment>
              ))}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LanguagesPage;