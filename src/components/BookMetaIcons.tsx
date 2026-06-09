import type { BookMetadata } from "@/types/book";

type BookMetaIconsProps = {
  metadata?: Partial<BookMetadata> | null;
  genre?: string;
  size?: "sm" | "md";
  className?: string;
};

type IconKind = "genre" | "format" | "language" | "audience" | "year";

const iconPathByKind: Record<IconKind, string[]> = {
  genre: ["M4 4h7l9 9-7 7-9-9V4Z", "M8 8h.01"],
  format: ["M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z", "M4 5.5A2.5 2.5 0 0 0 6.5 8H20"],
  language: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M3.6 9h16.8", "M3.6 15h16.8", "M12 3a14 14 0 0 1 0 18", "M12 3a14 14 0 0 0 0 18"],
  audience: ["M16 19v-1.5A3.5 3.5 0 0 0 12.5 14h-5A3.5 3.5 0 0 0 4 17.5V19", "M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M20 19v-1a3 3 0 0 0-2.2-2.9", "M15 3.3a4 4 0 0 1 0 7.4"],
  year: ["M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z", "M16 3v4", "M8 3v4", "M3 11h18"],
};

function valueOrFallback(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function Icon({ kind }: { kind: IconKind }) {
  return (
    <svg
      aria-hidden="true"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {iconPathByKind[kind].map((path) => (
        <path d={path} key={path} />
      ))}
    </svg>
  );
}

export function BookMetaIcons({ metadata, genre, size = "md", className = "" }: BookMetaIconsProps) {
  const safeMetadata = metadata ?? {};
  const items: Array<{ kind: IconKind; label: string; value: string }> = [
    { kind: "genre", label: "Genre", value: valueOrFallback(genre, "Uncategorized") },
    { kind: "format", label: "Format", value: valueOrFallback(safeMetadata.format, "Book") },
    { kind: "language", label: "Language", value: valueOrFallback(safeMetadata.language, "English") },
    { kind: "audience", label: "Audience", value: valueOrFallback(safeMetadata.audience, "Adult / General") },
  ];

  if (safeMetadata.publicationYear && safeMetadata.publicationYear !== "Not listed") {
    items.push({ kind: "year", label: "Publication year", value: safeMetadata.publicationYear });
  }

  const chipClass =
    size === "sm"
      ? "max-w-full gap-1.5 px-2 py-1 text-[0.68rem]"
      : "max-w-full gap-2 px-2.5 py-1.5 text-xs";

  return (
    <div className={`flex flex-wrap gap-2 ${className}`} aria-label="Book metadata">
      {items.map((item) => (
        <span
          aria-label={`${item.label}: ${item.value}`}
          className={`${chipClass} inline-flex min-w-0 items-center rounded-md border border-[#e4dacb] bg-[#fbf8f1] font-bold tracking-normal text-[#214d45]`}
          key={`${item.kind}-${item.value}`}
          title={`${item.label}: ${item.value}`}
        >
          <Icon kind={item.kind} />
          <span className="min-w-0 truncate">{item.value}</span>
        </span>
      ))}
    </div>
  );
}
