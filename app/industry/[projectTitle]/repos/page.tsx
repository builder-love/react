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

type SortableRepoKeys = 'repo' | 'fork_count' | 'stargaze_count' | 'watcher_count' | 'weighted_score_index' | 'repo_rank' | 'latest_data_timestamp' | 'quartile_bucket' | 'repo_rank_category';

const ProjectReposPage = () => {
  const router = useRouter();
  const params = useParams();
  const searchParamsHook = useSearchParams();

  const projectTitleUrlEncoded = params.projectTitle as string;
  const [projectTitle, setProjectTitle] = useState('');

  const [data, setData] = useState<RepoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);

  const initialPage = parseInt(searchParamsHook.get('page') || '1', 10);
  const initialLimit = parseInt(searchParamsHook.get('limit') || '10', 10);
  const initialSearch = searchParamsHook.get('search') || '';
  const initialSortBy = (searchParamsHook.get('sort_by') as SortableRepoKeys) || 'repo_rank';
  const initialSortOrder = (searchParamsHook.get('sort_order') as 'asc' | 'desc') || 'asc';

  const [sorting, setSorting] = useState<SortingState>([
    { id: initialSortBy, desc: initialSortOrder === 'desc' },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: initialPage - 1,
    pageSize: initialLimit,
  });
  const [globalFilter, setGlobalFilter] = useState(initialSearch);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(globalFilter);

  const debouncedSetSearchForAPI = _debounce((value: string) => {
    setDebouncedSearchTerm(value);
  }, 500);

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
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [debouncedSearchTerm]);

  useEffect(() => {
    if (!projectTitleUrlEncoded) return;

    const fetchRepos = async () => {
      setIsLoading(true);

      const sortBy = sorting[0]?.id || 'repo_rank';
      const sortOrder = sorting[0]?.desc ? 'desc' : 'asc';

      const queryParams = new URLSearchParams({
        page: (pagination.pageIndex + 1).toString(),
        limit: pagination.pageSize.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (debouncedSearchTerm.trim()) {
        queryParams.set('search', debouncedSearchTerm.trim());
      }
      const queryString = queryParams.toString();

      const currentSearchParams = searchParamsHook.toString();
      if (queryString !== currentSearchParams) {
        router.replace(`/industry/${projectTitleUrlEncoded}/repos?${queryString}`, { scroll: false });
      }

      try {
        const response = await fetch(`/api/industry/project/${projectTitleUrlEncoded}/repos?${queryString}`);
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || `Failed to fetch repositories (status: ${response.status})`);
        }
        const result: PaginatedRepos = await response.json();
        setData(result.items);
        setPageCount(result.total_pages);
        setError(null);
      } catch (err) {
        console.error("Fetch repositories error:", err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
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
    debouncedSearchTerm,
    router,
    searchParamsHook
  ]);

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

  if (!projectTitleUrlEncoded) {
    return <div className="container mx-auto p-4"><Alert color="failure">Project title not provided in URL.</Alert></div>;
  }

  const showInitialLoader = isLoading && data.length === 0 && !error;

  return (
    <div className="container mx-auto p-4 md:p-8 text-gray-300">
      <Button as={Link} href={`/industry/${projectTitleUrlEncoded}`} className="mb-6 print:hidden">
        &larr; Back to Project Details ({projectTitle})
      </Button>

      <h1 className="text-2xl font-bold mb-4 text-white">Repositories for {projectTitle}</h1>

      {!showInitialLoader && ( // Check this flag
        <div className="mb-4">
            <TextInput
            id="repoSearch"
            type="search"
            icon={HiSearch}
            placeholder="Search repositories by name..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-md dark:[&_input]:bg-gray-700 dark:[&_input]:text-white dark:[&_input]:border-gray-600"
            disabled={isLoading && data.length > 0}
            />
        </div>
        )}

      {(() => {
        if (isLoading && data.length === 0 && !error) {
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
          if (debouncedSearchTerm) {
            return <Alert color="info" className="my-4">No repositories found matching your search for &quot;{debouncedSearchTerm}&quot;.</Alert>;
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
              <Table hoverable striped className={isLoading && data.length > 0 ? 'opacity-60' : ''}>
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
              key={`go-to-page-${table.getState().pagination.pageIndex}`}
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
                if (pageVal === "") {
                    e.target.value = (table.getState().pagination.pageIndex + 1).toString();
                    return;
                }
                const page = Number(pageVal) - 1;
                 if (isNaN(page) || page < 0 || page >= table.getPageCount()) {
                    e.target.value = (table.getState().pagination.pageIndex + 1).toString();
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