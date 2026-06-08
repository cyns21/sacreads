import {
  buildGoodreadsSearchUrl,
  buildGoogleBooksSearchUrl,
} from "@/lib/catalogUrls";
import type { BookRecommendation, BookReviewSignal } from "@/types/book";

type GoogleBooksResponse = {
  items?: GoogleBookVolume[];
};

type GoogleBookVolume = {
  volumeInfo?: {
    title?: string;
    authors?: string[];
    description?: string;
    publishedDate?: string;
    language?: string;
    averageRating?: number;
    ratingsCount?: number;
    pageCount?: number;
    categories?: string[];
    infoLink?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
};

type OpenLibrarySearchResponse = {
  docs?: OpenLibrarySearchDoc[];
};

type OpenLibrarySearchDoc = {
  key?: string;
  cover_i?: number;
  first_publish_year?: number;
  language?: string[];
  ratings_average?: number;
  ratings_count?: number;
  number_of_pages_median?: number;
  subject?: string[];
};

type OpenLibraryWorkResponse = {
  description?: string | { value?: string };
};

type MetadataPatch = {
  description?: string;
  coverImageUrl?: string;
  publicationYear?: string;
  language?: string;
  pageCount?: number;
  genreTags?: string[];
  ratingAverage?: number;
  ratingCount?: number;
  reviewSignal?: BookReviewSignal;
};

const googleBooksCache = new Map<string, Promise<MetadataPatch | undefined>>();
const openLibraryCache = new Map<string, Promise<MetadataPatch | undefined>>();

const languageNames: Record<string, string> = {
  en: "English",
  eng: "English",
  es: "Spanish",
  spa: "Spanish",
  zh: "Chinese",
  chi: "Chinese",
  zho: "Chinese",
  vi: "Vietnamese",
  vie: "Vietnamese",
  ru: "Russian",
  rus: "Russian",
};

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatRating(value: number) {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}/5`;
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function trimDescription(value?: string) {
  if (!value) {
    return undefined;
  }

  const clean = stripHtml(value);

  if (clean.length <= 420) {
    return clean;
  }

  return `${clean.slice(0, 417).trim()}...`;
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "SacReads portfolio project",
    },
    next: { revalidate: 60 * 60 * 24 },
    signal: AbortSignal.timeout(2500),
  });

  if (!response.ok) {
    throw new Error(`Metadata source returned ${response.status}`);
  }

  return (await response.json()) as T;
}

function googleBooksQuery(book: BookRecommendation) {
  if (book.isbn) {
    return `isbn:${book.isbn}`;
  }

  return `intitle:${book.title} inauthor:${book.author}`;
}

async function getGoogleBooksPatch(book: BookRecommendation): Promise<MetadataPatch | undefined> {
  const cacheKey = `google:${book.isbn ?? `${book.title}:${book.author}`}`;

  if (googleBooksCache.has(cacheKey)) {
    return googleBooksCache.get(cacheKey);
  }

  const lookup = fetchGoogleBooksPatch(book).catch(() => undefined);
  googleBooksCache.set(cacheKey, lookup);

  return lookup;
}

async function fetchGoogleBooksPatch(book: BookRecommendation): Promise<MetadataPatch | undefined> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;

  const params = new URLSearchParams({
    q: googleBooksQuery(book),
    maxResults: "1",
    printType: "books",
    projection: "lite",
  });

  if (apiKey) {
    params.set("key", apiKey);
  }

  const payload = await fetchJson<GoogleBooksResponse>(`https://www.googleapis.com/books/v1/volumes?${params}`);
  const volume = payload.items?.[0]?.volumeInfo;

  if (!volume) {
    return undefined;
  }

  const ratingsCount = volume.ratingsCount ?? 0;
  const rating = typeof volume.averageRating === "number" ? formatRating(volume.averageRating) : undefined;
  const count = ratingsCount > 0 ? `${formatCount(ratingsCount)} ratings` : undefined;
  const coverImageUrl = volume.imageLinks?.thumbnail ?? volume.imageLinks?.smallThumbnail;

  return {
    description: trimDescription(volume.description),
    coverImageUrl: coverImageUrl?.replace(/^http:/, "https:"),
    publicationYear: volume.publishedDate?.slice(0, 4),
    language: volume.language ? languageNames[volume.language] : undefined,
    pageCount: volume.pageCount,
    genreTags: volume.categories?.slice(0, 5),
    ratingAverage: volume.averageRating,
    ratingCount: ratingsCount > 0 ? ratingsCount : undefined,
    reviewSignal: {
      source: "Google Books",
      rating: rating ?? "Google reviews",
      count,
      note: rating
        ? `Google Books reader rating${count ? ` across ${count}` : ""}.`
        : "Open Google Books for preview details and reader ratings when available.",
      url: volume.infoLink ?? buildGoogleBooksSearchUrl(book),
    },
  };
}

function openLibrarySearchUrl(book: BookRecommendation) {
  const params = new URLSearchParams({
    limit: "1",
    fields:
      "key,cover_i,first_publish_year,language,ratings_average,ratings_count,number_of_pages_median,subject",
  });

  if (book.isbn) {
    params.set("isbn", book.isbn);
  } else {
    params.set("title", book.title);
    params.set("author", book.author);
  }

  return `https://openlibrary.org/search.json?${params}`;
}

async function getOpenLibraryDescription(workKey?: string) {
  if (!workKey) {
    return undefined;
  }

  const payload = await fetchJson<OpenLibraryWorkResponse>(`https://openlibrary.org${workKey}.json`);
  const description =
    typeof payload.description === "string" ? payload.description : payload.description?.value;

  return trimDescription(description);
}

async function getOpenLibraryPatch(book: BookRecommendation): Promise<MetadataPatch | undefined> {
  const cacheKey = `openlibrary:${book.isbn ?? `${book.title}:${book.author}`}`;

  if (openLibraryCache.has(cacheKey)) {
    return openLibraryCache.get(cacheKey);
  }

  const lookup = fetchOpenLibraryPatch(book).catch(() => undefined);
  openLibraryCache.set(cacheKey, lookup);

  return lookup;
}

async function fetchOpenLibraryPatch(book: BookRecommendation): Promise<MetadataPatch | undefined> {
  const payload = await fetchJson<OpenLibrarySearchResponse>(openLibrarySearchUrl(book));
  const doc = payload.docs?.[0];

  if (!doc) {
    return undefined;
  }

  const description = await getOpenLibraryDescription(doc.key).catch(() => undefined);
  const rating =
    typeof doc.ratings_average === "number" && doc.ratings_average > 0
      ? formatRating(doc.ratings_average)
      : undefined;
  const count =
    typeof doc.ratings_count === "number" && doc.ratings_count > 0
      ? `${formatCount(doc.ratings_count)} ratings`
      : undefined;

  return {
    description,
    coverImageUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : undefined,
    publicationYear: doc.first_publish_year?.toString(),
    language: doc.language?.find((language) => languageNames[language])
      ? languageNames[doc.language.find((language) => languageNames[language]) as string]
      : undefined,
    pageCount: doc.number_of_pages_median,
    genreTags: doc.subject?.slice(0, 5),
    ratingAverage: rating ? doc.ratings_average : undefined,
    ratingCount: typeof doc.ratings_count === "number" && doc.ratings_count > 0 ? doc.ratings_count : undefined,
    reviewSignal:
      rating || count
        ? {
            source: "Open Library",
            rating: rating ?? "Reader ratings",
            count,
            note: "Open Library community rating from its public book record.",
            url: doc.key ? `https://openlibrary.org${doc.key}` : "https://openlibrary.org/",
          }
        : undefined,
  };
}

function sourceFallbackSignals(book: BookRecommendation): BookReviewSignal[] {
  return [
    {
      source: "Goodreads",
      rating: "Reader reviews",
      note: `Open Goodreads to compare community reviews and star ratings for ${book.title}.`,
      url: buildGoodreadsSearchUrl(book),
    },
    {
      source: "Google Books",
      rating: "Google reviews",
      note: "Open Google Books for preview details and reader ratings when available.",
      url: buildGoogleBooksSearchUrl(book),
    },
  ];
}

function mergeReviewSignals(book: BookRecommendation, signals: Array<BookReviewSignal | undefined>) {
  const merged = [...(book.reviewSignals ?? sourceFallbackSignals(book))];

  for (const signal of signals) {
    if (!signal) {
      continue;
    }

    const index = merged.findIndex((current) => current.source === signal.source);

    if (index >= 0) {
      merged[index] = signal;
    } else {
      merged.push(signal);
    }
  }

  return merged.slice(0, 3);
}

function applyPatch(book: BookRecommendation, patch?: MetadataPatch) {
  if (!patch) {
    return book;
  }

  const shouldFillLanguage = !book.metadata.language || book.metadata.language === "Not listed";
  const shouldFillPublicationYear =
    !book.metadata.publicationYear || book.metadata.publicationYear === "Not listed";
  const shouldFillPageCount = typeof book.metadata.pageCount !== "number";

  return {
    ...book,
    rating:
      typeof patch.ratingAverage === "number"
        ? formatRating(patch.ratingAverage)
        : book.rating,
    ratingAverage: patch.ratingAverage ?? book.ratingAverage,
    ratingCount: patch.ratingCount ?? book.ratingCount,
    googleUsers: patch.ratingCount ? `${formatCount(patch.ratingCount)} ratings` : book.googleUsers,
    description: patch.description ?? book.description,
    coverImageUrl: patch.coverImageUrl ?? book.coverImageUrl,
    metadata: {
      ...book.metadata,
      language: shouldFillLanguage ? patch.language ?? book.metadata.language : book.metadata.language,
      publicationYear: shouldFillPublicationYear
        ? patch.publicationYear ?? book.metadata.publicationYear
        : book.metadata.publicationYear,
      pageCount: shouldFillPageCount ? patch.pageCount ?? book.metadata.pageCount : book.metadata.pageCount,
      genreTags: patch.genreTags ?? book.metadata.genreTags,
    },
  };
}

export async function enrichBookRecommendation(book: BookRecommendation): Promise<BookRecommendation> {
  const [googlePatch, openLibraryPatch] = await Promise.all([
    getGoogleBooksPatch(book).catch(() => undefined),
    getOpenLibraryPatch(book).catch(() => undefined),
  ]);

  const withOpenLibrary = applyPatch(book, openLibraryPatch);
  const withGoogle = applyPatch(withOpenLibrary, googlePatch);

  return {
    ...withGoogle,
    rating: googlePatch?.reviewSignal?.rating ?? withGoogle.rating,
    googleUsers: googlePatch?.reviewSignal?.count ?? withGoogle.googleUsers,
    reviewSignals: mergeReviewSignals(withGoogle, [
      googlePatch?.reviewSignal,
      openLibraryPatch?.reviewSignal,
    ]),
  };
}

export async function enrichBookRecommendations(books: BookRecommendation[]): Promise<BookRecommendation[]> {
  return Promise.all(books.map((book) => enrichBookRecommendation(book)));
}
