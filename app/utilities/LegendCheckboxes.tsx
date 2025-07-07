// app/utilities/LegendCheckboxes.tsx

'use client'; // Good practice if it might contain client-side logic or be used in varied contexts

import { ToggleSwitch } from 'flowbite-react';
import React, { useEffect, useMemo } from 'react';

interface ProjectLegendCheckboxesProps {
  displayableProjectTitles: string[];
  visibleProjects: Set<string>;
  onToggleProject: (projectTitle: string) => void;
  projectColors: Record<string, string>;
  onItemMouseEnter: (projectTitle: string) => void;
  onItemMouseLeave: () => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  topNFilter: number;
  onTopNFilterChange: (newFilter: number) => void;
  includeForks: boolean;
  onIncludeForksChange: (checked: boolean) => void;
  maxColumnCount: number;
  isMobile: boolean; // Assuming this prop is passed from page.tsx
  isLoading: boolean;
}

const ProjectLegendCheckboxes: React.FC<ProjectLegendCheckboxesProps> = ({
  displayableProjectTitles,
  visibleProjects,
  onToggleProject,
  projectColors,
  onItemMouseEnter,
  onItemMouseLeave,
  onSelectAll,
  onClearAll,
  topNFilter,
  onTopNFilterChange,
  includeForks,
  onIncludeForksChange,
  maxColumnCount,
  isMobile,
  isLoading,
}) => {
  // console.log("LegendCheckboxes - isMobile prop:", isMobile); // For debugging

  const columnCount = Math.min(displayableProjectTitles.length > 0 ? displayableProjectTitles.length : 1, maxColumnCount);
  // Ensure your tailwind.config.ts safelist includes up to the maxColumnCount
  // e.g., if maxColumnCount can be 7, safelist 'grid-cols-1' through 'grid-cols-7'
  const columnClass = `grid-cols-${columnCount}`;

  const topNOptions = useMemo(() => isMobile
    ? [
        { value: 10, label: "Top 10" },
        { value: 20, label: "Top 20" },
      ]
    : [
        { value: 10, label: "Top 10" },
        { value: 25, label: "Top 25" },
        { value: 50, label: "Top 50" },
      ],
    [isMobile]
  );

  useEffect(() => {
    if (isMobile) {
      if (topNFilter !== 10 && topNFilter !== 20) {
        onTopNFilterChange(10);
      }
    } else {
      const validDesktopValues = topNOptions.map(opt => opt.value);
      if (!validDesktopValues.includes(topNFilter)) {
        onTopNFilterChange(10);
      }
    }
  }, [isMobile, topNFilter, onTopNFilterChange, topNOptions]);

  return (
    <div className="mb-3 md:mb-4 text-xs sm:text-sm">
      {/* Grid for legend items */}
      <div className={`grid ${columnClass} gap-x-2 gap-y-1.5`}>
        {displayableProjectTitles.map((title) => (
          <div
            key={title}
            className="flex items-center cursor-pointer group py-0.5 min-w-0"
            onClick={() => onToggleProject(title)}
            onMouseEnter={() => onItemMouseEnter(title)}
            onMouseLeave={onItemMouseLeave}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggleProject(title); }}
            role="checkbox"
            aria-checked={visibleProjects.has(title)}
            tabIndex={0}
            title={title}
          >
            <input
              type="checkbox"
              id={`legend-checkbox-${title.replace(/\W/g, '-')}`} // Sanitize title for ID
              checked={visibleProjects.has(title)}
              onChange={() => onToggleProject(title)} // Direct toggle, input is sr-only
              className="sr-only"
            />
            <span
              className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-sm border-2 flex-shrink-0 mr-1.5 sm:mr-2 group-hover:border-blue-400 transition-colors duration-150 ${
                visibleProjects.has(title) ? 'border-transparent' : 'border-gray-400 '
              }`}
              style={{ backgroundColor: visibleProjects.has(title) ? projectColors[title] || '#ccc' : 'transparent' }}
              aria-hidden="true"
            ></span>
            <label
              htmlFor={`legend-checkbox-${title.replace(/\W/g, '-')}`} // Sanitize title for htmlFor
              className="cursor-pointer group-hover:text-blue-300 truncate select-none"
              style={{ color: projectColors[title] || '#f5f5f5' }}
            >
              {title}
            </label>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center mt-3 pt-2 border-t border-gray-700">
        {/* "Select All" and "Clear All" links - Left Aligned Group */}
        <div className="flex items-center gap-x-3 sm:gap-x-4 mb-2 sm:mb-0">
          <span
            onClick={onSelectAll}
            className="cursor-pointer hover:text-blue-400 text-gray-300 font-medium"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectAll(); }}
            aria-label="Select all projects"
          >
            Select All
          </span>
          <span className="text-gray-500">|</span>
          <span
            onClick={onClearAll}
            className="cursor-pointer hover:text-blue-400 text-gray-300 font-medium"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClearAll(); }}
            aria-label="Clear all projects"
          >
            Clear All
          </span>
        </div>

        {/* NEW: Right Aligned Group for Toggle and Dropdown */}
        <div className="flex items-center gap-x-4 sm:gap-x-6">
          {/* Include Forks Toggle */}
          <div className="flex items-center space-x-2">
            <span className="text-xs sm:text-sm font-medium text-gray-400">Include Fork History</span>
            <ToggleSwitch 
              checked={includeForks} 
              onChange={onIncludeForksChange} 
              disabled={isLoading} 
            />
          </div>

          {/* Top N Dropdown Filter */}
          <select
            id="top-n-filter-select"
            value={topNFilter}
            onChange={(e) => onTopNFilterChange(Number(e.target.value))}
            className="bg-gray-700 border border-gray-600 text-white text-xs sm:text-sm rounded p-1 sm:p-1.5 focus:ring-blue-500 focus:border-blue-500"
            aria-label="Filter number of projects"
          >
            {topNOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default ProjectLegendCheckboxes;