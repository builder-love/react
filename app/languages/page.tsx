'use client';

import React, { useState, useEffect } from 'react';
import { Card } from 'flowbite-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { schemeTableau10 } from 'd3-scale-chromatic';
import type { LanguageTrendData, LanguageTrendChartDataItem, TooltipProps } from '../types';

// --- Color Palette ---
const COLORS = schemeTableau10;;

// --- Custom Tooltip Component ---
const CustomTooltip: React.FC<TooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const sortedPayload = [...payload].sort((a, b) => b.value - a.value);
    const total = sortedPayload.reduce((sum, entry) => sum + entry.value, 0);

    return (
      <div className="bg-gray-800 text-white p-3 rounded-md shadow-lg border border-gray-700">
        <p className="label font-bold text-lg mb-2">{`Date: ${new Date(label).toLocaleDateString()}`}</p>
        {sortedPayload.map((pld, index) => {
          const count = pld.value.toLocaleString();
          const percentage = total > 0 ? ((pld.value / total) * 100).toFixed(2) : 0;

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
            languageAverages[item.dominant_language] = (languageAverages[item.dominant_language] || 0) + item.developer_count;
        });
        
        const top10Langs = Object.entries(languageAverages)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([lang]) => lang);
        setTopLanguages(top10Langs);

        const processedData = Object.entries(groupedByTimestamp).map(([timestamp, items]) => {
          const chartItem: LanguageTrendChartDataItem = { timestamp: new Date(timestamp).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) };
          
          top10Langs.forEach(lang => {
            const langData = items.find(item => item.dominant_language === lang);
            // **FIX**: Ensure raw developer_count is used, not a percentage
            chartItem[lang] = langData ? langData.developer_count : 0;
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

  if (isLoading) return <div className="text-center mt-20 p-4">Loading chart data...</div>;
  if (error) return <div className="text-center mt-20 p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-4 md:p-6">
      <Card>
        <h3 className="text-2xl font-bold mb-4 text-center">
          Contributor Count by Dominant Language
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart
            data={chartData}
            // Increased left margin for better label spacing
            margin={{ top: 10, right: 30, left: 40, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis dataKey="timestamp" />
            <YAxis 
              tickFormatter={(tick) => new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(tick as number)}
              label={{ value: 'Total Contributors', angle: -90, position: 'insideLeft', offset: -15 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {topLanguages.map((lang, index) => (
              <Area 
                key={lang}
                type="monotone"
                dataKey={lang} 
                stackId="1"
                stroke={COLORS[index % COLORS.length]} 
                fill={COLORS[index % COLORS.length]} 
                name={lang}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

export default LanguageTrendPage;