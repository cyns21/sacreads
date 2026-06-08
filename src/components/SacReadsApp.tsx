"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookCard } from "@/components/BookCard";
import { SavedBooks } from "@/components/SavedBooks";
import { SearchForm } from "@/components/SearchForm";
import type { BookRecommendation, CatalogSearchFilters, ClientBook, SavedBook } from "@/types/book";

const savedBooksKey = "savedBooks";
const legacySavedBooksKey = "sacreads:saved-books";
const maxRecommendations = 10;
const maxSavedBooks = 24;

type RecommendationsResponse = {
  books: BookRecommendation[];
  mode: "spl-catalog" | "curated-catalog" | "seed-data";
  message: string;
  catalogUrl: string;
  error?: string;
};

type SacReadsAppProps = {
  initialBooks: BookRecommendation[];
  onRecommendationsLoaded?: (books: ClientBook[]) => void;
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
    matchScore: book.matchScore,
    availabilityNote: book.availabilityNote,
    rating: book.rating,
    ratingAverage: book.ratingAverage,
    ratingCount: book.ratingCount,
    reviewSignals: book.reviewSignals?.slice(0, 3),
    metadata: {
      format: book.metadata.format,
      audience: book.metadata.audience,
      language: book.metadata.language,
      publicationYear: book.metadata.publicationYear,
      pickupBranch: book.metadata.pickupBranch,
      pageCount: book.metadata.pageCount,
      genreTags: book.metadata.genreTags?.slice(0, 5),
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

function LoadingBookCard() {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-[#d8ccb9] bg-white p-5 shadow-sm">
      <div className="grid gap-5 sm:grid-cols-[132px_1fr]">
        <div className="min-h-52 animate-pulse rounded-md bg-[#e4dacb]" />
        <div>
          <div className="mb-3 flex gap-2">
            <div className="h-7 w-20 animate-pulse rounded-md bg-[#cbd8bc]" />
            <div className="h-7 w-16 animate-pulse rounded-md bg-[#dce9f5]" />
          </div>
          <div className="h-7 w-4/5 animate-pulse rounded-md bg-[#e4dacb]" />
          <div className="mt-3 h-4 w-2/3 animate-pulse rounded-md bg-[#eee7db]" />
          <div className="mt-5 space-y-2">
            <div className="h-4 animate-pulse rounded-md bg-[#eee7db]" />
            <div className="h-4 w-5/6 animate-pulse rounded-md bg-[#eee7db]" />
          </div>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        <div className="h-4 animate-pulse rounded-md bg-[#eee7db]" />
        <div className="h-4 animate-pulse rounded-md bg-[#eee7db]" />
        <div className="h-4 w-3/4 animate-pulse rounded-md bg-[#eee7db]" />
      </div>
    </article>
  );
}

export function SacReadsApp({
  initialBooks,
  onRecommendationsLoaded,
  onSavedCountChange,
}: SacReadsAppProps) {
  const initialClientBooks = useMemo(
    () => initialBooks.slice(0, maxRecommendations).map((book) => toClientBook(book)),
    [initialBooks],
  );
  const [recommendedBooks, setRecommendedBooks] = useState<ClientBook[]>(initialClientBooks);
  const [savedBooks, setSavedBooks] = useState<SavedBook[]>(readSavedBooks);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("Starter recommendations are ready with Sac Library hold links.");
  const [catalogUrl, setCatalogUrl] = useState("https://catalog.saclibrary.org/");
  const [errorMessage, setErrorMessage] = useState("");
  const activeRequest = useRef<AbortController | null>(null);

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

  useEffect(() => {
    return () => {
      activeRequest.current?.abort();
    };
  }, []);

  const savedIds = useMemo(() => new Set(savedBooks.map((book) => book.id)), [savedBooks]);

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

  async function handleSearch(filters: CatalogSearchFilters) {
    activeRequest.current?.abort();

    const controller = new AbortController();
    activeRequest.current = controller;

    setIsLoading(true);
    setErrorMessage("");
    setStatus("Searching Sacramento Public Library physical books...");
    setRecommendedBooks([]);
    document.getElementById("recommendations")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(filters),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("Recommendation request failed");
      }

      const data = (await response.json()) as RecommendationsResponse;
      const nextBooks = data.books.slice(0, maxRecommendations).map((book) => toClientBook(book));

      setRecommendedBooks(nextBooks);
      onRecommendationsLoaded?.(nextBooks.length > 0 ? nextBooks.slice(0, 3) : initialClientBooks.slice(0, 3));
      setStatus(
        nextBooks.length > 0
          ? data.message
          : "No matching recommendations came back yet. Try a broader mood, audience, or genre.",
      );
      setCatalogUrl(data.catalogUrl || "https://catalog.saclibrary.org/");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setRecommendedBooks(initialClientBooks);
      onRecommendationsLoaded?.(initialClientBooks.slice(0, 3));
      setErrorMessage("The recommendation search could not be reached. Showing starter recommendations.");
      setStatus("The catalog search could not be reached, so SacReads kept the starter recommendations visible.");
    } finally {
      if (activeRequest.current === controller) {
        setIsLoading(false);
        activeRequest.current = null;
      }
    }
  }

  return (
    <>
      <SearchForm isLoading={isLoading} onSearch={handleSearch} />

      <section aria-busy={isLoading} className="border-b border-[#ded3c2] bg-[#f8f5ee]" id="recommendations">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
            <div className="max-w-3xl">
              <p className="mb-3 text-sm font-bold uppercase text-[#8b4c35]">Local picks</p>
              <h2 className="text-3xl font-bold text-[#20231c] sm:text-4xl">Recommended holdable books.</h2>
              <p className="mt-4 text-base leading-7 text-[#555d50]" role="status">
                {status}
              </p>
              {errorMessage ? (
                <p className="mt-3 rounded-md border border-[#d9a38d] bg-[#fff4ee] px-4 py-3 text-sm font-semibold text-[#8b4c35]">
                  {errorMessage}
                </p>
              ) : null}
              <a
                className="mt-4 inline-flex rounded-md border border-[#315c8c] bg-white px-4 py-2 text-sm font-bold text-[#315c8c] transition hover:bg-[#eef4fb]"
                href={catalogUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                Open this search in SPL
              </a>
            </div>
            <SavedBooks books={savedBooks} onRemove={removeSavedBook} />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {isLoading ? [0, 1, 2].map((item) => <LoadingBookCard key={item} />) : null}
            {!isLoading && recommendedBooks.length === 0 ? (
              <div className="rounded-lg border border-[#d8ccb9] bg-white p-5 text-sm leading-6 text-[#555d50] lg:col-span-3">
                No recommendations loaded yet. Try broadening your filters and search again.
              </div>
            ) : null}
            {!isLoading && recommendedBooks.map((book) => (
              <BookCard book={book} isSaved={savedIds.has(book.id)} key={book.id} onSave={toggleSavedBook} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
