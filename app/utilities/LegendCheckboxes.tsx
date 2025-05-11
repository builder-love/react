// make legend items into checkboxes for the user to toggle items on the chart.
import React from 'react';

interface ProjectLegendCheckboxesProps {
  allProjectTitles: string[]; // All titles that can be toggled
  visibleProjects: Set<string>;
  onToggleProject: (projectTitle: string) => void;
  projectColors: Record<string, string>; // To color the legend item
  isMobile: boolean;
  onItemMouseEnter: (projectTitle: string) => void;
  onItemMouseLeave: () => void;
}

const ProjectLegendCheckboxes: React.FC<ProjectLegendCheckboxesProps> = ({
  allProjectTitles,
  visibleProjects,
  onToggleProject,
  projectColors,
  isMobile,
  onItemMouseEnter,
  onItemMouseLeave,
}) => {
  const legendStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap', 
    overflowX: 'visible',
    padding: isMobile ? '10px' : '20px',
    justifyContent: 'center',
    gap: '10px 15px', // Adds spacing between items
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: isMobile ? '12px' : '14px', // Slightly smaller font on mobile
  };

  const checkboxStyle: React.CSSProperties = {
    marginRight: '5px',
  };

  return (
    <div style={legendStyle} className="custom-project-legend">
      {allProjectTitles.map((title) => (
        <div
          key={title}
          style={itemStyle}
          onClick={() => onToggleProject(title)} // Make the whole item clickable
          onMouseEnter={() => onItemMouseEnter(title)}
          onMouseLeave={onItemMouseLeave}
        >
          <input
            type="checkbox"
            id={`legend-checkbox-${title.replace(/\s+/g, '-')}`} // Create a unique ID
            checked={visibleProjects.has(title)}
            onChange={() => {}} // onClick on div handles it, or use onToggleProject here too
            style={checkboxStyle}
          />
          <label
            htmlFor={`legend-checkbox-${title.replace(/\s+/g, '-')}`}
            style={{ color: visibleProjects.has(title) ? projectColors[title] || '#ccc' : '#888', cursor: 'pointer' }}
          >
            {title}
          </label>
        </div>
      ))}
    </div>
  );
};

export default ProjectLegendCheckboxes;