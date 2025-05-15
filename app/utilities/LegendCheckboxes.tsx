// make legend items into checkboxes for the user to toggle items on the chart.
// ./utilities/LegendCheckboxes.tsx
import React, { useMemo } from 'react';

interface ProjectLegendCheckboxesProps {
  displayableProjectTitles: string[]; // Renamed from allProjectTitles
  visibleProjects: Set<string>;
  onToggleProject: (projectTitle: string) => void;
  projectColors: Record<string, string>;
  onItemMouseEnter: (projectTitle: string) => void;
  onItemMouseLeave: () => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  topNFilter: number; // New prop
  onTopNFilterChange: (newFilter: number) => void; // New prop
  maxColumnCount: number; // New prop (replaces direct use of isMobile for columns)
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
  maxColumnCount,
}) => {
  const columnCount = Math.min(displayableProjectTitles.length > 0 ? displayableProjectTitles.length : 1, maxColumnCount);
  // Ensure Tailwind can pick up these classes. Add to safelist if dynamic generation isn't reliable.
  // For JIT mode, this should work:
  const columnClass = `grid-cols-${columnCount}`;

  const sortedTitlesForLegend = useMemo(() => {
    return [...displayableProjectTitles].sort((a, b) => a.localeCompare(b));
  }, [displayableProjectTitles]);

  return (
    <div className="mb-3 md:mb-4 text-xs sm:text-sm">
      {/* Grid for legend items */}
      <div className={`grid ${columnClass} gap-x-2 gap-y-1.5`}>
        {sortedTitlesForLegend.map((title) => (
          <div
            key={title}
            className="flex items-center cursor-pointer group py-0.5"
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
              id={`legend-checkbox-${title.replace(/\W/g, '-')}`}
              checked={visibleProjects.has(title)}
              onChange={() => onToggleProject(title)} // Keep direct onChange for accessibility with keyboard navigation on checkbox itself
              className="sr-only" // Visually hidden, but still functional
            />
            <span
              className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-sm border-2 flex-shrink-0 mr-1.5 sm:mr-2 group-hover:border-blue-400 transition-colors duration-150 ${
                visibleProjects.has(title) ? 'border-transparent' : 'border-gray-400 '
              }`}
              style={{ backgroundColor: visibleProjects.has(title) ? projectColors[title] || '#ccc' : 'transparent' }}
              aria-hidden="true"
            ></span>
            <label
              htmlFor={`legend-checkbox-${title.replace(/\W/g, '-')}`} // Links to the hidden checkbox
              className="cursor-pointer group-hover:text-blue-300 truncate select-none"
              style={{ color: projectColors[title] || '#f5f5f5' }}
            >
              {title}
            </label>
          </div>
        ))}
      </div>

      {/* Container for Dropdown, Select All / Clear All */}
      <div className="flex justify-between items-center gap-x-3 sm:gap-x-4 mt-2 pt-1 border-t border-gray-700 sm:border-none sm:pt-0"> {/* Added top border for mobile, removed for sm+ */}
        {/* Dropdown group on the left */}
        <div className="flex items-center">
            <label htmlFor="top-n-filter-select" className="text-xs sm:text-sm text-gray-300 mr-1.5 sm:mr-2">Show:</label>
            <select
              id="top-n-filter-select"
              value={topNFilter}
              onChange={(e) => onTopNFilterChange(Number(e.target.value))}
              className="bg-gray-700 border border-gray-600 text-white text-xs sm:text-sm rounded p-1 sm:p-1.5 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Filter number of projects"
            >
              <option value={10}>Top 10</option>
              <option value={25}>Top 25</option>
              <option value={50}>Top 50</option>
            </select>
        </div>

        {/* Select All / Clear All group on the right */}
        <div className="flex items-center gap-x-3 sm:gap-x-4">
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
      </div>
    </div>
  );
};

export default ProjectLegendCheckboxes;