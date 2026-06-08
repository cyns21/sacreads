"use client";

import Image from "next/image";
import type { SavedBook } from "@/types/book";

type SavedBooksProps = {
  books: SavedBook[];
  onRemove: (id: string) => void;
};

export function SavedBooks({ books, onRemove }: SavedBooksProps) {
  return (
    <aside className="rounded-lg border border-[#d8ccb9] bg-[#fffaf1] p-5 shadow-sm" id="saved-books">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-[#8b4c35]">Saved books</p>
          <h3 className="mt-2 text-2xl font-bold text-[#20231c]">{books.length} saved</h3>
        </div>
        <span className="rounded-md bg-white px-3 py-2 text-xs font-bold text-[#555d50]">Local</span>
      </div>

      <div className="mt-5 grid gap-3">
        {books.length === 0 ? (
          <p className="rounded-md border border-[#e4dacb] bg-white p-4 text-sm leading-6 text-[#555d50]">
            Saved titles will stay in this browser after you close the page.
          </p>
        ) : (
          books.map((book) => (
            <div className="grid grid-cols-[48px_1fr_auto] gap-3 rounded-md bg-white p-3" key={book.id}>
              {book.coverImageUrl ? (
                <Image
                  alt=""
                  className="h-16 rounded-md object-cover"
                  height={96}
                  loading="lazy"
                  src={book.coverImageUrl}
                  unoptimized
                  width={64}
                />
              ) : (
                <div className="h-16 rounded-md bg-[#cbd8bc]" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#20231c]">{book.title}</p>
                <p className="mt-1 truncate text-xs font-medium text-[#6a6257]">{book.author}</p>
                <p className="mt-1 truncate text-xs font-medium text-[#8a8174]">{book.publicationYear}</p>
              </div>
              <button
                className="self-start rounded-md border border-[#cfc4b3] px-3 py-2 text-xs font-bold text-[#555d50] transition hover:bg-[#fbf8f1]"
                onClick={() => onRemove(book.id)}
                type="button"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
