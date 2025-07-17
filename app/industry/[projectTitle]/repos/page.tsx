// app/industry/[projectTitle]/repos/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  PaginationState,
} from '@tanstack/react-table';
import {
  Table,
  Spinner,
  Alert,
  Button,
  TextInput,
} from 'flowbite-react';
import { HiSearch, HiInformationCircle, HiArrowUp, HiArrowDown } from 'react-icons/hi';
import { PaginatedRepos, RepoData } from '@/app/types';
import { formatNumberWithCommas } from '@/app/utilities/formatters';

type SortableRepoKeys = 'repo' | 'first_seen_timestamp' | 'fork_count' | 'stargaze_count' | 'watcher_count' | 'repo_rank' | 'repo_rank_category' | 'predicted_is_dev_tooling' | 'predicted_is_educational' | 'predicted_is_scaffold' | 'distance';

const ProjectReposPage = () => {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const projectTitleUrlEncoded = params.projectTitle as string;
  const [projectTitle, setProjectTitle] = useState('');

  // Data state
  const [data, setData] = useState<RepoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);

  // --- Single Source of Truth: Derive all state from URL search params ---
  const { page, limit, search, sortBy, sortOrder } = useMemo(() => {
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    // Default sort to 'distance' if a search is active, otherwise 'repo_rank'
    const sortBy = (searchParams.get('sort_by') as SortableRepoKeys) || (search ? 'distance' : 'repo_rank');
    const sortOrder = (searchParams.get('sort_order') as 'asc' | 'desc') || 'asc';
    return { page, limit, search, sortBy, sortOrder };
  }, [searchParams]);

  // State for the search input field, controlled by the user.
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Table state for React Table is derived directly from the URL params.
  const sorting: SortingState = useMemo(() => [{ id: sortBy, desc: sortOrder === 'desc' }], [sortBy, sortOrder]);
  const pagination: PaginationState = useMemo(() => ({ pageIndex: page - 1, pageSize: limit }), [page, limit]);

  useEffect(() => {
    if (projectTitleUrlEncoded) {
      setProjectTitle(decodeURIComponent(projectTitleUrlEncoded));
    }
  }, [projectTitleUrlEncoded]);

  // --- Main Data-Fetching useEffect ---
  useEffect(() => {
    if (!projectTitleUrlEncoded) {
      setIsLoading(false);
      return;
    }

    const fetchRepos = async () => {
      setIsLoading(true);
      setError(null);
      
      const queryParamsForFetch = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (search.trim()) {
        queryParamsForFetch.set('search', search.trim());
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
        setError(errCatch instanceof Error ? errCatch.message : 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchRepos();
  }, [projectTitleUrlEncoded, page, limit, search, sortBy, sortOrder]);


  // Helper function to update URL search params, triggering a re-render/re-fetch.
  const updateUrlParams = (newParams: Record<string, string | number | undefined>) => {
    const currentParams = new URLSearchParams(searchParams.toString());
    let resetPage = false;
    let isNewSearch = false;

    for (const [key, value] of Object.entries(newParams)) {
        if (value === undefined || value === '') {
            currentParams.delete(key);
        } else {
            currentParams.set(key, String(value));
        }
        if (key === 'sort_by' || key === 'search') {
            resetPage = true;
        }
        if (key === 'search') {
            isNewSearch = true;
        }
    }

    if (resetPage) {
        currentParams.set('page', '1');
    }

    // If it's a new search, default sort by distance. Otherwise, reset to default sort if search is cleared.
    if (isNewSearch && newParams.search) {
        currentParams.set('sort_by', 'distance');
        currentParams.set('sort_order', 'asc');
    } else if (isNewSearch && !newParams.search) {
        currentParams.set('sort_by', 'repo_rank');
        currentParams.set('sort_order', 'asc');
    }
    
    router.push(`/industry/${projectTitleUrlEncoded}/repos?${currentParams.toString()}`, { scroll: false });
  };

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
        header: 'Repo',
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
        header: 'First Seen',
        accessorKey: 'first_seen_timestamp',
        id: 'first_seen_timestamp',
        cell: ({ getValue }) => getValue<string>() ? new Date(getValue<string>()).toLocaleDateString() : 'N/A',
        size: 120,
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
      header: 'Search Similarity (0: good, 2: bad)',
      accessorKey: 'distance',
      id: 'distance',
      cell: ({ row }) => {
        const distance = row.original.distance;
        // Only show distance if a search is active
        if (search && typeof distance === 'number') {
            return distance.toFixed(4);
        }
        return 'N/A';
      },
      size: 120,
      enableSorting: true,
    },
  ], [search]);

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
    getCoreRowModel: getCoreRowModel(),
    debugTable: process.env.NODE_ENV === 'development',
  });

  const renderSortIcon = (columnId: string) => {
    const sort = sorting.find(s => s.id === columnId);
    if (!sort) return null;
    return sort.desc ? <HiArrowDown className="inline ml-1 w-4 h-4" /> : <HiArrowUp className="inline ml-1 w-4 h-4" />;
  };

  const handleSort = (columnId: string) => {
    // Prevent sorting by distance if there is no active search
    if (columnId === 'distance' && !search) return;
    const newSortOrder = sortBy === columnId && sortOrder === 'asc' ? 'desc' : 'asc';
    updateUrlParams({ sort_by: columnId, sort_order: newSortOrder });
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateUrlParams({ search: searchInput.trim() });
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
        <form onSubmit={handleSearchSubmit} className="mb-4 flex items-center gap-2">
          <TextInput
            id="repoSearch"
            type="search"
            icon={HiSearch}
            placeholder="Semantic search for repo attributes..."
            value={searchInput}
            maxLength={40} // Client-side limit
            onChange={(e) => {
              const newValue = e.target.value;
              setSearchInput(newValue);
              // If the user clears the input, immediately reset the search
              if (newValue === '') {
                updateUrlParams({ search: undefined });
              }
            }}
            className="w-full max-w-md dark:[&_input]:bg-gray-700 dark:[&_input]:text-white dark:[&_input]:border-gray-600"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            Search
          </Button>
        </form>
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
          if (search) {
            return <Alert color="info" className="my-4">No repositories found matching your search for &quot;{search}&quot;.</Alert>;
          }
          return <Alert color="info" className="my-4">No repositories found for this project.</Alert>;
        }
        if (data.length > 0) {
          return (
            <div className="relative overflow-x-auto shadow-md sm:rounded-lg border border-gray-700">
              {isLoading && (
                <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex flex-col items-center justify-center z-10 rounded-lg">
                  <Spinner size="lg" color="pink" />
                  <span className="mt-2 text-white">Updating results...</span>
                </div>
              )}
              <Table hoverable striped className={isLoading ? 'opacity-60' : ''}>
                <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b-gray-600">
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          onClick={header.column.getCanSort() ? () => handleSort(header.column.id) : undefined}
                          style={{ width: header.getSize() !== 0 ? header.getSize() : undefined }}
                          className={`px-3 py-3 text-left text-xs md:text-sm font-medium tracking-wider group whitespace-nowrap ${header.column.getCanSort() ? 'cursor-pointer' : ''}`}
                        >
                          <div className="flex items-center">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getCanSort() && renderSortIcon(header.column.id)}
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-gray-700 bg-gray-800">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-700 dark:hover:bg-gray-600">
                      {row.getVisibleCells().map((cell) => {
                        const isRightAligned = ['repo_rank', 'stargaze_count', 'fork_count', 'watcher_count', 'distance'].includes(cell.column.id);
                        const isCenterAligned = ['predicted_is_dev_tooling', 'predicted_is_educational', 'predicted_is_scaffold'].includes(cell.column.id);
                        const alignmentClass = isRightAligned ? 'text-right' : isCenterAligned ? 'text-center' : 'text-left';
                        return (
                          <td
                            key={cell.id}
                            style={{ width: cell.column.getSize() !== 0 ? cell.column.getSize() : undefined}}
                            className={`px-3 py-2 text-xs md:text-sm whitespace-nowrap ${alignmentClass}`}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          );
        }
        return null;
      })()}

      {pageCount > 1 && data.length > 0 && (
        <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4 w-full">
          <div className="flex items-center gap-2">
            <Button color="gray" size="xs" onClick={() => updateUrlParams({ page: 1 })} disabled={page <= 1 || isLoading} className="border-gray-600">{'<<'}</Button>
            <Button color="gray" size="xs" onClick={() => updateUrlParams({ page: page - 1 })} disabled={page <= 1 || isLoading} className="border-gray-600">{'<'}</Button>
            <Button color="gray" size="xs" onClick={() => updateUrlParams({ page: page + 1 })} disabled={page >= pageCount || isLoading} className="border-gray-600">{'>'}</Button>
            <Button color="gray" size="xs" onClick={() => updateUrlParams({ page: pageCount })} disabled={page >= pageCount || isLoading} className="border-gray-600">{'>>'}</Button>
          </div>
          <div className="flex items-center gap-2 text-xs md:text-sm text-gray-400">
            <span>Page</span>
            <strong>{page} of {pageCount}</strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm text-gray-400 hidden md:inline">Go to page:</span>
            <TextInput
              type="number"
              defaultValue={page}
              key={`go-to-page-${page}`}
              onBlur={e => {
                const pageVal = e.target.value;
                if (pageVal === "") {
                    e.target.value = String(page);
                    return;
                };
                const newPage = Number(pageVal);
                if (!isNaN(newPage) && newPage >= 1 && newPage <= pageCount) {
                    updateUrlParams({ page: newPage });
                } else {
                    e.target.value = String(page);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.currentTarget.blur();
                }
              }}
              className="w-16 text-xs dark:[&_input]:bg-gray-700 dark:[&_input]:text-white dark:[&_input]:border-gray-600 dark:[&_input]:p-1.5 text-center"
              disabled={isLoading}
            />
            <select
              value={limit}
              onChange={e => updateUrlParams({ limit: Number(e.target.value) })}
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
