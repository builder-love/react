// app/industry/[projectTitle]/repos/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
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

// Consider removing 'latest_data_timestamp' if it's not actually sortable as per previous discussion.
type SortableRepoKeys = 'repo' | 'fork_count' | 'stargaze_count' | 'watcher_count' | 'repo_rank' | 'repo_rank_category';

const ProjectReposPage = () => {
  const router = useRouter();
  const params = useParams();
  const searchParamsHook = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement | null>(null); // Ref for the search input element
  const _searchHadFocus = useRef(false); // *** CHANGED: Use useRef instead of useState for searchHadFocus ***

  const projectTitleUrlEncoded = params.projectTitle as string;
  const [projectTitle, setProjectTitle] = useState('');

  const [data, setData] = useState<RepoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);

  const initialValues = useMemo(() => {
    const page = parseInt(searchParamsHook.get('page') || '1', 10);
    const limit = parseInt(searchParamsHook.get('limit') || '10', 10);
    const search = searchParamsHook.get('search') || '';
    const sortBy = (searchParamsHook.get('sort_by') as SortableRepoKeys) || 'repo_rank';
    const sortOrder = (searchParamsHook.get('sort_order') as 'asc' | 'desc') || 'asc';
    return { page, limit, search, sortBy, sortOrder };
  }, [searchParamsHook]);

  const [sorting, setSorting] = useState<SortingState>([
    { id: initialValues.sortBy, desc: initialValues.sortOrder === 'desc' },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: initialValues.page - 1,
    pageSize: initialValues.limit,
  });
  const [globalFilter, setGlobalFilter] = useState(initialValues.search);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialValues.search);

  const debouncedSetSearchForAPI = useMemo(
    () =>
      _debounce((value: string) => {
        setDebouncedSearchTerm(value);
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      }, 500),
    []
  );

  useEffect(() => {
    if (projectTitleUrlEncoded) {
      setProjectTitle(decodeURIComponent(projectTitleUrlEncoded));
    }
  }, [projectTitleUrlEncoded]);

  useEffect(() => {
    debouncedSetSearchForAPI(globalFilter);
    return () => debouncedSetSearchForAPI.cancel();
  }, [globalFilter, debouncedSetSearchForAPI]);

  useEffect(() => {
    if (!projectTitleUrlEncoded) return;
    const desiredParams = new URLSearchParams();
    desiredParams.set('page', (pagination.pageIndex + 1).toString());
    desiredParams.set('limit', pagination.pageSize.toString());
    desiredParams.set('sort_by', sorting[0]?.id || 'repo_rank');
    desiredParams.set('sort_order', sorting[0]?.desc ? 'desc' : 'asc');
    if (debouncedSearchTerm.trim()) {
      desiredParams.set('search', debouncedSearchTerm.trim());
    }
    const desiredQueryString = desiredParams.toString();
    const currentQueryString = searchParamsHook.toString();
    if (desiredQueryString !== currentQueryString) {
      router.replace(`/industry/${projectTitleUrlEncoded}/repos?${desiredQueryString}`, { scroll: false });
    }
  }, [
    projectTitleUrlEncoded,
    pagination,
    sorting,
    debouncedSearchTerm,
    router,
    searchParamsHook
  ]);

  useEffect(() => {
    if (!projectTitleUrlEncoded) {
      setIsLoading(false);
      return;
    }
    const pageFromUrl = parseInt(searchParamsHook.get('page') || '1', 10);
    const limitFromUrl = parseInt(searchParamsHook.get('limit') || '10', 10);
    const searchFromUrl = searchParamsHook.get('search') || '';
    const sortByFromUrl = (searchParamsHook.get('sort_by') as SortableRepoKeys) || 'repo_rank';
    const sortOrderFromUrl = (searchParamsHook.get('sort_order') as 'asc' | 'desc') || 'asc';

    setPagination(prev => {
        const newPageIndex = pageFromUrl - 1;
        if (prev.pageIndex !== newPageIndex || prev.pageSize !== limitFromUrl) {
            return { pageIndex: newPageIndex, pageSize: limitFromUrl };
        }
        return prev;
    });
    setSorting(prev => {
        if (prev[0]?.id !== sortByFromUrl || (prev[0]?.desc ? 'desc' : 'asc') !== sortOrderFromUrl) {
            return [{ id: sortByFromUrl, desc: sortOrderFromUrl === 'desc' }];
        }
        return prev;
    });
    setGlobalFilter(currentGlobalFilter => {
      if (currentGlobalFilter !== searchFromUrl) {
        return searchFromUrl;
      }
      return currentGlobalFilter;
    });

    const fetchRepos = async () => {
      setIsLoading(true);
      setError(null);
      const queryParamsForFetch = new URLSearchParams({
        page: pageFromUrl.toString(),
        limit: limitFromUrl.toString(),
        sort_by: sortByFromUrl,
        sort_order: sortOrderFromUrl,
      });
      if (searchFromUrl.trim()) {
        queryParamsForFetch.set('search', searchFromUrl.trim());
      }
      const queryStringForFetch = queryParamsForFetch.toString();
      try {
        const response = await fetch(`/api/industry/project/${projectTitleUrlEncoded}/repos?${queryStringForFetch}`);
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || `Failed to fetch repositories (status: ${response.status})`);
        }
        const result: PaginatedRepos = await response.json();
        setData(result.items);
        setPageCount(result.total_pages);
      } catch (errCatch) {
        console.error("Fetch repositories error:", errCatch);
        setError(errCatch instanceof Error ? errCatch.message : 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchRepos();
  }, [projectTitleUrlEncoded, searchParamsHook]);

  // Effect to manage focus on the search input during loading states
  useEffect(() => {
    // Ensure we have a reference to the input element if the direct ref prop isn't working
    // This part tries to populate searchInputRef.current if it's not already set (e.g., by ref prop on TextInput)
    if (!searchInputRef.current) {
      const element = document.getElementById('repoSearch');
      if (element instanceof HTMLInputElement) {
        searchInputRef.current = element;
      }
    }

    let focusTimeoutId: NodeJS.Timeout | undefined = undefined;

    console.log('Focus Effect - searchInputRef.current:', searchInputRef.current);
    console.log('Focus Effect - document.activeElement:', document.activeElement);

    if (isLoading) {
      // If loading starts and the search input (now definitely referenced if possible) has focus
      if (searchInputRef.current && document.activeElement === searchInputRef.current) {
        _searchHadFocus.current = true; // Set the ref's value (does not trigger re-render)
      }
    } else {
      // If loading just finished
      // Read the ref's value (which persists across re-renders without causing them)
      if (_searchHadFocus.current && searchInputRef.current && !searchInputRef.current.disabled) {
        // Using setTimeout to ensure focus is set after any potential DOM updates
        // related to disabling/enabling the input have settled.
        focusTimeoutId = setTimeout(() => {
          // Re-check conditions inside setTimeout as state might have changed again
          if (searchInputRef.current && !searchInputRef.current.disabled) {
            searchInputRef.current.focus();
          }
        }, 0); // Minimal delay
      }
      // Always reset the flag (ref value) when loading finishes.
      _searchHadFocus.current = false;
    }

    return () => {
      // Cleanup timeout if the effect re-runs before timeout completes or component unmounts
      if (focusTimeoutId) {
        clearTimeout(focusTimeoutId);
      }
    };
  }, [isLoading]); // Dependency array is only [isLoading]. Linter should be happy.

  const columns = useMemo<ColumnDef<RepoData>[]>(() => [
    {
        header: 'Global Rank',
        accessorKey: 'repo_rank',
        id: 'repo_rank',
        cell: ({ getValue }) => getValue<number>()?.toLocaleString() ?? 'N/A',
        size: 70,
        enableSorting: true,
    },
    {
        header: 'Repository',
        accessorKey: 'repo',
        id: 'repo',
        cell: ({ getValue }) => {
            const repoUrl = getValue<string>();
            if (!repoUrl) return 'N/A';
            const displayUrl = repoUrl.replace(/^https?:\/\//, '');
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
        enableSorting: true,
    },
    {
        header: 'Stars',
        accessorKey: 'stargaze_count',
        id: 'stargaze_count',
        cell: ({ getValue }) => formatNumberWithCommas(getValue<number>() ?? 0),
        size: 100,
        enableSorting: true,
    },
    {
        header: 'Forks',
        accessorKey: 'fork_count',
        id: 'fork_count',
        cell: ({ getValue }) => formatNumberWithCommas(getValue<number>() ?? 0),
        size: 100,
        enableSorting: true,
    },
    {
        header: 'Watchers',
        accessorKey: 'watcher_count',
        id: 'watcher_count',
        cell: ({ getValue }) => formatNumberWithCommas(getValue<number>() ?? 0),
        size: 100,
        enableSorting: true,
    },
    {
        header: 'Rank Category',
        accessorKey: 'repo_rank_category',
        id: 'repo_rank_category',
        cell: ({ getValue }) => getValue<string>() ?? 'N/A',
        size: 120,
        enableSorting: true,
    }
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination,
    },
    pageCount,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    debugTable: process.env.NODE_ENV === 'development',
  });

  const renderSortIcon = (columnId: string) => {
    const sort = sorting.find(s => s.id === columnId);
    if (!sort) return null;
    return sort.desc ? <HiArrowDown className="inline ml-1 w-4 h-4" /> : <HiArrowUp className="inline ml-1 w-4 h-4" />;
  };

  if (!projectTitleUrlEncoded && !isLoading) {
    return <div className="container mx-auto p-4"><Alert color="failure">Project title not provided in URL.</Alert></div>;
  }

  const showInitialLoader = isLoading && data.length === 0 && !error;

  return (
    <div className="container mx-auto p-4 md:p-8 text-gray-300">
      <Button as={Link} href={`/industry/${projectTitleUrlEncoded}`} className="mb-6 print:hidden">
        &larr; Back to Project Details ({projectTitle})
      </Button>

      <h1 className="text-2xl font-bold mb-4 text-white">Repositories for {projectTitle}</h1>

      {!showInitialLoader && (
        <div className="mb-4">
            <TextInput
            id="repoSearch" // ID used for fallback document.getElementById
            ref={searchInputRef} // Attempt to use direct ref
            type="search"
            icon={HiSearch}
            placeholder="Search repositories by name..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-md dark:[&_input]:bg-gray-700 dark:[&_input]:text-white dark:[&_input]:border-gray-600"
            // disabled={isLoading && data.length > 0} // <-- Temporarily remove this for testing
            />
        </div>
        )}

      {(() => {
        if (showInitialLoader) {
          return (
            <div className="flex justify-center items-center py-10">
              <Spinner size="xl" color="pink"/> <span className="ml-3 text-white">Loading repositories...</span>
            </div>
          );
        }
        if (error) {
          return (
            <Alert color="failure" icon={HiInformationCircle} className="my-4">
              <span>Error loading repositories: {error}</span>
            </Alert>
          );
        }
        if (!isLoading && data.length === 0) {
          if (debouncedSearchTerm || globalFilter) { // Check both to cover edge cases with debounce timing
            return <Alert color="info" className="my-4">No repositories found matching your search for &quot;{debouncedSearchTerm || globalFilter}&quot;.</Alert>;
          }
          return <Alert color="info" className="my-4">No repositories found for this project.</Alert>;
        }
        if (data.length > 0) {
          return (
            <div className="relative overflow-x-auto shadow-md sm:rounded-lg border border-gray-700">
              {isLoading && data.length > 0 && (
                <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex flex-col items-center justify-center z-10 rounded-lg">
                  <Spinner size="lg" color="pink" />
                  <span className="mt-2 text-white">Updating results...</span>
                </div>
              )}
              <Table hoverable striped className={(isLoading && data.length > 0) ? 'opacity-60' : ''}>
                <TableHead className="text-xs text-gray-400 uppercase bg-gray-700">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="border-b-gray-600">
                      {headerGroup.headers.map((header) => (
                        <TableHeadCell
                          key={header.id}
                          onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                          style={{ width: header.getSize() !== 0 ? header.getSize() : undefined }}
                          className={`px-3 py-3 text-left text-xs md:text-sm font-medium tracking-wider group whitespace-nowrap ${header.column.getCanSort() ? 'cursor-pointer' : ''}`}
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
                                      ${['repo_rank', 'stargaze_count', 'fork_count', 'watcher_count'].includes(cell.column.id) ? 'text-right' : 'text-left'}`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          );
        }
        return null;
      })()}

      {pageCount > 0 && data.length > 0 && (
        <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4 w-full">
          <div className="flex items-center gap-2">
            <Button color="gray" size="xs" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage() || isLoading} className="border-gray-600">{'<<'}</Button>
            <Button color="gray" size="xs" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage() || isLoading} className="border-gray-600">{'<'}</Button>
            <Button color="gray" size="xs" onClick={() => table.nextPage()} disabled={!table.getCanNextPage() || isLoading} className="border-gray-600">{'>'}</Button>
            <Button color="gray" size="xs" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage() || isLoading} className="border-gray-600">{'>>'}</Button>
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
              key={`go-to-page-${table.getState().pagination.pageIndex}-${table.getState().pagination.pageSize}`}
              onChange={e => {
                const pageVal = e.target.value;
                if (pageVal === "") return;
                const page = Number(pageVal) - 1;
                if (!isNaN(page) && page >= 0 && page < table.getPageCount()) {
                    table.setPageIndex(page);
                }
              }}
              onBlur={(e) => {
                const pageVal = e.target.value;
                const currentPagePlusOne = (table.getState().pagination.pageIndex + 1).toString();
                if (pageVal === "") {
                    e.target.value = currentPagePlusOne;
                    return;
                }
                const page = Number(pageVal) - 1;
                 if (isNaN(page) || page < 0 || page >= table.getPageCount()) {
                    e.target.value = currentPagePlusOne;
                 }
              }}
              className="w-16 text-xs dark:[&_input]:bg-gray-700 dark:[&_input]:text-white dark:[&_input]:border-gray-600 dark:[&_input]:p-1.5 text-center"
              disabled={isLoading}
            />
            <select
              value={table.getState().pagination.pageSize}
              onChange={e => table.setPageSize(Number(e.target.value))}
              className="text-xs p-1.5 border border-gray-600 rounded bg-gray-700 text-white focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-500"
              disabled={isLoading}
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