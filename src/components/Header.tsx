import Link from "next/link";

const navItems = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Find books", href: "/#find-books" },
  { label: "Recommendations", href: "/#recommendations" },
  { label: "Saved", href: "/saved" },
];

type HeaderProps = {
  savedCount?: number;
};

export function Header({ savedCount }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#ded3c2] bg-[#f8f5ee]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link className="flex items-center gap-3" href="/" aria-label="SacReads home">
          <span className="grid size-10 place-items-center rounded-md bg-[#214d45] text-sm font-bold text-[#f8f5ee]">
            SR
          </span>
          <span className="text-xl font-bold text-[#20231c]">SacReads</span>
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <a
              className="text-sm font-medium text-[#4e5547] transition hover:text-[#214d45]"
              href={item.href}
              key={item.href}
            >
              {item.label === "Saved" && savedCount ? `Saved ${savedCount}` : item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
