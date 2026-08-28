import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface CloudflareEnv {
  DB: D1Database;
  ASSETS: Fetcher;
  SESSION_SECRET: string;
}

/**
 * Restituisce il binding del database D1 per l'ambiente Cloudflare corrente.
 * Va chiamata solo dentro Route Handlers / Server Components eseguiti su Cloudflare.
 */
export function getDB(): D1Database {
  const { env } = getCloudflareContext<CloudflareEnv>();
  return env.DB;
}

export function getSessionSecret(): string {
  const { env } = getCloudflareContext<CloudflareEnv>();
  return env.SESSION_SECRET || "dev-secret-change-me";
}

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
