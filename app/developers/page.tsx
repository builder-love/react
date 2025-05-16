// app/developers/page.tsx
'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
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

// --- Flowbite React Imports ---
import {
  Table,
  TextInput,
  Button,
  Dropdown,
  DropdownItem,
  Checkbox as FlowbiteCheckbox,
  Spinner,
  TableHead,
  TableBody,
  TableRow,
  TableHeadCell,
  TableCell,
} from 'flowbite-react';
import { HiSearch, HiOutlineChevronDown, HiOutlineChevronUp, HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi'; // Icons

// Define a custom filter function for multi-select
const multiSelectFilter: FilterFn<Top100Contributor> = (row, columnId, filterValue: string[]) => {
  const rawValue = row.getValue(columnId);
  const value = String(rawValue);
  return filterValue.includes(value);
};

const ContributorsPage: React.FC = () => {
  const [data, setData] = useState<Top100Contributor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'contributor_rank', desc: false },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState<string>('');

  const { isMobile } = useScreenOrientation(); // Assuming this hook is still relevant

  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedDominantLanguages, setSelectedDominantLanguages] = useState<string[]>([]);

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
        cell: ({ getValue }) => getValue<number>()?.toLocaleString() ?? 'N/A', // Text alignment will be handled by Table.Cell className
        size: 70,
      },
      {
        header: 'Github Login',
        accessorKey: 'contributor_login',
        id: 'contributor_login',
        cell: ({ row }) => {
            const login = row.original.contributor_login;
            const url = row.original.contributor_html_url;
            return (
                <div className="truncate" title={login}>
                    {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 dark:text-blue-500 hover:underline" // Flowbite-like link style
                        >
                          {login}
                        </a>
                    ) : (
                        login
                    )}
                </div>
            );
        },
        size: 150,
      },
       {
        header: 'Dominant Language',
        accessorKey: 'dominant_language',
        id: 'dominant_language',
        cell: ({ getValue }) => {
            const lang = getValue<string>() ?? 'N/A';
            return <div className="truncate" title={lang}>{lang}</div>;
        },
        filterFn: multiSelectFilter,
        size: 100,
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
            return displayValue;
        },
        size: 60,
      },
      {
        header: 'Location',
        accessorKey: 'location',
        id: 'location',
        cell: ({ getValue }) => {
            const loc = getValue<string>() ?? 'N/A';
            return <div className="truncate" title={loc}>{loc}</div>;
        },
        filterFn: multiSelectFilter,
        size: 100,
      },
      {
        header: 'Contributions',
        accessorKey: 'total_contributions',
        id: 'total_contributions',
        cell: ({ getValue }) => getValue<number>()?.toLocaleString() ?? 'N/A',
        size: 100,
      },
      {
        header: 'Repos Contributed To', 
        accessorKey: 'total_repos_contributed_to',
        id: 'total_repos_contributed_to',
        cell: ({ getValue }) => getValue<number>()?.toLocaleString() ?? 'N/A',
        size: 80,
      },
       {
        header: 'Repo Quality Rank', 
        accessorKey: 'normalized_total_repo_quality_weighted_contribution_score_rank',
        id: 'normalized_total_repo_quality_weighted_contribution_score_rank',
        cell: ({ getValue }) => getValue<number>()?.toLocaleString() ?? 'N/A',
        size: 80,
      },
      {
        header: 'Non-Fork Repo Contributions', 
        accessorKey: 'contributions_to_og_repos',
        id: 'contributions_to_og_repos',
        cell: ({ getValue }) => getValue<number>()?.toLocaleString() ?? 'N/A',
        size: 80,
      },
      {
        header: 'Followers',
        accessorKey: 'followers_total_count',
        id: 'followers_total_count',
        cell: ({ getValue }) => getValue<number>()?.toLocaleString() ?? 'N/A',
        size: 90,
      },
      {
        header: 'Builder Score',
        accessorKey: 'weighted_score_index',
        id: 'weighted_score_index',
        cell: ({ getValue }) => getValue<number>()?.toFixed(2) ?? 'N/A',
        size: 80,
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

  // const toggleLocationDropdown = () => setIsLocationDropdownOpen(!isLocationDropdownOpen);
  // const toggleLanguageDropdown = () => setIsLanguageDropdownOpen(!isLanguageDropdownOpen);

  // useEffect(() => {
  //   const handleClickOutside = (event: MouseEvent) => {
  //     if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) setIsLocationDropdownOpen(false);
  //     if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) setIsLanguageDropdownOpen(false);
  //   };
  //   document.addEventListener('mousedown', handleClickOutside);
  //   return () => document.removeEventListener('mousedown', handleClickOutside);
  // }, []);

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
    defaultColumn: {
      minSize: 50,
    }
  });

  // Tooltip logic for mobile
  const [showMobileTooltip, setShowMobileTooltip] = useState(false); // For clarity
  const handleRowHover = (rowData: Top100Contributor) => {
    if (isMobile) {
      setActiveRowData(rowData);
      setShowMobileTooltip(true);
    }
  };
  const closeMobileTooltip = useCallback(() => {
    if (isMobile) {
      setShowMobileTooltip(false);
      setTimeout(() => setActiveRowData(null), 300);
    }
  }, [isMobile]);
   useEffect(() => {
    const handleClickOutsideTooltip = (event: MouseEvent) => {
      if (showMobileTooltip && (!event.target || !(event.target instanceof Element) || !event.target.closest('.mobile-tooltip-content'))) {
        closeMobileTooltip();
      }
    };
    if (showMobileTooltip) {
      document.addEventListener('mousedown', handleClickOutsideTooltip);
    }
    return () => document.removeEventListener('mousedown', handleClickOutsideTooltip);
  }, [showMobileTooltip, closeMobileTooltip]);


  if (isLoading) return (
    <div className="flex justify-center items-center h-screen bg-black">
      <Spinner aria-label="Loading contributors..." size="xl" color="pink" />
      <span className="pl-3 text-white">Loading contributors...</span>
    </div>
  );
  if (error) return <div className="p-4 text-center text-red-500">Error loading data: {error}</div>;
  if (!data.length) return <div className="p-4 text-center text-white">No contributors data available.</div>;


  // --- JSX Structure with Flowbite ---
  return (
    <div className="p-2 md:p-4 bg-black text-gray-300 min-h-screen"> {/* Adjusted text color */}
      <h1 className="text-2xl md:text-3xl font-bold text-center text-white mt-8 mb-8">Top 100 Builders</h1>

      {/* Filters and Search Section */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Global Search - Using Flowbite TextInput */}
        <div className="md:w-auto lg:w-1/3"> {/* Adjusted width */}
          <TextInput
            id="table-search"
            type="text"
            icon={HiSearch} // Search icon
            placeholder="Search table..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full text-sm dark:[&_input]:bg-gray-800 dark:[&_input]:text-white dark:[&_input]:border-gray-600"
          />
        </div>

        {/* Filter Dropdowns - Using Flowbite Dropdown */}
        <div className={`flex items-center gap-2 sm:gap-4 ${isMobile ? 'justify-center' : 'justify-end'}`}>
          <Dropdown
            label="Location"
            dismissOnClick={false} // Keep open for multi-select
            renderTrigger={() => ( // Custom trigger to match your previous style
                <Button
                    color="dark"
                    size="sm"
                    className="border border-gray-600 hover:bg-gray-700 text-xs md:text-sm"
                >
                    Location <HiOutlineChevronDown className="ml-2 h-4 w-4" />
                </Button>
            )}
            className="w-56 max-h-72 overflow-y-auto dark:bg-gray-800 [&_ul]:bg-transparent [&_ul]:p-0" // Customizations for dropdown panel
          >
            {uniqueLocations.map((location) => (
              <DropdownItem key={location} onClick={() => {}} className="hover:bg-gray-700 focus:bg-gray-700 dark:focus:bg-gray-600">
                <label className="flex items-center w-full cursor-pointer text-xs md:text-sm" onClick={(e) => e.stopPropagation()}>
                  <FlowbiteCheckbox
                    id={`location-${location.replace(/\s+/g, '-')}`}
                    checked={selectedLocations.includes(location)}
                    onChange={() => handleLocationFilterChange(location)}
                    className="mr-2 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                  />
                  {location}
                </label>
              </DropdownItem>
            ))}
          </Dropdown>

          <Dropdown
            label="Language"
            dismissOnClick={false}
            renderTrigger={() => (
                <Button
                    color="dark"
                    size="sm"
                    className="border border-gray-600 hover:bg-gray-700 text-xs md:text-sm"
                >
                    Language <HiOutlineChevronDown className="ml-2 h-4 w-4" />
                </Button>
            )}
            className="w-48 max-h-72 overflow-y-auto dark:bg-gray-800 [&_ul]:bg-transparent [&_ul]:p-0"
          >
            {uniqueDominantLanguages.map((language) => (
              <DropdownItem key={language} onClick={() => {}} className="hover:bg-gray-700 focus:bg-gray-700 dark:focus:bg-gray-600">
                 <label className="flex items-center w-full cursor-pointer text-xs md:text-sm" onClick={(e) => e.stopPropagation()}>
                  <FlowbiteCheckbox
                    id={`lang-${language.replace(/\s+/g, '-')}`}
                    checked={selectedDominantLanguages.includes(language)}
                    onChange={() => handleDominantLanguageFilterChange(language)}
                    className="mr-2 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                  />
                  {language}
                </label>
              </DropdownItem>
            ))}
          </Dropdown>
        </div>
      </div>

      {/* Table Section with Flowbite styling */}
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg border border-gray-700">
        <Table hoverable striped>
          <TableHead className="text-xs text-gray-400 uppercase bg-gray-700">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b-0">
                {headerGroup.headers.map((header) => (
                  <TableHeadCell
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ width: header.getSize() !== 0 ? header.getSize() : undefined, minWidth: header.column.columnDef.minSize }}
                    className="px-3 py-2 text-left text-xs md:text-sm font-medium tracking-wider cursor-pointer group whitespace-normal"
                  >
                    <div className="flex items-center justify-start">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <span className="ml-1.5">
                        {header.column.getCanSort() && (header.column.getIsSorted() === 'asc' ? <HiOutlineChevronUp className="w-3 h-3" /> : header.column.getIsSorted() === 'desc' ? <HiOutlineChevronDown className="w-3 h-3" /> : <HiOutlineChevronUp className="w-3 h-3 text-gray-500 opacity-30 group-hover:opacity-100" />)}
                      </span>
                    </div>
                  </TableHeadCell>
                ))}
              </TableRow>
            ))}
          </TableHead>

          <TableBody className="divide-y divide-gray-700 bg-gray-800">
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="hover:bg-gray-700 dark:hover:bg-gray-700 cursor-pointer"
                onMouseEnter={() => handleRowHover(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    style={{ width: cell.column.getSize() !== 0 ? cell.column.getSize() : undefined, minWidth: cell.column.columnDef.minSize }}
                    className="px-3 py-2 text-xs md:text-sm whitespace-nowrap text-gray-300"
                  >
                    {['contributor_rank', 'is_anon'].includes(cell.column.id) ? <div className="text-center">{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                    : ['total_contributions', 'total_repos_contributed_to', 'normalized_total_repo_quality_weighted_contribution_score_rank', 'contributions_to_og_repos', 'followers_total_count', 'weighted_score_index'].includes(cell.column.id) ? <div className="text-right">{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                    : flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Tooltip Section */}
      {showMobileTooltip && activeRowData && (
        <div className="mobile-tooltip-content fixed inset-x-0 bottom-0 bg-gray-900 text-white p-4 rounded-t-lg shadow-2xl z-50 max-h-[70vh] overflow-y-auto" onClick={closeMobileTooltip}>
          <button onClick={closeMobileTooltip} className="absolute top-2 right-2 text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
          <h3 className="text-lg font-bold mb-2">
            {/* ... (your activeRowData display, ensure links are styled) ... */}
            {activeRowData.contributor_html_url ?
                <a href={activeRowData.contributor_html_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                    {activeRowData.contributor_login}
                </a> : activeRowData.contributor_login
            }
          </h3>
          {/* ... other details ... */}
          <p className="text-xs"><strong>Builder Rank:</strong> {activeRowData.contributor_rank?.toLocaleString() ?? 'N/A'}</p>
          {/* Add all other fields as in your original tooltip */}
           <p className="text-xs"><strong>Anon?:</strong> {activeRowData.is_anon === true ? 'Yes' : activeRowData.is_anon === false ? 'No' : 'N/A'}</p>
          <p className="text-xs"><strong>Language:</strong> {activeRowData.dominant_language ?? 'N/A'}</p>
          <p className="text-xs"><strong>Location:</strong> {activeRowData.location ?? 'N/A'}</p>
          <p className="text-xs"><strong>Contributions:</strong> {activeRowData.total_contributions?.toLocaleString() ?? 'N/A'}</p>
          <p className="text-xs"><strong>Repos Contributed To:</strong> {activeRowData.total_repos_contributed_to?.toLocaleString() ?? 'N/A'}</p>
          <p className="text-xs"><strong>OG Repo Contributions:</strong> {activeRowData.contributions_to_og_repos?.toLocaleString() ?? 'N/A'}</p>
          <p className="text-xs"><strong>Repo Quality Rank:</strong> {activeRowData.normalized_total_repo_quality_weighted_contribution_score_rank?.toLocaleString() ?? 'N/A'}</p>
          <p className="text-xs"><strong>Followers:</strong> {activeRowData.followers_total_count?.toLocaleString() ?? 'N/A'}</p>
          <p className="text-xs"><strong>Builder Score:</strong> {activeRowData.weighted_score_index?.toFixed(2) ?? 'N/A'}</p>
        </div>
      )}

      {/* Pagination Section - Using Flowbite Buttons */}
      <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4 w-full">
        <div className="flex items-center gap-2">
          <Button color="dark" size="xs" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} className="border-gray-600"> <HiOutlineChevronLeft className="h-4 w-4"/> </Button>
          <Button color="dark" size="xs" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="border-gray-600"> <HiOutlineChevronLeft className="h-4 w-4"/> Prev </Button>
          <Button color="dark" size="xs" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="border-gray-600"> Next <HiOutlineChevronRight className="h-4 w-4"/> </Button>
          <Button color="dark" size="xs" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} className="border-gray-600"> <HiOutlineChevronRight className="h-4 w-4"/> </Button>
        </div>
        <div className="flex items-center gap-2 text-xs md:text-sm text-gray-400">
          <span>Page</span>
          <strong>
            {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </strong>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs md:text-sm text-gray-400 hidden md:inline">Go to page:</span>
          <TextInput
            type="number"
            defaultValue={table.getState().pagination.pageIndex + 1}
            onChange={e => {
              const page = e.target.value ? Number(e.target.value) - 1 : 0;
              table.setPageIndex(page);
            }}
            className="w-16 text-xs dark:[&_input]:bg-gray-800 dark:[&_input]:text-white dark:[&_input]:border-gray-600 dark:[&_input]:p-1.5"
          />
           <select
            value={table.getState().pagination.pageSize}
            onChange={e => table.setPageSize(Number(e.target.value))}
            className="text-xs p-1.5 border border-gray-600 rounded bg-gray-800 text-white focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-500"
          >
            {[10, 20, 30, 50, 100].map(pageSize => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8 text-center">
        <a
          href="https://docs.builder.love/docs/methodology/developer-categories"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-500 hover:text-blue-400 hover:underline"
        >
          How do we identify strong builders?
        </a>
      </div>
    </div>
  );
};

export default ContributorsPage;