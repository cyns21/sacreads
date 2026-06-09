import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const INPUT_PATH = resolve("data/goodreads-metadata.csv");
const OUTPUT_PATH = resolve("src/data/books.json");
const BACKUP_PATH = resolve("src/data/books.backup.json");

const finalFields = [
  "id",
  "title",
  "author",
  "genre",
  "genres",
  "audience",
  "format",
  "language",
  "publicationYear",
  "description",
  "coverUrl",
  "goodreadsRating",
  "goodreadsReviewCount",
  "goodreadsUrl",
  "splCatalogUrl",
  "splSearchUrl",
  "sourceListName",
  "sourcePageUrl",
  "sourceSeed",
  "sourceSeeds",
  "sourceType",
];
const defaultValues = {
  genres: [],
  publicationYear: null,
  goodreadsRating: null,
  goodreadsReviewCount: null,
  sourceSeeds: [],
};

function clean(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizeKey(title, author) {
  return `${clean(title)}::${clean(author)}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(field);
      field = "";

      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((cell) => cell.length > 0)) {
    rows.push(row);
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) => clean(header));
  return rows.slice(1).map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, clean(cells[index] ?? "")])),
  );
}

function isMissingText(value) {
  return typeof value !== "string" || value.trim().length === 0;
}

function isMissingNumber(value) {
  return typeof value !== "number" || !Number.isFinite(value);
}

function parseRating(value) {
  const text = clean(value);

  if (!text) {
    return { value: undefined, valid: true };
  }

  const rating = Number(text.replace(",", "."));
  return { value: rating, valid: Number.isFinite(rating) && rating >= 0 && rating <= 5 };
}

function parseReviewCount(value) {
  const text = clean(value);

  if (!text) {
    return { value: undefined, valid: true };
  }

  const match = text.replace(/,/g, "").match(/^(\d+(?:\.\d+)?)([kKmM])?$/);

  if (!match) {
    return { value: undefined, valid: false };
  }

  const number = Number(match[1]);
  const multiplier = match[2]?.toLowerCase() === "m" ? 1000000 : match[2]?.toLowerCase() === "k" ? 1000 : 1;
  const count = Math.round(number * multiplier);

  return { value: count, valid: Number.isFinite(count) && count >= 0 };
}

function orderRecord(record) {
  return Object.fromEntries(finalFields.map((field) => [field, record[field] ?? defaultValues[field] ?? ""]));
}

async function backupBooks() {
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await copyFile(OUTPUT_PATH, BACKUP_PATH);
}

async function main() {
  try {
    await access(INPUT_PATH);
  } catch {
    console.log("No data/goodreads-metadata.csv file found.");
    console.log("Use data/goodreads-metadata-template.csv as the starter file, fill Goodreads fields manually,");
    console.log("then save it as data/goodreads-metadata.csv and run npm run import:goodreads.");
    return;
  }

  const books = JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
  const rows = parseCsv(await readFile(INPUT_PATH, "utf8"));
  const booksByKey = new Map();
  let rowsUnmatched = 0;
  let ratingsAdded = 0;
  let urlsAdded = 0;
  let reviewCountsAdded = 0;
  let invalidRatings = 0;
  let invalidReviewCounts = 0;

  for (const book of books) {
    booksByKey.set(normalizeKey(book.title, book.author), book);
  }

  for (const row of rows) {
    const key = normalizeKey(row.title, row.author);
    const book = booksByKey.get(key);

    if (!book) {
      rowsUnmatched += 1;
      continue;
    }

    const nextUrl = clean(row.goodreadsUrl);
    const rating = parseRating(row.goodreadsRating);
    const reviewCount = parseReviewCount(row.goodreadsReviewCount);

    if (!rating.valid) {
      invalidRatings += 1;
    }

    if (!reviewCount.valid) {
      invalidReviewCounts += 1;
    }

    if (nextUrl) {
      if (isMissingText(book.goodreadsUrl)) {
        urlsAdded += 1;
      }
      book.goodreadsUrl = nextUrl;
    }

    if (rating.valid && rating.value !== undefined) {
      if (isMissingNumber(book.goodreadsRating)) {
        ratingsAdded += 1;
      }
      book.goodreadsRating = rating.value;
    }

    if (reviewCount.valid && reviewCount.value !== undefined) {
      if (isMissingNumber(book.goodreadsReviewCount)) {
        reviewCountsAdded += 1;
      }
      book.goodreadsReviewCount = reviewCount.value;
    }
  }

  await backupBooks();
  await writeFile(OUTPUT_PATH, `${JSON.stringify(books.map(orderRecord), null, 2)}\n`);

  console.log(`Metadata rows read: ${rows.length}`);
  console.log(`Books matched: ${rows.length - rowsUnmatched}`);
  console.log(`Rows unmatched: ${rowsUnmatched}`);
  console.log(`Ratings added: ${ratingsAdded}`);
  console.log(`Goodreads URLs added: ${urlsAdded}`);
  console.log(`Goodreads review counts added: ${reviewCountsAdded}`);

  if (invalidRatings > 0) {
    console.log(`Invalid ratings skipped: ${invalidRatings}`);
  }

  if (invalidReviewCounts > 0) {
    console.log(`Invalid review counts skipped: ${invalidReviewCounts}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
