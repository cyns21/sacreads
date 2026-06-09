import { sacLibraryBooks } from "@/data/sacLibraryBooks";
import { buildSplCatalogSearchUrl, SPL_CATALOG_BASE_URL } from "@/lib/catalogUrls";
import { enrichBookRecommendations } from "@/lib/bookMetadata";
import { rankRecommendations } from "@/lib/recommendationEngine";
import type { BookRecommendation, CatalogSearchFilters } from "@/types/book";

type AspenItemListEntry = {
  key?: number;
  name?: string;
};

type AspenCatalogItem = {
  key?: string;
  title?: string;
  author?: string;
  image?: string;
  language?: string;
  summary?: string;
  isbn?: string | string[];
  itemList?: Record<string, AspenItemListEntry>;
};

type AspenSearchResponse = {
  result?: {
    success?: boolean;
    message?: string;
    items?: AspenCatalogItem[];
  };
  error?: string;
};

const recommendationCount = 36;
const enrichmentTimeoutMs = 1200;
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

function getApiHeaders() {
  const headers = new Headers({
    Accept: "application/json",
    "User-Agent": "SacReads portfolio project",
  });

  const key1 = process.env.SPL_ASPEN_API_KEY1 ?? process.env.ASPEN_API_KEY1;
  const key2 = process.env.SPL_ASPEN_API_KEY2 ?? process.env.ASPEN_API_KEY2;

  if (key1 && key2) {
    headers.set("Authorization", `Basic ${Buffer.from(`${key1}:${key2}`).toString("base64")}`);
  }

  return headers;
}

function getAspenSearchUrl(filters: CatalogSearchFilters) {
  const params = new URLSearchParams({
    method: "searchLite",
    lookfor: getQuery(filters),
    searchIndex: "Keyword",
    source: "local",
    sort: "relevance",
    pageSize: "15",
    includeSortList: "false",
    availability_toggle: "available",
  });

  params.append("filter[]", "availability_toggle:available");
  params.append("filter[]", 'format_category:"Books"');

  if (filters.pickupBranch) {
    params.append("filter[]", `available_at:"${filters.pickupBranch}"`);
  }

  return `${SPL_CATALOG_BASE_URL}/API/SearchAPI?${params.toString()}`;
}

function getMinimumRating(filters: CatalogSearchFilters) {
  const rating = Number.parseFloat(filters.minimumRating);
  return Number.isNaN(rating) ? undefined : rating;
}

function getMaxPages(filters: CatalogSearchFilters) {
  const match = filters.maxPages.match(/\d+/);

  if (!match) {
    return undefined;
  }

  const pages = Number.parseInt(match[0], 10);
  return Number.isNaN(pages) ? undefined : pages;
}

function normalizeGenre(value: string) {
  return genreAliases.get(value.toLowerCase()) ?? value;
}

function filterHasGenre(book: BookRecommendation, genre: string) {
  const expected = normalizeGenre(genre).toLowerCase();
  const candidates = [...(book.metadata.genreTags ?? []), ...(book.keywords ?? [])].map((value) =>
    normalizeGenre(value).toLowerCase(),
  );

  return candidates.includes(expected);
}

function matchesExtendedFilters(book: BookRecommendation, filters: CatalogSearchFilters) {
  const authorNeedle = filters.authorContains.trim().toLowerCase();
  const minimumRating = getMinimumRating(filters);
  const maxPages = getMaxPages(filters);

  if (authorNeedle && !book.author.toLowerCase().includes(authorNeedle)) {
    return false;
  }

  if (typeof minimumRating === "number" && (book.ratingAverage ?? 0) < minimumRating) {
    return false;
  }

  if (typeof maxPages === "number" && (book.metadata.pageCount ?? Number.POSITIVE_INFINITY) > maxPages) {
    return false;
  }

  return true;
}

function getPhysicalFormats(item: AspenCatalogItem) {
  return Object.values(item.itemList ?? {})
    .map((entry) => entry.name ?? "")
    .filter(Boolean)
    .filter((name) => !/ebook|eaudio|downloadable|online/i.test(name));
}

function isPhysicalBook(item: AspenCatalogItem) {
  const formats = getPhysicalFormats(item);

  if (formats.length === 0) {
    return true;
  }

  return formats.some((format) => /book|large print|board/i.test(format));
}

function absoluteUrl(value?: string) {
  if (!value) {
    return undefined;
  }

  if (value.startsWith("http")) {
    return value;
  }

  return `${SPL_CATALOG_BASE_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}

function inferAudience(item: AspenCatalogItem, filters: CatalogSearchFilters) {
  if (filters.audience !== "General") {
    return filters.audience;
  }

  const text = `${item.title ?? ""} ${item.summary ?? ""}`.toLowerCase();

  if (/teen|young adult|ya\b/.test(text)) {
    return "Young Adult";
  }

  if (/juvenile|children|kids|picture book/.test(text)) {
    return "Juvenile";
  }

  return "General";
}

function inferFormat(item: AspenCatalogItem, filters: CatalogSearchFilters) {
  if (filters.format === "Picture Book") {
    return "Picture Book";
  }

  const formats = getPhysicalFormats(item);
  return formats[0] ?? "Book";
}

function getIsbn(item: AspenCatalogItem) {
  if (Array.isArray(item.isbn)) {
    return item.isbn[0];
  }

  return item.isbn;
}

function withBranchHoldLink(book: BookRecommendation, filters: CatalogSearchFilters): BookRecommendation {
  const format = book.metadata.format === "Picture Book" ? "Picture Book" : filters.format;
  const catalogUrl = buildSplCatalogSearchUrl({
    query: book.title,
    pickupBranch: filters.pickupBranch,
    format,
  });

  return {
    ...book,
    catalogUrl,
    requestUrl: catalogUrl,
    availabilityNote: `Open SPL catalog to place a hold or confirm pickup availability at ${filters.pickupBranch}`,
    metadata: {
      ...book.metadata,
      pickupBranch: filters.pickupBranch,
    },
  };
}

function mapAspenItem(item: AspenCatalogItem, filters: CatalogSearchFilters): BookRecommendation {
  const title = item.title?.trim() || "Untitled catalog record";
  const author = item.author?.trim() || "Sacramento Public Library";
  const catalogUrl = buildSplCatalogSearchUrl({
    query: title,
    pickupBranch: filters.pickupBranch,
    format: filters.format,
  });

  return {
    id: item.key ?? `spl-${title}-${author}`,
    title,
    author,
    isbn: getIsbn(item),
    description:
      item.summary?.trim() ||
      "A Sacramento Public Library catalog result selected from the holdable physical books collection.",
    whyThisFits:
      "This physical Sacramento Public Library catalog result matched your request and opens to a hold-ready catalog search.",
    coverImageUrl: absoluteUrl(item.image),
    catalogUrl,
    requestUrl: catalogUrl,
    source: "spl-catalog",
    availabilityNote: `Available-now physical-book result for ${filters.pickupBranch}`,
    keywords: [filters.genre, filters.mood, filters.bookType, inferFormat(item, filters)].filter(
      (value) => value && !value.startsWith("Any"),
    ),
    metadata: {
      format: inferFormat(item, filters),
      audience: inferAudience(item, filters),
      language: item.language ?? (filters.language === "Any language" ? "Not listed" : filters.language),
      publicationYear: "Not listed",
      pickupBranch: filters.pickupBranch,
      genreTags: [filters.genre, filters.mood].filter((value) => !value.startsWith("Any")),
    },
  };
}

function getBookKey(book: BookRecommendation) {
  return `${book.title.toLowerCase()}::${book.author.toLowerCase()}`;
}

function mergeRecommendations(books: BookRecommendation[]) {
  const seen = new Set<string>();
  const merged: BookRecommendation[] = [];

  for (const book of books) {
    const key = getBookKey(book);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(book);
  }

  return merged;
}

function buildCuratedRecommendations(
  filters: CatalogSearchFilters,
  options: { ignoreGenre?: boolean; ignoreAudience?: boolean } = {},
) {
  const branchLinked = sacLibraryBooks.map((book) => withBranchHoldLink(book, filters));
  const filtered = branchLinked.filter((book) => {
    const formatMatches =
      filters.format !== "Picture Book" || book.metadata.format === "Picture Book";
    const audienceMatches =
      options.ignoreAudience || filters.audience === "General" || book.metadata.audience === filters.audience;
    const languageMatches =
      filters.language === "Any language" || book.metadata.language === filters.language;
    const genreMatches =
      options.ignoreGenre || filters.genre === "Any genre" || filterHasGenre(book, filters.genre);
    const bookTypeMatches =
      filters.bookType === "Any" ||
      book.keywords?.some((keyword) => keyword.toLowerCase() === filters.bookType.toLowerCase());

    return (
      formatMatches &&
      audienceMatches &&
      languageMatches &&
      genreMatches &&
      bookTypeMatches &&
      matchesExtendedFilters(book, filters)
    );
  });

  return rankRecommendations(filtered, filters);
}

function getFallbackRecommendations(filters: CatalogSearchFilters) {
  const hasLanguage = filters.language !== "Any language";
  const hasGenre = filters.genre !== "Any genre";
  const hasAudience = filters.audience !== "General";

  if (hasLanguage && hasGenre) {
    const books = buildCuratedRecommendations(filters, { ignoreGenre: true }).slice(0, recommendationCount);

    if (books.length > 0) {
      return {
        books,
        message: `Closest matches: No exact matches found for this combination. Try removing one filter, or browse all ${filters.language} results.`,
      };
    }
  }

  if (hasLanguage && hasAudience) {
    const books = buildCuratedRecommendations(filters, { ignoreAudience: true }).slice(0, recommendationCount);

    if (books.length > 0) {
      return {
        books,
        message: `Closest matches: No exact matches found for this combination. Try removing one filter, or browse all ${filters.language} results.`,
      };
    }
  }

  return {
    books: [],
    message:
      "No exact matches found for this combination. Try removing one filter, or browse all selected genre/language results.",
  };
}

async function getLiveCatalogBooks(filters: CatalogSearchFilters) {
  const response = await fetch(getAspenSearchUrl(filters), {
    headers: getApiHeaders(),
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(2500),
  });

  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok || !contentType.includes("application/json")) {
    throw new Error(`SPL catalog returned ${response.status}`);
  }

  const payload = (await response.json()) as AspenSearchResponse;

  if (payload.error) {
    throw new Error(payload.error);
  }

  const physicalBooks = (payload.result?.items ?? [])
    .filter(isPhysicalBook)
    .map((item) => mapAspenItem(item, filters));

  if (physicalBooks.length === 0) {
    throw new Error(payload.result?.message ?? "No physical catalog books returned");
  }

  return rankRecommendations(physicalBooks, filters);
}

async function withTimeout<T>(promise: Promise<T>, fallback: T, milliseconds: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeout = setTimeout(() => resolve(fallback), milliseconds);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export async function getSacReadsRecommendations(filters: CatalogSearchFilters) {
  const catalogUrl = buildSplCatalogSearchUrl({
    query: getQuery(filters),
    pickupBranch: filters.pickupBranch,
    format: filters.format,
  });

  let liveBooks: BookRecommendation[] = [];
  let liveCatalogError: string | undefined;

  try {
    liveBooks = await getLiveCatalogBooks(filters);
  } catch (error) {
    liveCatalogError = error instanceof Error ? error.message : "Unknown catalog error";
  }

  const curatedBooks = buildCuratedRecommendations(filters);
  let rankedBooks: BookRecommendation[] = rankRecommendations(
    mergeRecommendations([...liveBooks, ...curatedBooks]).map((book) => withBranchHoldLink(book, filters)),
    filters,
  )
    .filter((book) => matchesExtendedFilters(book, filters))
    .slice(0, recommendationCount);
  let fallbackMessage = "";

  if (rankedBooks.length === 0) {
    const fallback = getFallbackRecommendations(filters);
    rankedBooks = fallback.books.map((book) => withBranchHoldLink(book, filters));
    fallbackMessage = fallback.message;
  }

  const shouldEnrich = rankedBooks.length > 0;
  const enrichedBooks = shouldEnrich
    ? await withTimeout(enrichBookRecommendations(rankedBooks), rankedBooks, enrichmentTimeoutMs)
    : rankedBooks;
  const usedLiveCatalog = liveBooks.length > 0;

  return {
    books: enrichedBooks,
    mode: usedLiveCatalog ? ("spl-catalog" as const) : ("curated-catalog" as const),
    message:
      fallbackMessage ||
      (usedLiveCatalog
        ? `Ranked live Sacramento Public Library physical-book results for ${filters.pickupBranch}.`
        : `Ranked hold-ready Sacramento Public Library catalog searches for ${filters.pickupBranch}.`),
    catalogUrl,
    error: liveCatalogError,
  };
}
