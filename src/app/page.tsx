import { BookCard } from "@/components/BookCard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { HowItWorks } from "@/components/HowItWorks";
import { SearchForm } from "@/components/SearchForm";
import { mockBooks } from "@/data/mockBooks";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f8f5ee] text-[#20231c]">
      <Header />
      <main>
        <section className="border-b border-[#ded3c2] bg-[#f8f5ee]" id="home">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
            <div>
              <p className="mb-4 text-sm font-bold uppercase text-[#8b4c35]">SacReads</p>
              <h1 className="max-w-3xl text-5xl font-bold leading-tight text-[#20231c] sm:text-6xl">
                Find your next library book.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4e5547]">
                Get personalized book recommendations from the Sacramento Public Library catalog and request
                physical copies for pickup at your preferred branch.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  className="rounded-md bg-[#214d45] px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-[#173f3a] focus:outline-none focus:ring-4 focus:ring-[#214d45]/20"
                  href="#find-books"
                >
                  Find books
                </a>
                <a
                  className="rounded-md border border-[#315c8c] bg-white px-5 py-3 text-center text-sm font-bold text-[#315c8c] transition hover:bg-[#eef4fb] focus:outline-none focus:ring-4 focus:ring-[#315c8c]/15"
                  href="#how-it-works"
                >
                  How it works
                </a>
              </div>
            </div>

            <div className="rounded-lg border border-[#d8ccb9] bg-[#fffaf1] p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-4 border-b border-[#e4dacb] pb-4">
                <div>
                  <p className="text-sm font-bold text-[#20231c]">Recommendation preview</p>
                  <p className="mt-1 text-xs font-medium text-[#6a6257]">Central Library pickup</p>
                </div>
                <span className="rounded-md bg-[#cbd8bc] px-3 py-2 text-xs font-bold text-[#214d45]">
                  3 matches
                </span>
              </div>

              <div className="grid gap-3">
                {mockBooks.map((book) => (
                  <div className="grid grid-cols-[56px_1fr] gap-3 rounded-md bg-white p-3" key={book.title}>
                    <div
                      className="h-20 rounded-md"
                      style={{
                        background: `linear-gradient(135deg, ${book.cover.from}, ${book.cover.to})`,
                      }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#20231c]">{book.title}</p>
                      <p className="mt-1 truncate text-xs font-medium text-[#6a6257]">{book.author}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-md bg-[#fbf8f1] px-2 py-1 text-xs font-bold text-[#555d50]">
                          {book.metadata.format}
                        </span>
                        <span className="rounded-md bg-[#eef4fb] px-2 py-1 text-xs font-bold text-[#315c8c]">
                          {book.metadata.audience}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <SearchForm />

        <section className="border-b border-[#ded3c2] bg-[#f8f5ee]" id="recommendations">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="mb-8 max-w-3xl">
              <p className="mb-3 text-sm font-bold uppercase text-[#8b4c35]">Local picks</p>
              <h2 className="text-3xl font-bold text-[#20231c] sm:text-4xl">Recommended physical books.</h2>
              <p className="mt-4 text-base leading-7 text-[#555d50]">
                Review the fit, library metadata, and pickup actions for each title.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {mockBooks.map((book) => (
                <BookCard book={book} key={book.title} />
              ))}
            </div>
          </div>
        </section>

        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
}
