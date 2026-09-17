// Minimal `$env/dynamic/private` stub for the vitest pipeline.
// Server-route code (api/llm/_lib.ts) imports it; no test reaches those routes,
// so an empty env object is sufficient — it only needs to resolve.
export const env: Record<string, string | undefined> = {};
