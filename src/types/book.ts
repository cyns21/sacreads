export type BookReviewSignal = {
  source: "Goodreads" | "Google Books" | "Open Library";
  rating?: string;
  count?: string;
  note: string;
  url: string;
};

export type BookRecommendation = {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  rating?: string;
  ratingAverage?: number;
  ratingCount?: number;
  googleUsers?: string;
  description: string;
  whyThisFits: string;
  coverImageUrl?: string;
  catalogUrl: string;
  requestUrl: string;
  source: "spl-catalog" | "curated-catalog" | "seed-data";
  matchScore?: number;
  availabilityNote?: string;
  keywords?: string[];
  reviewSignals?: BookReviewSignal[];
  cover?: {
    from: string;
    to: string;
    spine: string;
  };
  metadata: {
    format: string;
    audience: string;
    language: string;
    publicationYear: string;
    pickupBranch?: string;
    pageCount?: number;
    genreTags?: string[];
  };
};

export type ClientBook = Pick<
  BookRecommendation,
  | "id"
  | "title"
  | "author"
  | "description"
  | "whyThisFits"
  | "coverImageUrl"
  | "catalogUrl"
  | "requestUrl"
  | "source"
  | "matchScore"
  | "availabilityNote"
  | "rating"
  | "ratingAverage"
  | "ratingCount"
  | "reviewSignals"
  | "metadata"
>;

export type SavedBook = Pick<ClientBook, "id" | "title" | "author" | "coverImageUrl" | "requestUrl"> & {
  publicationYear: string;
};

export type CatalogSearchFilters = {
  query: string;
  pickupBranch: string;
  language: string;
  format: string;
  bookType: string;
  audience: string;
  yearFrom: string;
  yearTo: string;
  mood: string;
  genre: string;
  authorContains: string;
  minimumRating: string;
  maxPages: string;
};
