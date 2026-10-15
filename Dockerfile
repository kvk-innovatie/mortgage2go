# syntax=docker/dockerfile:1

# 1. Build the SPA. Vite inlines VITE_* values into the bundle at build time, so
#    the service id is a build argument here and not a runtime variable.
FROM node:22-alpine AS client
ARG VITE_SERVICE_ID=EH_A530D4346A7ACD00
ENV VITE_SERVICE_ID=$VITE_SERVICE_ID
WORKDIR /build
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# 2. Runtime dependencies on their own, so the final image carries no toolchain.
FROM node:22-alpine AS deps
WORKDIR /build
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# 3. One process serving both: Express answers /api and hands out the built SPA
#    for everything else. Same origin by construction, which the wallet button
#    needs — without an apiKey prop it requests /api/… on its own origin.
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /build/node_modules ./node_modules
COPY server/ ./
COPY --from=client /build/dist ./public

EXPOSE 7020
CMD ["node", "index.js"]
