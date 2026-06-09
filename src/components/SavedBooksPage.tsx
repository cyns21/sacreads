"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BookCard } from "@/components/BookCard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { readSavedBooks, writeSavedBooks } from "@/lib/savedBooks";
import type { SavedBook } from "@/types/book";

export function SavedBooksPage() {
  const [books, setBooks] = useState<SavedBook[]>([]);
  const hasLoadedSavedBooks = useRef(false);

  useEffect(() => {
    if (hasLoadedSavedBooks.current) {
      return;
    }

    hasLoadedSavedBooks.current = true;
    setBooks(readSavedBooks());
  }, []);

  function removeSavedBook(id: string) {
    const nextBooks = books.filter((book) => book.id !== id);

    if (nextBooks.length === books.length) {
      return;
    }

    setBooks(nextBooks);
    writeSavedBooks(nextBooks);
  }

  return (
    <div className="min-h-screen bg-[#f8f5ee] text-[#20231c]">
      <Header savedCount={books.length} />
      <main>
        <section className="border-b border-[#ded3c2] bg-[#fffaf1]" id="saved-books-page">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-3xl">
                <p className="mb-3 text-sm font-bold uppercase text-[#8b4c35]">Saved books</p>
                <h1 className="text-3xl font-bold text-[#20231c] sm:text-4xl">Your SPL shortlist.</h1>
                <p className="mt-4 text-base leading-7 text-[#555d50]">
                  Open any saved title in the Sacramento Public Library catalog.
                </p>
              </div>
              <Link
                className="rounded-md border border-[#315c8c] bg-white px-4 py-3 text-center text-sm font-bold text-[#315c8c] transition hover:bg-[#eef4fb] focus:outline-none focus:ring-4 focus:ring-[#315c8c]/15"
                href="/#find-books"
              >
                Find more books
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-[#f8f5ee]">
          <div className="mx-auto max-w-6xl px-6 py-12">
            {books.length === 0 ? (
              <div className="rounded-md border border-[#d8ccb9] bg-white p-6 text-sm leading-6 text-[#555d50]">
                No saved books yet.
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {books.map((book) => (
                  <BookCard
                    book={book}
                    isSaved
                    key={book.id}
                    onToggleSaved={() => removeSavedBook(book.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
