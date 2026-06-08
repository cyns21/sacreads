import { SacReadsHome } from "@/components/SacReadsHome";
import { mockBooks } from "@/data/mockBooks";

export default function Home() {
  return <SacReadsHome initialBooks={mockBooks} />;
}
