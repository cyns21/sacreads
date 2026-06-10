"use client";

import { BookMetaIcons } from "@/components/BookMetaIcons";
import type { SavedBook } from "@/types/book";

type SavedBooksProps = {
  books?: SavedBook[];
  onRemove: (id: string) => void;
};

export function SavedBooks({ books, onRemove }: SavedBooksProps) {
  const safeBooks = Array.isArray(books) ? books : [];

  return (
    <aside className="rounded-lg border border-[#d8ccb9] bg-[#fffaf1] p-5 shadow-sm" id="saved-books">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-[#8b4c35]">Saved books</p>
          <h3 className="mt-2 text-2xl font-bold text-[#20231c]">{safeBooks.length} saved</h3>
        </div>
        <a
          className="rounded-md border border-[#cfc4b3] bg-white px-3 py-2 text-xs font-bold text-[#555d50] transition hover:bg-[#fbf8f1] focus:outline-none focus:ring-4 focus:ring-[#8a8174]/15"
          href="/saved"
        >
          View page
        </a>
      </div>

      <div className="mt-5 grid gap-3">
        {safeBooks.length === 0 ? (
          <p className="rounded-md border border-[#e4dacb] bg-white p-4 text-sm leading-6 text-[#555d50]">
            No saved books yet.
          </p>
        ) : (
          safeBooks.map((book) => (
            <div className="grid gap-3 rounded-md bg-white p-3" key={book.id}>
              <div className="min-w-0">
                <p className="block whitespace-normal break-words text-sm font-bold leading-snug text-[#20231c]">
                  {book.title || "Untitled book"}
                </p>
                <p className="mt-1 truncate text-xs font-medium text-[#6a6257]">
                  {book.author || "Unknown author"}
                </p>
              </div>
              <div className="grid gap-3">
                <BookMetaIcons genre={book.genre} metadata={book.metadata} size="sm" />
                <div className="flex flex-wrap gap-2">
                  <a
                    className="rounded-md border border-[#214d45] px-3 py-2 text-xs font-bold text-[#214d45] transition hover:bg-[#edf3e6] focus:outline-none focus:ring-4 focus:ring-[#214d45]/15"
                    href={book.splCatalogUrl || "https://catalog.saclibrary.org/"}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    View on SPL
                  </a>
                  <button
                    className="rounded-md border border-[#cfc4b3] px-3 py-2 text-xs font-bold text-[#555d50] transition hover:bg-[#fbf8f1] focus:outline-none focus:ring-4 focus:ring-[#8a8174]/15"
                    onClick={() => onRemove(book.id)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
