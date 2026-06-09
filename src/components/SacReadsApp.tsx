"use client";

import { useEffect, useMemo, useState } from "react";
import { BookCard } from "@/components/BookCard";
import { SavedBooks } from "@/components/SavedBooks";
import { SearchForm } from "@/components/SearchForm";
import { sacLibraryBooks } from "@/data/sacLibraryBooks";
import type { BookRecommendation, BrowseFilters, ClientBook, FilterOption, SavedBook } from "@/types/book";

const savedBooksKey = "savedBooks";
const legacySavedBooksKey = "sacreads:saved-books";
const initialVisibleRecommendations = 12;
const maxSavedBooks = 24;
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
    title: book.title,
    author: book.author,
    description: book.description,
    whyThisFits: book.whyThisFits,
    coverImageUrl: book.coverImageUrl,
    catalogUrl: book.catalogUrl,
    requestUrl: book.requestUrl || book.catalogUrl,
    source: book.source,
    sourceType: book.sourceType,
    matchScore: book.matchScore,
    availabilityNote: book.availabilityNote,
    rating: book.rating,
    ratingAverage: book.ratingAverage,
    ratingCount: book.ratingCount,
    reviewSignals: book.reviewSignals?.slice(0, 1),
    metadata: {
      format: book.metadata.format,
      audience: book.metadata.audience,
      language: book.metadata.language,
      publicationYear: book.metadata.publicationYear,
      pickupBranch: book.metadata.pickupBranch,
      pageCount: book.metadata.pageCount,
      genreTags: book.metadata.genreTags?.slice(0, 3),
    },
  };
}

function toSavedBook(book: ClientBook): SavedBook {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    coverImageUrl: book.coverImageUrl,
    requestUrl: book.requestUrl,
    publicationYear: book.metadata.publicationYear,
  };
}

function parseSavedBooks(snapshot: string | null) {
  if (!snapshot) {
    return [];
  }

  try {
    const parsed = JSON.parse(snapshot) as Partial<SavedBook>[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((book) => book.id && book.title && book.author)
      .map((book) => ({
        id: String(book.id),
        title: String(book.title),
        author: String(book.author),
        coverImageUrl: typeof book.coverImageUrl === "string" ? book.coverImageUrl : undefined,
        requestUrl: typeof book.requestUrl === "string" ? book.requestUrl : "https://catalog.saclibrary.org/",
        publicationYear: typeof book.publicationYear === "string" ? book.publicationYear : "Not listed",
      }))
      .slice(0, maxSavedBooks);
  } catch {
    return [];
  }
}

function readSavedBooks() {
  if (typeof window === "undefined") {
    return [];
  }

  return parseSavedBooks(
    window.localStorage.getItem(savedBooksKey) ?? window.localStorage.getItem(legacySavedBooksKey),
  );
}

function getBookGenre(book: ClientBook) {
  return book.metadata.genreTags?.[0] || "Uncategorized";
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
    if (sort === "Highest Goodreads rating") {
      const leftRating = left.ratingAverage ?? -1;
      const rightRating = right.ratingAverage ?? -1;
      return rightRating - leftRating || left.title.localeCompare(right.title);
    }

    if (sort === "Most Goodreads reviews") {
      const leftCount = left.ratingCount ?? -1;
      const rightCount = right.ratingCount ?? -1;
      return rightCount - leftCount || left.title.localeCompare(right.title);
    }

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
  const [savedBooks, setSavedBooks] = useState<SavedBook[]>(readSavedBooks);

  useEffect(() => {
    let isMounted = true;

    queueMicrotask(() => {
      if (isMounted) {
        setSavedBooks(readSavedBooks());
      }
    });

    return () => {
      isMounted = false;
    };
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
    () => sortBooks(allBooks.filter((book) => matchesFilters(book, filters)), filters.sort),
    [allBooks, filters],
  );
  const visibleBooks = filteredBooks.slice(0, visibleRecommendations);
  const savedIds = useMemo(() => new Set(savedBooks.map((book) => book.id)), [savedBooks]);
  const hasSelectedGenre = Boolean(filters.genre);
  const resultCount = hasSelectedGenre ? filteredBooks.length : allBooks.length;

  function persistSavedBooks(nextBooks: SavedBook[]) {
    setSavedBooks(nextBooks);
    window.localStorage.setItem(savedBooksKey, JSON.stringify(nextBooks));
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
                  <BookCard book={book} isSaved={savedIds.has(book.id)} key={book.id} onSave={toggleSavedBook} />
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
