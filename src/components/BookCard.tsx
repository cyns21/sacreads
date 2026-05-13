import type { BookRecommendation } from "@/types/book";

type BookCardProps = {
  book: BookRecommendation;
};

export function BookCard({ book }: BookCardProps) {
  const metadata = [
    ["Format", book.metadata.format],
    ["Audience", book.metadata.audience],
    ["Language", book.metadata.language],
    ["Publication year", book.metadata.publicationYear],
  ];

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-[#d8ccb9] bg-white shadow-sm">
      <div className="grid gap-5 p-5 sm:grid-cols-[120px_1fr]">
        <div
          aria-label={`${book.title} cover placeholder`}
          className="relative min-h-44 rounded-md shadow-inner"
          role="img"
          style={{
            background: `linear-gradient(135deg, ${book.cover.from}, ${book.cover.to})`,
          }}
        >
          <div
            className="absolute inset-y-0 left-0 w-5 rounded-l-md"
            style={{ backgroundColor: book.cover.spine }}
          />
          <div className="absolute inset-x-5 top-5 h-px bg-white/45" />
          <div className="absolute inset-x-5 bottom-6">
            <div className="mb-3 h-2 w-16 rounded-full bg-white/70" />
            <div className="h-2 w-24 rounded-full bg-white/50" />
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold leading-7 text-[#20231c]">{book.title}</h3>
          <p className="mt-1 text-sm font-semibold text-[#555d50]">by {book.author}</p>
          <div className="mt-3 space-y-1 text-sm font-medium text-[#6a6257]">
            <p>
              {book.rating} <span aria-hidden="true">&middot;</span> Goodreads
            </p>
            <p>
              {book.googleUsers} liked this book <span aria-hidden="true">&middot;</span> Google users
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5">
        <p className="text-sm leading-6 text-[#4e5547]">{book.description}</p>

        <div className="mt-5 border-l-4 border-[#d3a05f] bg-[#fffaf1] px-4 py-3">
          <p className="text-xs font-bold uppercase text-[#8b4c35]">Why this fits</p>
          <p className="mt-2 text-sm leading-6 text-[#4e5547]">{book.whyThisFits}</p>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          {metadata.map(([label, value]) => (
            <div className="rounded-md border border-[#e4dacb] bg-[#fbf8f1] p-3" key={label}>
              <dt className="text-xs font-bold uppercase text-[#777064]">{label}</dt>
              <dd className="mt-1 font-semibold text-[#20231c]">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <button
            className="rounded-md border border-[#315c8c] px-4 py-3 text-sm font-bold text-[#315c8c] transition hover:bg-[#eef4fb] focus:outline-none focus:ring-4 focus:ring-[#315c8c]/15"
            type="button"
          >
            Check SPL Catalog
          </button>
          <button
            className="rounded-md bg-[#214d45] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#173f3a] focus:outline-none focus:ring-4 focus:ring-[#214d45]/20"
            type="button"
          >
            Request Physical Copy
          </button>
          <button
            className="rounded-md border border-[#cfc4b3] px-4 py-3 text-sm font-bold text-[#555d50] transition hover:bg-[#fbf8f1] focus:outline-none focus:ring-4 focus:ring-[#8a8174]/15"
            type="button"
          >
            Save
          </button>
        </div>
      </div>
    </article>
  );
}
