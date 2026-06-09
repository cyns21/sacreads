import { sacLibraryBooks } from "@/data/sacLibraryBooks";
import { buildSplCatalogSearchUrl } from "@/lib/catalogUrls";
import { rankRecommendations } from "@/lib/recommendationEngine";
import type { BookRecommendation, CatalogSearchFilters } from "@/types/book";

const recommendationCount = 36;
const genreAliases = new Map([
  ["historical fiction", "Historical Fiction"],
  ["science fiction", "Science Fiction"],
  ["picture book", "Children's / Picture Books"],
  ["picture books", "Children's / Picture Books"],
]);

function getQuery(filters: CatalogSearchFilters) {
  const pieces = [
    filters.query,
    filters.genre !== "Any genre" ? filters.genre : "",
    filters.mood !== "Any mood" ? filters.mood : "",
    filters.format === "Picture Book" ? "picture book" : "",
    filters.bookType !== "Any" ? filters.bookType : "",
    filters.authorContains,
  ];

  return pieces.filter(Boolean).join(" ").trim() || "library books";
}

function normalizeGenre(value: string) {
  return genreAliases.get(value.toLowerCase()) ?? value;
}

function normalizeAudience(value: string) {
  const normalized = value.toLowerCase();

  if (normalized.includes("juvenile") || normalized.includes("young adult")) {
    return "young adult juvenile";
  }

  if (normalized.includes("adult")) {
    return "adult";
  }

  return normalized;
}

function filterHasGenre(book: BookRecommendation, genre: string) {
  const expected = normalizeGenre(genre).toLowerCase();
  const candidates = [book.genre, ...(book.keywords ?? [])].map((value) => normalizeGenre(value).toLowerCase());

  return candidates.includes(expected);
}

function matchesFilters(book: BookRecommendation, filters: CatalogSearchFilters) {
  const authorNeedle = filters.authorContains.trim().toLowerCase();

  if (authorNeedle && !book.author.toLowerCase().includes(authorNeedle)) {
    return false;
  }

  if (filters.format === "Picture Book" && book.metadata.format !== "Picture Book") {
    return false;
  }

  if (filters.audience !== "General" && normalizeAudience(book.metadata.audience) !== normalizeAudience(filters.audience)) {
    return false;
  }

  if (filters.language !== "Any language" && book.metadata.language !== filters.language) {
    return false;
  }

  if (filters.genre !== "Any genre" && !filterHasGenre(book, filters.genre)) {
    return false;
  }

  return (
    filters.bookType === "Any" ||
    book.keywords?.some((keyword) => keyword.toLowerCase() === filters.bookType.toLowerCase()) === true
  );
}

function buildCuratedRecommendations(filters: CatalogSearchFilters): BookRecommendation[] {
  return rankRecommendations(sacLibraryBooks.filter((book) => matchesFilters(book, filters)), filters).slice(
    0,
    recommendationCount,
  );
}

function getFallbackRecommendations(filters: CatalogSearchFilters) {
  if (filters.genre !== "Any genre") {
    const books = rankRecommendations(
      sacLibraryBooks.filter((book) => matchesFilters(book, { ...filters, genre: "Any genre" })),
      filters,
    ).slice(0, recommendationCount);

    if (books.length > 0) {
      return {
        books,
        message: "Closest matches: no exact matches found for this genre and filter combination.",
      };
    }
  }

  return {
    books: [] as BookRecommendation[],
    message: "No exact matches found for this combination. Try removing one filter.",
  };
}

export async function getSacReadsRecommendations(filters: CatalogSearchFilters) {
  const splCatalogUrl = buildSplCatalogSearchUrl({
    query: getQuery(filters),
    pickupBranch: filters.pickupBranch,
    format: filters.format,
  });

  let books: BookRecommendation[] = buildCuratedRecommendations(filters);
  let message = "Ranked imported Sacramento Public Library catalog records.";

  if (books.length === 0) {
    const fallback = getFallbackRecommendations(filters);
    books = fallback.books;
    message = fallback.message;
  }

  return {
    books,
    mode: "curated-catalog" as const,
    message,
    splCatalogUrl,
    error: undefined,
  };
}
