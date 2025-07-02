'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import type { TooltipProps, LanguageTrendData } from '../types';

interface ChartDataItem {
  timestamp: string;
  [language: string]: number | string; // Allows for dynamic language keys
}

// --- Color Palette ---
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4500',
  '#8A2BE2', '#DEB887', '#5F9EA0', '#D2691E', '#FF7F50', '#6495ED'
];

// --- Custom Tooltip Component ---
const CustomTooltip: React.FC<TooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 text-white p-3 rounded-md shadow-md border border-gray-700">
        <p className="label font-bold text-lg mb-2">{`Date: ${new Date(label).toLocaleDateString()}`}</p>
        {payload.map((pld, index) => (
          <div key={index} style={{ color: pld.color }}>
            <strong>{pld.name}:</strong> {(pld.value as number * 100).toFixed(2)}%
            <br />
            <span className="text-sm text-gray-400">
              Contributors: {(pld.payload[`${pld.name}_count`] as number)?.toLocaleString() || 'N/A'}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};


// --- Main Page Component ---
const LanguageTrendPage: React.FC = () => {
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
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

        // --- Data Processing ---
        // 1. Group by timestamp
        const groupedByTimestamp: { [key: string]: LanguageTrendData[] } = data.reduce((acc, item) => {
          const timestamp = item.latest_data_timestamp;
          if (!acc[timestamp]) {
            acc[timestamp] = [];
          }
          acc[timestamp].push(item);
          return acc;
        }, {} as { [key: string]: LanguageTrendData[] });

        // 2. Identify top 12 languages based on average contribution
        const languageAverages: { [key: string]: number } = {};
        const languageCounts: { [key: string]: number } = {};
        data.forEach(item => {
            const totalForTimestamp = groupedByTimestamp[item.latest_data_timestamp].reduce((sum, i) => sum + i.developer_count, 0);
            const percentage = totalForTimestamp > 0 ? (item.developer_count / totalForTimestamp) * 100 : 0;
            languageAverages[item.dominant_language] = (languageAverages[item.dominant_language] || 0) + percentage;
            languageCounts[item.dominant_language] = (languageCounts[item.dominant_language] || 0) + 1;
        });
        Object.keys(languageAverages).forEach(lang => {
            languageAverages[lang] /= Object.keys(groupedByTimestamp).length; // Average over all timestamps
        });
        
        const top12Langs = Object.entries(languageAverages)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 12)
          .map(([lang]) => lang);
        setTopLanguages(top12Langs);

        // 3. Pivot data for charting, including an "Other" category
        const processedData = Object.entries(groupedByTimestamp).map(([timestamp, items]) => {
          const totalDevelopers = items.reduce((sum, item) => sum + item.developer_count, 0);
          
          const chartItem: ChartDataItem = { timestamp: new Date(timestamp).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) };
          
          let topLangsTotalPercentage = 0;
          top12Langs.forEach(lang => {
            const langData = items.find(item => item.dominant_language === lang);
            const percentage = langData && totalDevelopers > 0 ? langData.developer_count / totalDevelopers : 0;
            chartItem[lang] = percentage;
            // Store raw count for tooltip
            chartItem[`${lang}_count`] = langData ? langData.developer_count : 0;
            topLangsTotalPercentage += percentage;
          });

          // Aggregate remaining languages into "Other"
          const otherPercentage = 1 - topLangsTotalPercentage;
          chartItem['Other'] = otherPercentage < 0 ? 0 : otherPercentage; // Clamp at 0
          
          return chartItem;
        });

        // Sort data chronologically
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

  const languagesForChart = useMemo(() => [...topLanguages, 'Other'], [topLanguages]);

  if (isLoading) {
    return <div className="text-center mt-20">Loading chart data...</div>;
  }
  if (error) {
    return <div className="text-center mt-20 text-red-500">Error: {error}</div>;
  }

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
            stackOffset="expand" // This creates the 100% stacked effect
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
            <XAxis dataKey="timestamp" />
            <YAxis 
              tickFormatter={(tick) => `${(tick * 100).toFixed(0)}%`} 
              label={{ value: 'Percentage of Contributors', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}/>
            <Legend />
            {languagesForChart.map((lang, index) => (
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