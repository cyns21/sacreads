import localBooks from "@/data/books.json";
import { buildSplCatalogSearchUrl } from "@/lib/catalogUrls";
import type { BookRecommendation, LocalBookRecord } from "@/types/book";

const fallbackTitle = "Untitled book";
const fallbackAuthor = "Unknown author";
const fallbackGenre = "Uncategorized";

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function makeFallbackId(title: string, author: string, index: number) {
  const slug = `${title}-${author}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);

  return slug || `spl-book-${index + 1}`;
}

function normalizePublicationYear(value: LocalBookRecord["publicationYear"]) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string") {
    const match = value.match(/\d{4}/);
    return match?.[0] ?? "Not listed";
  }

  return "Not listed";
}

function getGenres(book: LocalBookRecord) {
  const genres = Array.isArray(book.genres)
    ? book.genres.filter((genre) => typeof genre === "string" && genre.trim() && genre !== fallbackGenre)
    : [];
  const primaryGenre = stringValue(book.genre, genres[0] ?? fallbackGenre);

  return [...new Set([primaryGenre, ...genres])].filter(Boolean);
}

function getCatalogUrl(book: LocalBookRecord, title: string, author: string, format: string) {
  return (
    book.splCatalogUrl ||
    book.splSearchUrl ||
    buildSplCatalogSearchUrl({
      query: `${title} ${author}`,
      format,
    })
  );
}

function makeCatalogBook(book: LocalBookRecord, index: number): BookRecommendation {
  const title = stringValue(book.title, fallbackTitle);
  const author = stringValue(book.author, fallbackAuthor);
  const format = stringValue(book.format, "Book");
  const audience = stringValue(book.audience, "Adult / General");
  const language = stringValue(book.language, "English");
  const genres = getGenres(book);
  const genre = genres[0] ?? fallbackGenre;
  const splCatalogUrl = getCatalogUrl(book, title, author, format);
  const keywords = [
    genre,
    ...genres,
    audience,
    format,
    language,
    book.sourceListName,
    ...(book.sourceSeeds ?? []),
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  return {
    id: stringValue(book.id, makeFallbackId(title, author, index)),
    title,
    author,
    genre,
    splCatalogUrl,
    splSearchUrl: book.splSearchUrl,
    source: "curated-catalog",
    sourceType: book.sourceType ?? "spl-catalog-browser",
    sourceListName: book.sourceListName,
    sourcePageUrl: book.sourcePageUrl,
    keywords,
    metadata: {
      format,
      audience,
      language,
      publicationYear: normalizePublicationYear(book.publicationYear),
    },
  };
}

export const sacLibraryBooks: BookRecommendation[] = (localBooks as LocalBookRecord[]).map(makeCatalogBook);

export function getRandomCuratedBooks(count = 3) {
  const books = [...sacLibraryBooks];

  for (let index = books.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [books[index], books[swapIndex]] = [books[swapIndex], books[index]];
  }

  return books.slice(0, count);
}
