"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  VisibilityState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import topProjectsData from "../data/top_projects.json";

interface Project {
  project_name: string;
  project_rank: number;
  bytes_written: number;
  language_pct: number;
  stars_count: number;
  contributor_count: number;
  repo_count: number;
  fork_count: number;
  weighted_score: number;
  project_category: string;
  language_name: string;
}

const DevelopersPage: React.FC = () => {
  const [data, setData] = useState<Project[]>([]);
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "project_rank",
      desc: false,
    },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // State for multi-select filters
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  // State for dropdown visibility
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] =
    useState<boolean>(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] =
    useState<boolean>(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] =
    useState<boolean>(false);

  // Refs for dropdown containers
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("Imported JSON data:", topProjectsData);
    setData(topProjectsData);
  }, []);

  const columns = useMemo<ColumnDef<Project>[]>(
    () => [
      {
        header: "Project Name",
        accessorKey: "project_name",
        footer: (props) => props.column.id,
      },
      {
        header: "Language",
        accessorKey: "language_name",
        footer: (props) => props.column.id,
      },
      {
        header: "Rank",
        accessorKey: "project_rank",
        footer: (props) => props.column.id,
      },
      {
        header: "Bytes Written",
        accessorKey: "bytes_written",
        cell: ({ row }) => {
          const count = row.original.bytes_written;
          return new Intl.NumberFormat().format(count); // Format with commas
        },
        footer: (props) => props.column.id,
      },
      {
        header: "Language % Share of Project",
        accessorKey: "language_pct",
        cell: ({ row }) => (row.original.language_pct * 100).toFixed(2) + "%",
        footer: (props) => props.column.id,
      },
      {
        header: "Stars",
        accessorKey: "stars_count",
        cell: ({ row }) => {
          const count = row.original.stars_count;
          return new Intl.NumberFormat().format(count); // Format with commas
        },
        footer: (props) => props.column.id,
      },
      {
        header: "Contributors",
        accessorKey: "contributor_count",
        cell: ({ row }) => {
          const count = row.original.contributor_count;
          return new Intl.NumberFormat().format(count); // Format with commas
        },
        footer: (props) => props.column.id,
      },
      {
        header: "Repos",
        accessorKey: "repo_count",
        cell: ({ row }) => {
          const count = row.original.repo_count;
          return new Intl.NumberFormat().format(count); // Format with commas
        },
        footer: (props) => props.column.id,
      },
      {
        header: "Forks",
        accessorKey: "fork_count",
        cell: ({ row }) => {
          const count = row.original.fork_count;
          return new Intl.NumberFormat().format(count); // Format with commas
        },
        footer: (props) => props.column.id,
      },
      {
        header: "Category",
        accessorKey: "project_category",
        cell: ({ row }) => {
          const category = row.original.project_category;
          let bgColorClass = "";

          switch (category) {
            case "Top Project":
              bgColorClass = "bg-green-600"; // Dark green
              break;
            case "Leader":
              bgColorClass = "bg-blue-400"; // Light blue
              break;
            case "In-The-Mix":
              bgColorClass = "bg-yellow-600 text-black"; // Yellow with black text
              break;
            case "Laggard":
              bgColorClass = "bg-red-400 text-black"; // Red
              break;
            default:
              bgColorClass = "bg-gray-400"; // Default gray if not found
              break;
          }

          return (
            <div className={`${bgColorClass} px-2 py-1 rounded`}>
              {category}
            </div>
          );
        },
        footer: (props) => props.column.id,
      },
      {
        header: "Score",
        accessorKey: "weighted_score",
        cell: ({ row }) => row.original.weighted_score.toFixed(2), // Format to 2 decimal places
        footer: (props) => props.column.id,
      },
    ],
    []
  );

  // Get unique values for filter dropdowns
  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>();
    data.forEach((project) => {
      categories.add(project.project_category);
    });
    return Array.from(categories);
  }, [data]);

  const uniqueProjects = useMemo(() => {
    const projects = new Set<string>();
    data.forEach((project) => {
      projects.add(project.project_name);
    });
    return Array.from(projects);
  }, [data]);

  const uniqueLanguages = useMemo(() => {
    const languages = new Set<string>();
    data.forEach((project) => {
      languages.add(project.language_name);
    });
    return Array.from(languages);
  }, [data]);

  // Handle filter changes
  const handleCategoryFilterChange = (category: string) => {
    setSelectedCategories((prevSelectedCategories) => {
      const isSelected = prevSelectedCategories.includes(category);
      const nextSelectedCategories = isSelected
        ? prevSelectedCategories.filter((c) => c !== category)
        : [...prevSelectedCategories, category];

      // Update the column filters based on the selected categories
      setColumnFilters((prevFilters) => {
        const categoryFilter = prevFilters.find((f) => f.id === "project_category");

        if (nextSelectedCategories.length === 0) {
          return prevFilters.filter((f) => f.id !== "project_category");
        } else {
          const newFilter = {
            id: "project_category",
            value: nextSelectedCategories,
          };
          return categoryFilter
            ? prevFilters.map((f) =>
                f.id === "project_category" ? newFilter : f
              )
            : [...prevFilters, newFilter];
        }
      });

      return nextSelectedCategories;
    });
  };

  const handleProjectFilterChange = (project: string) => {
    setSelectedProjects((prevSelectedProjects) => {
      const isSelected = prevSelectedProjects.includes(project);
      const nextSelectedProjects = isSelected
        ? prevSelectedProjects.filter((p) => p !== project)
        : [...prevSelectedProjects, project];

      setColumnFilters((prevFilters) => {
        const projectFilter = prevFilters.find((f) => f.id === "project_name");

        if (nextSelectedProjects.length === 0) {
          return prevFilters.filter((f) => f.id !== "project_name");
        } else {
          const newFilter = { id: "project_name", value: nextSelectedProjects };
          return projectFilter
            ? prevFilters.map((f) =>
                f.id === "project_name" ? newFilter : f
              )
            : [...prevFilters, newFilter];
        }
      });

      return nextSelectedProjects;
    });
  };

  const handleLanguageFilterChange = (language: string) => {
    setSelectedLanguages((prevSelectedLanguages) => {
      const isSelected = prevSelectedLanguages.includes(language);
      const nextSelectedLanguages = isSelected
        ? prevSelectedLanguages.filter((l) => l !== language)
        : [...prevSelectedLanguages, language];

      setColumnFilters((prevFilters) => {
        const languageFilter = prevFilters.find((f) => f.id === "language_name");

        if (nextSelectedLanguages.length === 0) {
          return prevFilters.filter((f) => f.id !== "language_name");
        } else {
          const newFilter = {
            id: "language_name",
            value: nextSelectedLanguages,
          };
          return languageFilter
            ? prevFilters.map((f) =>
                f.id === "language_name" ? newFilter : f
              )
            : [...prevFilters, newFilter];
        }
      });

      return nextSelectedLanguages;
    });
  };

  // Toggle dropdown visibility
  const toggleCategoryDropdown = () => {
    setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
  };

  const toggleProjectDropdown = () => {
    setIsProjectDropdownOpen(!isProjectDropdownOpen);
  };

  const toggleLanguageDropdown = () => {
    setIsLanguageDropdownOpen(!isLanguageDropdownOpen);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
      if (
        projectDropdownRef.current &&
        !projectDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProjectDropdownOpen(false);
      }
      if (
        languageDropdownRef.current &&
        !languageDropdownRef.current.contains(event.target as Node)
      ) {
        setIsLanguageDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle option click for each filter
  const handleCategoryOptionClick = (category: string) => {
    handleCategoryFilterChange(category);
    setSelectedCategories(
      selectedCategories.includes(category)
        ? selectedCategories.filter((c) => c !== category)
        : [...selectedCategories, category]
    );
  };

  const handleProjectOptionClick = (project: string) => {
    handleProjectFilterChange(project);
    setSelectedProjects(
      selectedProjects.includes(project)
        ? selectedProjects.filter((p) => p !== project)
        : [...selectedProjects, project]
    );
  };

  const handleLanguageOptionClick = (language: string) => {
    handleLanguageFilterChange(language);
    setSelectedLanguages(
      selectedLanguages.includes(language)
        ? selectedLanguages.filter((l) => l !== language)
        : [...selectedLanguages, language]
    );
  };

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="p-4 bg-black text-white">
      <h1 className="text-2xl font-bold mb-4 mt-8 mb-8">
        Top Projects across Major Languages
      </h1>

      <div className="flex justify-start space-x-4 mb-4">
        <div className="relative" ref={projectDropdownRef}>
          <button
            onClick={toggleProjectDropdown}
            className="px-2 py-1 border border-gray-300 rounded bg-black text-white flex items-center"
          >
            Projects
            <svg
              className="ml-2 w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {isProjectDropdownOpen && (
            <div className="absolute z-10 mt-1 right-0 w-48 bg-gray-800 border border-gray-300 rounded shadow-lg">
              {uniqueProjects.map((project) => (
                <label
                  key={project}
                  className={`flex items-center px-4 py-2 cursor-pointer hover:bg-gray-700 text-white`}
                >
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-blue-600"
                    checked={selectedProjects.includes(project)}
                    onChange={() => handleProjectOptionClick(project)}
                  />
                  <span className="ml-2">{project}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={languageDropdownRef}>
          <button
            onClick={toggleLanguageDropdown}
            className="px-2 py-1 border border-gray-300 rounded bg-black text-white flex items-center"
          >
            Languages
            <svg
              className="ml-2 w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {isLanguageDropdownOpen && (
            <div className="absolute z-10 mt-1 right-0 w-48 bg-gray-800 border border-gray-300 rounded shadow-lg">
              {uniqueLanguages.map((language) => (
                <label
                  key={language}
                  className={`flex items-center px-4 py-2 cursor-pointer hover:bg-gray-700 text-white`}
                >
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-blue-600"
                    checked={selectedLanguages.includes(language)}
                    onChange={() => handleLanguageOptionClick(language)}
                  />
                  <span className="ml-2">{language}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={categoryDropdownRef}>
          <button
            onClick={toggleCategoryDropdown}
            className="px-2 py-1 border border-gray-300 rounded bg-black text-white flex items-center"
          >
            Categories
            <svg
              className="ml-2 w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {isCategoryDropdownOpen && (
            <div className="absolute z-10 mt-1 right-0 w-48 bg-gray-800 border border-gray-300 rounded shadow-lg">
              {uniqueCategories.map((category) => (
                <label
                  key={category}
                  className={`flex items-center px-4 py-2 cursor-pointer hover:bg-gray-700 text-white`}
                >
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-blue-600"
                    checked={selectedCategories.includes(category)}
                    onChange={() => handleCategoryOptionClick(category)}
                  />
                  <span className="ml-2">{category}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-black text-white">
          <thead className="bg-gray-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    {{
                      asc: " 🔼",
                      desc: " 🔽",
                    }[header.column.getIsSorted() as string] ?? null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-black text-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-800">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-300"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center space-x-2">
        <button
          className="px-3 py-1 border border-gray-300 rounded bg-black text-white"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
        >
          {"<<"}
        </button>
        <button
          className="px-3 py-1 border border-gray-300 rounded bg-black text-white"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {"<"}
        </button>
        <button
          className="px-3 py-1 border border-gray-300 rounded bg-black text-white"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          {">"}
        </button>
        <button
          className="px-3 py-1 border border-gray-300 rounded bg-black text-white"
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
        >
          {">>"}
        </button>
        <span className="text-sm text-white">
          Page{" "}
          <strong>
            {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </strong>{" "}
        </span>
        <span>
          | Go to page:{" "}
          <input
            type="number"
            defaultValue={table.getState().pagination.pageIndex + 1}
            onChange={(e) => {
              const page = e.target.value ? Number(e.target.value) - 1 : 0;
              table.setPageIndex(page);
            }}
            className="w-16 px-2 py-1 border rounded bg-black text-white"
          />
        </span>
        <select
          className="px-2 py-1 border border-gray-300 rounded bg-black text-white"
          value={table.getState().pagination.pageSize}
          onChange={(e) => {
            table.setPageSize(Number(e.target.value));
          }}
        >
          {[10, 20, 30, 40, 50].map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default DevelopersPage;