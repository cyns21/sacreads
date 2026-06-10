export function formatAuthorName(author: string | null | undefined) {
  const withoutDates = (author ?? "")
    .trim()
    .replace(/,\s*(?:approximately\s*)?\d{4}\s*-\s*(?:\d{4})?\s*$/i, "")
    .trim();

  const nameParts = withoutDates.split(",").map((part) => part.trim()).filter(Boolean);

  if (nameParts.length === 2) {
    return `${nameParts[1]} ${nameParts[0]}`;
  }

  return withoutDates;
}
