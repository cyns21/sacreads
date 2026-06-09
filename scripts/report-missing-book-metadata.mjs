import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import books from "../src/data/books.json" with { type: "json" };

const INPUT_DIR = resolve("data/spl-csv");
const PROGRESS_PATH = resolve("data/import-progress.json");

const expectedLanguages = ["English", "Spanish"];
const expectedAudiences = ["Adult / General", "Young Adult / Juvenile"];
const expectedGenres = [
  "Mystery",
  "Fantasy",
  "Romance",
  "Adventure",
  "Science Fiction",
  "Horror",
  "Historical Fiction",
  "Crime",
  "Biography",
  "Drama",
  "Nonfiction",
  "Uncategorized",
];
const expectedFormats = ["Book", "Large Print", "Audiobook", "Graphic Novel", "Picture Book"];
const nonfictionSpecificGenres = new Set(["Biography", "Crime", "Historical Fiction", "Drama"]);
const genreMap = new Map([
  ["mystery", "Mystery"],
  ["fantasy", "Fantasy"],
  ["romance", "Romance"],
  ["adventure", "Adventure"],
  ["scifi", "Science Fiction"],
  ["sci-fi", "Science Fiction"],
  ["science-fiction", "Science Fiction"],
  ["science fiction", "Science Fiction"],
  ["horror", "Horror"],
  ["historical", "Historical Fiction"],
  ["crime", "Crime"],
  ["biography", "Biography"],
  ["biographical", "Biography"],
  ["drama", "Drama"],
  ["nonfiction", "Nonfiction"],
  ["nonfic", "Nonfiction"],
]);

function clean(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function isMissingText(value) {
  return typeof value !== "string" || value.trim().length === 0;
}

function isMissingNumber(value) {
  return typeof value !== "number" || !Number.isFinite(value);
}

function normalizeText(value, fallback) {
  return isMissingText(value) ? fallback : value.trim();
}

function parseFilename(filename) {
  const stem = filename.replace(/\.csv$/i, "");
  const parts = stem.split("-");
  const languageIndex = parts.findIndex((part) => part === "eng" || part === "spa");
  const genreToken = languageIndex > 0 ? parts.slice(0, languageIndex).join("-") : parts[0] ?? "";
  const languageToken = languageIndex >= 0 ? parts[languageIndex] : "eng";
  const afterLanguage = languageIndex >= 0 ? parts.slice(languageIndex + 1) : parts.slice(1);
  const audienceToken = afterLanguage.find((part) => part === "gen" || part === "ya" || part === "all") ?? "gen";
  const fictionToken = afterLanguage.find((part) => part === "fic" || part === "nonfic") ?? "fic";
  let genre = genreMap.get(genreToken.toLowerCase()) ?? "Uncategorized";
  const fictionStatus = fictionToken === "nonfic" ? "Nonfiction" : "Fiction";

  if (fictionStatus === "Nonfiction" && !nonfictionSpecificGenres.has(genre)) {
    genre = "Nonfiction";
  }

  if (!expectedGenres.includes(genre)) {
    genre = "Uncategorized";
  }

  return {
    genre,
    language: languageToken === "spa" ? "Spanish" : "English",
    audience: audienceToken === "ya" ? "Young Adult / Juvenile" : "Adult / General",
    fictionStatus,
    sourceSeed: stem.replace(/-/g, " "),
  };
}

function countBy(items, getValue) {
  return items.reduce((counts, item) => {
    const value = getValue(item);
    counts.set(value, (counts.get(value) ?? 0) + 1);
    return counts;
  }, new Map());
}

function sortedCounts(counts) {
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
}

function withExpectedCounts(counts, expectedValues) {
  const nextCounts = new Map(counts);

  for (const value of expectedValues) {
    if (!nextCounts.has(value)) {
      nextCounts.set(value, 0);
    }
  }

  return nextCounts;
}

function printCounts(label, counts) {
  console.log(`\n${label}:`);
  for (const [name, count] of sortedCounts(counts)) {
    console.log(`- ${name}: ${count}`);
  }
}

function getBookSeeds(book) {
  return [
    ...(Array.isArray(book.sourceSeeds) ? book.sourceSeeds : []),
    book.sourceSeed,
  ]
    .map(clean)
    .filter(Boolean);
}

async function readProgress() {
  try {
    return JSON.parse(await readFile(PROGRESS_PATH, "utf8"));
  } catch {
    return undefined;
  }
}

const csvFilenames = (await readdir(INPUT_DIR)).filter((filename) => filename.endsWith(".csv")).sort();
const progress = await readProgress();
const csvEntries = csvFilenames.map((filename) => ({
  filename,
  ...parseFilename(filename),
}));
const csvGenreSet = new Set(csvEntries.map((entry) => entry.genre));
const completedGenreSet = new Set(
  Object.entries(progress?.files ?? {})
    .filter(([, file]) => file?.status === "completed")
    .map(([, file]) => normalizeText(file.genre, "Uncategorized")),
);

const sourceSeedCounts = new Map();
const sourcePageFiles = new Set();

for (const book of books) {
  for (const seed of getBookSeeds(book)) {
    sourceSeedCounts.set(seed, (sourceSeedCounts.get(seed) ?? 0) + 1);
  }

  if (typeof book.sourcePageUrl === "string" && book.sourcePageUrl.endsWith(".csv")) {
    sourcePageFiles.add(book.sourcePageUrl);
  }
}

const representedCsvFiles = csvEntries.filter(
  (entry) => sourceSeedCounts.has(entry.sourceSeed) || sourcePageFiles.has(entry.filename),
);
const representedCsvFileSet = new Set(representedCsvFiles.map((entry) => entry.filename));
const missingCsvFiles = csvEntries.filter((entry) => !representedCsvFileSet.has(entry.filename));
const representedCsvGenreSet = new Set(representedCsvFiles.map((entry) => entry.genre));

const languageCounts = withExpectedCounts(
  countBy(books, (book) => normalizeText(book.language, "English")),
  expectedLanguages,
);
const audienceCounts = withExpectedCounts(
  countBy(books, (book) => normalizeText(book.audience, "Adult / General")),
  expectedAudiences,
);
const genreCounts = withExpectedCounts(
  countBy(books, (book) => normalizeText(book.genre, "Uncategorized")),
  expectedGenres,
);
const formatCounts = withExpectedCounts(
  countBy(books, (book) => normalizeText(book.format, "Book")),
  expectedFormats,
);

const missingGoodreadsUrl = books.filter((book) => isMissingText(book.goodreadsUrl));
const missingGoodreadsRating = books.filter((book) => isMissingNumber(book.goodreadsRating));
const missingDescription = books.filter((book) => isMissingText(book.description));
const missingCoverUrl = books.filter((book) => isMissingText(book.coverUrl));
const warnings = [];
const missingCsvGenres = [...csvGenreSet].filter((genre) => !representedCsvGenreSet.has(genre));
const dominantGenre = sortedCounts(genreCounts).find(([genre]) => genre !== "Uncategorized");
const lowBookGenres = [...csvGenreSet]
  .filter((genre) => (genreCounts.get(genre) ?? 0) < 25)
  .sort();

if (missingCsvGenres.length > 0) {
  warnings.push(`WARNING: Some CSV genres were not imported: ${missingCsvGenres.join(", ")}.`);
}

if (dominantGenre && books.length > 0 && dominantGenre[1] / books.length > 0.4) {
  warnings.push(
    `WARNING: A single genre is more than 40% of dataset: ${dominantGenre[0]} (${dominantGenre[1]} of ${books.length}).`,
  );
}

if ((progress?.totals?.capReached || books.length >= (progress?.maxBooks ?? Number.POSITIVE_INFINITY)) && completedGenreSet.size < csvGenreSet.size) {
  warnings.push("WARNING: Import reached MAX_BOOKS before processing all genre groups.");
}

if (lowBookGenres.length > 0) {
  warnings.push(`WARNING: Some genres have fewer than 25 books: ${lowBookGenres.join(", ")}.`);
}

console.log(`Total books: ${books.length}`);
console.log(`Total CSV files in data/spl-csv: ${csvFilenames.length}`);
console.log(`CSV files represented in sourceSeeds: ${representedCsvFiles.length}`);
console.log(`CSV files not represented: ${missingCsvFiles.length}`);

if (warnings.length > 0) {
  console.log("\nWarnings:");
  for (const warning of warnings) {
    console.log(warning);
  }
}

if (missingCsvFiles.length > 0) {
  console.log("\nCSV files not represented:");
  for (const entry of missingCsvFiles) {
    console.log(`- ${entry.filename} (${entry.genre}, ${entry.language}, ${entry.audience}, ${entry.fictionStatus})`);
  }
}

printCounts("Counts by genre", genreCounts);
printCounts("Counts by language", languageCounts);
printCounts("Counts by audience", audienceCounts);
printCounts("Counts by format", formatCounts);

console.log("\nTop 10 sourceSeeds by book count:");
for (const [seed, count] of sortedCounts(sourceSeedCounts).slice(0, 10)) {
  console.log(`- ${seed}: ${count}`);
}

console.log("\nMetadata gaps:");
console.log(`- Books missing Goodreads URL: ${missingGoodreadsUrl.length}`);
console.log(`- Books missing Goodreads rating: ${missingGoodreadsRating.length}`);
console.log(`- Books missing description: ${missingDescription.length}`);
console.log(`- Books missing coverUrl: ${missingCoverUrl.length}`);
