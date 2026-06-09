import type { BookRecommendation, CatalogSearchFilters } from "@/types/book";

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "book",
  "books",
  "for",
  "i",
  "in",
  "me",
  "of",
  "on",
  "or",
  "read",
  "story",
  "the",
  "to",
  "want",
  "with",
]);

const moodKeywords: Record<string, string[]> = {
  Cozy: ["cozy", "warm", "gentle", "comfort", "family", "small town", "friendship"],
  "Thought-provoking": ["identity", "history", "memory", "ethics", "society", "reflective"],
  Funny: ["funny", "humor", "comic", "witty", "satire"],
  Adventurous: ["adventure", "quest", "survival", "journey", "fast-moving", "danger"],
  Reflective: ["reflective", "literary", "memory", "grief", "identity", "quiet"],
};

const genreKeywords: Record<string, string[]> = {
  Mystery: ["mystery", "murder", "detective", "crime", "case", "suspense"],
  "Historical fiction": ["historical", "history", "past", "war", "period"],
  "Science fiction": ["science fiction", "future", "space", "earth", "speculative"],
  Fantasy: ["fantasy", "magic", "myth", "quest", "dragon"],
  Romance: ["romance", "love", "relationship"],
  Biography: ["biography", "memoir", "life", "true", "real-life"],
  Cookbook: ["cookbook", "recipe", "food", "cooking", "kitchen"],
};

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

function includesAny(haystack: string, needles: string[]) {
  return needles.some((needle) => haystack.includes(needle.toLowerCase()));
}

function yearScore(publicationYear: string, yearFrom: string, yearTo: string) {
  const year = Number.parseInt(publicationYear, 10);
  const from = Number.parseInt(yearFrom, 10);
  const to = Number.parseInt(yearTo, 10);

  if (Number.isNaN(year)) {
    return 0;
  }

  if (!Number.isNaN(from) && year < from) {
    return -8;
  }

  if (!Number.isNaN(to) && year > to) {
    return -8;
  }

  return !Number.isNaN(from) || !Number.isNaN(to) ? 6 : 0;
}

export function rankRecommendations(books: BookRecommendation[], filters: CatalogSearchFilters) {
  const queryTokens = tokenize(filters.query);
  const desiredMood = moodKeywords[filters.mood] ?? [];
  const desiredGenre = genreKeywords[filters.genre] ?? [];

  return books
    .map((book) => {
      const searchable = [
        book.title,
        book.author,
        book.genre,
        book.metadata.format,
        book.metadata.audience,
        book.metadata.language,
        ...(book.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase();

      let score = book.source === "spl-catalog" ? 48 : 38;

      for (const token of queryTokens) {
        if (searchable.includes(token)) {
          score += 7;
        }
      }

      if (filters.format && searchable.includes(filters.format.toLowerCase())) {
        score += 12;
      }

      if (filters.audience !== "General" && searchable.includes(filters.audience.toLowerCase())) {
        score += 10;
      }

      if (filters.language !== "Any language" && book.metadata.language === filters.language) {
        score += 8;
      }

      if (filters.authorContains.trim() && book.author.toLowerCase().includes(filters.authorContains.toLowerCase())) {
        score += 16;
      }

      if (filters.bookType !== "Any" && includesAny(searchable, [filters.bookType])) {
        score += 6;
      }

      if (desiredMood.length > 0 && includesAny(searchable, desiredMood)) {
        score += 10;
      }

      if (desiredGenre.length > 0 && includesAny(searchable, desiredGenre)) {
        score += 12;
      }

      score += yearScore(book.metadata.publicationYear, filters.yearFrom, filters.yearTo);

      return {
        ...book,
        matchScore: Math.min(99, Math.max(35, score)),
      };
    })
    .sort((first, second) => (second.matchScore ?? 0) - (first.matchScore ?? 0));
}
