import localBooks from "@/data/books.json";
import { buildSplCatalogSearchUrl } from "@/lib/catalogUrls";
import type { BookRecommendation, BookReviewSignal, LocalBookRecord } from "@/types/book";

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 100000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatRating(value: number) {
  return `${value.toFixed(1)}/5`;
}

function hasRating(book: LocalBookRecord) {
  return typeof book.goodreadsRating === "number" && Number.isFinite(book.goodreadsRating);
}

function hasReviewCount(book: LocalBookRecord) {
  return typeof book.goodreadsReviewCount === "number" && Number.isFinite(book.goodreadsReviewCount);
}

function buildReviewSignals(book: LocalBookRecord): BookReviewSignal[] {
  if (!hasRating(book)) {
    return [
      {
        source: "Goodreads",
        note: "Goodreads info not added yet.",
        url: book.goodreadsUrl || undefined,
      },
    ];
  }

  return [
    {
      source: "Goodreads",
      rating: hasRating(book) ? formatRating(book.goodreadsRating as number) : undefined,
      count: hasReviewCount(book) ? `${formatCount(book.goodreadsReviewCount as number)} reviews` : undefined,
      note: "Manually added Goodreads metadata.",
      url: book.goodreadsUrl || undefined,
    },
  ];
}

function getCatalogUrl(book: LocalBookRecord) {
  return (
    book.splCatalogUrl ||
    book.splSearchUrl ||
    buildSplCatalogSearchUrl({
      query: `${book.title} ${book.author}`,
      format: book.format || "Book",
    })
  );
}

function makeCatalogBook(book: LocalBookRecord): BookRecommendation {
  const catalogUrl = getCatalogUrl(book);
  const isBrowserCatalogResult = book.sourceType === "spl-catalog-browser";
  const genreTags =
    book.genres?.length
      ? book.genres.filter((genre) => genre !== "Uncategorized")
      : book.genre && book.genre !== "Uncategorized"
        ? [book.genre]
        : [];
  const keywords = [
    book.genre,
    ...(book.genres ?? []),
    book.audience,
    book.format,
    book.language,
    book.sourceListName,
    ...(book.sourceSeeds ?? []),
  ].filter(Boolean);

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    rating: hasRating(book) ? formatRating(book.goodreadsRating as number) : undefined,
    ratingAverage: hasRating(book) ? book.goodreadsRating ?? undefined : undefined,
    ratingCount: hasReviewCount(book) ? book.goodreadsReviewCount ?? undefined : undefined,
    description: book.description || "Description not added yet.",
    whyThisFits: isBrowserCatalogResult
      ? `Found in a public Sacramento Public Library catalog search for ${book.sourceSeed || "this topic"}.`
      : `A Sacramento Public Library reading-list pick from ${book.sourceListName || "a public SPL list"}.`,
    coverImageUrl: book.coverUrl || undefined,
    catalogUrl,
    requestUrl: catalogUrl,
    source: "curated-catalog",
    sourceType: book.sourceType ?? "spl-catalog-browser",
    availabilityNote: "Check SPL catalog for current locations, copies, and request options.",
    keywords,
    reviewSignals: buildReviewSignals(book),
    metadata: {
      format: book.format || "Book",
      audience: book.audience || "Adult / General",
      language: book.language || "English",
      publicationYear: book.publicationYear ? String(book.publicationYear) : "Not listed",
      genreTags,
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
