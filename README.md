# SacReads

SacReads recommends physical books for Sacramento Public Library readers, ranks them by reading request
and branch filters, and opens hold-ready SPL catalog searches for pickup.

## Getting Started

Install dependencies, then run the development server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to view the app.

## Deploying to Vercel

Vercel can deploy this as a standard Next.js app.

- Framework preset: Next.js
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: leave blank; Vercel reads the `.next` output automatically

Optional credentials can be added in Vercel Project Settings:

- `SPL_ASPEN_API_KEY1` and `SPL_ASPEN_API_KEY2` for the Aspen catalog API
- `GOOGLE_BOOKS_API_KEY` for Google Books descriptions and rating counts

The app still renders without them. If the live SPL catalog blocks server-side search, SacReads ranks a
curated physical-book pool and links each title to an SPL catalog search filtered for the selected branch.
Goodreads is linked as a reader-review source because it does not provide a current public review API for
new integrations.

## Notes

- Recommendations include SPL hold/search links, description enrichment, and review-source links.
- The app uses Next.js App Router, TypeScript, and Tailwind CSS.
