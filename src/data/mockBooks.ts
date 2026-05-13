import type { BookRecommendation } from "@/types/book";

export const mockBooks: BookRecommendation[] = [
  {
    title: "The Personal Librarian",
    author: "Marie Benedict and Victoria Christopher Murray",
    rating: "3.8/5",
    googleUsers: "80%",
    description:
      "A richly imagined historical novel about Belle da Costa Greene, the brilliant curator who shaped J. P. Morgan's world-class library.",
    whyThisFits:
      "A strong match for readers who want literary historical fiction, complex real-life figures, and a bookish setting.",
    cover: {
      from: "#2f5f56",
      to: "#d3a05f",
      spine: "#173f3a",
    },
    metadata: {
      format: "Book",
      audience: "Adult",
      language: "English",
      publicationYear: "2021",
    },
  },
  {
    title: "The Last Cuentista",
    author: "Donna Barba Higuera",
    rating: "4.4/5",
    googleUsers: "93%",
    description:
      "A Newbery Medal-winning story about memory, storytelling, and survival as a young girl carries Earth's old tales into the future.",
    whyThisFits:
      "Great for readers looking for hopeful science fiction, folklore, family, and a fast-moving young adult adventure.",
    cover: {
      from: "#315c8c",
      to: "#b96f4a",
      spine: "#203f63",
    },
    metadata: {
      format: "Book",
      audience: "Young Adult",
      language: "English",
      publicationYear: "2021",
    },
  },
  {
    title: "Julian Is a Mermaid",
    author: "Jessica Love",
    rating: "4.5/5",
    googleUsers: "91%",
    description:
      "A vibrant picture book about imagination, self-expression, and the joy of being seen by someone who loves you.",
    whyThisFits:
      "A warm pick for families seeking inclusive picture books with expressive art, gentle pacing, and a celebratory mood.",
    cover: {
      from: "#7bb6a6",
      to: "#e2bd65",
      spine: "#32665c",
    },
    metadata: {
      format: "Picture Book",
      audience: "Juvenile",
      language: "English",
      publicationYear: "2018",
    },
  },
];
