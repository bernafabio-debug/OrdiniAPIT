import { getCloudflareContext } from "@opennextjs/cloudflare";

// @opennextjs/cloudflare dichiara globalmente l'interfaccia CloudflareEnv:
// qui la estendiamo con i binding specifici di questo progetto (declaration merging),
// invece di ridefinirla da zero.
declare global {
  interface CloudflareEnv {
    DB: D1Database;
    SESSION_SECRET: string;
  }
}

/**
 * Restituisce il binding del database D1 per l'ambiente Cloudflare corrente.
 * Va chiamata solo dentro Route Handlers / Server Components eseguiti su Cloudflare.
 */
export function getDB(): D1Database {
  const { env } = getCloudflareContext();
  return env.DB;
}

export function getSessionSecret(): string {
  const { env } = getCloudflareContext();
  return env.SESSION_SECRET || "dev-secret-change-me";
}

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
