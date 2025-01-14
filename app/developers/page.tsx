'use client';

import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CustomScatterData } from '../types';

// Import data for each language
import solidityData from '../data/top_solidity_projects.json';
import cData from '../data/top_c_projects.json';
import goData from '../data/top_go_projects.json';
import rustData from '../data/top_rust_projects.json';

const DevelopersPage: React.FC = () => {

  // Create a function to render a bubble chart for a given language
  const renderBubbleChart = (data: CustomScatterData[], language: string) => (
    <div key={language} className="mb-8">
      <h2 className="text-xl font-bold text-blue-500 mb-4">{`Top ${language} Projects`}</h2>
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart
          margin={{
            top: 20,
            right: 20,
            bottom: 100, // Increased bottom margin for labels
            left: 80,
          }}
        >
          <XAxis
            type="number"
            dataKey="contributor_count"
            name="Contributors"
            tickFormatter={(value) => value.toLocaleString()}
            label={{ value: 'Number of Contributors', position: 'bottom', offset: 50 }} // Added label
          />
          <YAxis
            type="number"
            dataKey="stars_count"
            name="Stars"
            tickFormatter={(value) => value.toLocaleString()}
            label={{ value: 'Number of Stars', angle: -90, position: 'left', offset: 30 }} // Added label
          />
          <ZAxis type="number" dataKey="repo_count" range={[60, 400]} name="Repos" />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ payload }) => {
              if (payload && payload.length) {
                return (
                  <div className="bg-white p-2 border rounded text-black">
                    <p className="font-bold">{payload[0].payload.project_name}</p>
                    <p>Contributors: {payload[0].payload.contributor_count.toLocaleString()}</p>
                    <p>Stars: {payload[0].payload.stars_count.toLocaleString()}</p>
                    <p>Repos: {payload[0].payload.repo_count.toLocaleString()}</p> {/* Format repo count */}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
          <Scatter name={language} data={data} fill="#8884d8" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="p-6">
      {/* Render bubble charts for each language */}
      {renderBubbleChart(solidityData, 'Solidity')}
      {renderBubbleChart(cData, 'C')}
      {renderBubbleChart(goData, 'Go')}
      {renderBubbleChart(rustData, 'Rust')}
    </div>
  );
};

export default DevelopersPage;