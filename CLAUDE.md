# Wedding Camera App (Toy Camera)

## Project Overview
A wedding disposable camera web app. Guests scan a QR code, open a browser-based camera with Instagram-style filters, take photos, and all images go to a shared Firebase-powered gallery.

## Tech Stack
- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Firebase: Auth (anonymous + email/password), Firestore, Storage
- Canvas API for photo filters
- Mobile-first, dark theme (#0A0A0A) with gold accents (#D4AF37)

## Important Next.js 16 Notes
- `params` and `searchParams` are **Promises** — must use `await` in server components or `use()` in client components
- Tailwind v4 uses `@import 'tailwindcss'` in CSS, not config-based
- React 19 with `use()` hook available

## Project Structure
```
app/              — Next.js App Router pages
  event/[eventId]/  — Guest-facing pages (entry, camera, gallery)
  admin/            — Host admin panel
components/       — Reusable React components
lib/              — Firebase config, types, filters, utilities
public/           — Static assets (icons, sounds)
```

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint

@AGENTS.md
