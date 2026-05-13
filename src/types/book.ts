export type BookRecommendation = {
  title: string;
  author: string;
  rating: string;
  googleUsers: string;
  description: string;
  whyThisFits: string;
  cover: {
    from: string;
    to: string;
    spine: string;
  };
  metadata: {
    format: string;
    audience: string;
    language: string;
    publicationYear: string;
  };
};
