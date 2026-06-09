"use client";

import Image from "next/image";
import { useState } from "react";
import type { ClientBook, BookReviewSignal } from "@/types/book";

type BookCardProps = {
  book: ClientBook;
  isSaved: boolean;
  onSave: (book: ClientBook) => void;
};

function CoverFallback({ book }: { book: ClientBook }) {
  const cover = {
    from: "#315c8c",
    to: "#d3a05f",
    spine: "#214d45",
  };

  return (
    <div
      aria-label={`${book.title} cover placeholder`}
      className="relative min-h-52 rounded-md shadow-inner"
      role="img"
      style={{
        background: `linear-gradient(135deg, ${cover.from}, ${cover.to})`,
      }}
    >
      <div className="absolute inset-y-0 left-0 w-5 rounded-l-md" style={{ backgroundColor: cover.spine }} />
      <div className="absolute inset-x-5 top-5 h-px bg-white/45" />
      <div className="absolute inset-x-5 bottom-6">
        <div className="mb-3 h-2 w-16 rounded-full bg-white/70" />
        <div className="h-2 w-24 rounded-full bg-white/50" />
      </div>
    </div>
  );
}

function ReviewSignals({ signals }: { signals?: BookReviewSignal[] }) {
  if (!signals || signals.length === 0) {
    return null;
  }

  return (
    <div className="mt-5 border-l-4 border-[#315c8c] bg-[#eef4fb] px-4 py-3">
      <p className="text-xs font-bold uppercase text-[#315c8c]">Goodreads</p>
      <div className="mt-3 grid gap-2">
        {signals.map((signal) => {
          const content = (
            <>
              <span className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-bold text-[#20231c]">{signal.source}</span>
                <span className="text-xs font-bold uppercase text-[#315c8c]">
                  {[signal.rating, signal.count].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="mt-1 block leading-6 text-[#4e5547]">{signal.note}</span>
            </>
          );

          return signal.url ? (
            <a
              className="block rounded-md bg-white px-3 py-2 text-sm transition hover:bg-[#f7fbff] focus:outline-none focus:ring-4 focus:ring-[#315c8c]/15"
              href={signal.url}
              key={signal.source}
              rel="noopener noreferrer"
              target="_blank"
            >
              {content}
            </a>
          ) : (
            <div className="block rounded-md bg-white px-3 py-2 text-sm" key={signal.source}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BookCard({ book, isSaved, onSave }: BookCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const genre = book.metadata.genreTags?.[0] || "Uncategorized";
  const badges = [genre, book.metadata.format, book.metadata.language, book.metadata.audience];
  const metadata = book.metadata.publicationYear !== "Not listed" ? [["Publication year", book.metadata.publicationYear]] : [];

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-[#d8ccb9] bg-white shadow-sm">
      <div className="grid gap-5 p-5 sm:grid-cols-[132px_1fr]">
        {book.coverImageUrl && !imageFailed ? (
          <Image
            alt={`${book.title} book cover`}
            className="min-h-52 w-full rounded-md bg-[#fbf8f1] object-cover shadow-inner"
            height={416}
            loading="lazy"
            onError={() => setImageFailed(true)}
            src={book.coverImageUrl}
            unoptimized
            width={264}
          />
        ) : (
          <CoverFallback book={book} />
        )}

        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span className="rounded-md bg-[#eef4fb] px-2.5 py-1 text-xs font-bold text-[#315c8c]" key={badge}>
                {badge}
              </span>
            ))}
          </div>
          <h3 className="text-xl font-bold leading-7 text-[#20231c]">{book.title}</h3>
          <p className="mt-1 text-sm font-semibold text-[#555d50]">by {book.author}</p>
          <div className="mt-3 space-y-1 text-sm font-medium text-[#6a6257]">
            <p>{book.availabilityNote ?? "Open SPL catalog to confirm current copies and place a hold"}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5">
        <p className="text-sm leading-6 text-[#4e5547]">{book.description}</p>

        <div className="mt-5 border-l-4 border-[#d3a05f] bg-[#fffaf1] px-4 py-3">
          <p className="text-xs font-bold uppercase text-[#8b4c35]">Why this fits</p>
          <p className="mt-2 text-sm leading-6 text-[#4e5547]">{book.whyThisFits}</p>
        </div>

        <ReviewSignals signals={book.reviewSignals} />

        {metadata.length > 0 ? (
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            {metadata.map(([label, value]) => (
              <div className="rounded-md border border-[#e4dacb] bg-[#fbf8f1] p-3" key={label}>
                <dt className="text-xs font-bold uppercase text-[#777064]">{label}</dt>
                <dd className="mt-1 font-semibold text-[#20231c]">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {book.availabilityNote ? (
          <p className="mt-4 text-xs font-semibold uppercase text-[#6a6257]">{book.availabilityNote}</p>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <a
            className="rounded-md bg-[#214d45] px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-[#173f3a] focus:outline-none focus:ring-4 focus:ring-[#214d45]/20"
            href={book.requestUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Check SPL catalog
          </a>
          <button
            className={`rounded-md border px-4 py-3 text-sm font-bold transition focus:outline-none focus:ring-4 ${
              isSaved
                ? "cursor-not-allowed border-[#214d45] bg-[#cbd8bc] text-[#214d45] focus:ring-[#214d45]/15"
                : "border-[#cfc4b3] text-[#555d50] hover:bg-[#fbf8f1] focus:ring-[#8a8174]/15"
            }`}
            disabled={isSaved}
            onClick={() => {
              if (!isSaved) {
                onSave(book);
              }
            }}
            type="button"
          >
            {isSaved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
    </article>
  );
}
