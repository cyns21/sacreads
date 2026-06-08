"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { BookCard } from "@/components/BookCard";
import { SavedBooks } from "@/components/SavedBooks";
import { SearchForm } from "@/components/SearchForm";
import type { BookRecommendation, CatalogSearchFilters } from "@/types/book";

const savedBooksKey = "sacreads:saved-books";

type RecommendationsResponse = {
  books: BookRecommendation[];
  mode: "spl-catalog" | "curated-catalog" | "seed-data";
  message: string;
  catalogUrl: string;
  error?: string;
};

type SacReadsAppProps = {
  initialBooks: BookRecommendation[];
};

function parseSavedBooks(snapshot: string) {
  try {
    return JSON.parse(snapshot) as BookRecommendation[];
  } catch {
    return [];
  }
}

function getSavedBooksSnapshot() {
  if (typeof window === "undefined") {
    return "[]";
  }

  return window.localStorage.getItem(savedBooksKey) ?? "[]";
}

function subscribeToSavedBooks(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("sacreads-saved-books", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("sacreads-saved-books", callback);
  };
}

function writeSavedBooks(books: BookRecommendation[]) {
  window.localStorage.setItem(savedBooksKey, JSON.stringify(books));
  window.dispatchEvent(new Event("sacreads-saved-books"));
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

export function SacReadsApp({ initialBooks }: SacReadsAppProps) {
  const [books, setBooks] = useState<BookRecommendation[]>(initialBooks);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("Starter recommendations are ready with Sac Library hold links.");
  const [catalogUrl, setCatalogUrl] = useState("https://catalog.saclibrary.org/");
  const savedBooksSnapshot = useSyncExternalStore(subscribeToSavedBooks, getSavedBooksSnapshot, () => "[]");

  const savedBooks = useMemo(() => parseSavedBooks(savedBooksSnapshot), [savedBooksSnapshot]);

  const savedIds = useMemo(() => new Set(savedBooks.map((book) => book.id)), [savedBooks]);

  function toggleSavedBook(book: BookRecommendation) {
    const next = savedBooks.some((savedBook) => savedBook.id === book.id)
      ? savedBooks.filter((savedBook) => savedBook.id !== book.id)
      : [book, ...savedBooks].slice(0, 12);

    writeSavedBooks(next);
  }

  function removeSavedBook(id: string) {
    writeSavedBooks(savedBooks.filter((book) => book.id !== id));
  }

  async function handleSearch(filters: CatalogSearchFilters) {
    setIsLoading(true);
    setStatus("Searching Sacramento Public Library physical books...");
    setBooks([]);
    document.getElementById("recommendations")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(filters),
      });

      if (!response.ok) {
        throw new Error("Recommendation request failed");
      }

      const data = (await response.json()) as RecommendationsResponse;
      setBooks(data.books);
      setStatus(
        data.books.length > 0
          ? data.message
          : "No matching recommendations came back yet. Try a broader mood, audience, or genre.",
      );
      setCatalogUrl(data.catalogUrl);
    } catch {
      setBooks(initialBooks);
      setStatus("The catalog search could not be reached, so SacReads kept the starter recommendations visible.");
    } finally {
      setIsLoading(false);
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
              <a
                className="mt-4 inline-flex rounded-md border border-[#315c8c] bg-white px-4 py-2 text-sm font-bold text-[#315c8c] transition hover:bg-[#eef4fb]"
                href={catalogUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open this search in SPL
              </a>
            </div>
            <SavedBooks books={savedBooks} onRemove={removeSavedBook} />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {isLoading ? [0, 1, 2].map((item) => <LoadingBookCard key={item} />) : null}
            {!isLoading && books.length === 0 ? (
              <div className="rounded-lg border border-[#d8ccb9] bg-white p-5 text-sm leading-6 text-[#555d50] lg:col-span-3">
                No recommendations loaded yet. Try broadening your filters and search again.
              </div>
            ) : null}
            {!isLoading && books.map((book) => (
              <BookCard book={book} isSaved={savedIds.has(book.id)} key={book.id} onSave={toggleSavedBook} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
