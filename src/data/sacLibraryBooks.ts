import {
  buildGoodreadsSearchUrl,
  buildGoogleBooksSearchUrl,
  buildSplCatalogSearchUrl,
} from "@/lib/catalogUrls";
import type { BookRecommendation, BookReviewSignal } from "@/types/book";

type CuratedBookSeed = Omit<
  BookRecommendation,
  "catalogUrl" | "requestUrl" | "source" | "reviewSignals"
> & {
  goodreadsRating?: string;
  goodreadsNote?: string;
  googleRating?: string;
  googleNote?: string;
};

function defaultGoodreadsNote(book: CuratedBookSeed) {
  return `Open Goodreads to scan community reviews and shelves for ${book.title}.`;
}

function defaultGoogleNote() {
  return `Open Google Books for preview details and reader ratings when Google has them.`;
}

function buildReviewSignals(book: CuratedBookSeed): BookReviewSignal[] {
  return [
    {
      source: "Goodreads",
      rating: book.goodreadsRating ?? "Reader reviews",
      note: book.goodreadsNote ?? defaultGoodreadsNote(book),
      url: buildGoodreadsSearchUrl(book),
    },
    {
      source: "Google Books",
      rating: book.googleRating ?? "Google reviews",
      note: book.googleNote ?? defaultGoogleNote(),
      url: buildGoogleBooksSearchUrl(book),
    },
  ];
}

function makeCatalogBook(book: CuratedBookSeed): BookRecommendation {
  const recommendation = { ...book };
  delete recommendation.goodreadsRating;
  delete recommendation.goodreadsNote;
  delete recommendation.googleRating;
  delete recommendation.googleNote;

  const catalogUrl = buildSplCatalogSearchUrl({
    query: recommendation.title,
    format: recommendation.metadata.format,
  });

  return {
    ...recommendation,
    catalogUrl,
    requestUrl: catalogUrl,
    source: "curated-catalog",
    availabilityNote:
      recommendation.availabilityNote ??
      "Holdable physical-book search in the Sacramento Public Library catalog",
    reviewSignals: buildReviewSignals(book),
  };
}

export const sacLibraryBooks: BookRecommendation[] = [
  makeCatalogBook({
    id: "curated-the-personal-librarian",
    title: "The Personal Librarian",
    author: "Marie Benedict and Victoria Christopher Murray",
    isbn: "9780593101537",
    rating: "3.8/5",
    googleUsers: "80%",
    description:
      "A historical novel about Belle da Costa Greene, the brilliant curator who shaped J. P. Morgan's library while protecting a dangerous secret about her identity.",
    whyThisFits:
      "A strong match for readers who want literary historical fiction, complex real-life figures, and a bookish setting.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780593101537-L.jpg",
    keywords: ["historical fiction", "library", "bookish", "identity", "adult", "reflective"],
    goodreadsRating: "3.8/5",
    goodreadsNote: "Goodreads readers often discuss the historical setting, Belle's ambition, and the identity questions.",
    googleRating: "80% liked it",
    googleNote: "Google reader signals point toward fans of biographical historical fiction.",
    cover: {
      from: "#2f5f56",
      to: "#d3a05f",
      spine: "#173f3a",
    },
    metadata: {
      format: "Book",
      audience: "Adult",
      language: "English",
      publicationYear: "2021",
    },
  }),
  makeCatalogBook({
    id: "curated-the-last-cuentista",
    title: "The Last Cuentista",
    author: "Donna Barba Higuera",
    isbn: "9781646140893",
    rating: "4.4/5",
    googleUsers: "93%",
    description:
      "A Newbery Medal-winning story about memory, storytelling, and survival as a young girl carries Earth's old tales into the future.",
    whyThisFits:
      "Great for readers looking for hopeful science fiction, folklore, family, and a fast-moving young adult adventure.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9781646140893-L.jpg",
    keywords: ["science fiction", "storytelling", "folklore", "hopeful", "young adult", "adventurous"],
    goodreadsRating: "4.4/5",
    goodreadsNote: "Goodreads readers tend to highlight the storytelling theme and emotional science-fiction stakes.",
    googleRating: "93% liked it",
    googleNote: "Google reader signals favor the family, memory, and adventure elements.",
    cover: {
      from: "#315c8c",
      to: "#b96f4a",
      spine: "#203f63",
    },
    metadata: {
      format: "Book",
      audience: "Young Adult",
      language: "English",
      publicationYear: "2021",
    },
  }),
  makeCatalogBook({
    id: "curated-julian-is-a-mermaid",
    title: "Julian Is a Mermaid",
    author: "Jessica Love",
    isbn: "9780763690458",
    rating: "4.5/5",
    googleUsers: "91%",
    description:
      "A vibrant picture book about imagination, self-expression, and the joy of being seen by someone who loves you.",
    whyThisFits:
      "A warm pick for families seeking inclusive picture books with expressive art, gentle pacing, and a celebratory mood.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780763690458-L.jpg",
    keywords: ["picture book", "family", "inclusive", "juvenile", "cozy", "art"],
    goodreadsRating: "4.5/5",
    goodreadsNote: "Goodreads readers often praise the artwork, affirmation, and gentle emotional arc.",
    googleRating: "91% liked it",
    googleNote: "Google reader signals point to strong family read-aloud appeal.",
    cover: {
      from: "#7bb6a6",
      to: "#e2bd65",
      spine: "#32665c",
    },
    metadata: {
      format: "Picture Book",
      audience: "Juvenile",
      language: "English",
      publicationYear: "2018",
    },
  }),
  makeCatalogBook({
    id: "curated-the-thursday-murder-club",
    title: "The Thursday Murder Club",
    author: "Richard Osman",
    isbn: "9781984880963",
    description:
      "Four retirement-village friends meet weekly to study unsolved crimes, then find themselves in the middle of a fresh murder case.",
    whyThisFits:
      "A friendly mystery with dry humor, an ensemble cast, and enough clues to keep the pages turning.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9781984880963-L.jpg",
    keywords: ["mystery", "cozy", "funny", "friendship", "adult", "fiction"],
    goodreadsNote: "Goodreads readers commonly mention the cozy ensemble, humor, and twisty light-mystery pacing.",
    googleNote: "Google Books can surface preview details and reader ratings for the mystery series.",
    cover: {
      from: "#214d45",
      to: "#d3a05f",
      spine: "#173f3a",
    },
    metadata: {
      format: "Book",
      audience: "Adult",
      language: "English",
      publicationYear: "2020",
    },
  }),
  makeCatalogBook({
    id: "curated-vera-wong",
    title: "Vera Wong's Unsolicited Advice for Murderers",
    author: "Jesse Q. Sutanto",
    isbn: "9780593549223",
    description:
      "A tea shop owner discovers a body and decides the police could use her help, whether they asked for it or not.",
    whyThisFits:
      "A playful choice for readers who want a funny mystery, found family, and a memorable amateur sleuth.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780593549223-L.jpg",
    keywords: ["mystery", "funny", "cozy", "found family", "adult", "fiction"],
    goodreadsNote: "Goodreads readers often call out Vera's voice, the humor, and the comforting found-family thread.",
    googleNote: "Google Books can help compare reader ratings and preview details before opening the SPL hold link.",
    cover: {
      from: "#8b4c35",
      to: "#e2bd65",
      spine: "#653020",
    },
    metadata: {
      format: "Book",
      audience: "Adult",
      language: "English",
      publicationYear: "2023",
    },
  }),
  makeCatalogBook({
    id: "curated-project-hail-mary",
    title: "Project Hail Mary",
    author: "Andy Weir",
    isbn: "9780593135204",
    description:
      "A lone astronaut wakes with missing memories and a mission that may determine the future of humanity.",
    whyThisFits:
      "A high-energy science fiction pick for readers who like problem-solving, momentum, and adventure.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780593135204-L.jpg",
    keywords: ["science fiction", "space", "adventure", "funny", "adult", "fiction"],
    goodreadsNote: "Goodreads readers frequently highlight the inventive problem-solving and propulsive pacing.",
    googleNote: "Google Books can surface preview and rating details for readers comparing science-fiction picks.",
    cover: {
      from: "#315c8c",
      to: "#cbd8bc",
      spine: "#203f63",
    },
    metadata: {
      format: "Book",
      audience: "Adult",
      language: "English",
      publicationYear: "2021",
    },
  }),
  makeCatalogBook({
    id: "curated-heaven-earth-grocery-store",
    title: "The Heaven & Earth Grocery Store",
    author: "James McBride",
    isbn: "9780593422946",
    description:
      "A layered neighborhood novel about a small Pennsylvania community, a discovered skeleton, and the secrets people carry.",
    whyThisFits:
      "A thoughtful match for readers who want historical fiction, community stories, and morally complex characters.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780593422946-L.jpg",
    keywords: ["historical fiction", "community", "reflective", "thought-provoking", "adult", "fiction"],
    goodreadsNote: "Goodreads readers often discuss the character web, social history, and slow-building emotional payoff.",
    googleNote: "Google Books can provide reader ratings and preview context for the novel.",
    cover: {
      from: "#4d5f8b",
      to: "#d3a05f",
      spine: "#2f3f63",
    },
    metadata: {
      format: "Book",
      audience: "Adult",
      language: "English",
      publicationYear: "2023",
    },
  }),
  makeCatalogBook({
    id: "curated-lessons-in-chemistry",
    title: "Lessons in Chemistry",
    author: "Bonnie Garmus",
    isbn: "9780385547345",
    description:
      "A sharp, warm novel about a brilliant chemist whose career is blocked by sexism and who finds an unexpected public platform.",
    whyThisFits:
      "A good fit for readers who want humor, resilience, historical texture, and an easy-to-root-for lead.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780385547345-L.jpg",
    keywords: ["historical fiction", "funny", "women", "science", "adult", "fiction"],
    goodreadsNote: "Goodreads readers tend to debate the tone while praising the heroine and quick readability.",
    googleNote: "Google Books can show preview details and reader-rating context for this popular title.",
    cover: {
      from: "#d3a05f",
      to: "#f0d9a0",
      spine: "#8b4c35",
    },
    metadata: {
      format: "Book",
      audience: "Adult",
      language: "English",
      publicationYear: "2022",
    },
  }),
  makeCatalogBook({
    id: "curated-house-cerulean-sea",
    title: "The House in the Cerulean Sea",
    author: "TJ Klune",
    isbn: "9781250217318",
    description:
      "A lonely case worker is sent to evaluate an unusual seaside home and finds his carefully ordered life opening up.",
    whyThisFits:
      "A cozy fantasy pick for readers who want tenderness, humor, and an optimistic found-family arc.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9781250217318-L.jpg",
    keywords: ["fantasy", "cozy", "found family", "funny", "adult", "fiction"],
    goodreadsNote: "Goodreads readers often focus on the comfort-read tone, found family, and optimistic ending.",
    googleNote: "Google Books can help compare ratings and preview information for fantasy readers.",
    cover: {
      from: "#315c8c",
      to: "#7bb6a6",
      spine: "#203f63",
    },
    metadata: {
      format: "Book",
      audience: "Adult",
      language: "English",
      publicationYear: "2020",
    },
  }),
  makeCatalogBook({
    id: "curated-babel",
    title: "Babel",
    author: "R. F. Kuang",
    isbn: "9780063021426",
    description:
      "An alternate-history fantasy about language, empire, translation, and student resistance at Oxford.",
    whyThisFits:
      "A strong recommendation for readers who want fantasy with ideas, academic atmosphere, and historical critique.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780063021426-L.jpg",
    keywords: ["fantasy", "historical fiction", "thought-provoking", "language", "adult", "fiction"],
    goodreadsNote: "Goodreads readers frequently discuss the ambition, politics, and language-centered worldbuilding.",
    googleNote: "Google Books can provide preview/rating signals for readers weighing dense fantasy.",
    cover: {
      from: "#20231c",
      to: "#d3a05f",
      spine: "#11130f",
    },
    metadata: {
      format: "Book",
      audience: "Adult",
      language: "English",
      publicationYear: "2022",
    },
  }),
  makeCatalogBook({
    id: "curated-crying-in-h-mart",
    title: "Crying in H Mart",
    author: "Michelle Zauner",
    isbn: "9780525657743",
    description:
      "A memoir about grief, Korean American identity, food, music, and the bond between a daughter and her mother.",
    whyThisFits:
      "A reflective nonfiction pick for readers who want intimate memoir, family, and sensory writing.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780525657743-L.jpg",
    keywords: ["biography", "memoir", "food", "family", "reflective", "nonfiction", "adult"],
    goodreadsNote: "Goodreads readers often mention the emotional honesty, food writing, and mother-daughter relationship.",
    googleNote: "Google Books can surface preview text and reader-rating context for memoir fans.",
    cover: {
      from: "#b96f4a",
      to: "#f0d9a0",
      spine: "#8b4c35",
    },
    metadata: {
      format: "Book",
      audience: "Adult",
      language: "English",
      publicationYear: "2021",
    },
  }),
  makeCatalogBook({
    id: "curated-the-wager",
    title: "The Wager",
    author: "David Grann",
    isbn: "9780385534260",
    description:
      "A narrative history of shipwreck, survival, mutiny, and competing stories of what really happened.",
    whyThisFits:
      "A nonfiction choice with adventure pacing, historical detail, and a mystery-like structure.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780385534260-L.jpg",
    keywords: ["history", "biography", "adventure", "mystery", "nonfiction", "adult"],
    goodreadsNote: "Goodreads readers tend to emphasize the suspense, research, and survival-story momentum.",
    googleNote: "Google Books can provide preview and rating signals for narrative nonfiction readers.",
    cover: {
      from: "#214d45",
      to: "#315c8c",
      spine: "#173f3a",
    },
    metadata: {
      format: "Book",
      audience: "Adult",
      language: "English",
      publicationYear: "2023",
    },
  }),
  makeCatalogBook({
    id: "curated-braiding-sweetgrass",
    title: "Braiding Sweetgrass",
    author: "Robin Wall Kimmerer",
    isbn: "9781571313560",
    description:
      "Essays that braid Indigenous knowledge, botany, teaching, and reciprocity with the living world.",
    whyThisFits:
      "A reflective nonfiction match for readers who want nature writing, science, and philosophical depth.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9781571313560-L.jpg",
    keywords: ["nonfiction", "nature", "science", "reflective", "thought-provoking", "adult"],
    goodreadsNote: "Goodreads readers often highlight the lyrical essays, ecological thinking, and sense of gratitude.",
    googleNote: "Google Books can surface preview and reader-rating details for this nonfiction favorite.",
    cover: {
      from: "#214d45",
      to: "#cbd8bc",
      spine: "#173f3a",
    },
    metadata: {
      format: "Book",
      audience: "Adult",
      language: "English",
      publicationYear: "2013",
    },
  }),
  makeCatalogBook({
    id: "curated-salt-fat-acid-heat",
    title: "Salt, Fat, Acid, Heat",
    author: "Samin Nosrat",
    isbn: "9781476753836",
    description:
      "A practical, illustrated cooking guide built around four elements that help home cooks understand flavor.",
    whyThisFits:
      "A useful cookbook pick for readers who want technique, warmth, and confidence in the kitchen.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9781476753836-L.jpg",
    keywords: ["cookbook", "food", "cooking", "nonfiction", "funny", "adult"],
    goodreadsNote: "Goodreads readers commonly praise the approachable teaching style and practical cooking framework.",
    googleNote: "Google Books can show preview pages and reader-rating context for cookbook browsing.",
    cover: {
      from: "#8b4c35",
      to: "#d3a05f",
      spine: "#653020",
    },
    metadata: {
      format: "Book",
      audience: "Adult",
      language: "English",
      publicationYear: "2017",
    },
  }),
  makeCatalogBook({
    id: "curated-front-desk",
    title: "Front Desk",
    author: "Kelly Yang",
    isbn: "9781338157796",
    description:
      "A middle grade novel about a young girl helping run a motel while her immigrant family works toward stability.",
    whyThisFits:
      "A heartfelt juvenile pick with humor, family, social issues, and a resilient narrator.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9781338157796-L.jpg",
    keywords: ["juvenile", "funny", "family", "immigration", "realistic fiction", "cozy"],
    goodreadsNote: "Goodreads readers often mention the warmth, humor, and accessible social themes.",
    googleNote: "Google Books can help families compare preview details and reader ratings.",
    cover: {
      from: "#d3a05f",
      to: "#cbd8bc",
      spine: "#8b4c35",
    },
    metadata: {
      format: "Book",
      audience: "Juvenile",
      language: "English",
      publicationYear: "2018",
    },
  }),
  makeCatalogBook({
    id: "curated-new-kid",
    title: "New Kid",
    author: "Jerry Craft",
    isbn: "9780062691194",
    description:
      "A graphic novel about a seventh grader navigating a new private school while trying to stay connected to home.",
    whyThisFits:
      "A smart juvenile recommendation for readers who want humor, school stories, and accessible visual storytelling.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780062691194-L.jpg",
    keywords: ["juvenile", "funny", "graphic novel", "school", "realistic fiction"],
    goodreadsNote: "Goodreads readers frequently praise the humor, art, and thoughtful school-life observations.",
    googleNote: "Google Books can surface preview and reader-rating details for graphic novel readers.",
    cover: {
      from: "#315c8c",
      to: "#d3a05f",
      spine: "#203f63",
    },
    metadata: {
      format: "Book",
      audience: "Juvenile",
      language: "English",
      publicationYear: "2019",
    },
  }),
  makeCatalogBook({
    id: "curated-last-stop-market-street",
    title: "Last Stop on Market Street",
    author: "Matt de la Pena",
    isbn: "9780399257742",
    description:
      "A picture book about a child and grandparent finding beauty, gratitude, and community during a city bus ride.",
    whyThisFits:
      "A gentle picture book for families seeking warmth, everyday wonder, and inclusive city life.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780399257742-L.jpg",
    keywords: ["picture book", "juvenile", "cozy", "community", "family", "reflective"],
    goodreadsNote: "Goodreads readers often praise the language, illustrations, and warm intergenerational relationship.",
    googleNote: "Google Books can provide preview and reader-rating context for picture-book selection.",
    cover: {
      from: "#7bb6a6",
      to: "#b96f4a",
      spine: "#32665c",
    },
    metadata: {
      format: "Picture Book",
      audience: "Juvenile",
      language: "English",
      publicationYear: "2015",
    },
  }),
  makeCatalogBook({
    id: "curated-the-hate-u-give",
    title: "The Hate U Give",
    author: "Angie Thomas",
    isbn: "9780062498533",
    description:
      "A young adult novel about a teen whose life changes after she witnesses a police shooting.",
    whyThisFits:
      "A powerful YA recommendation for readers looking for voice-driven contemporary fiction and social urgency.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780062498533-L.jpg",
    keywords: ["young adult", "thought-provoking", "realistic fiction", "social issues", "reflective"],
    goodreadsNote: "Goodreads readers often discuss the voice, emotional force, and timely social questions.",
    googleNote: "Google Books can help compare preview and reader-rating signals for YA fiction.",
    cover: {
      from: "#20231c",
      to: "#cbd8bc",
      spine: "#11130f",
    },
    metadata: {
      format: "Book",
      audience: "Young Adult",
      language: "English",
      publicationYear: "2017",
    },
  }),
].map((book) => ({
  ...book,
  matchScore: book.matchScore ?? 60,
}));
