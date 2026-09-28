// Auditor surface (`guardian`) — client-only: it reads the consent store and the Significator
// from localStorage, and an auditor surface that server-rendered would emit a profile
// shell before consent is checked (16 §2.4.1: a refused render returns a reason, never
// a partial payload).
export const ssr = false;
export const prerender = false;
