# Agapornis Next Frontend

Next.js 16 panel UI for the Nest master API. Styling uses Tailwind CSS, Inter, Manrope, and color tokens in `styles/globals.css`.

Run:

```bash
cd next-frontend
npm install
AGAPORNIS_API_URL=http://localhost:3001/api npm run dev
```

The first account created through the register form becomes `owner`. Browser requests use the same-origin `/api` route; Next rewrites those requests server-side to `AGAPORNIS_API_URL`, so the Nest API address is not exposed to the browser.

Theme colors are intentionally easy to change:

```css
:root {
  --color-page: #080808;
  --color-surface: #101010;
  --color-accent: #dff8e8;
}
```
