import { defaultFilters } from "@/data/searchOptions";
import { getSacReadsRecommendations } from "@/lib/splCatalog";
import type { CatalogSearchFilters } from "@/types/book";

export const runtime = "nodejs";

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function normalizeFilters(value: unknown): CatalogSearchFilters {
  const input = typeof value === "object" && value !== null ? (value as Partial<CatalogSearchFilters>) : {};

  return {
    query: stringValue(input.query, defaultFilters.query).slice(0, 500),
    pickupBranch: stringValue(input.pickupBranch, defaultFilters.pickupBranch),
    language: stringValue(input.language, defaultFilters.language),
    format: stringValue(input.format, defaultFilters.format),
    bookType: stringValue(input.bookType, defaultFilters.bookType),
    audience: stringValue(input.audience, defaultFilters.audience),
    yearFrom: stringValue(input.yearFrom, defaultFilters.yearFrom),
    yearTo: stringValue(input.yearTo, defaultFilters.yearTo),
    mood: stringValue(input.mood, defaultFilters.mood),
    genre: stringValue(input.genre, defaultFilters.genre),
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const filters = normalizeFilters(body);
  const recommendations = await getSacReadsRecommendations(filters);

  return Response.json(recommendations);
}
