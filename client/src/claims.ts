/**
 * What the wallet button hands to `onSuccess`, as NB Wallet Connect shapes it:
 *
 *   { credentials: [ { type, name: { lang: name },
 *                      attributes: { <claim>: { name: { lang: label }, value } } } ],
 *     representation?: { authorised, basis, serviceId } }
 *
 * One entry per disclosed attestation. `attributes` mirrors the credential's
 * own structure: every disclosed claim is a `{ name, value }` leaf, nested
 * claims sit in plain objects and array-of-objects claims in arrays.
 */
export interface ClaimLeaf {
  name?: Record<string, string>;
  value?: unknown;
}

export interface Credential {
  type: string;
  name?: Record<string, string>;
  attributes?: Record<string, unknown>;
}

export interface Representation {
  authorised: boolean | null;
  basis?: string | null;
  serviceId?: string;
}

export interface DisclosedResponse {
  credentials?: Credential[];
  representation?: Representation;
  [key: string]: unknown;
}

/** The four attestations the consult asks for, by their SD-JWT VC type. */
export const VCT = {
  LPID: "urn:eudi:lpid:nl:1",
  EUCC: "urn:eudi:eucc:nl:1",
  POX: "urn:eudi:pox:nl:1",
  KEURMERK: "urn:zzpgarantie:keurmerk:nl:1",
} as const;

/** Dutch label if the metadata has one, else English, else any, else the fallback. */
export function displayName(names: Record<string, string> | undefined, fallback: string): string {
  if (!names) return fallback;
  return names["nl-NL"] ?? names["nl"] ?? names["en-US"] ?? names["en"] ?? Object.values(names)[0] ?? fallback;
}

export function prettifyKey(key: string): string {
  return key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export function isLeaf(node: unknown): node is ClaimLeaf {
  return typeof node === "object" && node !== null && !Array.isArray(node) && "value" in node;
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "ja" : "nee";
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Every claim leaf as [label path, value]; nested objects and arrays spelled out. */
export function flattenClaims(node: unknown, path: string[] = []): [string[], unknown][] {
  if (isLeaf(node)) return [[path, node.value]];
  if (Array.isArray(node)) {
    return node.flatMap((item, i) => flattenClaims(item, [...path.slice(0, -1), `${path[path.length - 1]} ${i + 1}`]));
  }
  if (typeof node === "object" && node !== null) {
    return Object.entries(node).flatMap(([key, child]) =>
      flattenClaims(child, [...path, displayName(isLeaf(child) ? child.name : undefined, prettifyKey(key))]),
    );
  }
  return [[path, node]];
}

/** The first disclosed credential of the given type, if the wallet shared one. */
export function findCredential(disclosed: DisclosedResponse | null, vct: string): Credential | undefined {
  return disclosed?.credentials?.find((c) => c.type === vct);
}

/** The raw value of the claim at `path` inside one credential (`undefined` when absent). */
export function claim(credential: Credential | undefined, ...path: string[]): unknown {
  let node: unknown = credential?.attributes;
  for (const key of path) {
    if (typeof node !== "object" || node === null || Array.isArray(node)) return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return isLeaf(node) ? node.value : undefined;
}

/** The Dutch display name of the claim at `path`, from the metadata the wallet connect service attached. */
export function claimLabel(credential: Credential | undefined, ...path: string[]): string | undefined {
  let node: unknown = credential?.attributes;
  for (const key of path) {
    if (typeof node !== "object" || node === null || Array.isArray(node)) return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return isLeaf(node) && node.name ? displayName(node.name, path[path.length - 1]) : undefined;
}

export function claimString(credential: Credential | undefined, ...path: string[]): string | undefined {
  const value = claim(credential, ...path);
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

export function claimNumber(credential: Credential | undefined, ...path: string[]): number | undefined {
  const value = claim(credential, ...path);
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) return Number(value);
  return undefined;
}

/** The claim stored under `key` in any credential — used for the account menu. */
export function findClaim(disclosed: DisclosedResponse | null, key: string): string | undefined {
  for (const credential of disclosed?.credentials ?? []) {
    const leaf = credential.attributes?.[key];
    if (isLeaf(leaf) && leaf.value !== undefined && leaf.value !== null && leaf.value !== "") return String(leaf.value);
  }
  return undefined;
}
