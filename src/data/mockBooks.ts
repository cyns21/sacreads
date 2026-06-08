import { getRandomCuratedBooks } from "@/data/sacLibraryBooks";
import { enrichBookRecommendations } from "@/lib/bookMetadata";

export async function getStarterRecommendations() {
  const starters = getRandomCuratedBooks(3);

  try {
    return await Promise.race([
      enrichBookRecommendations(starters),
      new Promise<typeof starters>((resolve) => {
        setTimeout(() => resolve(starters), 1200);
      }),
    ]);
  } catch {
    return starters;
  }
}
