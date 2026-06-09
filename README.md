# SacReads v1.0.0

SacReads is a simple Sacramento Public Library book recommendation app. It shows suggestions from a
local SPL-derived dataset and sends readers to the SPL catalog for current availability, requests, and
full record details.

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

## Notes

- Recommendations are generated from the local dataset in `src/data/books.json`.
- Book cards link directly to SPL catalog records when a catalog URL is available.
- Saved books are stored in browser `localStorage`.
- The app uses Next.js App Router, TypeScript, and Tailwind CSS.
