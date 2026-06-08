import { SacReadsHome } from "@/components/SacReadsHome";
import { getStarterRecommendations } from "@/data/mockBooks";

export const dynamic = "force-dynamic";

export default async function Home() {
  const starterBooks = await getStarterRecommendations();

  return <SacReadsHome initialBooks={starterBooks} />;
}
