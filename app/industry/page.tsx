// app/industry/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TextInput, Button, Card, ListGroup, ListGroupItem, Spinner, Alert } from 'flowbite-react'; // Adjust imports as needed
import { HiSearch, HiInformationCircle } from 'react-icons/hi';
import _debounce from 'lodash/debounce'; // For debouncing API calls
import { TopProjects } from '@/app/types';

const IndustrySearchPage = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<TopProjects[]>([]);
  const [fullResults, setFullResults] = useState<TopProjects[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingFullResults, setIsLoadingFullResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchSuggestions = useCallback(async (term: string) => {
    if (term.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setIsLoadingSuggestions(true);
    setError(null);
    try {
      const response = await fetch(`/api/industry/search?q=${encodeURIComponent(term)}&limit=7`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to fetch suggestions');
      }
      const data: TopProjects[] = await response.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (err: Error | unknown) {
      console.error("Suggestion fetch error:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  const debouncedFetchSuggestions = useMemo(
    () => _debounce(fetchSuggestions, 300),
    [fetchSuggestions]
  );

  useEffect(() => {
    if (searchTerm) {
      debouncedFetchSuggestions(searchTerm);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      debouncedFetchSuggestions.cancel(); // Cancel any pending debounced calls
    }
    return () => {
      debouncedFetchSuggestions.cancel();
    };
  }, [searchTerm, debouncedFetchSuggestions]);

  const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = event.target.value;
    setSearchTerm(newSearchTerm);
    setFullResults([]); // Clear full results when typing new term
  };

  const handleSuggestionClick = (project: TopProjects) => {
    setSearchTerm(project.project_title); // Optional: fill search box with selected title
    setSuggestions([]);
    setShowSuggestions(false);
    router.push(`/industry/${encodeURIComponent(project.project_title)}`);
  };

  const handleFullSearch = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setError("Please enter at least 2 characters to search.");
      setFullResults([]);
      return;
    }
    setShowSuggestions(false); // Hide suggestions when performing full search
    setIsLoadingFullResults(true);
    setFullResults([]);
    setError(null);
    try {
      const response = await fetch(`/api/industry/search?q=${encodeURIComponent(searchTerm)}&limit=20`); // Fetch more for full results
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to fetch search results');
      }
      const data: TopProjects[] = await response.json();
      setFullResults(data);
      if (data.length === 0) {
        setError("No projects found matching your query.");
      }
    } catch (err: Error | unknown) {
      console.error("Full search error:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setFullResults([]);
    } finally {
      setIsLoadingFullResults(false);
    }
  };

  return (
    <div className="container mx-auto p-4 flex flex-col items-center min-h-screen">
      <div className="w-full max-w-2xl mt-8 mb-6 relative">
        <h1 className="text-3xl font-bold text-center mb-6">Search Blockchain Projects</h1>
        <form onSubmit={handleFullSearch} className="flex items-center gap-2">
          <TextInput
            id="projectSearch"
            type="search"
            icon={HiSearch}
            placeholder="Enter project name (e.g., Ethereum, Polkadot)"
            value={searchTerm}
            onChange={handleSearchInputChange}
            onFocus={() => searchTerm && suggestions.length > 0 && setShowSuggestions(true)}
            // onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} // Hide suggestions on blur with delay
            className="flex-grow"
            required
            aria-autocomplete="list"
            aria-controls="suggestions-list"
          />
          <Button type="submit" color="blue" disabled={isLoadingFullResults}>
            {isLoadingFullResults ? <Spinner size="sm" /> : 'Search'}
          </Button>
        </form>

        {/* Suggestions List */}
        {showSuggestions && suggestions.length > 0 && (
          <Card id="suggestions-list" className="absolute z-10 w-full mt-1 shadow-lg">
            <ListGroup className="border-none">
              {suggestions.map((project) => (
                <ListGroupItem
                  key={project.project_title}
                  onClick={() => handleSuggestionClick(project)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded"
                >
                  {project.project_title}
                  {project.project_rank_category && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      ({project.project_rank_category})
                    </span>
                  )}
                </ListGroupItem>
              ))}
            </ListGroup>
          </Card>
        )}
        {isLoadingSuggestions && <div className="text-center mt-2"><Spinner size="sm" /> Loading suggestions...</div>}
      </div>

      {error && !isLoadingFullResults && (
        <Alert color="failure" icon={HiInformationCircle} className="w-full max-w-2xl my-4">
          <span>{error}</span>
        </Alert>
      )}

      {/* Full Search Results */}
      {isLoadingFullResults && <div className="text-center my-6"><Spinner size="lg" /> Searching...</div>}
      {!isLoadingFullResults && fullResults.length > 0 && (
        <div className="w-full max-w-3xl mt-6">
          <h2 className="text-xl font-semibold mb-3">Search Results for &quot;{searchTerm}&quot;</h2>
          <ListGroup>
            {fullResults.map((project) => (
              <ListGroupItem
                key={project.project_title}
                onClick={() => router.push(`/industry/${encodeURIComponent(project.project_title)}`)}
                className="p-3 mb-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer dark:border-gray-600"
              >
                <div className="font-medium text-blue-600 dark:text-blue-400">{project.project_title}</div>
                {project.stargaze_count && <div className="text-sm text-gray-600 dark:text-gray-300">Stars: {project.stargaze_count}</div>}
                {project.project_rank_category && <div className="text-sm text-gray-600 dark:text-gray-300">Category: {project.project_rank_category}</div>}
              </ListGroupItem>
            ))}
          </ListGroup>
        </div>
      )}
    </div>
  );
};

export default IndustrySearchPage;