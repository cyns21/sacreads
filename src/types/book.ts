export type BookMetadata = {
  format: string;
  audience: string;
  language: string;
  publicationYear: string;
};

export type BookRecommendation = {
  id: string;
  title: string;
  author: string;
  genre: string;
  splCatalogUrl: string;
  splSearchUrl?: string;
  source: "spl-catalog" | "curated-catalog" | "seed-data";
  sourceType?: "spl-reading-list" | "spl-catalog-browser" | "open-library";
  sourceListName?: string;
  sourcePageUrl?: string;
  matchScore?: number;
  keywords?: string[];
  metadata: BookMetadata;
};

export type ClientBook = Pick<
  BookRecommendation,
  | "id"
  | "title"
  | "author"
  | "genre"
  | "splCatalogUrl"
  | "splSearchUrl"
  | "source"
  | "sourceType"
  | "sourceListName"
  | "sourcePageUrl"
  | "matchScore"
  | "metadata"
>;

export type SavedBook = Pick<ClientBook, "id" | "title" | "author" | "genre" | "splCatalogUrl" | "metadata">;

export type BrowseSort = "Newest" | "Oldest" | "Title A-Z";

export type BrowseFilters = {
  genre: string;
  format: string;
  language: string;
  audience: string;
  yearFrom: string;
  yearTo: string;
  sort: BrowseSort;
};

export type FilterOption = {
  label: string;
  count: number;
};

export type BrowseFilterOptions = {
  genres: FilterOption[];
  formats: FilterOption[];
  languages: FilterOption[];
  audiences: FilterOption[];
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
};

export type LocalBookRecord = {
  id?: string;
  title?: string;
  author?: string;
  genre?: string;
  genres?: string[];
  audience?: string;
  format?: string;
  language?: string;
  publicationYear?: number | string | null;
  splCatalogUrl?: string;
  splSearchUrl?: string;
  sourceListName?: string;
  sourcePageUrl?: string;
  sourceSeed?: string;
  sourceSeeds?: string[];
  sourceType?: "spl-reading-list" | "spl-catalog-browser" | "open-library";
};
