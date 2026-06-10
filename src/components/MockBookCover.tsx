import type { CSSProperties } from "react";
import { formatAuthorName } from "@/lib/formatAuthorName";

type MockBookCoverProps = {
  id: string;
  title: string;
  author: string;
  year?: string;
};

type CoverTheme = {
  background: string;
  accent: string;
  shape: string;
  shapeAlt: string;
  text: string;
};

const coverThemes: CoverTheme[] = [
  {
    background: "linear-gradient(135deg, #113f36 0%, #1e5d4d 100%)",
    accent: "#f3c95f",
    shape: "rgba(199, 218, 193, 0.24)",
    shapeAlt: "rgba(19, 48, 43, 0.52)",
    text: "#fff8e8",
  },
  {
    background: "linear-gradient(135deg, #315f66 0%, #183f48 100%)",
    accent: "#f0d28a",
    shape: "rgba(181, 207, 201, 0.24)",
    shapeAlt: "rgba(10, 38, 45, 0.48)",
    text: "#fff8e8",
  },
  {
    background: "linear-gradient(135deg, #244760 0%, #122b3d 100%)",
    accent: "#dba844",
    shape: "rgba(135, 171, 194, 0.3)",
    shapeAlt: "rgba(13, 31, 45, 0.48)",
    text: "#fff8e8",
  },
  {
    background: "linear-gradient(135deg, #496d59 0%, #243f32 100%)",
    accent: "#f1d48d",
    shape: "rgba(214, 226, 206, 0.28)",
    shapeAlt: "rgba(32, 65, 48, 0.48)",
    text: "#fff8e8",
  },
  {
    background: "linear-gradient(135deg, #b98a35 0%, #8a672a 100%)",
    accent: "#fff0bd",
    shape: "rgba(255, 248, 232, 0.22)",
    shapeAlt: "rgba(89, 67, 28, 0.42)",
    text: "#fff8e8",
  },
  {
    background: "linear-gradient(135deg, #1d4f4a 0%, #0e3935 100%)",
    accent: "#e9be50",
    shape: "rgba(176, 204, 190, 0.26)",
    shapeAlt: "rgba(13, 47, 43, 0.5)",
    text: "#fff8e8",
  },
];

function hashText(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 9973;
  }

  return hash;
}

function titleClass(title: string) {
  if (title.length > 92) {
    return "text-lg leading-snug";
  }

  if (title.length > 64) {
    return "text-xl leading-snug";
  }

  if (title.length > 42) {
    return "text-2xl leading-tight";
  }

  return "text-3xl leading-tight";
}

export function MockBookCover({ id, title, author, year }: MockBookCoverProps) {
  const theme = coverThemes[hashText(`${id}-${title}-${year ?? ""}`) % coverThemes.length];
  const displayAuthor = formatAuthorName(author) || "Unknown author";
  const style = {
    "--cover-bg": theme.background,
    "--cover-accent": theme.accent,
    "--cover-shape": theme.shape,
    "--cover-shape-alt": theme.shapeAlt,
    "--cover-text": theme.text,
  } as CSSProperties;

  return (
    <div
      className="relative isolate mt-4 min-h-64 rounded-md p-6 shadow-inner"
      style={{ ...style, color: "var(--cover-text)" }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 overflow-hidden rounded-md"
        style={{ background: "var(--cover-bg)" }}
      >
        <div className="absolute -right-12 -top-12 size-36 rounded-full" style={{ backgroundColor: "var(--cover-shape)" }} />
        <div className="absolute -bottom-16 right-8 size-44 rounded-full" style={{ backgroundColor: "var(--cover-shape-alt)" }} />
        <div className="absolute bottom-8 right-8 grid grid-cols-4 gap-2">
          {Array.from({ length: 16 }).map((_, index) => (
            <span className="size-1 rounded-full opacity-70" key={index} style={{ backgroundColor: "var(--cover-accent)" }} />
          ))}
        </div>
        <div className="absolute right-0 top-10 h-24 w-24 rounded-l-full border border-r-0 opacity-50" style={{ borderColor: "var(--cover-accent)" }} />
      </div>
      <div className="relative flex min-h-52 max-w-[86%] flex-col justify-between gap-8">
        <div>
          <h3
            className={`${titleClass(title)} whitespace-normal break-words font-bold tracking-normal`}
          >
            {title}
          </h3>
          <div className="mt-4 h-1 w-12 rounded-full" style={{ backgroundColor: "var(--cover-accent)" }} />
        </div>
        <p className="truncate text-xs font-bold uppercase tracking-normal">{displayAuthor}</p>
      </div>
    </div>
  );
}
