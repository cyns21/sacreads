import books from "../src/data/books.json" with { type: "json" };
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const OUTPUT_PATH = resolve("data/goodreads-missing.csv");
const columns = [
  "title",
  "author",
  "splCatalogUrl",
  "splSearchUrl",
  "genre",
  "format",
  "language",
  "audience",
  "publicationYear",
  "goodreadsUrl",
  "goodreadsRating",
  "goodreadsReviewCount",
];
const languagePriority = new Map([
  ["English", 0],
  ["Spanish", 1],
]);
const genrePriority = new Map([
  ["Mystery", 0],
  ["Fantasy", 1],
  ["Romance", 2],
  ["Science Fiction", 3],
  ["Horror", 4],
  ["Historical Fiction", 5],
  ["Crime", 6],
  ["Biography", 7],
  ["Drama", 8],
  ["Adventure", 9],
  ["Nonfiction", 10],
  ["Uncategorized", 11],
]);

function isMissingText(value) {
  return typeof value !== "string" || value.trim().length === 0;
}

function isMissingNumber(value) {
  return typeof value !== "number" || !Number.isFinite(value);
}

function getSourceSeedCount(book) {
  return Array.isArray(book.sourceSeeds) ? book.sourceSeeds.length : book.sourceSeed ? 1 : 0;
}

function getMissingGoodreadsScore(book) {
  return (isMissingText(book.goodreadsUrl) ? 1 : 0) + (isMissingNumber(book.goodreadsRating) ? 1 : 0);
}

function escapeCsv(value) {
  const text = value === null || value === undefined ? "" : String(value);

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

const missingRows = books
  .filter(
    (book) =>
      isMissingText(book.goodreadsUrl) ||
      isMissingNumber(book.goodreadsRating) ||
      isMissingNumber(book.goodreadsReviewCount),
  )
  .sort((left, right) => {
    const languageCompare =
      (languagePriority.get(left.language) ?? 99) - (languagePriority.get(right.language) ?? 99);
    if (languageCompare !== 0) return languageCompare;

    const genreCompare = (genrePriority.get(left.genre) ?? 99) - (genrePriority.get(right.genre) ?? 99);
    if (genreCompare !== 0) return genreCompare;

    const sourceCompare = getSourceSeedCount(right) - getSourceSeedCount(left);
    if (sourceCompare !== 0) return sourceCompare;

    const missingCompare = getMissingGoodreadsScore(right) - getMissingGoodreadsScore(left);
    if (missingCompare !== 0) return missingCompare;

    return String(left.title).localeCompare(String(right.title));
  });

const csv = [
  columns.join(","),
  ...missingRows.map((book) => columns.map((column) => escapeCsv(book[column])).join(",")),
].join("\n");

await mkdir(dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${csv}\n`);

console.log(`Exported ${missingRows.length} books missing Goodreads metadata to data/goodreads-missing.csv`);
