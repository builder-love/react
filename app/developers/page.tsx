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
  // Convert boolean/null to string representation for consistent filtering
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

  const { isMobile } = useScreenOrientation();

  const [selectedContributorLogins, setSelectedContributorLogins] = useState<string[]>([]);
  const [selectedDominantLanguages, setSelectedDominantLanguages] = useState<string[]>([]);
  const [selectedIsAnon, setSelectedIsAnon] = useState<string[]>([]); // Stores "true", "false", "null" as strings

  const [isContributorDropdownOpen, setIsContributorDropdownOpen] = useState<boolean>(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState<boolean>(false);
  const [isAnonDropdownOpen, setIsAnonDropdownOpen] = useState<boolean>(false);

  const contributorDropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const isAnonDropdownRef = useRef<HTMLDivElement>(null);

  const [activeRowData, setActiveRowData] = useState<Top100Contributor | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('../api/get-top100-contributors/route.ts');
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
        cell: ({ getValue }) => <div className="text-sm md:text-base">{getValue<number>()?.toLocaleString() ?? 'N/A'}</div>,
      },
      {
        header: 'Github Login',
        accessorKey: 'contributor_login',
        id: 'contributor_login',
        cell: ({ row }) => (
            row.original.contributor_html_url ?
            <a 
              href={row.original.contributor_html_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 hover:underline text-sm md:text-base"
            >
              {row.original.contributor_login}
            </a> : <div className="text-sm md:text-base">{row.original.contributor_login}</div>
          ),
        filterFn: multiSelectFilter,
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
            return <div className="text-sm md:text-base">{displayValue}</div>;
        },
        filterFn: multiSelectFilter,
      },
      {
        header: 'Dominant Language',
        accessorKey: 'dominant_language',
        id: 'dominant_language',
        cell: ({ getValue }) => <div className="text-sm md:text-base">{getValue<string>() ?? 'N/A'}</div>,
        filterFn: multiSelectFilter,
      },
      {
        header: 'Location',
        accessorKey: 'location',
        id: 'location',
        cell: ({ getValue }) => <div className="text-sm md:text-base">{getValue<string>() ?? 'N/A'}</div>,
      },
      {
        header: 'Total Contributions',
        accessorKey: 'total_contributions',
        id: 'total_contributions',
        cell: ({ getValue }) => <div className="text-sm md:text-base">{getValue<number>()?.toLocaleString() ?? 'N/A'}</div>,
      },
      {
        header: 'Repos Contrib To',
        accessorKey: 'total_repos_contributed_to',
        id: 'total_repos_contributed_to',
        cell: ({ getValue }) => <div className="text-sm md:text-base">{getValue<number>()?.toLocaleString() ?? 'N/A'}</div>,
      },
      {
        header: 'Followers',
        accessorKey: 'followers_total_count',
        id: 'followers_total_count',
        cell: ({ getValue }) => <div className="text-sm md:text-base">{getValue<number>()?.toLocaleString() ?? 'N/A'}</div>,
      },
      {
        header: 'Builder Score',
        accessorKey: 'weighted_score_index',
        id: 'weighted_score_index',
        cell: ({ getValue }) => <div className="text-sm md:text-base">{getValue<number>()?.toFixed(2) ?? 'N/A'}</div>,
      },
       {
        header: 'Quartile Rank',
        accessorKey: 'quartile_bucket',
        id: 'quartile_bucket',
        cell: ({ getValue }) => <div className="text-sm md:text-base">{getValue<number>()?.toLocaleString() ?? 'N/A'}</div>,
      },
    ],
    []
  );

  const uniqueContributorLogins = useMemo(() => {
    const logins = new Set<string>();
    data.forEach((contributor) => contributor.contributor_login && logins.add(contributor.contributor_login));
    return Array.from(logins).sort();
  }, [data]);

  const uniqueDominantLanguages = useMemo(() => {
    const languages = new Set<string>();
    data.forEach((contributor) => contributor.dominant_language && languages.add(contributor.dominant_language));
    return Array.from(languages).sort();
  }, [data]);
  
  // For 'is_anon' filter dropdown
  const isAnonOptions = useMemo(() => [
    { label: 'Yes', value: 'true' }, // String "true" for true
    { label: 'No', value: 'false' },  // String "false" for false
    { label: 'Unknown', value: 'null' } // String "null" for null
  ], []);


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

  const handleContributorLoginFilterChange = (login: string) => {
    setSelectedContributorLogins((prevSelected) => {
      const newSelected = prevSelected.includes(login) ? prevSelected.filter((l) => l !== login) : [...prevSelected, login];
      updateColumnFilters('contributor_login', newSelected);
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

  const handleIsAnonFilterChange = (value: string) => { // value will be "true", "false", or "null"
    setSelectedIsAnon((prevSelected) => {
      const newSelected = prevSelected.includes(value) ? prevSelected.filter((v) => v !== value) : [...prevSelected, value];
      updateColumnFilters('is_anon', newSelected);
      return newSelected;
    });
  };

  const toggleContributorDropdown = () => setIsContributorDropdownOpen(!isContributorDropdownOpen);
  const toggleLanguageDropdown = () => setIsLanguageDropdownOpen(!isLanguageDropdownOpen);
  const toggleIsAnonDropdown = () => setIsAnonDropdownOpen(!isAnonDropdownOpen);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contributorDropdownRef.current && !contributorDropdownRef.current.contains(event.target as Node)) setIsContributorDropdownOpen(false);
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) setIsLanguageDropdownOpen(false);
      if (isAnonDropdownRef.current && !isAnonDropdownRef.current.contains(event.target as Node)) setIsAnonDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setColumnVisibility({
        location: false,
        total_repos_contributed_to: false,
        followers_total_count: false,
        weighted_score_index: false,
        quartile_bucket: false,
      });
    } else {
      setColumnVisibility({});
    }
  }, [isMobile]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    filterFns: { multiSelect: multiSelectFilter }
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
    <div className="p-4 bg-black text-white min-h-screen relative z-0">
      <h1 className="text-2xl font-bold text-center mt-8 mb-8">Top 100 Contributors</h1>

      <div className="mb-4">
        <div className={`flex space-x-4 ${isMobile ? 'justify-center' : 'justify-start md:justify-center'}`}>
          <div className="relative" ref={contributorDropdownRef}>
            <button onClick={toggleContributorDropdown} className="px-2 py-1 border border-gray-300 rounded bg-black text-white flex items-center text-xs md:text-sm">
              Contributors <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isContributorDropdownOpen && (
              <div className="absolute z-30 mt-1 left-0 w-56 bg-gray-800 border border-gray-300 rounded shadow-lg overflow-y-auto max-h-72" onClick={(e) => e.stopPropagation()}>
                {uniqueContributorLogins.map((login) => (
                  <div key={login} className="flex items-center px-4 py-2 cursor-pointer hover:bg-gray-700 text-white text-xs md:text-sm" onClick={() => handleContributorLoginFilterChange(login)}>
                    <CustomCheckbox checked={selectedContributorLogins.includes(login)} onChange={() => handleContributorLoginFilterChange(login)} />
                    <span className="ml-2">{login}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={languageDropdownRef}>
            <button onClick={toggleLanguageDropdown} className="px-2 py-1 border border-gray-300 rounded bg-black text-white flex items-center text-xs md:text-sm">
              Languages <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isLanguageDropdownOpen && (
              <div className="absolute z-30 mt-1 left-0 w-48 bg-gray-800 border border-gray-300 rounded shadow-lg overflow-y-auto max-h-72" onClick={(e) => e.stopPropagation()}>
                {uniqueDominantLanguages.map((language) => (
                  <div key={language} className="flex items-center px-4 py-2 cursor-pointer hover:bg-gray-700 text-white text-xs md:text-sm" onClick={() => handleDominantLanguageFilterChange(language)}>
                    <CustomCheckbox checked={selectedDominantLanguages.includes(language)} onChange={() => handleDominantLanguageFilterChange(language)} />
                    <span className="ml-2">{language}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={isAnonDropdownRef}>
            <button onClick={toggleIsAnonDropdown} className="px-2 py-1 border border-gray-300 rounded bg-black text-white flex items-center text-xs md:text-sm">
              Anon? <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isAnonDropdownOpen && (
              <div className="absolute z-30 mt-1 right-0 w-48 bg-gray-800 border border-gray-300 rounded shadow-lg overflow-y-auto max-h-72" onClick={(e) => e.stopPropagation()}>
                {isAnonOptions.map((option) => (
                  <div key={option.value} className="flex items-center px-4 py-2 cursor-pointer hover:bg-gray-700 text-white text-xs md:text-sm" onClick={() => handleIsAnonFilterChange(option.value)}>
                    <CustomCheckbox checked={selectedIsAnon.includes(option.value)} onChange={() => handleIsAnonFilterChange(option.value)} />
                    <span className="ml-2">{option.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 table-auto">
          <thead className="bg-gray-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} onClick={header.column.getToggleSortingHandler()} className="px-4 py-2 text-left text-xs md:text-sm font-medium text-gray-300 uppercase tracking-wider cursor-pointer whitespace-nowrap">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    <span className="ml-1">{{ asc: "↑", desc: "↓" }[header.column.getIsSorted() as string] ?? null}</span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-black text-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-800 cursor-pointer tooltip-trigger" onMouseEnter={() => isMobile && handleRowHover(row.original)} onMouseLeave={() => isMobile && closeTooltip()}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-2 py-2 md:px-6 md:py-4 text-xs md:text-sm whitespace-nowrap text-gray-300">
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
          <p className="text-xs md:text-sm"><strong>Rank:</strong> {activeRowData.contributor_rank?.toLocaleString() ?? 'N/A'}</p>
          <p className="text-xs md:text-sm"><strong>Anon?:</strong> {activeRowData.is_anon === true ? 'Yes' : activeRowData.is_anon === false ? 'No' : 'N/A'}</p>
          <p className="text-xs md:text-sm"><strong>Language:</strong> {activeRowData.dominant_language ?? 'N/A'}</p>
          <p className="text-xs md:text-sm"><strong>Location:</strong> {activeRowData.location ?? 'N/A'}</p>
          <p className="text-xs md:text-sm"><strong>Total Contributions:</strong> {activeRowData.total_contributions?.toLocaleString() ?? 'N/A'}</p>
          <p className="text-xs md:text-sm"><strong>Repos Contrib To:</strong> {activeRowData.total_repos_contributed_to?.toLocaleString() ?? 'N/A'}</p>
          <p className="text-xs md:text-sm"><strong>Followers:</strong> {activeRowData.followers_total_count?.toLocaleString() ?? 'N/A'}</p>
          <p className="text-xs md:text-sm"><strong>Weighted Score:</strong> {activeRowData.weighted_score_index?.toFixed(2) ?? 'N/A'}</p>
          <p className="text-xs md:text-sm"><strong>Quartile:</strong> {activeRowData.quartile_bucket?.toLocaleString() ?? 'N/A'}</p>
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
    </div>
  );
};

export default ContributorsPage;