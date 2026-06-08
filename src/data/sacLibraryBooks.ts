import curatedSplBooks from "@/data/curatedSplBooks.json";
import {
  buildGoodreadsSearchUrl,
  buildGoogleBooksSearchUrl,
  buildSplCatalogSearchUrl,
} from "@/lib/catalogUrls";
import type { BookRecommendation, BookReviewSignal } from "@/types/book";

type CuratedSplBook = {
  id: string;
  title: string;
  author: string;
  isbn: string;
  format: string;
  audience: string;
  language: string;
  publicationYear: string;
  pageCount: number;
  ratingAverage: number;
  ratingCount: number;
  description: string;
  keywords: string[];
};

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 100000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatRating(value: number) {
  return `${value.toFixed(1)}/5`;
}

function buildReviewSignals(book: CuratedSplBook): BookReviewSignal[] {
  return [
    {
      source: "Goodreads",
      rating: "Reader reviews",
      note: "Goodreads review links are provided because Goodreads no longer offers a public reviews API for new integrations.",
      url: buildGoodreadsSearchUrl(book),
    },
    {
      source: "Google Books",
      rating: formatRating(book.ratingAverage),
      count: `${formatCount(book.ratingCount)} ratings`,
      note: "Seed rating shown until a cached Google Books/Open Library lookup updates this title.",
      url: buildGoogleBooksSearchUrl(book),
    },
  ];
}

function makeCatalogBook(book: CuratedSplBook): BookRecommendation {
  const catalogUrl = buildSplCatalogSearchUrl({
    query: book.title,
    format: book.format,
  });

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    rating: formatRating(book.ratingAverage),
    ratingAverage: book.ratingAverage,
    ratingCount: book.ratingCount,
    googleUsers: `${formatCount(book.ratingCount)} ratings`,
    description: book.description,
    whyThisFits: `A physical Sacramento Public Library candidate with ${book.keywords
      .slice(0, 3)
      .join(", ")} appeal.`,
    coverImageUrl: `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`,
    catalogUrl,
    requestUrl: catalogUrl,
    source: "curated-catalog",
    availabilityNote: "Holdable physical-book search in the Sacramento Public Library catalog",
    keywords: book.keywords,
    reviewSignals: buildReviewSignals(book),
    metadata: {
      format: book.format,
      audience: book.audience,
      language: book.language,
      publicationYear: book.publicationYear,
      pageCount: book.pageCount,
      genreTags: book.keywords.slice(0, 5),
    },
  };
}

export const sacLibraryBooks: BookRecommendation[] = (curatedSplBooks as CuratedSplBook[]).map(makeCatalogBook);

export function getRandomCuratedBooks(count = 3) {
  const books = [...sacLibraryBooks];

  for (let index = books.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [books[index], books[swapIndex]] = [books[swapIndex], books[index]];
  }

  return books.slice(0, count);
}
