import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const START_URL = "https://www.saclibrary.org/browse-borrow/reading-recommendations";
const KNOWN_READING_URLS = [
  START_URL,
  "https://www.saclibrary.org/browse-borrow/reading-recommendations/now-try",
  "https://www.saclibrary.org/browse-borrow/reading-recommendations/personalized-reading-recommendations",
  "https://www.saclibrary.org/browse-borrow/reading-recommendations/personal-shopper",
];
const OUTPUT_PATH = resolve("src/data/books.json");
const BACKUP_PATH = resolve("src/data/books.backup.json");
const MAX_BOOKS = 1500;
const MAX_PAGES = 120;
const MAX_RESULTS_PER_SEED = 30;
const MAX_PAGES_PER_SEED = 2;
const REQUEST_DELAY_MIN_MS = 900;
const REQUEST_DELAY_MAX_MS = 1500;
const MAX_CONCURRENT_REQUESTS = 1;
const PARTIAL_SAVE_EVERY = 50;
const TIMEOUT_MS = 12000;

const DEFAULT_SOURCE_NAME = "Sacramento Public Library reading list";

const genreRules = [
  ["Children's / Picture Books", /picture book|storytime|read aloud|early reader|children|kids|juvenile/i],
  ["Young Adult", /young adult|\bYA\b|teen|teens/i],
  ["Graphic Novel", /graphic novel|comics?|manga/i],
  ["Cookbook", /cookbook|cooking|recipes|food|baking|kitchen/i],
  ["Memoir", /memoir|personal essays?|true story/i],
  ["Biography", /biograph|autobiograph|life of|profile/i],
  ["Poetry", /poetry|poems?|verse/i],
  ["Historical Fiction", /historical fiction|historical novel|regency|victorian|world war|civil war/i],
  ["Science Fiction", /science fiction|sci-fi|speculative|space|time travel|robot|artificial intelligence|\bai\b/i],
  ["Fantasy", /fantasy|magic|dragon|witch|fae|fairy|sorcer|myth/i],
  ["Horror", /horror|haunted|ghost|gothic|scary|supernatural/i],
  ["Thriller", /thriller|suspense|psychological suspense|spy|espionage/i],
  ["Mystery", /mystery|crime|detective|sleuth|murder|killer|whodunit/i],
  ["Romance", /romance|romantic|love story|wedding|dating/i],
  ["Nonfiction", /nonfiction|non-fiction|history|science|business|health|travel|essays|self-help/i],
  ["Literary Fiction", /literary fiction|book club|great reads|contemporary fiction|novels?/i],
];

const audienceRules = [
  ["Young Adult", /young adult|\bYA\b|teen|teens/i],
  ["Juvenile", /juvenile|children|kids|middle grade|picture book|storytime|early reader/i],
  ["Adult", /adult|great reads|staff picks|fiction|nonfiction|mystery|romance|thriller/i],
];

const genreAliases = new Map([
  ["children's / picture books", "Children's / Picture Books"],
  ["children’s / picture books", "Children's / Picture Books"],
  ["picture book", "Children's / Picture Books"],
  ["juvenile", "Children's / Picture Books"],
  ["historical fiction", "Historical Fiction"],
  ["science fiction", "Science Fiction"],
  ["sci-fi", "Science Fiction"],
  ["literary fiction", "Literary Fiction"],
  ["graphic novel", "Graphic Novel"],
  ["young adult", "Young Adult"],
]);

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
  "Spanish biography",
  "libros en español",
  "novelas en español",
  "cuentos infantiles español",
  "Chinese fiction",
  "Chinese children books",
  "Chinese picture books",
  "Chinese biography",
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
  "large print fiction",
  "audiobook mystery",
  "audiobook romance",
  "graphic novels",
  "picture books",
];

let latestBooksSnapshot = [];

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function requestDelayMs() {
  return REQUEST_DELAY_MIN_MS + Math.floor(Math.random() * (REQUEST_DELAY_MAX_MS - REQUEST_DELAY_MIN_MS + 1));
}

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&rdquo;|&ldquo;/g, '"')
    .replace(/&mdash;|&ndash;/g, "-")
    .replace(/&bull;/g, " ")
    .replace(/&hellip;/g, "...")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value = "") {
  return decodeHtml(String(value).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]*>/g, " "));
}

function trimText(value = "", maxLength = 520) {
  const clean = stripTags(value);

  if (clean.length <= maxLength) {
    return clean;
  }

  return `${clean.slice(0, maxLength - 3).trim()}...`;
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

function absoluteUrl(url, baseUrl) {
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(decodeHtml(String(url)), baseUrl);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function getHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isSplHost(hostname) {
  return /(^|\.)saclibrary\.org$/i.test(hostname);
}

function isCatalogHost(hostname) {
  return hostname === "catalog.saclibrary.org";
}

function isBlockedUrl(url) {
  try {
    const parsed = new URL(url);
    const text = `${parsed.pathname} ${parsed.search}`.toLowerCase();

    if (/goodreads|google|amazon|barnes|bookshop|facebook|instagram|youtube|twitter|x\.com/.test(parsed.hostname)) {
      return true;
    }

    if (isCatalogHost(parsed.hostname) && /^\/MyAccount\/MyList\/\d+\/?$/i.test(parsed.pathname)) {
      return false;
    }

    return /login|logout|account|holds?|checkedout|fines?|events?|hours|locations?|branches?|room|calendar|donate|volunteer|meeting/.test(
      text,
    );
  } catch {
    return true;
  }
}

function isSplReadingRecommendationUrl(url) {
  try {
    const parsed = new URL(url);
    return (
      isSplHost(parsed.hostname) &&
      parsed.pathname.startsWith("/browse-borrow/reading-recommendations") &&
      !isBlockedUrl(url)
    );
  } catch {
    return false;
  }
}

function isCatalogListOrSearchUrl(url) {
  try {
    const parsed = new URL(url);

    if (!isCatalogHost(parsed.hostname) || isBlockedUrl(url)) {
      return false;
    }

    return /^\/(?:Search(?:\/Results|\/Home|\/Advanced|\/)?|MyResearch\/(?:List|MyList)|PublicLists?|Browse)/i.test(
      parsed.pathname,
    ) || /^\/MyAccount\/MyList\/\d+\/?$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function isAllowedPageUrl(url) {
  return isSplReadingRecommendationUrl(url) || isCatalogListOrSearchUrl(url);
}

function isCatalogUrl(url) {
  try {
    const parsed = new URL(url);
    return isCatalogHost(parsed.hostname) && !isBlockedUrl(url);
  } catch {
    return false;
  }
}

function buildCatalogSearchUrl(title, author = "") {
  const lookfor = [title, author].filter(Boolean).join(" ");
  const params = new URLSearchParams({
    lookfor,
    searchIndex: "Keyword",
    searchSource: "local",
  });

  return `https://catalog.saclibrary.org/Search/Results?${params.toString()}`;
}

function buildSeedSearchUrl(seed, page = 1) {
  const params = new URLSearchParams({
    lookfor: seed.query,
    searchIndex: "Keyword",
    searchSource: "local",
    sort: "relevance",
  });

  if (page > 1) {
    params.set("page", String(page));
  }

  return `https://catalog.saclibrary.org/Search/Results?${params.toString()}`;
}

function pickGenre(book) {
  const haystack = [book.sourceListName, book.title, book.description].filter(Boolean).join(" ");
  const match = genreRules.find(([, pattern]) => pattern.test(haystack));
  return match?.[0] ?? "Uncategorized";
}

function normalizeGenre(value) {
  const clean = stripTags(value ?? "");
  return genreAliases.get(clean.toLowerCase()) ?? clean;
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

function inferGenreFromText(value = "") {
  const text = stripTags(value).toLowerCase();

  if (/picture books?|cuentos infantiles|children books?/.test(text)) return "Children's / Picture Books";
  if (/young adult|\bya\b|teen/.test(text)) return "Young Adult";
  if (/middle grade/.test(text)) return "Children's / Picture Books";
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
  if (/graphic novels?/.test(text)) return "Graphic Novel";
  if (/poetry/.test(text)) return "Poetry";
  if (/literary fiction/.test(text)) return "Literary Fiction";

  return "";
}

function inferLanguageFromText(value = "") {
  const text = stripTags(value).toLowerCase();

  if (/spanish|español|libros en español|novelas en español|cuentos infantiles español/.test(text)) {
    return "Spanish";
  }

  if (/chinese|books in chinese/.test(text)) {
    return "Chinese";
  }

  if (/vietnamese|books in vietnamese/.test(text)) {
    return "Vietnamese";
  }

  if (/russian|books in russian/.test(text)) {
    return "Russian";
  }

  return "";
}

function inferAudienceFromText(value = "") {
  const text = stripTags(value).toLowerCase();

  if (/children|juvenile|picture books?|cuentos infantiles|middle grade/.test(text)) {
    return "Juvenile";
  }

  if (/teen|young adult|\bya\b/.test(text)) {
    return "Young Adult";
  }

  if (/adult/.test(text)) {
    return "Adult";
  }

  return "";
}

function inferFormatFromText(value = "") {
  const text = stripTags(value).toLowerCase();

  if (/large print/.test(text)) return "Large Print";
  if (/audiobook/.test(text)) return "Audiobook";
  if (/graphic novels?/.test(text)) return "Graphic Novel";
  if (/picture books?/.test(text)) return "Picture Book";

  return "";
}

function makeSeed(query) {
  return {
    key: slugify(query),
    query,
    genre: normalizeGenre(inferGenreFromText(query)),
    language: inferLanguageFromText(query),
    audience: inferAudienceFromText(query),
    format: inferFormatFromText(query),
  };
}

function pickAudience(book) {
  const haystack = [book.sourceListName, book.title, book.description].filter(Boolean).join(" ");
  const match = audienceRules.find(([, pattern]) => pattern.test(haystack));
  return match?.[0] ?? "Adult";
}

function getFormat(item) {
  const formats = Array.isArray(item.format) ? item.format : [item.format].filter(Boolean);
  const joined = formats.join(" ");

  if (/graphic|comic|manga/i.test(joined)) {
    return "Graphic Novel";
  }

  if (/picture/i.test(joined)) {
    return "Picture Book";
  }

  if (/large print/i.test(joined)) {
    return "Large Print";
  }

  if (/book/i.test(joined)) {
    return "Book";
  }

  return stripTags(formats[0] ?? "") || "Book";
}

function getCoverUrl(item) {
  const image = item.small_image ?? item.image ?? item.coverUrl ?? item.thumbnail;

  if (!image) {
    return "";
  }

  return absoluteUrl(image, "https://catalog.saclibrary.org");
}

function getYear(item) {
  const year = String(item.publishDate ?? item.publicationDate ?? item.year ?? item.date ?? "").match(/\b(19|20)\d{2}\b/);
  return year ? Number(year[0]) : null;
}

function getLanguage(item) {
  const value = Array.isArray(item.language) ? item.language[0] : item.language;
  return stripTags(value ?? "") || "English";
}

function findNextData(html) {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);

  if (!match) {
    return undefined;
  }

  try {
    return JSON.parse(decodeHtml(match[1]));
  } catch {
    return undefined;
  }
}

function getPageTitle(html) {
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);

  if (h1) {
    return stripTags(h1[1]) || DEFAULT_SOURCE_NAME;
  }

  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return stripTags(title?.[1] ?? "").replace(/\s*\|\s*Sacramento Public Library\s*$/i, "") || DEFAULT_SOURCE_NAME;
}

function walk(value, visitor) {
  if (!value || typeof value !== "object") {
    return;
  }

  visitor(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      walk(item, visitor);
    }
    return;
  }

  for (const item of Object.values(value)) {
    walk(item, visitor);
  }
}

function getHref(attributes) {
  return (
    attributes.match(/\bhref\s*=\s*"([^"]+)"/i)?.[1] ??
    attributes.match(/\bhref\s*=\s*'([^']+)'/i)?.[1] ??
    attributes.match(/\bhref\s*=\s*([^\s>]+)/i)?.[1] ??
    ""
  );
}

function getImageSource(attributes) {
  return (
    attributes.match(/\b(?:data-src|src)\s*=\s*"([^"]+)"/i)?.[1] ??
    attributes.match(/\b(?:data-src|src)\s*=\s*'([^']+)'/i)?.[1] ??
    ""
  );
}

function extractLinksFromHtml(html, pageUrl) {
  const links = [];
  const pattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = pattern.exec(html))) {
    const href = getHref(match[1]);
    const url = absoluteUrl(href, pageUrl);
    const label = stripTags(match[2]);

    if (url && isAllowedPageUrl(url)) {
      links.push({ url, label });
    }
  }

  return links;
}

function addFollowLink(links, url, label, pageUrl) {
  const linkUrl = absoluteUrl(url, pageUrl);

  if (linkUrl && isAllowedPageUrl(linkUrl)) {
    links.push({ url: linkUrl, label: stripTags(label ?? "") });
  }
}

function makeBook(seed) {
  const title = stripTags(seed.title ?? "");
  const author = stripTags(seed.author ?? "");

  if (!title || !author) {
    return undefined;
  }

  const seedLabel = stripTags(seed.sourceSeed ?? seed.seed?.query ?? "");
  const inferredGenre = normalizeGenre(seed.genre || inferGenreFromText(seedLabel));
  const inferredLanguage = stripTags(seed.language ?? "") || inferLanguageFromText(seedLabel);
  const inferredAudience = stripTags(seed.audience ?? "") || inferAudienceFromText(seedLabel);
  const inferredFormat = stripTags(seed.format ?? "") || inferFormatFromText(seedLabel);
  const genres = uniqueTextList([...(Array.isArray(seed.genres) ? seed.genres : []), inferredGenre])
    .map((genre) => normalizeGenre(genre))
    .filter(Boolean);
  const sourceSeeds = uniqueTextList([...(Array.isArray(seed.sourceSeeds) ? seed.sourceSeeds : []), seedLabel]);
  const splCatalogUrl = isCatalogUrl(seed.splCatalogUrl ?? "")
    ? seed.splCatalogUrl
    : buildCatalogSearchUrl(title, author);

  const book = {
    id: hasText(seed.id) ? stripTags(seed.id) : slugify(`${title}-${author}`),
    title,
    author,
    genre: inferredGenre,
    genres,
    audience: inferredAudience,
    format: inferredFormat || "Book",
    language: inferredLanguage || "English",
    publicationYear: hasNumber(seed.publicationYear) ? seed.publicationYear : null,
    description: trimText(seed.description ?? ""),
    coverUrl: absoluteUrl(seed.coverUrl ?? "", seed.sourcePageUrl ?? START_URL),
    goodreadsRating: hasNumber(seed.goodreadsRating) ? seed.goodreadsRating : null,
    goodreadsReviewCount: hasNumber(seed.goodreadsReviewCount) ? seed.goodreadsReviewCount : null,
    goodreadsUrl: stripTags(seed.goodreadsUrl ?? ""),
    splCatalogUrl,
    sourceListName: stripTags(seed.sourceListName ?? "") || DEFAULT_SOURCE_NAME,
    sourcePageUrl: absoluteUrl(seed.sourcePageUrl ?? "", START_URL) || START_URL,
    sourceSeeds,
  };

  book.genre = normalizeGenre(book.genre || pickGenre(book));
  if (book.genre && book.genre !== "Uncategorized" && !book.genres.some((genre) => genre.toLowerCase() === book.genre.toLowerCase())) {
    book.genres.push(book.genre);
  }
  book.audience = book.audience || pickAudience(book);

  return book;
}

function extractBooksFromNextData(nextData, pageUrl, seedMeta) {
  const books = [];
  const links = [];

  function addBook(item, sourceListName) {
    const title = stripTags(item.title ?? item.name ?? "");
    const author = stripTags(item.author ?? item.creator ?? "");

    if (!title || !author) {
      return;
    }

    const rawCatalogUrl = item.titleURL ?? item.url ?? item.recordUrl ?? "";
    const catalogUrl = absoluteUrl(rawCatalogUrl, pageUrl);

    const seed = makeBook({
      title,
      author,
      genre: "",
      audience: "",
      format: getFormat(item),
      language: getLanguage(item),
      publicationYear: getYear(item),
      description: item.description ?? item.summary ?? "",
      coverUrl: getCoverUrl(item),
      goodreadsRating: null,
      goodreadsReviewCount: null,
      goodreadsUrl: "",
      splCatalogUrl: isCatalogUrl(catalogUrl) ? catalogUrl : buildCatalogSearchUrl(title, author),
      sourceListName: seedMeta ? `SPL catalog seed: ${seedMeta.query}` : sourceListName,
      sourcePageUrl: pageUrl,
      sourceSeed: seedMeta?.query ?? "",
      seed: seedMeta,
    });

    if (seed) {
      books.push(seed);
    }
  }

  walk(nextData, (node) => {
    if (node.link?.url) {
      addFollowLink(links, node.link.url, node.title ?? node.link.title, pageUrl);
    }

    for (const field of ["url", "href", "readMoreUrl", "linkUrl"]) {
      if (typeof node[field] === "string") {
        addFollowLink(links, node[field], node.title ?? node.label ?? node.name, pageUrl);
      }
    }

    if (Array.isArray(node.bookRiver)) {
      for (const river of node.bookRiver) {
        const titles = river.bookRiverData?.titles;

        if (Array.isArray(titles)) {
          const sourceListName = node.title ?? river.bookRiverData?.listTitle ?? DEFAULT_SOURCE_NAME;
          for (const item of titles) {
            addBook(item, sourceListName);
          }
        }
      }
    }

    if (Array.isArray(node.bookRiverData?.titles)) {
      const sourceListName = node.bookRiverData?.listTitle ?? node.title ?? DEFAULT_SOURCE_NAME;
      for (const item of node.bookRiverData.titles) {
        addBook(item, sourceListName);
      }
    }

    const items = node.data?.items;
    if (Array.isArray(items)) {
      const sourceListName = node.data?.listTitle ?? node.title ?? node.link?.title ?? DEFAULT_SOURCE_NAME;
      for (const item of items) {
        addBook(item, sourceListName);
      }
    }
  });

  return { books, links };
}

function extractJsonLdBooks(html, pageUrl, sourceListName, seedMeta) {
  const books = [];
  const scriptPattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptPattern.exec(html))) {
    try {
      const parsed = JSON.parse(decodeHtml(match[1]));
      walk(parsed, (node) => {
        const nodeType = Array.isArray(node["@type"]) ? node["@type"].join(" ") : node["@type"];

        if (!/book/i.test(String(nodeType ?? ""))) {
          return;
        }

        const author = Array.isArray(node.author) ? node.author[0] : node.author;
        const authorName = typeof author === "object" && author !== null ? author.name : author;
        const book = makeBook({
          title: node.name ?? node.title,
          author: authorName,
          genre: "",
          audience: "",
          format: "Book",
          language: node.inLanguage ?? "English",
          publicationYear: getYear(node),
          description: node.description ?? "",
          coverUrl: node.image ?? "",
          splCatalogUrl: absoluteUrl(node.url ?? "", pageUrl),
          sourceListName,
          sourcePageUrl: pageUrl,
          sourceSeed: seedMeta?.query ?? "",
          seed: seedMeta,
        });

        if (book) {
          books.push(book);
        }
      });
    } catch {
      continue;
    }
  }

  return books;
}

function extractCatalogBooksFromHtml(html, pageUrl, seedMeta) {
  const sourceListName = seedMeta ? `SPL catalog seed: ${seedMeta.query}` : getPageTitle(html);
  const books = extractJsonLdBooks(html, pageUrl, sourceListName, seedMeta);
  const chunks =
    html.match(
      /<(?:div|li|article)\b[^>]*class=["'][^"']*(?:result|record|resultItem|browse-result)[^"']*["'][^>]*>[\s\S]*?(?=<(?:div|li|article)\b[^>]*class=["'][^"']*(?:result|record|resultItem|browse-result)[^"']*["']|<\/main>|<\/ol>|<\/ul>|$)/gi,
    ) ?? [];

  for (const chunk of chunks) {
    let title = "";
    let author = "";
    let splCatalogUrl = "";
    const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
    let anchorMatch;

    while ((anchorMatch = anchorPattern.exec(chunk))) {
      const href = getHref(anchorMatch[1]);
      const url = absoluteUrl(href, pageUrl);
      const label = stripTags(anchorMatch[2]);

      if (!label || /place hold|availability|request|details|more|add to/i.test(label)) {
        continue;
      }

      if (isCatalogUrl(url) && (/\/Record\//i.test(url) || /\/Search\/Results/i.test(url))) {
        title = title || label;
        splCatalogUrl = splCatalogUrl || url;
      }
    }

    const authorMatch =
      chunk.match(/(?:by|author)\s*:?\s*(?:<\/?[^>]+>|\s)*<a\b[^>]*>([\s\S]*?)<\/a>/i) ??
      chunk.match(/class=["'][^"']*author[^"']*["'][^>]*>([\s\S]*?)<\/(?:a|span|div|p)>/i);
    author = stripTags(authorMatch?.[1] ?? "");

    if (!title || !author) {
      continue;
    }

    const imageAttributes = chunk.match(/<img\b([^>]*)>/i)?.[1] ?? "";
    const coverUrl = absoluteUrl(getImageSource(imageAttributes), pageUrl);
    const book = makeBook({
      title,
      author,
      genre: "",
      audience: "",
      format: /large print/i.test(chunk) ? "Large Print" : /graphic|manga|comic/i.test(chunk) ? "Graphic Novel" : "Book",
      language: /spanish/i.test(chunk) ? "Spanish" : "English",
      publicationYear: getYear({ year: chunk }),
      description: "",
      coverUrl,
      splCatalogUrl,
      sourceListName,
      sourcePageUrl: pageUrl,
      sourceSeed: seedMeta?.query ?? "",
      seed: seedMeta,
    });

    if (book) {
      books.push(book);
    }
  }

  return books;
}

async function fetchPage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "SacReads one-time dataset builder (+https://www.saclibrary.org/)",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
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

async function saveBooks(books, reason = "save") {
  latestBooksSnapshot = books;
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(books, null, 2)}\n`);
  console.log(`${reason}: wrote ${books.length} unique books to ${OUTPUT_PATH}`);
}

function mergeMissingFields(existing, scraped) {
  existing.genres = uniqueTextList([...(Array.isArray(existing.genres) ? existing.genres : []), ...(Array.isArray(scraped.genres) ? scraped.genres : [])])
    .map((genre) => normalizeGenre(genre))
    .filter(Boolean);
  existing.sourceSeeds = uniqueTextList([
    ...(Array.isArray(existing.sourceSeeds) ? existing.sourceSeeds : []),
    ...(Array.isArray(scraped.sourceSeeds) ? scraped.sourceSeeds : []),
  ]);

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
    "sourceListName",
    "sourcePageUrl",
    "sourceSeeds",
  ];

  for (const field of fields) {
    if (!hasFieldValue(existing, field) && hasFieldValue(scraped, field)) {
      existing[field] = scraped[field];
    }
  }

  return existing;
}

function normalizeExistingBook(record) {
  return makeBook({
    id: record.id,
    title: record.title,
    author: record.author,
    genre: record.genre,
    genres: record.genres,
    audience: record.audience,
    format: record.format,
    language: record.language,
    publicationYear: record.publicationYear,
    description: record.description,
    coverUrl: record.coverUrl,
    goodreadsRating: record.goodreadsRating,
    goodreadsReviewCount: record.goodreadsReviewCount,
    goodreadsUrl: record.goodreadsUrl,
    splCatalogUrl: record.splCatalogUrl,
    sourceListName: record.sourceListName,
    sourcePageUrl: record.sourcePageUrl,
    sourceSeeds: record.sourceSeeds ?? (record.sourceSeed ? [record.sourceSeed] : []),
  });
}

function printProgress(stats) {
  console.log(
    [
      `Progress: pages visited=${stats.pagesVisited}`,
      `queue length=${stats.queueLength}`,
      `books collected=${stats.booksCollected}`,
      `unique books saved=${stats.uniqueBooksSaved}`,
      `duplicates skipped=${stats.duplicatesSkipped}`,
      `pages skipped=${stats.pagesSkipped}`,
      `partial save count=${stats.partialSaveCount}`,
    ].join(", "),
  );
}

async function main() {
  if (MAX_CONCURRENT_REQUESTS !== 1) {
    throw new Error("This scraper is intentionally sequential. Keep MAX_CONCURRENT_REQUESTS at 1.");
  }

  const existingBooks = await readExistingBooks();
  await createBackup();
  console.log(`Loaded ${existingBooks.length} existing books. Backup written to ${BACKUP_PATH}`);

  const seeds = seedQueries.map(makeSeed);
  const seedByUrl = new Map();
  const seedResultCounts = new Map();
  const queue = [];
  const queued = new Set();

  function enqueue(url, seedMeta) {
    if (!url || queued.has(url)) {
      return;
    }

    if (!isAllowedPageUrl(url)) {
      return;
    }

    queue.push(url);
    queued.add(url);

    if (seedMeta) {
      seedByUrl.set(url, seedMeta);
    }
  }

  for (const url of KNOWN_READING_URLS) {
    enqueue(url);
  }

  for (const seed of seeds) {
    for (let page = 1; page <= MAX_PAGES_PER_SEED; page += 1) {
      enqueue(buildSeedSearchUrl(seed, page), seed);
    }
  }

  const visited = new Set();
  const bookByKey = new Map();
  const books = [];
  let booksCollected = 0;
  let duplicatesSkipped = 0;
  let pagesSkipped = 0;
  let partialSaveCount = 0;
  let newBooksSinceSave = 0;

  for (const existing of existingBooks) {
    const normalized = normalizeExistingBook(existing);

    if (!normalized) {
      continue;
    }

    const key = normalizeKey(normalized.title, normalized.author);

    if (bookByKey.has(key)) {
      mergeMissingFields(bookByKey.get(key), normalized);
      duplicatesSkipped += 1;
      continue;
    }

    bookByKey.set(key, normalized);
    books.push(normalized);
  }

  latestBooksSnapshot = books;

  while (queue.length > 0 && visited.size < MAX_PAGES && books.length < MAX_BOOKS) {
    const pageUrl = queue.shift();
    queued.delete(pageUrl);
    const seedMeta = seedByUrl.get(pageUrl);

    if (!pageUrl || visited.has(pageUrl) || !isAllowedPageUrl(pageUrl)) {
      pagesSkipped += 1;
      continue;
    }

    visited.add(pageUrl);
    console.log(`Fetching page ${visited.size}/${MAX_PAGES}: ${pageUrl}`);

    try {
      const html = await fetchPage(pageUrl);
      const nextData = findNextData(html);
      const extracted = nextData
        ? extractBooksFromNextData(nextData, pageUrl, seedMeta)
        : { books: extractCatalogBooksFromHtml(html, pageUrl, seedMeta), links: [] };
      const fallbackCatalogBooks = isCatalogHost(getHostname(pageUrl))
        ? extractCatalogBooksFromHtml(html, pageUrl, seedMeta)
        : [];
      const pageBooks = [...extracted.books, ...fallbackCatalogBooks];
      const pageLinks = isSplReadingRecommendationUrl(pageUrl)
        ? [...extracted.links, ...extractLinksFromHtml(html, pageUrl)]
        : [];

      for (const book of pageBooks) {
        booksCollected += 1;

        if (seedMeta) {
          const seedCount = seedResultCounts.get(seedMeta.key) ?? 0;

          if (seedCount >= MAX_RESULTS_PER_SEED) {
            continue;
          }

          seedResultCounts.set(seedMeta.key, seedCount + 1);
        }

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

        if (books.length >= MAX_BOOKS) {
          break;
        }

        bookByKey.set(key, book);
        books.push(book);
        newBooksSinceSave += 1;

        if (newBooksSinceSave >= PARTIAL_SAVE_EVERY) {
          partialSaveCount += 1;
          newBooksSinceSave = 0;
          await saveBooks(books, `Partial save ${partialSaveCount}`);
        }
      }

      for (const link of pageLinks) {
        if (visited.size + queue.length >= MAX_PAGES) {
          break;
        }

        if (!visited.has(link.url) && !queued.has(link.url) && isAllowedPageUrl(link.url)) {
          queue.push(link.url);
          queued.add(link.url);
        }
      }
    } catch (error) {
      console.warn(`Failed page: ${pageUrl}`);
      console.warn(error instanceof Error ? error.message : error);
    } finally {
      printProgress({
        pagesVisited: visited.size,
        queueLength: queue.length,
        booksCollected,
        uniqueBooksSaved: books.length,
        duplicatesSkipped,
        pagesSkipped,
        partialSaveCount,
      });
      await sleep(requestDelayMs());
    }
  }

  await saveBooks(books, "Final save");

  if (visited.size >= MAX_PAGES) {
    console.log(`Stopped cleanly after reaching MAX_PAGES=${MAX_PAGES}.`);
  }

  if (books.length >= MAX_BOOKS) {
    console.log(`Stopped cleanly after reaching MAX_BOOKS=${MAX_BOOKS}.`);
  }

  console.log(`Done. Saved ${books.length} unique books to ${OUTPUT_PATH}`);
}

main().catch(async (error) => {
  console.error(error);

  if (latestBooksSnapshot.length > 0) {
    try {
      await saveBooks(latestBooksSnapshot, "Crash recovery save");
    } catch (saveError) {
      console.error(saveError);
    }
  }

  process.exitCode = 1;
});
