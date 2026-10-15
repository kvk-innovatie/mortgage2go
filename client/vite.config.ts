import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const BACKEND = process.env.MORTGAGE2GO_BACKEND_URL || "http://localhost:7020";

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.MORTGAGE2GO_FRONTEND_PORT || 7021),
    // The button calls `/api/create-session` and `/api/disclosed-attributes`
    // same-origin (it only prefixes a host when an apiKey is set), so the dev
    // server forwards /api to the backend, which attaches the API key.
    proxy: {
      "/api": { target: BACKEND, changeOrigin: true },
    },
  },
  optimizeDeps: {
    // Pre-bundle these at startup instead of letting Vite discover them on the
    // first page load. A dep it optimizes mid-session triggers a re-optimize
    // plus full reload, and until that lands the page can run against a
    // half-updated module graph — which is what makes the syntax-highlighted
    // code blocks render as `[object Object],[object Object],…` right after an
    // `npm install`, and why a couple of refreshes clear it.
    include: [
      "wallet-connect-button-react",
      "react-syntax-highlighter",
      // Deep entries: plain data modules, but they only exist as subpaths.
      "react-syntax-highlighter/dist/esm/styles/prism",
      "react-syntax-highlighter/dist/esm/languages/prism/bash",
      "react-syntax-highlighter/dist/esm/languages/prism/css",
      "react-syntax-highlighter/dist/esm/languages/prism/javascript",
      "react-syntax-highlighter/dist/esm/languages/prism/jsx",
    ],
  },
});
