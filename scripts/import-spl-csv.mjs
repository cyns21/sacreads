import { createReadStream } from "node:fs";
import { access, copyFile, mkdir, readFile, readdir, rm, writeFile, appendFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const INPUT_DIR = resolve("data/spl-csv");
const OUTPUT_PATH = resolve("src/data/books.json");
const BACKUP_PATH = resolve("src/data/books.backup.json");
const PROGRESS_PATH = resolve("data/import-progress.json");
const LOG_PATH = resolve("data/import-log.txt");

const DEFAULT_MAX_BOOKS = 5000;
const DEFAULT_MAX_ROWS_PER_FILE = 150;
const DEFAULT_MAX_FILES_PER_RUN = 78;
const PROCESS_ALL_FILES_BALANCED = true;
const SAVE_EVERY_NEW_UNIQUE_BOOKS = 500;

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

const genreOptions = [
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
const genrePriority = new Map(genreOptions.map((genre, index) => [genre, index]));
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
const allowedGenres = new Set(genreOptions);
const nonfictionSpecificGenres = new Set(["Biography", "Crime", "Historical Fiction", "Drama"]);
const formatRank = new Map([
  ["Book", 1],
  ["Large Print", 2],
  ["Audiobook", 3],
  ["Picture Book", 4],
  ["Graphic Novel", 5],
]);

function parseArgs(argv) {
  const options = {
    balanced: PROCESS_ALL_FILES_BALANCED,
    dryRun: false,
    reset: false,
    maxBooks: DEFAULT_MAX_BOOKS,
    maxRowsPerFile: DEFAULT_MAX_ROWS_PER_FILE,
    maxFiles: DEFAULT_MAX_FILES_PER_RUN,
  };

  for (const arg of argv) {
    if (arg === "--balanced") {
      options.balanced = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--reset") {
      options.reset = true;
      continue;
    }

    if (arg.startsWith("--max-files=")) {
      const value = Number(arg.slice("--max-files=".length));
      if (!Number.isInteger(value) || value < 1) {
        throw new Error(`Invalid --max-files value: ${arg}`);
      }
      options.maxFiles = value;
      continue;
    }

    if (arg.startsWith("--max-books=")) {
      const value = Number(arg.slice("--max-books=".length));
      if (!Number.isInteger(value) || value < 1) {
        throw new Error(`Invalid --max-books value: ${arg}`);
      }
      options.maxBooks = value;
      continue;
    }

    if (arg.startsWith("--max-rows-per-file=")) {
      const value = Number(arg.slice("--max-rows-per-file=".length));
      if (!Number.isInteger(value) || value < 1) {
        throw new Error(`Invalid --max-rows-per-file value: ${arg}`);
      }
      options.maxRowsPerFile = value;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function clean(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function slugify(value) {
  return clean(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function normalizeKey(title, author) {
  return `${clean(title)}::${clean(author)}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function parseExistingNumber(value) {
  if (hasNumber(value)) {
    return value;
  }

  if (!hasText(value)) {
    return null;
  }

  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function hasValue(record, field) {
  const value = record[field];

  if (field === "genres" || field === "sourceSeeds") {
    return Array.isArray(value) && value.length > 0;
  }

  if (field === "publicationYear" || field === "goodreadsRating" || field === "goodreadsReviewCount") {
    return hasNumber(value);
  }

  if (field === "genre") {
    return hasText(value) && value !== "Uncategorized";
  }

  return value !== null && value !== undefined && String(value).trim() !== "";
}

function uniqueTextList(values) {
  const seen = new Set();
  const result = [];

  for (const value of Array.isArray(values) ? values : [values]) {
    const item = clean(value ?? "");

    if (!item) {
      continue;
    }

    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

async function* parseCsvRows(filePath) {
  let row = [];
  let field = "";
  let inQuotes = false;
  let sawQuoteInField = false;
  let previousWasCR = false;
  let atStart = true;

  const pushField = () => {
    row.push(field);
    field = "";
    sawQuoteInField = false;
  };

  const rowHasContent = () => row.some((cell) => cell.length > 0);

  const emitRow = async function* () {
    pushField();
    if (rowHasContent()) {
      yield row;
    }
    row = [];
  };

  const stream = createReadStream(filePath, { encoding: "utf8" });

  for await (const chunk of stream) {
    for (let index = 0; index < chunk.length; index += 1) {
      let char = chunk[index];
      const next = chunk[index + 1];

      if (atStart) {
        atStart = false;
        if (char === "\uFEFF") {
          continue;
        }
      }

      if (previousWasCR) {
        previousWasCR = false;
        if (char === "\n") {
          continue;
        }
      }

      if (char === '"') {
        if (inQuotes && next === '"') {
          field += '"';
          index += 1;
        } else if (inQuotes) {
          inQuotes = false;
          sawQuoteInField = true;
        } else if (!sawQuoteInField && field.length === 0) {
          inQuotes = true;
        } else {
          field += char;
        }
        continue;
      }

      if (char === "," && !inQuotes) {
        pushField();
        continue;
      }

      if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r") {
          previousWasCR = true;
        }

        for await (const completedRow of emitRow()) {
          yield completedRow;
        }
        continue;
      }

      field += char;
    }
  }

  if (inQuotes) {
    throw new Error(`Unclosed quoted field in ${filePath}`);
  }

  pushField();
  if (rowHasContent()) {
    yield row;
  }
}

function rowToObject(headers, cells) {
  return Object.fromEntries(headers.map((header, index) => [header, clean(cells[index] ?? "")]));
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

  if (!allowedGenres.has(genre)) {
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

function getCsvFileEntries(filenames) {
  return filenames.map((filename) => ({
    filename,
    metadata: parseFilename(filename),
  }));
}

function getBalancedFileEntries(entries) {
  const groups = new Map();

  for (const entry of entries) {
    const genre = entry.metadata.genre;
    if (!groups.has(genre)) {
      groups.set(genre, []);
    }
    groups.get(genre).push(entry);
  }

  const sortedGenres = [...groups.keys()].sort(
    (left, right) => (genrePriority.get(left) ?? 99) - (genrePriority.get(right) ?? 99) || left.localeCompare(right),
  );
  const result = [];
  let addedInRound = true;

  while (addedInRound) {
    addedInRound = false;

    for (const genre of sortedGenres) {
      const group = groups.get(genre);
      const next = group.shift();

      if (next) {
        result.push(next);
        addedInRound = true;
      }
    }
  }

  return result;
}

function getFileBookLimits(entries, maxBooks, existingBookCount) {
  const remainingBookSlots = Math.max(0, maxBooks - existingBookCount);
  const fileCount = Math.max(1, entries.length);
  const baseLimit = Math.floor(remainingBookSlots / fileCount);
  const extraSlots = remainingBookSlots % fileCount;
  const limits = new Map();

  entries.forEach((entry, index) => {
    limits.set(entry.filename, baseLimit + (index < extraSlots ? 1 : 0));
  });

  return limits;
}

function parsePublicationYear(value) {
  const matches = clean(value).match(/\b\d{4}\b/g);

  if (!matches || matches.length === 0) {
    return null;
  }

  return Math.min(...matches.map((year) => Number(year)).filter(Number.isFinite));
}

function appearsPhysical(row) {
  const format = row.Format ?? "";
  const location = row["Location & Call Number"] ?? "";
  const formatTokens = format.split(";").map(clean).filter(Boolean);
  const hasPhysicalFormat = formatTokens.some((token) =>
    /^(Book|Large Print|Audiobook - CD|Graphic Novel\/Manga|Picture Book|Easy Reader)$/i.test(token),
  );
  const hasPhysicalLocation = /Book::|Large Print::|Audiobook::|Graphic Novel|CHILDREN|TEEN|ADULT/i.test(location);
  const hasOnlyDigital =
    formatTokens.length > 0 && formatTokens.every((token) => /^(eBook|eAudiobook|eComic)$/i.test(token)) && !hasPhysicalLocation;

  return !hasOnlyDigital && (hasPhysicalFormat || hasPhysicalLocation);
}

function inferFormat(row) {
  const format = row.Format ?? "";
  const location = row["Location & Call Number"] ?? "";
  const formatTokens = format.split(";").map(clean).filter(Boolean);
  const hasFormat = (name) => formatTokens.some((token) => token.toLowerCase() === name.toLowerCase());

  if (hasFormat("Large Print")) return "Large Print";
  if (hasFormat("Audiobook - CD") || /Audiobook::/i.test(location)) return "Audiobook";
  if (hasFormat("Graphic Novel/Manga") || /Graphic Novel/i.test(location)) return "Graphic Novel";
  if (hasFormat("Picture Book") || hasFormat("Easy Reader")) return "Picture Book";
  if (hasFormat("Book")) return "Book";
  if (/Book::/i.test(location)) return "Book";

  return appearsPhysical(row) ? "Book" : "";
}

function buildSearchUrl(title, author) {
  return `https://catalog.saclibrary.org/Search/Results?lookfor=${encodeURIComponent(`${title} ${author}`.trim())}`;
}

function normalizeExistingGenre(value) {
  const genre = clean(value);

  if (allowedGenres.has(genre)) {
    return genre;
  }

  if (genre === "Science fiction") return "Science Fiction";
  if (genre === "Historical fiction") return "Historical Fiction";

  return "Uncategorized";
}

function normalizeExistingAudience(value) {
  const audience = clean(value);

  if (audience === "Adult / General" || audience === "Young Adult / Juvenile") {
    return audience;
  }

  if (/young adult|juvenile|teen/i.test(audience)) {
    return "Young Adult / Juvenile";
  }

  return "Adult / General";
}

function normalizeExistingFormat(value) {
  const format = clean(value);
  return formatRank.has(format) ? format : "Book";
}

function normalizeExistingLanguage(value) {
  const language = clean(value);
  return language === "Spanish" ? "Spanish" : "English";
}

function orderRecord(record) {
  return Object.fromEntries(finalFields.map((field) => [field, record[field]]));
}

function normalizeExistingBook(record) {
  const title = clean(record.title);
  const author = clean(record.author);
  const genre = normalizeExistingGenre(record.genre);
  const sourceSeeds = uniqueTextList(record.sourceSeeds ?? (record.sourceSeed ? [record.sourceSeed] : []));

  return orderRecord({
    id: hasText(record.id) ? clean(record.id) : slugify(`${title}-${author}`),
    title,
    author,
    genre,
    genres: uniqueTextList(record.genres ?? (genre !== "Uncategorized" ? [genre] : [])).filter((item) =>
      allowedGenres.has(item),
    ),
    audience: normalizeExistingAudience(record.audience),
    format: normalizeExistingFormat(record.format),
    language: normalizeExistingLanguage(record.language),
    publicationYear: hasNumber(record.publicationYear) ? record.publicationYear : parsePublicationYear(record.publicationYear),
    description: hasText(record.description) ? record.description : "",
    coverUrl: hasText(record.coverUrl) ? record.coverUrl : "",
    goodreadsRating: parseExistingNumber(record.goodreadsRating),
    goodreadsReviewCount: parseExistingNumber(record.goodreadsReviewCount),
    goodreadsUrl: hasText(record.goodreadsUrl) ? record.goodreadsUrl : "",
    splCatalogUrl: hasText(record.splCatalogUrl) ? record.splCatalogUrl : buildSearchUrl(title, author),
    splSearchUrl: hasText(record.splSearchUrl) ? record.splSearchUrl : buildSearchUrl(title, author),
    sourceListName: hasText(record.sourceListName) ? record.sourceListName : "SPL catalog CSV",
    sourcePageUrl: hasText(record.sourcePageUrl) ? record.sourcePageUrl : "",
    sourceSeed: hasText(record.sourceSeed) ? record.sourceSeed : sourceSeeds[0] ?? "",
    sourceSeeds,
    sourceType: hasText(record.sourceType) ? record.sourceType : "spl-catalog-browser",
  });
}

function makeBook(row, filenameMeta, filename) {
  const title = clean(row.Title);
  const author = clean(row.Author);
  const format = inferFormat(row);

  if (!title || !author || !format || !appearsPhysical(row)) {
    return undefined;
  }

  const sourceSeeds = [filenameMeta.sourceSeed];

  return orderRecord({
    id: slugify(`${title}-${author}`),
    title,
    author,
    genre: filenameMeta.genre,
    genres: filenameMeta.genre === "Uncategorized" ? [] : [filenameMeta.genre],
    audience: filenameMeta.audience,
    format,
    language: filenameMeta.language,
    publicationYear: parsePublicationYear(row["Publish Date"]),
    description: "",
    coverUrl: "",
    goodreadsRating: null,
    goodreadsReviewCount: null,
    goodreadsUrl: "",
    splCatalogUrl: clean(row.Link) || buildSearchUrl(title, author),
    splSearchUrl: buildSearchUrl(title, author),
    sourceListName: "SPL catalog CSV",
    sourcePageUrl: filename,
    sourceSeed: filenameMeta.sourceSeed,
    sourceSeeds,
    sourceType: "spl-catalog-browser",
  });
}

function mergeBooks(existing, incoming) {
  existing.sourceSeeds = uniqueTextList([...(existing.sourceSeeds ?? []), ...(incoming.sourceSeeds ?? [])]);
  existing.genres = uniqueTextList([...(existing.genres ?? []), ...(incoming.genres ?? [])]).filter((item) =>
    allowedGenres.has(item),
  );

  if (
    (existing.genre === "Uncategorized" || existing.genre === "Nonfiction") &&
    incoming.genre !== "Uncategorized" &&
    incoming.genre !== "Nonfiction"
  ) {
    existing.genre = incoming.genre;
  }

  const existingRank = formatRank.get(existing.format) ?? 0;
  const incomingRank = formatRank.get(incoming.format) ?? 0;
  if (incomingRank > existingRank) {
    existing.format = incoming.format;
  }

  for (const field of finalFields) {
    if (!hasValue(existing, field) && hasValue(incoming, field)) {
      existing[field] = incoming[field];
    }
  }

  existing.sourceSeed = existing.sourceSeeds[0] ?? existing.sourceSeed;
  return orderRecord(existing);
}

function applyPreservedMetadata(incoming, preserved) {
  const book = { ...incoming };

  for (const field of ["id", "description", "coverUrl", "goodreadsRating", "goodreadsReviewCount", "goodreadsUrl"]) {
    if (hasValue(preserved, field)) {
      book[field] = preserved[field];
    }
  }

  if (!hasValue(book, "splCatalogUrl") && hasValue(preserved, "splCatalogUrl")) {
    book.splCatalogUrl = preserved.splCatalogUrl;
  }

  if (!hasValue(book, "splSearchUrl") && hasValue(preserved, "splSearchUrl")) {
    book.splSearchUrl = preserved.splSearchUrl;
  }

  return orderRecord(book);
}

async function readExistingBooks() {
  try {
    const parsed = JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function readProgress() {
  try {
    const parsed = JSON.parse(await readFile(PROGRESS_PATH, "utf8"));
    if (parsed && Array.isArray(parsed.completedFiles)) {
      return {
        version: 1,
        completedFiles: parsed.completedFiles,
        files: parsed.files && typeof parsed.files === "object" ? parsed.files : {},
        totals: parsed.totals && typeof parsed.totals === "object" ? parsed.totals : {},
      };
    }
  } catch {
    // Missing or invalid progress should not block a fresh import batch.
  }

  return {
    version: 1,
    completedFiles: [],
    files: {},
    totals: {},
  };
}

async function backupBooks() {
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  try {
    await access(OUTPUT_PATH);
    await copyFile(OUTPUT_PATH, BACKUP_PATH);
  } catch {
    await writeFile(BACKUP_PATH, "[]\n");
  }
}

async function writeBooks(books) {
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(books.map(orderRecord), null, 2)}\n`);
}

async function writeProgress(progress, totals, options) {
  const now = new Date().toISOString();
  const payload = {
    version: 1,
    inputDir: "data/spl-csv",
    outputPath: "src/data/books.json",
    maxBooks: options.maxBooks,
    maxRowsPerFile: options.maxRowsPerFile,
    balanced: options.balanced,
    updatedAt: now,
    completedFiles: [...new Set(progress.completedFiles)].sort(),
    files: progress.files,
    totals,
  };

  await mkdir(dirname(PROGRESS_PATH), { recursive: true });
  await writeFile(PROGRESS_PATH, `${JSON.stringify(payload, null, 2)}\n`);
}

async function logLine(message, dryRun) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);

  if (!dryRun) {
    await mkdir(dirname(LOG_PATH), { recursive: true });
    await appendFile(LOG_PATH, `${line}\n`);
  }
}

function addCount(counts, key) {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function summarizeBooks(books) {
  const countsByLanguage = new Map();
  const countsByAudience = new Map();
  const countsByGenre = new Map();
  const countsByFormat = new Map();

  for (const book of books) {
    addCount(countsByLanguage, book.language);
    addCount(countsByAudience, book.audience);
    addCount(countsByGenre, book.genre);
    addCount(countsByFormat, book.format);
  }

  return { countsByLanguage, countsByAudience, countsByGenre, countsByFormat };
}

function printCounts(label, counts) {
  console.log(label);
  for (const [key, value] of [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
    console.log(`- ${key}: ${value}`);
  }
}

function createTotals(existingBooksLoaded, existingBooksSkippedForCap, maxBooks) {
  return {
    existingBooksLoaded,
    existingMetadataLoaded: 0,
    existingBooksSkippedForCap,
    filesProcessed: 0,
    filesSkippedByProgress: 0,
    rowsRead: 0,
    filesStoppedAtRowLimit: 0,
    booksAdded: 0,
    duplicatesMerged: 0,
    digitalRowsSkipped: 0,
    rowsMissingTitleSkipped: 0,
    rowsMissingAuthorSkipped: 0,
    rowsRejectedSkipped: 0,
    booksSkippedByFileBookLimit: 0,
    partialSaves: 0,
    capReached: existingBooksLoaded >= maxBooks,
  };
}

async function loadExistingBookIndex(maxBooks) {
  const existingBooks = await readExistingBooks();
  const books = [];
  const bookByKey = new Map();
  let duplicatesMerged = 0;
  let skippedForCap = 0;

  for (const record of existingBooks) {
    const book = normalizeExistingBook(record);
    const key = normalizeKey(book.title, book.author);

    if (!book.title || !book.author || !key) {
      continue;
    }

    if (bookByKey.has(key)) {
      mergeBooks(bookByKey.get(key), book);
      duplicatesMerged += 1;
      continue;
    }

    if (books.length >= maxBooks) {
      skippedForCap += 1;
      continue;
    }

    bookByKey.set(key, book);
    books.push(book);
  }

  return {
    books,
    bookByKey,
    existingBooksRead: existingBooks.length,
    duplicatesMerged,
    skippedForCap,
  };
}

async function loadExistingMetadataIndex() {
  const existingBooks = await readExistingBooks();
  const metadataByKey = new Map();
  let duplicatesMerged = 0;

  for (const record of existingBooks) {
    const book = normalizeExistingBook(record);
    const key = normalizeKey(book.title, book.author);

    if (!book.title || !book.author || !key) {
      continue;
    }

    if (metadataByKey.has(key)) {
      mergeBooks(metadataByKey.get(key), book);
      duplicatesMerged += 1;
      continue;
    }

    metadataByKey.set(key, book);
  }

  return {
    metadataByKey,
    existingBooksRead: existingBooks.length,
    duplicatesMerged,
  };
}

async function dryRunFile(filename, maxRowsPerFile) {
  const filePath = join(INPUT_DIR, filename);
  const iterator = parseCsvRows(filePath);
  const first = await iterator.next();

  if (first.done) {
    return {
      filename,
      headers: [],
      rowsRead: 0,
      rowLimitHit: false,
    };
  }

  const headers = first.value.map((header) => clean(header));
  let rowsRead = 0;
  let rowLimitHit = false;

  for await (const _cells of iterator) {
    if (rowsRead >= maxRowsPerFile) {
      rowLimitHit = true;
      break;
    }
    rowsRead += 1;
  }

  return {
    filename,
    headers,
    rowsRead,
    rowLimitHit,
  };
}

async function processFile({
  filename,
  books,
  bookByKey,
  metadataByKey,
  totals,
  newBooksSinceSave,
  dryRun,
  maxBooks,
  maxRowsPerFile,
  fileBookLimit,
}) {
  const metadata = parseFilename(filename);
  const filePath = join(INPUT_DIR, filename);
  const iterator = parseCsvRows(filePath);
  const first = await iterator.next();
  const summary = {
    rowsRead: 0,
    rowLimitHit: false,
    booksAdded: 0,
    duplicatesMerged: 0,
    digitalRowsSkipped: 0,
    rowsMissingTitleSkipped: 0,
    rowsMissingAuthorSkipped: 0,
    rowsRejectedSkipped: 0,
    booksSkippedByFileBookLimit: 0,
    capReached: false,
  };

  if (first.done) {
    return { summary, newBooksSinceSave };
  }

  const headers = first.value.map((header) => clean(header));

  for await (const cells of iterator) {
    if (summary.rowsRead >= maxRowsPerFile) {
      summary.rowLimitHit = true;
      break;
    }

    summary.rowsRead += 1;
    const row = rowToObject(headers, cells);

    if (!hasText(row.Title)) {
      summary.rowsMissingTitleSkipped += 1;
      continue;
    }

    if (!hasText(row.Author)) {
      summary.rowsMissingAuthorSkipped += 1;
      continue;
    }

    if (!appearsPhysical(row)) {
      summary.digitalRowsSkipped += 1;
      continue;
    }

    const incoming = makeBook(row, metadata, filename);

    if (!incoming) {
      summary.rowsRejectedSkipped += 1;
      continue;
    }

    const key = normalizeKey(incoming.title, incoming.author);
    const existing = bookByKey.get(key);

    if (existing) {
      mergeBooks(existing, incoming);
      summary.duplicatesMerged += 1;
      continue;
    }

    if (books.length >= maxBooks) {
      summary.capReached = true;
      break;
    }

    const preserved = metadataByKey?.get(key);
    const bookToAdd = preserved ? applyPreservedMetadata(incoming, preserved) : incoming;

    if (summary.booksAdded >= fileBookLimit) {
      summary.booksSkippedByFileBookLimit += 1;
      continue;
    }

    if (preserved) {
      metadataByKey.delete(key);
      summary.duplicatesMerged += 1;
    }

    bookByKey.set(key, bookToAdd);
    books.push(bookToAdd);
    summary.booksAdded += 1;
    newBooksSinceSave += 1;

    if (!dryRun && newBooksSinceSave >= SAVE_EVERY_NEW_UNIQUE_BOOKS) {
      await writeBooks(books);
      totals.partialSaves += 1;
      newBooksSinceSave = 0;
    }
  }

  totals.filesProcessed += 1;
  totals.rowsRead += summary.rowsRead;
  totals.filesStoppedAtRowLimit += summary.rowLimitHit ? 1 : 0;
  totals.booksAdded += summary.booksAdded;
  totals.duplicatesMerged += summary.duplicatesMerged;
  totals.digitalRowsSkipped += summary.digitalRowsSkipped;
  totals.rowsMissingTitleSkipped += summary.rowsMissingTitleSkipped;
  totals.rowsMissingAuthorSkipped += summary.rowsMissingAuthorSkipped;
  totals.rowsRejectedSkipped += summary.rowsRejectedSkipped;
  totals.booksSkippedByFileBookLimit += summary.booksSkippedByFileBookLimit;
  totals.capReached = totals.capReached || summary.capReached || books.length >= maxBooks;

  return { summary, newBooksSinceSave };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const filenames = (await readdir(INPUT_DIR)).filter((filename) => filename.endsWith(".csv")).sort();
  const allFileEntries = getCsvFileEntries(filenames);
  const orderedFileEntries = options.balanced ? getBalancedFileEntries(allFileEntries) : allFileEntries;
  const progress = await readProgress();
  const completedFiles = options.reset ? new Set() : new Set(progress.completedFiles);
  const candidateFileEntries = orderedFileEntries.filter((entry) => !completedFiles.has(entry.filename));
  const filesToProcess = candidateFileEntries.slice(0, Math.min(options.maxFiles, candidateFileEntries.length));
  const skippedByProgress = filenames.filter((filename) => completedFiles.has(filename)).length;

  if (options.dryRun) {
    await logLine(
      `DRY RUN start: balanced=${options.balanced}, maxFiles=${options.maxFiles}, maxRowsPerFile=${options.maxRowsPerFile}, maxBooks=${options.maxBooks}, candidates=${filesToProcess.length}, skippedByProgress=${skippedByProgress}`,
      true,
    );

    let dryRowsRead = 0;
    let dryFilesStoppedAtRowLimit = 0;

    for (const entry of filesToProcess) {
      const result = await dryRunFile(entry.filename, options.maxRowsPerFile);
      dryRowsRead += result.rowsRead;
      dryFilesStoppedAtRowLimit += result.rowLimitHit ? 1 : 0;
      console.log(
        `Dry run ${entry.filename}: genre=${entry.metadata.genre}, language=${entry.metadata.language}, audience=${entry.metadata.audience}, fictionStatus=${entry.metadata.fictionStatus}, headers=${result.headers.join(" | ") || "(none)"}, rowsRead=${result.rowsRead}, rowLimitHit=${result.rowLimitHit ? "yes" : "no"}`,
      );
    }

    console.log(`Dry run CSV files checked: ${filesToProcess.length}`);
    console.log(`Dry run rows read: ${dryRowsRead}`);
    console.log(`Dry run files stopped at row limit: ${dryFilesStoppedAtRowLimit}`);
    console.log("Dry run did not write books.json, progress, backup, or log files.");
    return;
  }

  await backupBooks();

  if (options.reset) {
    await rm(PROGRESS_PATH, { force: true });
    progress.completedFiles = [];
    progress.files = {};
    progress.totals = {};
  }

  const resetMetadata = options.reset ? await loadExistingMetadataIndex() : null;
  const existingIndex = options.reset
    ? {
        books: [],
        bookByKey: new Map(),
        existingBooksRead: resetMetadata.existingBooksRead,
        duplicatesMerged: resetMetadata.duplicatesMerged,
        skippedForCap: 0,
      }
    : await loadExistingBookIndex(options.maxBooks);
  const { books, bookByKey, existingBooksRead, duplicatesMerged, skippedForCap } = existingIndex;
  const metadataByKey = resetMetadata?.metadataByKey;
  const totals = createTotals(books.length, skippedForCap, options.maxBooks);
  totals.existingMetadataLoaded = metadataByKey?.size ?? 0;
  totals.duplicatesMerged += duplicatesMerged;
  totals.filesSkippedByProgress = skippedByProgress;
  const fileBookLimits = options.balanced ? getFileBookLimits(filesToProcess, options.maxBooks, books.length) : new Map();

  await logLine(
    `Import start: reset=${options.reset}, balanced=${options.balanced}, maxFiles=${options.maxFiles}, maxRowsPerFile=${options.maxRowsPerFile}, maxBooks=${options.maxBooks}, existingRead=${existingBooksRead}, existingLoaded=${books.length}, existingSkippedForCap=${skippedForCap}, candidates=${filesToProcess.length}, skippedByProgress=${skippedByProgress}`,
    false,
  );

  let newBooksSinceSave = 0;

  for (const entry of filesToProcess) {
    if (books.length >= options.maxBooks) {
      totals.capReached = true;
      await logLine(`Stopping before ${entry.filename}: maxBooks=${options.maxBooks} already reached.`, false);
      break;
    }

    const result = await processFile({
      filename: entry.filename,
      books,
      bookByKey,
      metadataByKey,
      totals,
      newBooksSinceSave,
      dryRun: false,
      maxBooks: options.maxBooks,
      maxRowsPerFile: options.maxRowsPerFile,
      fileBookLimit: fileBookLimits.get(entry.filename) ?? options.maxBooks,
    });
    newBooksSinceSave = result.newBooksSinceSave;

    progress.completedFiles = [...new Set([...progress.completedFiles, entry.filename])];
    progress.files[entry.filename] = {
      status: "completed",
      completedAt: new Date().toISOString(),
      genre: entry.metadata.genre,
      language: entry.metadata.language,
      audience: entry.metadata.audience,
      fictionStatus: entry.metadata.fictionStatus,
      fileBookLimit: fileBookLimits.get(entry.filename) ?? null,
      ...result.summary,
    };

    await writeProgress(progress, totals, options);
    await logLine(
      `${entry.filename}: genre=${entry.metadata.genre}, rows=${result.summary.rowsRead}, rowLimitHit=${result.summary.rowLimitHit ? "yes" : "no"}, fileBookLimit=${fileBookLimits.get(entry.filename) ?? "none"}, added=${result.summary.booksAdded}, skippedByFileBookLimit=${result.summary.booksSkippedByFileBookLimit}, duplicates=${result.summary.duplicatesMerged}, digitalSkipped=${result.summary.digitalRowsSkipped}, missingTitle=${result.summary.rowsMissingTitleSkipped}, missingAuthor=${result.summary.rowsMissingAuthorSkipped}, rejected=${result.summary.rowsRejectedSkipped}, totalBooks=${books.length}`,
      false,
    );
  }

  await writeBooks(books);
  await writeProgress(progress, totals, options);

  const { countsByLanguage, countsByAudience, countsByGenre, countsByFormat } = summarizeBooks(books);

  console.log(`CSV files available: ${filenames.length}`);
  console.log(`CSV files processed this run: ${totals.filesProcessed}`);
  console.log(`CSV files skipped by progress: ${totals.filesSkippedByProgress}`);
  console.log(`Rows read: ${totals.rowsRead}`);
  console.log(`Files stopped at per-file row limit: ${totals.filesStoppedAtRowLimit}`);
  console.log(`Total unique books written: ${books.length}`);
  console.log(`Books added: ${totals.booksAdded}`);
  console.log(`Books skipped by balanced file limit: ${totals.booksSkippedByFileBookLimit}`);
  console.log(`Duplicates merged: ${totals.duplicatesMerged}`);
  console.log(`Digital-only rows skipped: ${totals.digitalRowsSkipped}`);
  console.log(`Rows missing title skipped: ${totals.rowsMissingTitleSkipped}`);
  console.log(`Rows missing author skipped: ${totals.rowsMissingAuthorSkipped}`);
  console.log(`Rows rejected skipped: ${totals.rowsRejectedSkipped}`);
  console.log(`Partial books.json saves: ${totals.partialSaves}`);
  console.log(`maxBooks reached: ${totals.capReached ? "yes" : "no"}`);
  printCounts("Counts by language:", countsByLanguage);
  printCounts("Counts by audience:", countsByAudience);
  printCounts("Counts by genre:", countsByGenre);
  printCounts("Counts by format:", countsByFormat);

  await logLine(
    `Import complete: processed=${totals.filesProcessed}, rows=${totals.rowsRead}, added=${totals.booksAdded}, duplicates=${totals.duplicatesMerged}, totalBooks=${books.length}, capReached=${totals.capReached}`,
    false,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
