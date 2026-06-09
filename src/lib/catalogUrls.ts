import type { CatalogSearchFilters } from "@/types/book";

export const SPL_CATALOG_BASE_URL = "https://catalog.saclibrary.org";

type CatalogUrlOptions = Partial<Pick<CatalogSearchFilters, "pickupBranch" | "format">> & {
  query: string;
};

export function buildSplCatalogSearchUrl({ query, pickupBranch, format }: CatalogUrlOptions) {
  const params = new URLSearchParams({
    lookfor: query.trim() || "books",
    searchIndex: "Keyword",
    searchSource: "local",
    sort: "relevance",
    view: "list",
  });

  params.append("filter[]", 'format_category:"Books"');

  if (pickupBranch) {
    params.append("filter[]", `available_at:"${pickupBranch}"`);
  }

  if (format === "Picture Book") {
    params.set("lookfor", `${params.get("lookfor")} picture book`);
  }

  return `${SPL_CATALOG_BASE_URL}/Search/Results?${params.toString()}`;
}
