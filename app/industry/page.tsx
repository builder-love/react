// app/industry/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'; // Added useRef
import { useRouter } from 'next/navigation';
import { TextInput, Button, Card, ListGroup, ListGroupItem, Spinner, Alert } from 'flowbite-react';
import { HiSearch, HiInformationCircle } from 'react-icons/hi';
import _debounce from 'lodash/debounce';

interface Project {
  project_title: string;
  latest_data_timestamp: string;
  contributor_count?: number | null;
  stargaze_count?: number | null;
  project_rank_category?: string | null;
}

const IndustrySearchPage = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Project[]>([]);
  const [fullResults, setFullResults] = useState<Project[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingFullResults, setIsLoadingFullResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Ref for the search container to handle click outside
  const searchContainerRef = useRef<HTMLDivElement>(null); // For click outside

  // Memoize fetchSuggestions itself
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
      const data: Project[] = await response.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch (err: Error | unknown) {
      console.error("Suggestion fetch error:", err);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []); // State setters are stable

  // Use useMemo to create and memoize the debounced version of fetchSuggestions
  const debouncedFetchSuggestions = useMemo(
    () => _debounce(fetchSuggestions, 300),
    [fetchSuggestions] // Re-create the debounced function only if fetchSuggestions changes
  );

  useEffect(() => {
    if (searchTerm.trim()) { // Check if searchTerm is not just whitespace
      debouncedFetchSuggestions(searchTerm);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      debouncedFetchSuggestions.cancel();
    }
    return () => {
      debouncedFetchSuggestions.cancel();
    };
  }, [searchTerm, debouncedFetchSuggestions]);

  const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = event.target.value;
    setSearchTerm(newSearchTerm);
    setFullResults([]); // Clear full results when typing new term
    // Suggestions will be shown by the useEffect if newSearchTerm is valid
  };

  const handleSuggestionClick = (project: Project) => {
    setSearchTerm(project.project_title);
    setSuggestions([]);
    setShowSuggestions(false); // Explicitly hide suggestions
    router.push(`/industry/${encodeURIComponent(project.project_title)}`);
  };

  const handleFullSearch = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    debouncedFetchSuggestions.cancel(); // Cancel any pending suggestion fetches
    setShowSuggestions(false);      // <--- KEY CHANGE: Hide suggestions immediately

    if (!searchTerm.trim() || searchTerm.length < 2) {
      setError("Please enter at least 2 characters to search.");
      setFullResults([]);
      setSuggestions([]); // Also clear suggestions here
      return;
    }

    setIsLoadingFullResults(true);
    setFullResults([]);
    setError(null);
    try {
      const response = await fetch(`/api/industry/search?q=${encodeURIComponent(searchTerm)}&limit=50`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to fetch search results');
      }
      const data: Project[] = await response.json();
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

  // Effect to handle clicks outside the search suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  return (
    <div className="container mx-auto p-4 flex flex-col items-center min-h-screen">
      {/* Assign ref to the search container */}
      <div className="w-full max-w-2xl mt-8 mb-6 relative" ref={searchContainerRef}>
        <h1 className="text-3xl font-bold text-center mb-6">Search Blockchain Projects</h1>
        <form onSubmit={handleFullSearch} className="flex items-center gap-2">
          <TextInput
            id="projectSearch"
            type="search"
            icon={HiSearch}
            placeholder="Enter project name (e.g., Ethereum, Polkadot)"
            value={searchTerm}
            onChange={handleSearchInputChange}
            onFocus={() => {
                // Only show suggestions on focus if there's already a search term and suggestions exist
                if (searchTerm.trim() && suggestions.length > 0) {
                    setShowSuggestions(true);
                }
            }}
            // Removed onBlur to rely on click outside or explicit actions
            className="flex-grow"
            autoComplete="off" // often good for custom suggestion lists
            aria-autocomplete="list"
            aria-controls="suggestions-list"
          />
          <Button type="submit" color="blue" disabled={isLoadingFullResults}>
            {isLoadingFullResults ? <Spinner size="sm" /> : 'Search'}
          </Button>
        </form>

        {/* Suggestions List */}
        {showSuggestions && searchTerm.trim() && suggestions.length > 0 && (
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
        {/* Only show loading suggestions if actively typing and suggestions are expected */}
        {isLoadingSuggestions && searchTerm.trim() && <div className="text-center mt-2"><Spinner size="sm" /> Loading suggestions...</div>}
      </div>

      {/* Error display (moved out of the ref'd container if it's general) */}
      {error && !isLoadingFullResults && !isLoadingSuggestions && (
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
                onClick={() => {
                    setShowSuggestions(false);
                    router.push(`/industry/${encodeURIComponent(project.project_title)}`);
                }}
                className="p-3 mb-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer dark:border-gray-600"
              >
                <div className="font-medium text-blue-600 dark:text-blue-400">{project.project_title}</div>
                {project.stargaze_count !== undefined && <div className="text-sm text-gray-600 dark:text-gray-300">Stars: {project.stargaze_count}</div>}
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