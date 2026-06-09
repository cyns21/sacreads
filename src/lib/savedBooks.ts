import type { ClientBook, SavedBook } from "@/types/book";

export const savedBooksKey = "savedBooks";
export const legacySavedBooksKey = "sacreads:saved-books";
export const maxSavedBooks = 24;
const fallbackSplCatalogUrl = "https://catalog.saclibrary.org/";

const fallbackMetadata: SavedBook["metadata"] = {
  format: "Book",
  audience: "Adult / General",
  language: "English",
  publicationYear: "Not listed",
};

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function makeFallbackId(title: string, author: string, index: number) {
  const slug = `${title}-${author}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return slug || `saved-book-${index + 1}`;
}

function firstString(values: unknown[], fallback: string) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasSavedBookContent(book: Record<string, unknown>) {
  return [book.id, book.title, book.author, book.splCatalogUrl, book.requestUrl, book.catalogUrl].some(
    (value) => typeof value === "string" && value.trim(),
  );
}

function normalizeMetadata(value: unknown, publicationYear?: unknown): SavedBook["metadata"] {
  const metadata = typeof value === "object" && value !== null ? (value as Partial<SavedBook["metadata"]>) : {};

  return {
    format: stringValue(metadata.format, fallbackMetadata.format),
    audience: stringValue(metadata.audience, fallbackMetadata.audience),
    language: stringValue(metadata.language, fallbackMetadata.language),
    publicationYear: stringValue(metadata.publicationYear, stringValue(publicationYear, fallbackMetadata.publicationYear)),
  };
}

function normalizeSavedBook(book: Record<string, unknown>, index: number): SavedBook {
  const metadata = isRecord(book.metadata) ? book.metadata : {};
  const title = stringValue(book.title, "Untitled book");
  const author = stringValue(book.author, "Unknown author");
  const genre = firstString(
    [
      book.genre,
      Array.isArray(metadata.genreTags) ? metadata.genreTags.find((item) => typeof item === "string") : undefined,
    ],
    "Uncategorized",
  );

  return {
    id: stringValue(book.id, makeFallbackId(title, author, index)),
    title,
    author,
    genre,
    splCatalogUrl: firstString([book.splCatalogUrl, book.requestUrl, book.catalogUrl], fallbackSplCatalogUrl),
    metadata: normalizeMetadata(book.metadata, book.publicationYear),
  };
}

export function toSavedBook(book: ClientBook): SavedBook {
  return normalizeSavedBook(book as unknown as Record<string, unknown>, 0);
}

export function parseSavedBooks(snapshot: string | null) {
  if (!snapshot) {
    return [];
  }

  try {
    const parsed = JSON.parse(snapshot) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isRecord)
      .filter(hasSavedBookContent)
      .map(normalizeSavedBook)
      .slice(0, maxSavedBooks);
  } catch {
    return [];
  }
}

export function readSavedBooks() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return parseSavedBooks(window.localStorage.getItem(savedBooksKey) ?? window.localStorage.getItem(legacySavedBooksKey));
  } catch {
    return [];
  }
}

export function writeSavedBooks(books: SavedBook[]) {
  if (typeof window === "undefined" || !Array.isArray(books)) {
    return;
  }

  try {
    const safeBooks = books
      .filter((book): book is SavedBook => isRecord(book))
      .filter((book) => hasSavedBookContent(book as unknown as Record<string, unknown>))
      .map((book, index) => normalizeSavedBook(book as unknown as Record<string, unknown>, index))
      .slice(0, maxSavedBooks);

    window.localStorage.setItem(savedBooksKey, JSON.stringify(safeBooks));
  } catch {
    // Saving is a convenience feature; browsing should keep working if storage is unavailable.
  }
}
