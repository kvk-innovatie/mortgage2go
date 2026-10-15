import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import axios from "axios";

import { API_KEY, PORT, WALLET_CONNECT_URL } from "./config.js";

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "public");

const app = express();

app.use(express.json());

/**
 * The whole Mortgage2Go backend: forward `/api/*` to NB Wallet Connect with
 * this relying party's API key attached.
 *
 * All the disclosure logic — which usecase to run, which attestations and
 * claims to ask for (EUCC, LPID, POX and the ZZP keurmerk), reading them back
 * off the verification server — lives in NB Wallet Connect. A relying party
 * only has to keep its API key off the browser, which is what this proxy does.
 *
 * It is deliberately a catch-all rather than a route per endpoint: the wallet
 * button calls `/api/create-session` (via `start-url`), polls
 * `/api/disclosure/sessions/…`, and finally reads `/api/disclosed-attributes`,
 * all same-origin, so a single pass-through covers the flow and stays correct
 * if the button adds a call.
 */
async function proxyToWalletConnect(req, res) {
  try {
    const response = await axios({
      method: req.method,
      url: `${WALLET_CONNECT_URL}${req.originalUrl}`,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      data: req.body,
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(502).json({ error: "Proxy error", message: error.message });
    }
  }
}

app.all("/api/*", proxyToWalletConnect);

app.get("/healthz", (_req, res) =>
  res.json({ status: "ok", upstream: WALLET_CONNECT_URL }),
);

/**
 * In the container the built SPA sits in ./public and this process serves it, so
 * the page and its `/api` calls share an origin — which is what the button
 * assumes when it is used without an `apiKey` prop.
 *
 * Absent when running from source: there Vite serves the page and proxies /api
 * here, so the directory does not exist and these routes are never registered.
 */
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
  // Registered after /api/*, so it only catches what the proxy did not.
  app.get("*", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));
}

app.listen(PORT, () => {
  console.log(`Mortgage2Go backend listening on http://localhost:${PORT}`);
  console.log(`  proxying /api/* to ${WALLET_CONNECT_URL}`);
});
