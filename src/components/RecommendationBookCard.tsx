"use client";

import { BookMetaIcons } from "@/components/BookMetaIcons";
import { MockBookCover } from "@/components/MockBookCover";
import type { ClientBook } from "@/types/book";

type RecommendationBookCardProps = {
  book: ClientBook;
  isSaved: boolean;
  onToggleSaved: () => void;
};

function valueOrFallback(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function BookmarkIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h7A2.5 2.5 0 0 1 18 4.5V21l-6-3-6 3V4.5Z" />
    </svg>
  );
}

export function RecommendationBookCard({ book, isSaved, onToggleSaved }: RecommendationBookCardProps) {
  const title = valueOrFallback(book.title, "Untitled book");
  const author = valueOrFallback(book.author, "Unknown author");
  const splCatalogUrl = valueOrFallback(book.splCatalogUrl, "https://catalog.saclibrary.org/");

  return (
    <article className="flex h-full flex-col rounded-lg border border-[#d8ccb9] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#b9ab98] hover:shadow-md">
      <BookMetaIcons genre={book.genre} metadata={book.metadata} size="sm" />
      <MockBookCover author={author} id={book.id} title={title} year={book.metadata.publicationYear} />

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
        <a
          className="rounded-md bg-[#214d45] px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-[#173f3a] focus:outline-none focus:ring-4 focus:ring-[#214d45]/20"
          href={splCatalogUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          View on SPL
        </a>
        <button
          aria-label={isSaved ? `Unsave ${title}` : `Save ${title}`}
          aria-pressed={isSaved}
          className={`inline-flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-bold transition focus:outline-none focus:ring-4 ${
            isSaved
              ? "border-[#214d45] bg-[#cbd8bc] text-[#214d45] hover:bg-[#d8e2cc] focus:ring-[#214d45]/15"
              : "border-[#cfc4b3] text-[#214d45] hover:bg-[#fbf8f1] focus:ring-[#8a8174]/15"
          }`}
          onClick={onToggleSaved}
          type="button"
        >
          <BookmarkIcon />
          {isSaved ? "Saved" : "Save"}
        </button>
      </div>
    </article>
  );
}
