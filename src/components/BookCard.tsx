"use client";

import { BookMetaIcons } from "@/components/BookMetaIcons";
import { formatAuthorName } from "@/lib/formatAuthorName";
import type { ClientBook, SavedBook } from "@/types/book";

type BookCardBook = ClientBook | SavedBook;

type BookCardProps = {
  book: BookCardBook;
  isSaved: boolean;
  onToggleSaved: () => void;
};

const genreAccents = new Map([
  ["Mystery", "#315c8c"],
  ["Fantasy", "#6b5ca5"],
  ["Romance", "#a44762"],
  ["Adventure", "#b36b32"],
  ["Science Fiction", "#28707a"],
  ["Horror", "#5a4b43"],
  ["Historical Fiction", "#8b4c35"],
  ["Crime", "#45515f"],
  ["Biography", "#74613f"],
  ["Drama", "#7d5260"],
  ["Nonfiction", "#214d45"],
]);

function getGenre(book: BookCardBook) {
  return book.genre || "Uncategorized";
}

function valueOrFallback(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

export function BookCard({ book, isSaved, onToggleSaved }: BookCardProps) {
  const accent = genreAccents.get(getGenre(book)) ?? "#214d45";
  const title = valueOrFallback(book.title, "Untitled book");
  const author = valueOrFallback(formatAuthorName(book.author), "Unknown author");
  const splCatalogUrl = valueOrFallback(book.splCatalogUrl, "https://catalog.saclibrary.org/");

  return (
    <article className="flex h-full min-h-72 flex-col overflow-hidden rounded-md border border-[#d8ccb9] bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#b9ab98] hover:shadow-md">
      <div className="h-1.5" style={{ backgroundColor: accent }} />

      <div className="flex flex-1 flex-col p-5">
        <BookMetaIcons genre={getGenre(book)} metadata={book.metadata} />

        <div className="mt-6">
          <h3 className="text-2xl font-bold leading-8 text-[#20231c]">{title}</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#555d50]">by {author}</p>
        </div>

        <div className="mt-auto grid gap-3 pt-8 sm:grid-cols-[1fr_auto]">
          <a
            className="rounded-md bg-[#214d45] px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-[#173f3a] focus:outline-none focus:ring-4 focus:ring-[#214d45]/20"
            href={splCatalogUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            View on SPL
          </a>
          <button
            className={`rounded-md border px-4 py-3 text-sm font-bold transition focus:outline-none focus:ring-4 ${
              isSaved
                ? "border-[#214d45] bg-[#cbd8bc] text-[#214d45] hover:bg-[#d8e2cc] focus:ring-[#214d45]/15"
                : "border-[#cfc4b3] text-[#555d50] hover:bg-[#fbf8f1] focus:ring-[#8a8174]/15"
            }`}
            aria-label={isSaved ? `Unsave ${title}` : `Save ${title}`}
            aria-pressed={isSaved}
            onClick={onToggleSaved}
            type="button"
          >
            {isSaved ? "Unsave" : "Save"}
          </button>
        </div>
      </div>
    </article>
  );
}
