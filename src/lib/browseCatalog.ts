import "server-only";

import { sacLibraryBooks } from "@/data/sacLibraryBooks";
import type { BookRecommendation, BrowseFilterOptions, BrowseFilters, ClientBook, FilterOption } from "@/types/book";

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

let clientBooksCache: ClientBook[] | null = null;
let filterOptionsCache: BrowseFilterOptions | null = null;

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

function getClientBooks() {
  if (!clientBooksCache) {
    clientBooksCache = sacLibraryBooks.map((book) => toClientBook(book));
  }

  return clientBooksCache;
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

export function getBrowseFilterOptions() {
  if (!filterOptionsCache) {
    const books = getClientBooks();

    filterOptionsCache = {
      genres: makeOptions(books, genreOrder, getBookGenre),
      formats: makeOptions(books, formatOrder, (book) => book.metadata.format),
      languages: makeOptions(books, languageOrder, (book) => book.metadata.language),
      audiences: makeOptions(books, audienceOrder, (book) => book.metadata.audience),
    };
  }

  return filterOptionsCache;
}

export function getBrowseBookCount() {
  return getClientBooks().length;
}

export function getBrowseResults(filters: BrowseFilters, limit: number) {
  if (!filters.genre) {
    return {
      books: [] as ClientBook[],
      resultCount: getBrowseBookCount(),
    };
  }

  const filteredBooks = sortBooks(
    getClientBooks().filter((book) => matchesFilters(book, filters)),
    filters.sort,
  );

  return {
    books: filteredBooks.slice(0, limit),
    resultCount: filteredBooks.length,
  };
}
