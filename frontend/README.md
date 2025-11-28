# FinPath Frontend

Production‑ready UI built with React, Vite, TypeScript, Tailwind v4, Radix UI, Motion, and Recharts. This repository implements the full Figma design client‑side (no backend).

## Tech Stack
- React `^19.2.0`
- Vite `^7.2.2`
- TypeScript `~5.9.3`
- Tailwind CSS `^4.1.17` with `@tailwindcss/postcss`
- Radix UI (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-slot`)
- Motion `^12.23.24` for animations
- Recharts `^3.4.1` for charts
- ESLint `^9.39.1`

## Prerequisites
- Node.js `>=18`
- npm `>=9`

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173/`.
3. Build for production:
   ```bash
   npm run build
   ```
4. Preview production build:
   ```bash
   npm run preview
   ```
5. Lint:
   ```bash
   npm run lint
   ```

## Project Structure
- `src/App.tsx` – App shell and page switching
- `src/index.css` – Tailwind import and design tokens
- `src/components/Header.tsx` – Navigation (desktop + mobile Sheet)
- Pages:
  - `src/components/HomePage.tsx`
  - `src/components/DashboardPage.tsx`
  - `src/components/TransactionsPage.tsx`
  - `src/components/AICoachPage.tsx`
  - `src/components/GoalsPage.tsx`
  - `src/components/RemindersPage.tsx`
  - `src/components/SettingsPage.tsx`
- UI primitives: `src/components/ui/*` (`button`, `card`, `sheet`, `dropdown-menu`, `progress`, `badge`, `table`, `input`, `textarea`, `dialog`, `label`, `utils`)

## Styling & Tokens
- Tailwind v4 is imported via `@import "tailwindcss";` in `src/index.css`.
- Design tokens (colors, spacing, typography) are declared in `@layer theme` in `src/index.css`.
- Default button color uses design indigo (`#4F46E5`).

## Navigation
- Header tabs change the internal `currentPage` state in `App.tsx`.
- If you prefer URLs, integrate `react-router` and map routes to pages.

## Data & Behavior
- Demo data is embedded in pages (no persistence).
- Charts render static samples matching the design.
- AI Coach simulates responses and inline visual summaries.

## Troubleshooting
- UI appears unstyled: ensure `src/index.css` contains `@import "tailwindcss";` and `postcss.config.js` uses `@tailwindcss/postcss`.
- Type errors on charts: use safe access for Recharts label props (see `DashboardPage.tsx`).
- Lint failing on impure IDs: use `useRef` counters (see `AICoachPage.tsx`).

## License
MIT