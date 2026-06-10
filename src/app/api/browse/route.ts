import { getBrowseResults } from "@/lib/browseCatalog";
import type { BrowseFilters, BrowseSort } from "@/types/book";

export const runtime = "nodejs";

const defaultFilters: BrowseFilters = {
  genre: "",
  format: "",
  language: "",
  audience: "",
  yearFrom: "",
  yearTo: "",
  sort: "Title A-Z",
};
const browseSortValues: BrowseSort[] = ["Newest", "Oldest", "Title A-Z"];
const defaultLimit = 12;

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeSort(value: unknown): BrowseSort {
  return typeof value === "string" && browseSortValues.includes(value as BrowseSort)
    ? (value as BrowseSort)
    : defaultFilters.sort;
}

function normalizeFilters(value: unknown): BrowseFilters {
  const input = typeof value === "object" && value !== null ? (value as Partial<BrowseFilters>) : {};

  return {
    genre: stringValue(input.genre),
    format: stringValue(input.format),
    language: stringValue(input.language),
    audience: stringValue(input.audience),
    yearFrom: stringValue(input.yearFrom),
    yearTo: stringValue(input.yearTo),
    sort: normalizeSort(input.sort),
  };
}

function normalizeLimit(value: unknown) {
  const limit = Number(value);

  return Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : defaultLimit;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const input = typeof body === "object" && body !== null ? (body as { filters?: unknown; limit?: unknown }) : {};
  const filters = normalizeFilters(input.filters);
  const limit = normalizeLimit(input.limit);

  return Response.json(getBrowseResults(filters, limit));
}
