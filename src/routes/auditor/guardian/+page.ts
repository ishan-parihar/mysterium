// Auditor surface (`guardian`) — client-only: it reads the consent store and the Significator
// from localStorage, and an auditor surface that server-rendered would emit a profile
// shell before consent is checked (16 §2.4.1: a refused render returns a reason, never
// a partial payload).
// Re-exported, not re-declared: the serving decision lives in one place. See
// `src/lib/config/serving.ts` for why page loads are pre-rendered and what that
// does to the cost of a deploy.
export { ssr, prerender } from '$lib/config/serving.js';
