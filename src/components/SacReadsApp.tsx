"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RecommendationBookCard } from "@/components/RecommendationBookCard";
import { RecommendationFilters } from "@/components/RecommendationFilters";
import { SavedBooks } from "@/components/SavedBooks";
import { readSavedBooks, toSavedBook, writeSavedBooks, maxSavedBooks } from "@/lib/savedBooks";
import type { BrowseFilterOptions, BrowseFilters, ClientBook, SavedBook } from "@/types/book";

const initialVisibleRecommendations = 12;
const defaultFilters: BrowseFilters = {
  genre: "",
  format: "",
  language: "",
  audience: "",
  yearFrom: "",
  yearTo: "",
  sort: "Title A-Z",
};

type SacReadsAppProps = {
  filterOptions: BrowseFilterOptions;
  onSavedCountChange?: (count: number) => void;
  totalBookCount: number;
};

type BrowseResponse = {
  books: ClientBook[];
  resultCount: number;
};

function isAbortError(error: unknown) {
  if (typeof error !== "object" || error === null || !("name" in error)) {
    return false;
  }

  return (error as { name?: unknown }).name === "AbortError";
}

function isBrowseResponse(value: unknown): value is BrowseResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const response = value as Partial<BrowseResponse>;
  return Array.isArray(response.books) && typeof response.resultCount === "number";
}

export function SacReadsApp({ filterOptions, onSavedCountChange, totalBookCount }: SacReadsAppProps) {
  const [filters, setFilters] = useState<BrowseFilters>(defaultFilters);
  const [visibleRecommendations, setVisibleRecommendations] = useState(initialVisibleRecommendations);
  const [filteredBooks, setFilteredBooks] = useState<ClientBook[]>([]);
  const [resultCount, setResultCount] = useState(totalBookCount);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [savedBooks, setSavedBooks] = useState<SavedBook[]>([]);
  const hasLoadedSavedBooks = useRef(false);

  useEffect(() => {
    if (hasLoadedSavedBooks.current) {
      return;
    }

    hasLoadedSavedBooks.current = true;
    setSavedBooks(readSavedBooks());
  }, []);

  useEffect(() => {
    onSavedCountChange?.(savedBooks.length);
  }, [onSavedCountChange, savedBooks.length]);

  useEffect(() => {
    if (!filters.genre) {
      return;
    }

    const controller = new AbortController();
    let isCurrent = true;

    async function loadBooks() {
      setIsLoadingBooks(true);
      setLoadError(false);

      try {
        const response = await fetch("/api/browse", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ filters, limit: visibleRecommendations }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load browse results.");
        }

        const payload: unknown = await response.json();

        if (!isBrowseResponse(payload)) {
          throw new Error("Invalid browse results.");
        }

        if (isCurrent) {
          setFilteredBooks(payload.books);
          setResultCount(payload.resultCount);
        }
      } catch (error) {
        if (isAbortError(error) || !isCurrent) {
          return;
        }

        setFilteredBooks([]);
        setResultCount(0);
        setLoadError(true);
      } finally {
        if (isCurrent) {
          setIsLoadingBooks(false);
        }
      }
    }

    void loadBooks();

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [filters, visibleRecommendations]);

  const savedIds = useMemo(() => new Set(savedBooks.map((book) => book.id)), [savedBooks]);
  const hasSelectedGenre = Boolean(filters.genre);

  function persistSavedBooks(nextBooks: SavedBook[]) {
    setSavedBooks(nextBooks);
    writeSavedBooks(nextBooks);
  }

  function toggleSavedBook(book: ClientBook) {
    const next = savedBooks.some((savedBook) => savedBook.id === book.id)
      ? savedBooks.filter((savedBook) => savedBook.id !== book.id)
      : [toSavedBook(book), ...savedBooks].slice(0, maxSavedBooks);

    persistSavedBooks(next);
  }

  function removeSavedBook(id: string) {
    persistSavedBooks(savedBooks.filter((book) => book.id !== id));
  }

  function handleFiltersChange(nextFilters: BrowseFilters) {
    setFilters(nextFilters);
    setVisibleRecommendations(initialVisibleRecommendations);

    if (!nextFilters.genre) {
      setFilteredBooks([]);
      setResultCount(totalBookCount);
      setLoadError(false);
      setIsLoadingBooks(false);
    }
  }

  function handleResetFilters() {
    setFilters(defaultFilters);
    setVisibleRecommendations(initialVisibleRecommendations);
    setFilteredBooks([]);
    setResultCount(totalBookCount);
    setLoadError(false);
    setIsLoadingBooks(false);
  }

  return (
    <>
      <section className="border-b border-[#ded3c2] bg-[#f8f5ee]" id="recommendations">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
            <div className="max-w-3xl">
              <p className="mb-3 text-sm font-bold uppercase text-[#8b4c35]">Catalog results</p>
              <h2 className="text-3xl font-bold text-[#20231c] sm:text-4xl">Holdable SPL books.</h2>
              <p className="mt-4 text-base leading-7 text-[#555d50]" role="status">
                {hasSelectedGenre
                  ? `${resultCount.toLocaleString()} ${filters.genre} books match these filters.`
                  : "Choose a genre to show matching Sacramento Public Library catalog books."}
              </p>
            </div>
            <SavedBooks books={savedBooks} onRemove={removeSavedBook} />
          </div>

          <div className="mb-8 scroll-mt-24" id="find-books">
            <RecommendationFilters
              filters={filters}
              onChange={handleFiltersChange}
              onReset={handleResetFilters}
              options={filterOptions}
            />
          </div>

          {!hasSelectedGenre ? (
            <div className="rounded-lg border border-[#d8ccb9] bg-white p-5 text-sm leading-6 text-[#555d50]">
              Choose a genre in the filter bar to show matching Sacramento Public Library books.
            </div>
          ) : null}

          {hasSelectedGenre && loadError ? (
            <div className="rounded-lg border border-[#d8ccb9] bg-white p-5 text-sm leading-6 text-[#555d50]">
              Books could not load right now. Try changing filters or refreshing the page.
            </div>
          ) : null}

          {hasSelectedGenre && !isLoadingBooks && !loadError && resultCount === 0 ? (
            <div className="rounded-lg border border-[#d8ccb9] bg-white p-5 text-sm leading-6 text-[#555d50]">
              No books match this combination yet. Try a broader year range or remove one filter.
            </div>
          ) : null}

          {hasSelectedGenre && filteredBooks.length > 0 ? (
            <>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filteredBooks.map((book) => (
                  <RecommendationBookCard
                    book={book}
                    isSaved={savedIds.has(book.id)}
                    key={book.id}
                    onToggleSaved={() => toggleSavedBook(book)}
                  />
                ))}
              </div>

              {resultCount > filteredBooks.length ? (
                <div className="mt-8 flex justify-center">
                  <button
                    className="rounded-md border border-[#315c8c] bg-white px-5 py-3 text-sm font-bold text-[#315c8c] transition hover:bg-[#eef4fb] focus:outline-none focus:ring-4 focus:ring-[#315c8c]/15"
                    disabled={isLoadingBooks}
                    onClick={() =>
                      setVisibleRecommendations((current) =>
                        Math.min(current + initialVisibleRecommendations, resultCount),
                      )
                    }
                    type="button"
                  >
                    Show more
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </section>
    </>
  );
}
