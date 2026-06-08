import type { CatalogSearchFilters } from "@/types/book";

export const branches = [
  "Central Library",
  "South Natomas Library",
  "North Natomas Library",
  "Belle Cooledge Library",
  "Arcade Library",
  "Colonial Heights Library",
  "Robbie Waters Pocket-Greenhaven Library",
];

export const languages = ["Any language", "English", "Spanish", "Chinese", "Vietnamese", "Russian"];
export const formats = ["Book", "Picture Book"];
export const bookTypes = ["Any", "Fiction", "Nonfiction"];
export const audiences = ["General", "Adult", "Juvenile", "Young Adult"];
export const moods = ["Any mood", "Cozy", "Thought-provoking", "Funny", "Adventurous", "Reflective"];
export const genres = [
  "Any genre",
  "Mystery",
  "Historical fiction",
  "Science fiction",
  "Fantasy",
  "Romance",
  "Biography",
  "Cookbook",
];

export const defaultFilters: CatalogSearchFilters = {
  query: "hopeful, character-driven stories with a strong sense of place",
  pickupBranch: branches[0],
  language: languages[0],
  format: formats[0],
  bookType: bookTypes[0],
  audience: audiences[0],
  yearFrom: "",
  yearTo: "",
  mood: moods[0],
  genre: genres[0],
};
