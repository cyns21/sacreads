export function formatAuthorName(author: string | null | undefined) {
  return (author ?? "")
    .trim()
    .replace(/,\s*(?:approximately\s*)?\d{4}\s*-\s*(?:\d{4})?\s*$/i, "")
    .trim();
}
