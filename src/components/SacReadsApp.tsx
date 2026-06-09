"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookCard } from "@/components/BookCard";
import { SavedBooks } from "@/components/SavedBooks";
import { SearchForm } from "@/components/SearchForm";
import { sacLibraryBooks } from "@/data/sacLibraryBooks";
import { readSavedBooks, toSavedBook, writeSavedBooks, maxSavedBooks } from "@/lib/savedBooks";
import type { BookRecommendation, BrowseFilters, ClientBook, FilterOption, SavedBook } from "@/types/book";

const initialVisibleRecommendations = 12;
const genreOrder = [
  "Mystery",
  "Fantasy",
  "Romance",
  "Adventure",
  "Science Fiction",
  "Horror",
  "Historical Fiction",
  "Crime",
  "Biography",
  "Drama",
  "Nonfiction",
  "Uncategorized",
];
const formatOrder = ["Book", "Large Print", "Audiobook", "Graphic Novel", "Picture Book"];
const languageOrder = ["English", "Spanish"];
const audienceOrder = ["Adult / General", "Young Adult / Juvenile"];
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
  onSavedCountChange?: (count: number) => void;
};

function toClientBook(book: BookRecommendation): ClientBook {
  return {
    id: book.id,
    title: book.title || "Untitled book",
    author: book.author || "Unknown author",
    genre: book.genre || "Uncategorized",
    splCatalogUrl: book.splCatalogUrl || "https://catalog.saclibrary.org/",
    splSearchUrl: book.splSearchUrl,
    source: book.source,
    sourceType: book.sourceType,
    sourceListName: book.sourceListName,
    sourcePageUrl: book.sourcePageUrl,
    matchScore: book.matchScore,
    metadata: {
      format: book.metadata?.format || "Book",
      audience: book.metadata?.audience || "Adult / General",
      language: book.metadata?.language || "English",
      publicationYear: book.metadata?.publicationYear || "Not listed",
    },
  };
}

function getBookGenre(book: ClientBook) {
  return book.genre || "Uncategorized";
}

function parsePublicationYear(book: ClientBook) {
  const year = Number(book.metadata.publicationYear);
  return Number.isFinite(year) ? year : null;
}

function makeOptions(books: ClientBook[], values: string[], getValue: (book: ClientBook) => string): FilterOption[] {
  const counts = new Map<string, number>();

  for (const book of books) {
    const value = getValue(book);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return values
    .map((label) => ({ label, count: counts.get(label) ?? 0 }))
    .filter((option) => option.count > 0);
}

function matchesFilters(book: ClientBook, filters: BrowseFilters) {
  if (!filters.genre) {
    return false;
  }

  if (getBookGenre(book) !== filters.genre) {
    return false;
  }

  if (filters.format && book.metadata.format !== filters.format) {
    return false;
  }

  if (filters.language && book.metadata.language !== filters.language) {
    return false;
  }

  if (filters.audience && book.metadata.audience !== filters.audience) {
    return false;
  }

  const year = parsePublicationYear(book);
  const yearFrom = filters.yearFrom ? Number(filters.yearFrom) : null;
  const yearTo = filters.yearTo ? Number(filters.yearTo) : null;

  if (yearFrom && (!year || year < yearFrom)) {
    return false;
  }

  if (yearTo && (!year || year > yearTo)) {
    return false;
  }

  return true;
}

function sortBooks(books: ClientBook[], sort: BrowseFilters["sort"]) {
  const nextBooks = [...books];

  return nextBooks.sort((left, right) => {
    if (sort === "Newest") {
      const leftYear = parsePublicationYear(left) ?? -1;
      const rightYear = parsePublicationYear(right) ?? -1;
      return rightYear - leftYear || left.title.localeCompare(right.title);
    }

    if (sort === "Oldest") {
      const leftYear = parsePublicationYear(left) ?? Number.MAX_SAFE_INTEGER;
      const rightYear = parsePublicationYear(right) ?? Number.MAX_SAFE_INTEGER;
      return leftYear - rightYear || left.title.localeCompare(right.title);
    }

    return left.title.localeCompare(right.title);
  });
}

export function SacReadsApp({ onSavedCountChange }: SacReadsAppProps) {
  const allBooks = useMemo(() => sacLibraryBooks.map((book) => toClientBook(book)), []);
  const [filters, setFilters] = useState<BrowseFilters>(defaultFilters);
  const [visibleRecommendations, setVisibleRecommendations] = useState(initialVisibleRecommendations);
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

  const filterOptions = useMemo(
    () => ({
      genres: makeOptions(allBooks, genreOrder, getBookGenre),
      formats: makeOptions(allBooks, formatOrder, (book) => book.metadata.format),
      languages: makeOptions(allBooks, languageOrder, (book) => book.metadata.language),
      audiences: makeOptions(allBooks, audienceOrder, (book) => book.metadata.audience),
    }),
    [allBooks],
  );
  const filteredBooks = useMemo(
    () => (filters.genre ? sortBooks(allBooks.filter((book) => matchesFilters(book, filters)), filters.sort) : []),
    [allBooks, filters],
  );
  const visibleBooks = useMemo(
    () => filteredBooks.slice(0, visibleRecommendations),
    [filteredBooks, visibleRecommendations],
  );
  const savedIds = useMemo(() => new Set(savedBooks.map((book) => book.id)), [savedBooks]);
  const hasSelectedGenre = Boolean(filters.genre);
  const resultCount = hasSelectedGenre ? filteredBooks.length : allBooks.length;

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
  }

  function handleResetFilters() {
    setFilters(defaultFilters);
    setVisibleRecommendations(initialVisibleRecommendations);
  }

  return (
    <>
      <SearchForm
        filters={filters}
        onChange={handleFiltersChange}
        onReset={handleResetFilters}
        options={filterOptions}
        resultCount={resultCount}
      />

      <section className="border-b border-[#ded3c2] bg-[#f8f5ee]" id="recommendations">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
            <div className="max-w-3xl">
              <p className="mb-3 text-sm font-bold uppercase text-[#8b4c35]">Catalog results</p>
              <h2 className="text-3xl font-bold text-[#20231c] sm:text-4xl">Holdable SPL books.</h2>
              <p className="mt-4 text-base leading-7 text-[#555d50]" role="status">
                {hasSelectedGenre
                  ? `${filteredBooks.length.toLocaleString()} ${filters.genre} books match these filters.`
                  : "Choose a genre to show matching Sacramento Public Library catalog books."}
              </p>
            </div>
            <SavedBooks books={savedBooks} onRemove={removeSavedBook} />
          </div>

          {!hasSelectedGenre ? (
            <div className="rounded-lg border border-[#d8ccb9] bg-white p-5 text-sm leading-6 text-[#555d50]">
              Genre cards are ready above. Results stay hidden until a genre is selected.
            </div>
          ) : null}

          {hasSelectedGenre && filteredBooks.length === 0 ? (
            <div className="rounded-lg border border-[#d8ccb9] bg-white p-5 text-sm leading-6 text-[#555d50]">
              No books match this combination yet. Try a broader year range or remove one filter.
            </div>
          ) : null}

          {hasSelectedGenre && filteredBooks.length > 0 ? (
            <>
              <div className="grid gap-5 lg:grid-cols-3">
                {visibleBooks.map((book) => (
                  <BookCard
                    book={book}
                    isSaved={savedIds.has(book.id)}
                    key={book.id}
                    onToggleSaved={() => toggleSavedBook(book)}
                  />
                ))}
              </div>

              {filteredBooks.length > visibleRecommendations ? (
                <div className="mt-8 flex justify-center">
                  <button
                    className="rounded-md border border-[#315c8c] bg-white px-5 py-3 text-sm font-bold text-[#315c8c] transition hover:bg-[#eef4fb] focus:outline-none focus:ring-4 focus:ring-[#315c8c]/15"
                    onClick={() =>
                      setVisibleRecommendations((current) =>
                        Math.min(current + initialVisibleRecommendations, filteredBooks.length),
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
