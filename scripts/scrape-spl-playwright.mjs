import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const OUTPUT_PATH = resolve("src/data/books.json");
const BACKUP_PATH = resolve("src/data/books.backup.json");
const REPORT_PATH = resolve("src/data/spl-playwright-report.json");
const CATALOG_BASE_URL = "https://catalog.saclibrary.org";
const MAX_BOOKS = 1000;
const MAX_SEEDS = 60;
const MAX_PAGES_PER_SEED = 2;
const MAX_RESULTS_PER_SEED = 30;
const DELAY_BETWEEN_PAGES_MIN_MS = 3000;
const DELAY_BETWEEN_PAGES_MAX_MS = 6000;
const DELAY_BETWEEN_SEEDS_MIN_MS = 5000;
const DELAY_BETWEEN_SEEDS_MAX_MS = 9000;
const MAX_TOTAL_RUNTIME_MINUTES = 45;
const PARTIAL_SAVE_EVERY = 25;
const NAVIGATION_TIMEOUT_MS = 30000;

const seedQueries = [
  "mystery fiction",
  "romance fiction",
  "historical fiction",
  "science fiction",
  "fantasy fiction",
  "thriller fiction",
  "horror fiction",
  "literary fiction",
  "biography",
  "memoir",
  "cookbook",
  "graphic novel",
  "poetry",
  "Spanish fiction",
  "Spanish mystery",
  "Spanish romance",
  "Spanish children books",
  "Spanish picture books",
  "Spanish young adult",
  "libros en español",
  "novelas en español",
  "cuentos infantiles español",
  "Chinese fiction",
  "Chinese children books",
  "Chinese picture books",
  "books in Chinese",
  "Vietnamese fiction",
  "Vietnamese children books",
  "Vietnamese picture books",
  "books in Vietnamese",
  "Russian fiction",
  "Russian children books",
  "books in Russian",
  "adult fiction",
  "young adult fiction",
  "juvenile fiction",
  "children picture books",
  "teen fantasy",
  "teen romance",
  "teen mystery",
  "middle grade fantasy",
  "middle grade mystery",
].slice(0, MAX_SEEDS);

let latestBooksSnapshot = [];
let latestReportSnapshot = {};

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function randomDelay(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function stripTags(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return stripTags(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function normalizeKey(title, author) {
  return `${stripTags(title)}::${stripTags(author)}`
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

function hasFieldValue(record, field) {
  const value = record[field];

  if (field === "genres" || field === "sourceSeeds") {
    return Array.isArray(value) && value.length > 0;
  }

  if (field === "genre") {
    return hasText(value) && value !== "Uncategorized";
  }

  if (field === "publicationYear" || field === "goodreadsRating" || field === "goodreadsReviewCount") {
    return hasNumber(value);
  }

  return value !== null && value !== undefined && String(value).trim() !== "";
}

function uniqueTextList(values) {
  const source = Array.isArray(values) ? values : [values].filter(Boolean);
  const seen = new Set();
  const result = [];

  for (const value of source) {
    const clean = stripTags(value ?? "");

    if (!clean) {
      continue;
    }

    const key = clean.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(clean);
    }
  }

  return result;
}

function absoluteUrl(value, baseUrl = CATALOG_BASE_URL) {
  if (!value) {
    return "";
  }

  try {
    const parsed = new URL(value, baseUrl);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function buildSearchUrl(query, page = 1) {
  const params = new URLSearchParams({ lookfor: query });

  if (page > 1) {
    params.set("page", String(page));
  }

  return `${CATALOG_BASE_URL}/Search/Results?${params.toString()}`;
}

function buildTitleSearchUrl(title, author) {
  return buildSearchUrl([title, author].filter(Boolean).join(" "));
}

function inferGenre(seed) {
  const text = seed.toLowerCase();

  if (/mystery/.test(text)) return "Mystery";
  if (/romance/.test(text)) return "Romance";
  if (/historical fiction/.test(text)) return "Historical Fiction";
  if (/science fiction|sci-fi/.test(text)) return "Science Fiction";
  if (/fantasy/.test(text)) return "Fantasy";
  if (/thriller/.test(text)) return "Thriller";
  if (/horror/.test(text)) return "Horror";
  if (/biography/.test(text)) return "Biography";
  if (/memoir/.test(text)) return "Memoir";
  if (/cookbook/.test(text)) return "Cookbook";
  if (/graphic novel/.test(text)) return "Graphic Novel";
  if (/poetry/.test(text)) return "Poetry";
  if (/literary fiction/.test(text)) return "Literary Fiction";
  if (/children|juvenile|picture books?|cuentos infantiles|middle grade/.test(text)) return "Children's / Picture Books";
  if (/young adult|teen|\bya\b/.test(text)) return "Young Adult";

  return "Uncategorized";
}

function inferLanguage(seed) {
  const text = seed.toLowerCase();

  if (/spanish|español|libros|novelas|cuentos infantiles/.test(text)) return "Spanish";
  if (/chinese/.test(text)) return "Chinese";
  if (/vietnamese/.test(text)) return "Vietnamese";
  if (/russian/.test(text)) return "Russian";

  return "English";
}

function inferAudience(seed) {
  const text = seed.toLowerCase();

  if (/children|juvenile|picture books?|cuentos infantiles|middle grade/.test(text)) return "Juvenile";
  if (/teen|young adult|\bya\b/.test(text)) return "Young Adult";
  if (/adult/.test(text)) return "Adult";

  return "Adult";
}

function inferFormat(seed, visibleText = "") {
  const text = `${seed} ${visibleText}`.toLowerCase();

  if (/large print/.test(text)) return "Large Print";
  if (/audiobook/.test(text)) return "Audiobook";
  if (/graphic novel/.test(text)) return "Graphic Novel";
  if (/picture books?/.test(text)) return "Picture Book";

  return "Book";
}

function inferYear(value = "") {
  const match = String(value).match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function makeBook(scraped, seed) {
  const title = stripTags(scraped.title);
  const author = stripTags(scraped.author);

  if (!title || !author) {
    return undefined;
  }

  const genre = inferGenre(seed);
  const splCatalogUrl = absoluteUrl(scraped.splCatalogUrl);

  return {
    id: slugify(`${title}-${author}`),
    title,
    author,
    genre,
    genres: genre === "Uncategorized" ? [] : [genre],
    audience: inferAudience(seed),
    format: scraped.format || inferFormat(seed, scraped.visibleText),
    language: scraped.language || inferLanguage(seed),
    publicationYear: scraped.publicationYear ?? inferYear(scraped.visibleText),
    description: "",
    coverUrl: absoluteUrl(scraped.coverUrl),
    goodreadsRating: null,
    goodreadsReviewCount: null,
    goodreadsUrl: "",
    splCatalogUrl,
    splSearchUrl: buildTitleSearchUrl(title, author),
    sourceListName: `SPL catalog seed: ${seed}`,
    sourcePageUrl: buildSearchUrl(seed),
    sourceSeed: seed,
    sourceSeeds: [seed],
    sourceType: "spl-catalog-browser",
  };
}

async function readExistingBooks() {
  try {
    const snapshot = await readFile(OUTPUT_PATH, "utf8");
    const parsed = JSON.parse(snapshot);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.warn(`Could not read existing dataset: ${error instanceof Error ? error.message : error}`);
    }

    return [];
  }
}

async function createBackup() {
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });

  try {
    await access(OUTPUT_PATH);
    await copyFile(OUTPUT_PATH, BACKUP_PATH);
  } catch {
    await writeFile(BACKUP_PATH, "[]\n");
  }
}

async function saveBooks(books, reason) {
  latestBooksSnapshot = books;
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(books, null, 2)}\n`);
  console.log(`${reason}: wrote ${books.length} books to ${OUTPUT_PATH}`);
}

async function saveReport(report, reason) {
  latestReportSnapshot = report;
  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`${reason}: wrote scrape report to ${REPORT_PATH}`);
}

function mergeMissingFields(existing, scraped) {
  existing.genres = uniqueTextList([...(existing.genres ?? []), ...(scraped.genres ?? [])]);
  existing.sourceSeeds = uniqueTextList([...(existing.sourceSeeds ?? []), ...(scraped.sourceSeeds ?? [])]);

  const fields = [
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

  for (const field of fields) {
    if (!hasFieldValue(existing, field) && hasFieldValue(scraped, field)) {
      existing[field] = scraped[field];
    }
  }

  return existing;
}

function normalizeExistingBook(record) {
  return {
    id: hasText(record.id) ? record.id : slugify(`${record.title}-${record.author}`),
    title: stripTags(record.title ?? ""),
    author: stripTags(record.author ?? ""),
    genre: hasText(record.genre) ? record.genre : "Uncategorized",
    genres: uniqueTextList(record.genres ?? (record.genre && record.genre !== "Uncategorized" ? [record.genre] : [])),
    audience: hasText(record.audience) ? record.audience : "Adult",
    format: hasText(record.format) ? record.format : "Book",
    language: hasText(record.language) ? record.language : "English",
    publicationYear: hasNumber(record.publicationYear) ? record.publicationYear : null,
    description: hasText(record.description) ? record.description : "",
    coverUrl: hasText(record.coverUrl) ? record.coverUrl : "",
    goodreadsRating: hasNumber(record.goodreadsRating) ? record.goodreadsRating : null,
    goodreadsReviewCount: hasNumber(record.goodreadsReviewCount) ? record.goodreadsReviewCount : null,
    goodreadsUrl: hasText(record.goodreadsUrl) ? record.goodreadsUrl : "",
    splCatalogUrl: hasText(record.splCatalogUrl) ? record.splCatalogUrl : buildTitleSearchUrl(record.title, record.author),
    splSearchUrl: hasText(record.splSearchUrl) ? record.splSearchUrl : buildTitleSearchUrl(record.title, record.author),
    sourceListName: hasText(record.sourceListName) ? record.sourceListName : "Sacramento Public Library reading list",
    sourcePageUrl: hasText(record.sourcePageUrl) ? record.sourcePageUrl : "https://www.saclibrary.org/browse-borrow/reading-recommendations",
    sourceSeed: hasText(record.sourceSeed) ? record.sourceSeed : "",
    sourceSeeds: uniqueTextList(record.sourceSeeds ?? (record.sourceSeed ? [record.sourceSeed] : [])),
    sourceType: hasText(record.sourceType) ? record.sourceType : "spl-reading-list",
  };
}

function isBlockedText(text) {
  return /attention required|cloudflare|captcha|access denied|you have been blocked|login required|sign in to|please log in|blocked/i.test(
    text,
  );
}

async function extractVisibleResults(page, seed) {
  const rows = await page.evaluate(() => {
    function clean(value) {
      return String(value ?? "").replace(/\s+/g, " ").trim();
    }

    function getAuthor(container, title) {
      const authorNode = container.querySelector(
        '[class*="author" i], [data-test*="author" i], .result-author, .author, .byline',
      );
      const authorFromNode = clean(authorNode?.textContent ?? "").replace(/^by\s+/i, "");

      if (authorFromNode && authorFromNode.toLowerCase() !== title.toLowerCase()) {
        return authorFromNode;
      }

      const lines = clean(container.innerText)
        .split(/\n|\r| {2,}/)
        .map((line) => clean(line))
        .filter(Boolean)
        .filter((line) => line.toLowerCase() !== title.toLowerCase());
      const byLine = lines.find((line) => /^by\s+/.test(line));

      if (byLine) {
        return clean(byLine.replace(/^by\s+/i, ""));
      }

      return (
        lines.find(
          (line) =>
            !/available|checked|format|book|ebook|audiobook|place hold|request|copies|library|rating|search/i.test(line) &&
            line.length < 100,
        ) ?? ""
      );
    }

    const anchors = [...document.querySelectorAll('a[href*="/GroupedWork/"], a[href*="/Record/"]')];
    const seen = new Set();
    const results = [];

    for (const anchor of anchors) {
      const href = anchor.href;
      const title = clean(anchor.innerText || anchor.getAttribute("aria-label"));

      if (!href || !title || title.length < 2 || /availability|place hold|details|request|more/i.test(title)) {
        continue;
      }

      const container =
        anchor.closest('article, li, [class*="result" i], [class*="record" i], [class*="browse" i]') ??
        anchor.parentElement;

      if (!container) {
        continue;
      }

      const author = getAuthor(container, title);
      const key = `${title.toLowerCase()}::${author.toLowerCase()}`;

      if (!author || seen.has(key)) {
        continue;
      }

      seen.add(key);
      const visibleText = clean(container.innerText);
      const image = container.querySelector("img");

      results.push({
        title,
        author,
        splCatalogUrl: href,
        coverUrl: image?.currentSrc || image?.src || "",
        publicationYear: (visibleText.match(/\b(19|20)\d{2}\b/) ?? [])[0]
          ? Number((visibleText.match(/\b(19|20)\d{2}\b/) ?? [])[0])
          : null,
        format: /large print/i.test(visibleText)
          ? "Large Print"
          : /audiobook/i.test(visibleText)
            ? "Audiobook"
            : /graphic novel/i.test(visibleText)
              ? "Graphic Novel"
              : /picture book/i.test(visibleText)
                ? "Picture Book"
                : "",
        language: /spanish|español/i.test(visibleText)
          ? "Spanish"
          : /chinese/i.test(visibleText)
            ? "Chinese"
            : /vietnamese/i.test(visibleText)
              ? "Vietnamese"
              : /russian/i.test(visibleText)
                ? "Russian"
                : "",
        visibleText,
      });
    }

    return results;
  });

  return rows.map((row) => makeBook(row, seed)).filter(Boolean);
}

async function main() {
  const startTime = Date.now();
  const deadline = startTime + MAX_TOTAL_RUNTIME_MINUTES * 60 * 1000;
  const headless = /^(1|true|yes)$/i.test(process.env.SACREADS_BROWSER_HEADLESS ?? "false");
  const existingBooks = await readExistingBooks();
  const bookByKey = new Map();
  const books = [];
  const skippedSeeds = [];
  const blockedSeeds = [];
  let newBooksAdded = 0;
  let duplicatesSkipped = 0;
  let partialSaveCount = 0;

  await createBackup();
  console.log(`Loaded ${existingBooks.length} existing books. Backup written to ${BACKUP_PATH}`);

  for (const existing of existingBooks) {
    const normalized = normalizeExistingBook(existing);
    const key = normalizeKey(normalized.title, normalized.author);

    if (!normalized.title || !normalized.author || !key) {
      continue;
    }

    if (bookByKey.has(key)) {
      mergeMissingFields(bookByKey.get(key), normalized);
      duplicatesSkipped += 1;
      continue;
    }

    bookByKey.set(key, normalized);
    books.push(normalized);
  }

  latestBooksSnapshot = books;

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new Error("Playwright is not installed. Run `npm install --save-dev playwright` before this manual scraper.");
  }

  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();
  page.setDefaultTimeout(NAVIGATION_TIMEOUT_MS);
  page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);

  try {
    for (const seed of seedQueries) {
      if (Date.now() > deadline || books.length >= MAX_BOOKS) {
        break;
      }

      let resultsForSeed = 0;
      console.log(`Seed: ${seed}`);

      for (let pageNumber = 1; pageNumber <= MAX_PAGES_PER_SEED; pageNumber += 1) {
        if (Date.now() > deadline || books.length >= MAX_BOOKS || resultsForSeed >= MAX_RESULTS_PER_SEED) {
          break;
        }

        const url = buildSearchUrl(seed, pageNumber);
        console.log(`Fetching seed page ${pageNumber}/${MAX_PAGES_PER_SEED}: ${url}`);

        try {
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAVIGATION_TIMEOUT_MS });
          await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});

          const bodyText = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");

          if (isBlockedText(bodyText)) {
            const skipped = { seed, page: pageNumber, url, reason: "blocked, captcha, login, or access denied page" };
            blockedSeeds.push(skipped);
            skippedSeeds.push(skipped);
            console.warn(`Skipped blocked page for seed "${seed}" page ${pageNumber}`);
            break;
          }

          const scrapedBooks = (await extractVisibleResults(page, seed)).slice(0, MAX_RESULTS_PER_SEED - resultsForSeed);
          resultsForSeed += scrapedBooks.length;

          if (scrapedBooks.length === 0) {
            skippedSeeds.push({ seed, page: pageNumber, url, reason: "no visible book results parsed" });
          }

          for (const book of scrapedBooks) {
            const key = normalizeKey(book.title, book.author);

            if (!key) {
              continue;
            }

            const existing = bookByKey.get(key);

            if (existing) {
              mergeMissingFields(existing, book);
              duplicatesSkipped += 1;
              continue;
            }

            bookByKey.set(key, book);
            books.push(book);
            newBooksAdded += 1;

            if (newBooksAdded > 0 && newBooksAdded % PARTIAL_SAVE_EVERY === 0) {
              partialSaveCount += 1;
              await saveBooks(books, `Partial save ${partialSaveCount}`);
            }

            if (books.length >= MAX_BOOKS) {
              break;
            }
          }
        } catch (error) {
          skippedSeeds.push({
            seed,
            page: pageNumber,
            url,
            reason: error instanceof Error ? error.message : String(error),
          });
          console.warn(`Skipped seed "${seed}" page ${pageNumber}: ${error instanceof Error ? error.message : error}`);
        }

        await sleep(randomDelay(DELAY_BETWEEN_PAGES_MIN_MS, DELAY_BETWEEN_PAGES_MAX_MS));
      }

      console.log(
        `Progress: total books=${books.length}, new books added=${newBooksAdded}, duplicates skipped=${duplicatesSkipped}, seed results=${resultsForSeed}`,
      );
      await sleep(randomDelay(DELAY_BETWEEN_SEEDS_MIN_MS, DELAY_BETWEEN_SEEDS_MAX_MS));
    }
  } finally {
    await browser.close();
  }

  const report = {
    generatedAt: new Date().toISOString(),
    sourceType: "spl-catalog-browser",
    totalBooks: books.length,
    newBooksAdded,
    duplicatesSkipped,
    blockedSeeds,
    skippedSeeds,
    limits: {
      MAX_BOOKS,
      MAX_SEEDS,
      MAX_PAGES_PER_SEED,
      MAX_RESULTS_PER_SEED,
      MAX_TOTAL_RUNTIME_MINUTES,
    },
  };

  await saveBooks(books, "Final save");
  await saveReport(report, "Final report");
  console.log(`Done. Added ${newBooksAdded} books with Playwright. Total dataset size: ${books.length}`);
}

main().catch(async (error) => {
  console.error(error);

  if (latestBooksSnapshot.length > 0) {
    await saveBooks(latestBooksSnapshot, "Crash recovery save").catch((saveError) => console.error(saveError));
  }

  if (Object.keys(latestReportSnapshot).length > 0) {
    await saveReport(latestReportSnapshot, "Crash recovery report").catch((saveError) => console.error(saveError));
  }

  process.exitCode = 1;
});
