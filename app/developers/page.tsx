'use client';
import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  FilterFn,
} from '@tanstack/react-table';
import { Top100Contributor } from '../types';
import { useScreenOrientation } from '../hooks/useScreenOrientation';

// Define a custom filter function for multi-select
const multiSelectFilter: FilterFn<Top100Contributor> = (row, columnId, filterValue: string[]) => {
  const rawValue = row.getValue(columnId);
  const value = String(rawValue);
  return filterValue.includes(value);
};

interface CustomCheckboxProps {
  checked: boolean;
  onChange: () => void;
}

const CustomCheckbox: React.FC<CustomCheckboxProps> = ({ checked, onChange }) => {
  return (
    <div
      className={`w-4 h-4 border rounded cursor-pointer flex items-center justify-center ${
        checked ? "bg-blue-600 border-blue-600" : "bg-gray-800 border-gray-300"
      }`}
      onClick={onChange}
    >
      {checked && (
        <svg
          className="w-3 h-3 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}
    </div>
  );
};

const ContributorsPage: React.FC = () => {
  const [data, setData] = useState<Top100Contributor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: 'contributor_rank',
      desc: false,
    },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState<string>('');

  const { isMobile } = useScreenOrientation();

  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedDominantLanguages, setSelectedDominantLanguages] = useState<string[]>([]);

  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState<boolean>(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState<boolean>(false);

  const locationDropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);

  const [activeRowData, setActiveRowData] = useState<Top100Contributor | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/get-top100-contributors');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: `HTTP error! status: ${response.status}` }));
          throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
        const result: Top100Contributor[] = await response.json();
        setData(result);
      } catch (e) {
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError("An unknown error occurred while fetching contributor data.");
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const columns = useMemo<ColumnDef<Top100Contributor>[]>(
    () => [
      {
        header: 'Builder Rank',
        accessorKey: 'contributor_rank',
        id: 'contributor_rank',
        cell: ({ getValue }) => <div className="text-center text-sm md:text-base">{getValue<number>()?.toLocaleString() ?? 'N/A'}</div>,
        size: 70, // Explicit size for rank
      },
      {
        header: 'Github Login',
        accessorKey: 'contributor_login',
        id: 'contributor_login',
        cell: ({ row }) => {
            const login = row.original.contributor_login;
            const url = row.original.contributor_html_url;
            return (
                <div className="truncate text-sm md:text-base" title={login}> {/* Added truncate and title */}
                    {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 hover:underline"
                        >
                          {login}
                        </a>
                    ) : (
                        login
                    )}
                </div>
            );
        },
        size: 150, // Explicit size
      },
      {
        header: 'Anon?',
        accessorKey: 'is_anon',
        id: 'is_anon',
        cell: ({ getValue }) => {
            const value = getValue<boolean | null>();
            let displayValue = 'N/A';
            if (value === true) displayValue = 'Yes';
            else if (value === false) displayValue = 'No';
            return <div className="text-center text-sm md:text-base">{displayValue}</div>;
        },
        size: 60, // Explicit size
      },
      {
        header: 'Dominant Language',
        accessorKey: 'dominant_language',
        id: 'dominant_language',
        cell: ({ getValue }) => {
            const lang = getValue<string>() ?? 'N/A';
            return <div className="truncate text-sm md:text-base" title={lang}>{lang}</div>; // Added truncate and title
        },
        filterFn: multiSelectFilter,
        size: 120, // Explicit size
      },
      {
        header: 'Location',
        accessorKey: 'location',
        id: 'location',
        cell: ({ getValue }) => {
            const loc = getValue<string>() ?? 'N/A';
            return <div className="truncate text-sm md:text-base" title={loc}>{loc}</div>; // Added truncate and title
        },
        filterFn: multiSelectFilter,
        size: 130, // Explicit size
      },
      {
        header: 'Contributions', 
        accessorKey: 'total_contributions',
        id: 'total_contributions',
        cell: ({ getValue }) => <div className="text-right text-sm md:text-base">{getValue<number>()?.toLocaleString() ?? 'N/A'}</div>,
        size: 100, // Explicit size
      },
      {
        header: 'Associated Blockchain Repos',
        accessorKey: 'total_repos_contributed_to',
        id: 'total_repos_contributed_to',
        cell: ({ getValue }) => <div className="text-right text-sm md:text-base">{getValue<number>()?.toLocaleString() ?? 'N/A'}</div>,
        size: 80, // Explicit size
      },
      {
        header: 'Associated Repos - Relative Strength',
        accessorKey: 'normalized_total_repo_quality_weighted_contribution_score_rank',
        id: 'normalized_total_repo_quality_weighted_contribution_score_rank',
        cell: ({ getValue }) => <div className="text-right text-sm md:text-base">{getValue<number>()?.toLocaleString() ?? 'N/A'}</div>,
        size: 80, // Explicit size
      },
      {
        header: 'Contributions to Non-Forked Repos',
        accessorKey: 'contributions_to_og_repos',
        id: 'contributions_to_og_repos',
        cell: ({ getValue }) => <div className="text-right text-sm md:text-base">{getValue<number>()?.toLocaleString() ?? 'N/A'}</div>,
        size: 80, // Explicit size
      },
      {
        header: 'Followers',
        accessorKey: 'followers_total_count',
        id: 'followers_total_count',
        cell: ({ getValue }) => <div className="text-right text-sm md:text-base">{getValue<number>()?.toLocaleString() ?? 'N/A'}</div>,
        size: 90, // Explicit size
      },
      {
        header: 'Builder Score',
        accessorKey: 'weighted_score_index',
        id: 'weighted_score_index',
        cell: ({ getValue }) => <div className="text-right text-sm md:text-base">{getValue<number>()?.toFixed(2) ?? 'N/A'}</div>,
        size: 80, // Explicit size
      },
    ],
    []
  );

  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    data.forEach((contributor) => contributor.location && locations.add(contributor.location));
    return Array.from(locations).sort();
  }, [data]);

  const uniqueDominantLanguages = useMemo(() => {
    const languages = new Set<string>();
    data.forEach((contributor) => contributor.dominant_language && languages.add(contributor.dominant_language));
    return Array.from(languages).sort();
  }, [data]);

  const updateColumnFilters = (columnId: string, selectedValues: string[]) => {
    setColumnFilters((prevFilters) => {
      const existingFilter = prevFilters.find((f) => f.id === columnId);
      if (selectedValues.length === 0) {
        return prevFilters.filter((f) => f.id !== columnId);
      } else {
        const newFilter = { id: columnId, value: selectedValues };
        return existingFilter ? prevFilters.map((f) => (f.id === columnId ? newFilter : f)) : [...prevFilters, newFilter];
      }
    });
  };

  const handleLocationFilterChange = (location: string) => {
    setSelectedLocations((prevSelected) => {
      const newSelected = prevSelected.includes(location) ? prevSelected.filter((l) => l !== location) : [...prevSelected, location];
      updateColumnFilters('location', newSelected);
      return newSelected;
    });
  };

  const handleDominantLanguageFilterChange = (language: string) => {
    setSelectedDominantLanguages((prevSelected) => {
      const newSelected = prevSelected.includes(language) ? prevSelected.filter((l) => l !== language) : [...prevSelected, language];
      updateColumnFilters('dominant_language', newSelected);
      return newSelected;
    });
  };

  const toggleLocationDropdown = () => setIsLocationDropdownOpen(!isLocationDropdownOpen);
  const toggleLanguageDropdown = () => setIsLanguageDropdownOpen(!isLanguageDropdownOpen);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) setIsLocationDropdownOpen(false);
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) setIsLanguageDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Current mobile visibility - adjust if Location/Language should be visible on mobile
    if (isMobile) {
      setColumnVisibility({
        location: false,
        total_repos_contributed_to: false,
        followers_total_count: false,
        weighted_score_index: false,
        is_anon: false, 
        total_contributions: false,
        contributions_to_og_repos: false,
        normalized_total_repo_quality_weighted_contribution_score_rank: false,
      });
    } else {
      setColumnVisibility({});
    }
  }, [isMobile]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    filterFns: { multiSelect: multiSelectFilter },
    defaultColumn: { // Can set default min/max size for columns if not specified
      minSize: 50,
    }
  });

  useEffect(() => {
    const handleClickOutsideTooltip = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('.tooltip-trigger')) closeTooltip();
    };
    document.addEventListener('mousedown', handleClickOutsideTooltip);
    return () => document.removeEventListener('mousedown', handleClickOutsideTooltip);
  }, []);

  const handleRowHover = (rowData: Top100Contributor) => setActiveRowData(rowData);
  const closeTooltip = () => setActiveRowData(null);

  if (isLoading) return <div className="p-4 text-center text-white">Loading contributors...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Error loading data: {error}</div>;

  return (
    <div className="p-2 md:p-4 bg-black text-white min-h-screen relative z-0"> {/* Reduced overall padding */}
      <h1 className="text-2xl font-bold text-center mt-8 mb-8">Top 100 Builders</h1>

      <div className={`mb-4 flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0`}>
        <div className="md:w-1/3 lg:w-1/4">
          <input
            type="text"
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search table..."
            className="px-3 py-2 border border-gray-600 rounded bg-gray-800 text-white focus:ring-blue-500 focus:border-blue-500 text-sm w-full"
          />
        </div>
        <div className={`flex space-x-2 sm:space-x-4 ${isMobile ? 'justify-center mt-2 md:mt-0' : 'justify-end'}`}>
          <div className="relative" ref={locationDropdownRef}>
            <button onClick={toggleLocationDropdown} className="px-2 py-1 border border-gray-300 rounded bg-black text-white flex items-center text-xs md:text-sm">
              Location <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isLocationDropdownOpen && (
              <div className="absolute z-30 mt-1 right-0 md:left-0 w-56 bg-gray-800 border border-gray-300 rounded shadow-lg overflow-y-auto max-h-72" onClick={(e) => e.stopPropagation()}>
                {uniqueLocations.map((location) => (
                  <div key={location} className="flex items-center px-4 py-2 cursor-pointer hover:bg-gray-700 text-white text-xs md:text-sm" onClick={() => handleLocationFilterChange(location)}>
                    <CustomCheckbox checked={selectedLocations.includes(location)} onChange={() => handleLocationFilterChange(location)} />
                    <span className="ml-2">{location}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="relative" ref={languageDropdownRef}>
            <button onClick={toggleLanguageDropdown} className="px-2 py-1 border border-gray-300 rounded bg-black text-white flex items-center text-xs md:text-sm">
              Language <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isLanguageDropdownOpen && (
              <div className="absolute z-30 mt-1 right-0 w-48 bg-gray-800 border border-gray-300 rounded shadow-lg overflow-y-auto max-h-72" onClick={(e) => e.stopPropagation()}>
                {uniqueDominantLanguages.map((language) => (
                  <div key={language} className="flex items-center px-4 py-2 cursor-pointer hover:bg-gray-700 text-white text-xs md:text-sm" onClick={() => handleDominantLanguageFilterChange(language)}>
                    <CustomCheckbox checked={selectedDominantLanguages.includes(language)} onChange={() => handleDominantLanguageFilterChange(language)} />
                    <span className="ml-2">{language}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        {/* For column sizing to work effectively, table-layout:fixed can be useful,
            but TanStack Table often applies widths directly to th/td styles.
            Ensure the sum of your column sizes is reasonable.
        */}
        <table className="min-w-full divide-y divide-gray-200 table-auto"> {/* table-auto is fine, sizes will influence initial layout */}
          <thead className="bg-gray-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    // Applying width from column definition style
                    style={{ width: header.getSize() !== 0 ? header.getSize() : undefined }}
                    className="px-2 py-2 text-left text-xs md:text-sm font-medium text-gray-300 tracking-wider cursor-pointer whitespace-normal group" // Reduced header padding
                  >
                    <div className="flex items-center justify-between"> {/* For sort icon alignment */}
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {{ asc: "↑", desc: "↓" }[header.column.getIsSorted() as string] ?? <span className="text-gray-500">↕</span>}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-black text-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-800 cursor-pointer tooltip-trigger" onMouseEnter={() => isMobile && handleRowHover(row.original)} onMouseLeave={() => isMobile && closeTooltip()}>
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    // Applying width from column definition style
                    style={{ width: cell.column.getSize() !== 0 ? cell.column.getSize() : undefined }}
                    className="px-2 py-1 md:px-3 md:py-2 text-xs md:text-sm whitespace-nowrap text-gray-300" // Reduced cell padding
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeRowData && isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 rounded-t-lg shadow-lg z-50" onClick={closeTooltip}>
          <h3 className="text-lg font-bold mb-2">
            {activeRowData.contributor_html_url ?
                <a href={activeRowData.contributor_html_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                    {activeRowData.contributor_login}
                </a> : activeRowData.contributor_login
            }
          </h3>
          <p className="text-xs md:text-sm"><strong>Builder Rank:</strong> {activeRowData.contributor_rank?.toLocaleString() ?? 'N/A'}</p>
          <p className="text-xs md:text-sm"><strong>Anon?:</strong> {activeRowData.is_anon === true ? 'Yes' : activeRowData.is_anon === false ? 'No' : 'N/A'}</p>
          <p className="text-xs md:text-sm"><strong>Language:</strong> {activeRowData.dominant_language ?? 'N/A'}</p>
          <p className="text-xs md:text-sm"><strong>Location:</strong> {activeRowData.location ?? 'N/A'}</p>
          <p className="text-xs md:text-sm"><strong>Contributions:</strong> {activeRowData.total_contributions?.toLocaleString() ?? 'N/A'}</p>
          <p className="text-xs md:text-sm"><strong>Associated Blockchain Repos:</strong> {activeRowData.total_repos_contributed_to?.toLocaleString() ?? 'N/A'}</p>
          <p className="text-xs md:text-sm"><strong>Contributions to Non-Forked Repos:</strong> {activeRowData.contributions_to_og_repos?.toLocaleString() ?? 'N/A'}</p>
          <p className="text-xs md:text-sm"><strong>Associated Repos - Relative Strength:</strong> {activeRowData.normalized_total_repo_quality_weighted_contribution_score_rank?.toLocaleString() ?? 'N/A'}</p>
          <p className="text-xs md:text-sm"><strong>Followers:</strong> {activeRowData.followers_total_count?.toLocaleString() ?? 'N/A'}</p>
          <p className="text-xs md:text-sm"><strong>Builder Score:</strong> {activeRowData.weighted_score_index?.toFixed(2) ?? 'N/A'}</p>
        </div>
      )}

      <div className="mt-4 flex justify-between items-center space-y-2 md:space-y-0 md:space-x-2 w-full">
        <div className="flex space-x-2">
          <button className="px-2 py-1 md:px-3 md:py-1 border border-gray-300 rounded bg-black text-white text-xs md:text-sm" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>{"<<"}</button>
          <button className="px-2 py-1 md:px-3 md:py-1 border border-gray-300 rounded bg-black text-white text-xs md:text-sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>{"<"}</button>
          <button className="px-2 py-1 md:px-3 md:py-1 border border-gray-300 rounded bg-black text-white text-xs md:text-sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>{">"}</button>
          <button className="px-2 py-1 md:px-3 md:py-1 border border-gray-300 rounded bg-black text-white text-xs md:text-sm" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>{">>"}</button>
        </div>
        <div className="flex-grow flex justify-center">
          <span className="text-xs md:text-sm text-white">Page <strong>{table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</strong></span>
        </div>
        <div className="hidden md:block">
          <select className="px-2 py-1 border border-gray-300 rounded bg-black text-white text-xs md:text-sm" value={table.getState().pagination.pageSize} onChange={(e) => table.setPageSize(Number(e.target.value))}>
            {[10, 20, 30, 40, 50, 100].map((pageSize) => (<option key={pageSize} value={pageSize}>Show {pageSize}</option>))}
          </select>
        </div>
      </div>

      {/* Link to methodology */}
      <div className="mt-8 text-center"> {/* Using mt-6 for spacing from pagination */}
        <a
          href="https://docs.builder.love/docs/methodology/developer-categories"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 hover:underline text-sm md:text-base"
        >
          How do we identify strong builders?
        </a>
      </div>
    </div>
  );
};

export default ContributorsPage;