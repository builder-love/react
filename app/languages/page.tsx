'use client';

import React, { useState, useEffect } from 'react';
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
import type { LanguageTrendData, LanguageTrendChartDataItem, TooltipProps } from '../types';

// --- Color Palette ---
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4500',
  '#8A2BE2', '#DEB887', '#5F9EA0', '#D2691E'
];

// --- Custom Tooltip Component ---
const CustomTooltip: React.FC<TooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const sortedPayload = [...payload].sort((a, b) => b.value - a.value);

    return (
      <div className="bg-gray-800 text-white p-3 rounded-md shadow-md border border-gray-700">
        <p className="label font-bold text-lg mb-2">{`Date: ${new Date(label).toLocaleDateString()}`}</p>
        {sortedPayload.map((pld, index) => {
          const count = (pld.payload[`${pld.name}_count`] as number)?.toLocaleString() || 'N/A';
          const percentage = (pld.value * 100).toFixed(2);
          
          if (pld.value === 0) return null;

          return (
            <div key={index} style={{ color: pld.color }}>
              <strong>{pld.name}:</strong> {count} ({percentage}%)
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

// --- Main Page Component ---
const LanguageTrendPage: React.FC = () => {
  const [chartData, setChartData] = useState<LanguageTrendChartDataItem[]>([]);
  const [topLanguages, setTopLanguages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/get-language-trends');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch data');
        }
        const data: LanguageTrendData[] = await response.json();

        const groupedByTimestamp: { [key: string]: LanguageTrendData[] } = data.reduce((acc, item) => {
          const timestamp = item.latest_data_timestamp;
          if (!acc[timestamp]) acc[timestamp] = [];
          acc[timestamp].push(item);
          return acc;
        }, {} as { [key: string]: LanguageTrendData[] });

        const languageAverages: { [key: string]: number } = {};
        data.forEach(item => {
            const totalForTimestamp = groupedByTimestamp[item.latest_data_timestamp].reduce((sum, i) => sum + i.developer_count, 0);
            const percentage = totalForTimestamp > 0 ? (item.developer_count / totalForTimestamp) * 100 : 0;
            languageAverages[item.dominant_language] = (languageAverages[item.dominant_language] || 0) + percentage;
        });
        
        const top10Langs = Object.entries(languageAverages)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([lang]) => lang);
        setTopLanguages(top10Langs);

        const processedData = Object.entries(groupedByTimestamp).map(([timestamp, items]) => {
          const totalDevelopers = items.reduce((sum, item) => sum + item.developer_count, 0);
          const chartItem: LanguageTrendChartDataItem = { timestamp: new Date(timestamp).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) };
          
          top10Langs.forEach(lang => {
            const langData = items.find(item => item.dominant_language === lang);
            const percentage = langData && totalDevelopers > 0 ? langData.developer_count / totalDevelopers : 0;
            chartItem[lang] = percentage;
            chartItem[`${lang}_count`] = langData ? langData.developer_count : 0;
          });
          
          return chartItem;
        });

        processedData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setChartData(processedData);

      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) return <div className="text-center mt-20">Loading chart data...</div>;
  if (error) return <div className="text-center mt-20 text-red-500">Error: {error}</div>;

  return (
    <div className="p-6">
      <div className="mt-20">
        <h3 className="text-2xl font-bold mb-4 text-center">
          Language Contribution Trend by Developer Count
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            stackOffset="expand"
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
            <XAxis dataKey="timestamp" />
            <YAxis 
              tickFormatter={(tick) => `${(tick * 100).toFixed(0)}%`} 
              label={{ value: 'Percentage of Contributors', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}/>
            <Legend />
            {topLanguages.map((lang, index) => (
              <Bar 
                key={lang} 
                dataKey={lang} 
                stackId="a" 
                fill={COLORS[index % COLORS.length]} 
                name={lang}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LanguageTrendPage;