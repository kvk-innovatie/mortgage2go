import dotenv from "dotenv";

dotenv.config();

export const PORT = Number(process.env.PORT || 7020);

/**
 * NB Wallet Connect, the verification service on the nb-wallet side.
 *
 * Locally that is the nb-wallet-connect dev server on port 5021. Against the
 * deployed service it is `https://connect.nbwallet.org`, which owns `/api/`
 * outright.
 */
export const WALLET_CONNECT_URL =
  process.env.WALLET_CONNECT_URL || "http://localhost:5021";

/**
 * Identifies Mortgage2Go to NB Wallet Connect: the API key it issued for the
 * hypotheekconsult service (see registration/mortgage2go.seed.json).
 *
 * No default on purpose: this is the credential that keeps the disclosure
 * endpoints from being callable by anyone who can reach them, so it comes from
 * the environment (see `.env.example`) and is never committed. Failing loudly
 * here beats sending `Bearer undefined` and debugging a 401 from the far side.
 */
export const API_KEY = process.env.WALLET_CONNECT_API_KEY;

if (!API_KEY) {
  console.error(
    "WALLET_CONNECT_API_KEY is not set — copy .env.example to .env and fill it in.",
  );
  process.exit(1);
}
