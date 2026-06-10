import { SacReadsHome } from "@/components/SacReadsHome";
import { getBrowseBookCount, getBrowseFilterOptions } from "@/lib/browseCatalog";

export default function Home() {
  return <SacReadsHome filterOptions={getBrowseFilterOptions()} totalBookCount={getBrowseBookCount()} />;
}
