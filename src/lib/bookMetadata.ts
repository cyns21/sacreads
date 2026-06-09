import type { BookRecommendation } from "@/types/book";

export async function enrichBookRecommendation(book: BookRecommendation): Promise<BookRecommendation> {
  return book;
}

export async function enrichBookRecommendations(books: BookRecommendation[]): Promise<BookRecommendation[]> {
  return books;
}
