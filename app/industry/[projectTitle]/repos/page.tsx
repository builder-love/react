// app/industry/[projectTitle]/repos/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  SortingState,
  PaginationState,
} from '@tanstack/react-table';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeadCell,
  TableCell,
  Spinner,
  Alert,
  Button,
  TextInput,
} from 'flowbite-react';
import { HiSearch, HiInformationCircle, HiArrowUp, HiArrowDown } from 'react-icons/hi';
import { PaginatedRepos, RepoData } from '@/app/types';
import { formatNumberWithCommas } from '@/app/utilities/formatters';
import _debounce from 'lodash/debounce';

// Define which columns are sortable by their key in RepoData (matching FastAPI validation)
type SortableRepoKeys = 'repo' | 'fork_count' | 'stargaze_count' | 'watcher_count' | 'weighted_score_index' | 'repo_rank' | 'latest_data_timestamp' | 'quartile_bucket' | 'repo_rank_category';


const ProjectReposPage = () => {
  const router = useRouter();
  const params = useParams();
  const searchParamsHook = useSearchParams(); // For reading initial query params

  const projectTitleUrlEncoded = params.projectTitle as string;
  const [projectTitle, setProjectTitle] = useState('');

  const [data, setData] = useState<RepoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0); // Total pages from server

  // Initial state from URL or defaults
  const initialPage = parseInt(searchParamsHook.get('page') || '1', 10);
  const initialLimit = parseInt(searchParamsHook.get('limit') || '10', 10);
  const initialSearch = searchParamsHook.get('search') || '';
  const initialSortBy = (searchParamsHook.get('sort_by') as SortableRepoKeys) || 'repo_rank';
  const initialSortOrder = (searchParamsHook.get('sort_order') as 'asc' | 'desc') || 'asc';

  // TanStack Table State
  const [sorting, setSorting] = useState<SortingState>([
    { id: initialSortBy, desc: initialSortOrder === 'desc' },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: initialPage - 1, // 0-indexed
    pageSize: initialLimit,
  });
  const [globalFilter, setGlobalFilter] = useState(initialSearch); // For search input

  // Debounced search term for API calls
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(globalFilter);

  useEffect(() => {
    if (projectTitleUrlEncoded) {
      setProjectTitle(decodeURIComponent(projectTitleUrlEncoded));
    }
  }, [projectTitleUrlEncoded]);

  const debouncedSetSearchForAPI = _debounce((value: string) => {
    setDebouncedSearchTerm(value);
    // When search term changes, go to first page
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, 500);

  useEffect(() => {
    debouncedSetSearchForAPI(globalFilter);
    return () => debouncedSetSearchForAPI.cancel();
  }, [globalFilter, debouncedSetSearchForAPI]);


  // Data Fetching Effect
  useEffect(() => {
    if (!projectTitleUrlEncoded) return;

    const fetchRepos = async () => {
      setIsLoading(true);
      setError(null);

      const sortBy = sorting[0]?.id || 'repo_rank';
      const sortOrder = sorting[0]?.desc ? 'desc' : 'asc';

      const query = new URLSearchParams({
        page: (pagination.pageIndex + 1).toString(),
        limit: pagination.pageSize.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (debouncedSearchTerm.trim()) {
        query.set('search', debouncedSearchTerm.trim());
      }

      // Update URL query parameters
      router.replace(`/industry/${projectTitleUrlEncoded}/repos?${query.toString()}`, { scroll: false });

      try {
        const response = await fetch(`/api/industry/project/${projectTitleUrlEncoded}/repos?${query.toString()}`);
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || `Failed to fetch repositories (status: ${response.status})`);
        }
        const result: PaginatedRepos = await response.json();
        setData(result.items);
        setPageCount(result.total_pages); // Set total pages for TanStack Table
        // pagination.pageSize is already set, TanStack will use it
      } catch (err) {
        console.error("Fetch repositories error:", err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        setData([]);
        setPageCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRepos();
  }, [
    projectTitleUrlEncoded,
    pagination.pageIndex,
    pagination.pageSize,
    sorting,
    debouncedSearchTerm, // Use debounced term for API call
    router, // Added router to dependency array
  ]);

  const columns = useMemo<ColumnDef<RepoData>[]>(() => [
    {
        header: 'Global Rank',
        accessorKey: 'repo_rank',
        id: 'repo_rank',
        cell: ({ getValue }) => getValue<number>()?.toLocaleString() ?? 'N/A',
        size: 70,
    },
    {
        header: 'Repository',
        accessorKey: 'repo',
        id: 'repo',
        cell: ({ getValue }) => {
            const repoUrl = getValue<string>();
            if (!repoUrl) return 'N/A';
            const displayUrl = repoUrl.replace(/^https?:\/\//, ''); // Remove http(s):// for display
            return (
                <a
                    href={repoUrl.startsWith('http') ? repoUrl : `https://${repoUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 dark:text-blue-500 hover:underline truncate block"
                    title={repoUrl}
                >
                    {displayUrl}
                </a>
            );
        },
        size: 250,
    },
    {
        header: 'Stars',
        accessorKey: 'stargaze_count',
        id: 'stargaze_count',
        cell: ({ getValue }) => formatNumberWithCommas(getValue<number>() ?? 0),
        size: 100,
    },
    {
        header: 'Forks',
        accessorKey: 'fork_count',
        id: 'fork_count',
        cell: ({ getValue }) => formatNumberWithCommas(getValue<number>() ?? 0),
        size: 100,
    },
    {
        header: 'Watchers',
        accessorKey: 'watcher_count',
        id: 'watcher_count',
        cell: ({ getValue }) => formatNumberWithCommas(getValue<number>() ?? 0),
        size: 100,
    },
    {
        header: 'Rank Category',
        accessorKey: 'repo_rank_category',
        id: 'repo_rank_category',
        cell: ({ getValue }) => getValue<string>() ?? 'N/A',
        size: 120,
    }
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination,
      globalFilter, // Managed by our own state for debouncing to API
    },
    pageCount, // Total pages from server
    manualPagination: true, // Crucial for server-side pagination
    manualSorting: true,    // Crucial for server-side sorting
    manualFiltering: true,  // Crucial for server-side global filtering
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter, // Updates local globalFilter, triggers debounced API call
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(), // Still useful for header sort indicators
    getPaginationRowModel: getPaginationRowModel(), // For client-side pagination structure if needed
    // getFilteredRowModel: getFilteredRowModel(), // Not strictly needed if all filtering is server-side
    debugTable: process.env.NODE_ENV === 'development', // Optional: for debugging
  });
  
  const renderSortIcon = (columnId: string) => {
    const sort = sorting.find(s => s.id === columnId);
    if (!sort) {
        // return <HiOutlineChevronUp className="w-3 h-3 text-gray-500 opacity-30 group-hover:opacity-100 inline ml-1.5" />; // Neutral
        return null; // Or a more subtle default icon
    }
    return sort.desc ? <HiArrowDown className="inline ml-1 w-4 h-4" /> : <HiArrowUp className="inline ml-1 w-4 h-4" />;
  };


  if (!projectTitleUrlEncoded) {
    return <div className="container mx-auto p-4"><Alert color="failure">Project title not provided in URL.</Alert></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 text-gray-300">
      <Button as={Link} href={`/industry/${projectTitleUrlEncoded}`} className="mb-6 print:hidden">
        &larr; Back to Project Details ({projectTitle})
      </Button>

      <h1 className="text-2xl font-bold mb-4 text-white">Repositories for {projectTitle}</h1>

      <div className="mb-4">
        <TextInput
          id="repoSearch"
          type="search"
          icon={HiSearch}
          placeholder="Search repositories by name..."
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)} // Update globalFilter state
          className="max-w-md dark:[&_input]:bg-gray-700 dark:[&_input]:text-white dark:[&_input]:border-gray-600"
        />
      </div>

      {isLoading && data.length === 0 && ( // Show spinner only if no data is yet displayed
        <div className="flex justify-center items-center py-10">
          <Spinner size="xl" color="pink"/> <span className="ml-3 text-white">Loading repositories...</span>
        </div>
      )}
      {error && (
        <Alert color="failure" icon={HiInformationCircle} className="my-4">
          <span>Error loading repositories: {error}</span>
        </Alert>
      )}
      {!error && !isLoading && data.length === 0 && debouncedSearchTerm && (
         <Alert color="info">No repositories found matching your search for &quot;{debouncedSearchTerm}&quot;.</Alert>
      )}
       {!error && !isLoading && data.length === 0 && !debouncedSearchTerm && (
         <Alert color="info">No repositories found for this project.</Alert>
      )}

      {/* Table Section with Flowbite styling */}
      {data.length > 0 && (
        <div className="relative overflow-x-auto shadow-md sm:rounded-lg border border-gray-700">
          <Table hoverable striped>
            <TableHead className="text-xs text-gray-400 uppercase bg-gray-700">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b-gray-600">
                  {headerGroup.headers.map((header) => (
                    <TableHeadCell
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ width: header.getSize() !== 0 ? header.getSize() : undefined }}
                      className="px-3 py-3 text-left text-xs md:text-sm font-medium tracking-wider cursor-pointer group whitespace-nowrap"
                    >
                      <div className="flex items-center">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && renderSortIcon(header.column.id)}
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
                  className="hover:bg-gray-700 dark:hover:bg-gray-600"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{ width: cell.column.getSize() !== 0 ? cell.column.getSize() : undefined}}
                      className={`px-3 py-2 text-xs md:text-sm whitespace-nowrap 
                                  ${['repo_rank', 'stargaze_count', 'fork_count', 'watcher_count', 'weighted_score_index', 'quartile_bucket'].includes(cell.column.id) ? 'text-right' : 'text-left'}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination Controls - Using Flowbite Buttons */}
      {pageCount > 0 && data.length > 0 && (
        <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4 w-full">
          <div className="flex items-center gap-2">
            <Button color="gray" size="xs" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} className="border-gray-600">{'<<'}</Button>
            <Button color="gray" size="xs" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="border-gray-600">{'<'}</Button>
            <Button color="gray" size="xs" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="border-gray-600">{'>'}</Button>
            <Button color="gray" size="xs" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} className="border-gray-600">{'>>'}</Button>
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
                if (page >= 0 && page < table.getPageCount()) {
                    table.setPageIndex(page);
                }
              }}
              onBlur={e => { // Reset if invalid on blur
                 const page = e.target.value ? Number(e.target.value) -1 : 0;
                 if (page < 0 || page >= table.getPageCount()) {
                    e.target.value = (table.getState().pagination.pageIndex + 1).toString();
                 }
              }}
              className="w-16 text-xs dark:[&_input]:bg-gray-700 dark:[&_input]:text-white dark:[&_input]:border-gray-600 dark:[&_input]:p-1.5 text-center"
            />
            <select
              value={table.getState().pagination.pageSize}
              onChange={e => table.setPageSize(Number(e.target.value))}
              className="text-xs p-1.5 border border-gray-600 rounded bg-gray-700 text-white focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-500"
            >
              {[10, 20, 30, 50, 100].map(pageSize => (
                <option key={pageSize} value={pageSize}>
                  Show {pageSize}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectReposPage;