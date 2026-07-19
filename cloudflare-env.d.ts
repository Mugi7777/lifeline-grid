declare namespace Cloudflare {
  interface Env {
    ASSETS: Fetcher;
    DB: D1Database;
    OPENAI_API_KEY?: string;
    AUTHORITY_TRUST_REGISTRY_JSON?: string;
  }
}
