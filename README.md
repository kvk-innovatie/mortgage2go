# Mortgage2Go — hypotheekconsult voor zzp'ers (demo relying party)

A demo of a tool Mortgage2Go has in development: a self-employed professional
(zzp'er) prepares a mortgage consult by sharing company data from their
**NB Wallet** instead of handing over a pile of documents. The page asks the
wallet for four attestations in one disclosure session, reads them back and
turns them into a consult summary for the adviser:

| Attestation | Type | What the consult takes from it |
| --- | --- | --- |
| European Company Certificate | `urn:eudi:eucc:nl:1` | legal form, registration date, status, address, contact details |
| Business Wallet Owner ID (LPID) | `urn:eudi:lpid:nl:1` | legal name and EUID of the wallet's owner |
| KVK Bevoegdheid (POX) | `urn:eudi:pox:nl:1` | who the representative is and whether they may act for the company |
| ZZP-keurmerk | `urn:zzpgarantie:keurmerk:nl:1` | the ZZP Garantie assessment: certainty score, verdict, attention items, selected answers |

The keurmerk is the credential type under
[`nb-wallet-connect/examples/zzp-keurmerk`](../nb-wallet-connect/examples/zzp-keurmerk),
issued by the [zzp-garantie](../zzp-garantie) demo. The site is styled after
[mortgage2go.com](https://mortgage2go.com) (Inter, the navy hero, pill buttons,
the four-colour logo symbol) and runs under
<https://mortgage2go.mayersoftwaredevelopment.nl>.

It is a standalone relying party built the same way as zzp-garantie: it holds
no wallet infrastructure of its own and talks to **NB Wallet Connect** on
`connect.nbwallet.org`.

```
┌────────────────┐  /api/*  ┌──────────────┐  /api/* + api key  ┌───────────────────┐
│  React page    │─────────▶│  backend     │───────────────────▶│ NB Wallet Connect │
│  (Vite, 7021)  │          │  (7020)      │                    │ connect.nbwallet  │
└────────────────┘          └──────────────┘                    └─────────┬─────────┘
        │                    holds the API key                            │
        │ nl-wallet-button → universal link                               ▼
        ▼                                                 verification_server (public)
   NB Wallet app ──────────────────────────────────────────▶ verification.connect.nbwallet.org
```

## Pages

- `/hypotheekconsult` — the hero with the wallet button. After a successful
  disclosure it becomes the consult: a score ring for the keurmerk, an
  "indicatie voor je consult" list (years registered, keurmerk verdict,
  representative authorised, spread of clients, hourly rate), summary cards
  per attestation, a demo "plan mijn consult" action and the full disclosed
  data plus the raw response.
- `/hoe-het-werkt` — the four steps and what is requested from the wallet, and why.
- `/voor-ontwikkelaars` — the integration example (button, backend proxy, the
  requested attributes).

The indicators are indicative only and the booking button does nothing beyond
showing a confirmation: nothing is sent, nothing is stored.

## The backend

One handler:

```js
app.all("/api/*", proxyToWalletConnect);   // adds Authorization: Bearer <api key>
```

That is the whole relying-party integration. Which attestations and claims to
ask for lives in the service's registration in NB Wallet Connect, not in this
code. The only job here is keeping the API key off the browser.

## The service in NB Wallet Connect

The page identifies itself with a **service id**: `EH_A530D4346A7ACD00`, the
registration Mayer Software Development created on <https://connect.nbwallet.org>
for this demo. It is active and asks the wallet for the four attestations
above (all claims of each). The id is the default in `client/.env`, the
`Dockerfile` and `docker-compose.yml`; the matching API key goes in
`server/.env` and is never committed.

[`registration/mortgage2go.seed.json`](registration/mortgage2go.seed.json)
documents the registration in the seed-file shape NB Wallet Connect's
`scripts/seed-registration.js` reads, with the subset of claims the consult
actually uses. It is a reference and a way to re-create the service on another
NB Wallet Connect instance (operator token required):

```bash
cd ../nb-wallet-connect
ADMIN_TOKEN=... node scripts/seed-registration.js ../mortgage2go/registration/mortgage2go.seed.json \
  --url https://connect.nbwallet.org --api-key <existing key>
```

To change what is requested, edit the registration on connect.nbwallet.org
(logged in as the owning company); nothing in this repo has to change unless
the consult should read a claim it does not read yet.

## Running it

```bash
cp server/.env.example server/.env              # fill in WALLET_CONNECT_API_KEY
(cd server && npm install && npm run dev)       # :7020
(cd client && npm install && npm run dev)       # :7021
```

Then open <http://localhost:7021>. The Vite dev server proxies `/api` to the
backend so the API key stays server-side. The one call that does not go that
way is the status polling: the button fetches the absolute `status_url` from
`connect.nbwallet.org` directly, which NB Wallet Connect allows from any origin
for that surface, so nothing has to be whitelisted for local development.

### In Docker

`docker compose up --build` builds the SPA, bakes it into a Node image and
serves both from one process on <http://localhost:7020>. There is no Vite proxy
in that setup: Express hands out the built page and answers `/api` on the same
origin, which is what the button needs.

`VITE_SERVICE_ID` is a build argument rather than an environment variable,
because Vite inlines it into the bundle — changing it means rebuilding. The
runtime values sit in `docker-compose.yml`, except the API key, which Compose
reads from `server/.env` so it stays uncommitted.

### Deploying

```bash
./deploy.sh
```

Builds the image locally, streams it to the server with `docker save | ssh
docker load` (no registry), copies `docker-compose.yml` and `server/.env`, then
restarts the container and checks `/healthz`. Target and credentials come from
the environment:

| Variable | Default |
| --- | --- |
| `DEPLOY_HOST` | `mortgage2go.mayersoftwaredevelopment.nl` |
| `DEPLOY_USER` | `root` |
| `DEPLOY_SSH_KEY` | `~/.ssh/id_ed25519` |
| `DEPLOY_DIR` | `/root/mortgage2go` |

Note that `mortgage2go.mayersoftwaredevelopment.nl` resolves to a different
server than `zzpgarantie.mayersoftwaredevelopment.nl`; the container port is
7020 either way, so both can share a host.

`nginx.conf` is an example vhost for that host: it terminates TLS and reverse
proxies to the container on 7020. Install it once by hand, then run
`certbot --nginx -d mortgage2go.mayersoftwaredevelopment.nl` — certbot rewrites
the file to add the 443 block and the redirect. `deploy.sh` does not touch it.

### On a physical phone

The wallet fetches the disclosure request from the verification server's public
listener on `verification.connect.nbwallet.org`, reachable from the phone as it
is. The page is the half that has to be reachable, and `http://localhost:7021`
is not: either use the deployed site, or bind the dev server to the machine's
LAN IP:

```bash
(cd client && npm run dev -- --host)            # http://<lan-ip>:7021
```

## Configuration

Copy `server/.env.example` to `server/.env` and fill it in — `.env` is gitignored.

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `7020` | Port the backend listens on |
| `WALLET_CONNECT_URL` | `http://localhost:5021` | Upstream NB Wallet Connect. `https://connect.nbwallet.org` for the deployed service. |
| `WALLET_CONNECT_API_KEY` | *(none — required)* | The API key NB Wallet Connect issued for the service. The backend refuses to start without it. |

Frontend: `VITE_SERVICE_ID` (default `EH_A530D4346A7ACD00`).

## The button

`client/` installs `wallet-connect-button-react` from npm, and uses it like this
([`src/App.tsx`](client/src/App.tsx)):

```jsx
<WalletConnectButton
  serviceId={SERVICE_ID}
  nbwallet
  label="Deel gegevens met je NB Wallet"
  lang="nl"
  onSuccess={handleSuccess}
/>
```

`nbwallet` points it at this stack: `https://connect.nbwallet.org` as the host
and the `https://nbwallet.org/deeplink/` universal link, speaking the service-id
form of the API.

**No `apiKey` prop**, which is the other half of the setup. Without it the
component requests `/api/create-session` and `/api/disclosed-attributes`
same-origin — through the backend above, with the key never reaching the page.

`onSuccess` receives `{ credentials: [...], representation?: {...} }`: one entry
per disclosed attestation, each claim a `{ name, value }` leaf, and when a POX
was disclosed NB Wallet Connect's verdict on whether the representative may act
for this service. [`src/claims.ts`](client/src/claims.ts) holds the lookups and
[`src/Consult.tsx`](client/src/Consult.tsx) turns them into the consult.
