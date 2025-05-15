// make legend items into checkboxes for the user to toggle items on the chart.
// ./utilities/LegendCheckboxes.tsx
import React, { useMemo } from 'react'; 

interface ProjectLegendCheckboxesProps {
  allProjectTitles: string[];
  visibleProjects: Set<string>;
  onToggleProject: (projectTitle: string) => void;
  projectColors: Record<string, string>;
  isMobile: boolean;
  onItemMouseEnter: (projectTitle: string) => void;
  onItemMouseLeave: () => void;
  onSelectAll: () => void; // allow user to select all projects
  onClearAll: () => void;  // allow user to clear all projects
}

const ProjectLegendCheckboxes: React.FC<ProjectLegendCheckboxesProps> = ({
  allProjectTitles,
  visibleProjects,
  onToggleProject,
  projectColors,
  isMobile,
  onItemMouseEnter,
  onItemMouseLeave,
  onSelectAll, // Destructure
  onClearAll,   
}) => {
  const maxColumns = isMobile ? 2 : 7; // Adjust columns as needed
  // Ensure columnCount is at least 1 to avoid grid-cols-0 if allProjectTitles is empty during initial renders.
  const columnCount = Math.min(allProjectTitles.length > 0 ? allProjectTitles.length : 1, maxColumns);
  const columnClass = `grid-cols-${columnCount}`;

  // Sort titles alphabetically for consistent display in the legend
  // This helps if the order from `allProjectTitles` can change but you want a stable legend.
  const sortedTitlesForLegend = useMemo(() => {
    return [...allProjectTitles].sort((a, b) => a.localeCompare(b));
  }, [allProjectTitles]);

  return (
    <div className="mb-3 md:mb-4 text-xs sm:text-sm">
      {/* Container for Select All / Clear All */}
      <div className="flex justify-end items-center gap-x-3 sm:gap-x-4 mb-2 pr-1">
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
        {/* Optional: Add a visual separator if desired */}
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

      {/* Grid for legend items */}
      <div className={`grid ${columnClass} gap-x-2 gap-y-1.5`}> {/* Using Tailwind grid for layout */}
        {sortedTitlesForLegend.map((title) => (
          <div
            key={title}
            className="flex items-center cursor-pointer group py-0.5" // group for hover effects on children
            onClick={() => onToggleProject(title)}
            onMouseEnter={() => onItemMouseEnter(title)}
            onMouseLeave={onItemMouseLeave}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggleProject(title); }}
            role="checkbox"
            aria-checked={visibleProjects.has(title)}
            tabIndex={0} // Make div focusable
            title={title} // Show full title on hover if it's truncated
          >
            {/* Visually hidden real checkbox for semantics, custom styled span for appearance */}
            <input
              type="checkbox"
              id={`legend-checkbox-${title.replace(/\W/g, '-')}`} // Sanitize ID for special characters
              checked={visibleProjects.has(title)}
              onChange={() => onToggleProject(title)} // Keep for direct interaction if needed
              className="sr-only" // Tailwind class to visually hide but keep accessible
            />
            {/* Custom checkbox visual */}
            <span
              className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-sm border-2 flex-shrink-0 mr-1.5 sm:mr-2 group-hover:border-blue-400 transition-colors duration-150 ${
                visibleProjects.has(title) ? 'border-transparent' : 'border-gray-400 ' // Tailwind classes
              }`}
              style={{ backgroundColor: visibleProjects.has(title) ? projectColors[title] || '#ccc' : 'transparent' }}
              aria-hidden="true"
            ></span>
            <label
              htmlFor={`legend-checkbox-${title.replace(/\W/g, '-')}`} // Connects to the hidden checkbox
              className="cursor-pointer group-hover:text-blue-300 truncate select-none" // Tailwind classes
              style={{ color: projectColors[title] || '#f5f5f5' }} // Keep dynamic color, but can be Tailwind too
            >
              {title}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectLegendCheckboxes;