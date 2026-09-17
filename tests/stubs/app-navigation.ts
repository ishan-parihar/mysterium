// Minimal `$app/navigation` stub for the vitest pipeline (see app-environment.ts).
// routeGuard.ts imports `goto`; no test asserts navigation, only that the
// module resolves and calls are safe no-ops in a node environment.
type BeforeNavigate = (navigation: { cancel: () => void }) => void;
type AfterNavigate = (navigation: { to: URL | null }) => void;

export async function goto(_url: string | URL, _opts?: unknown): Promise<unknown> {
  return undefined;
}
export async function invalidate(_url: string | URL | (string | URL)[]): Promise<void> {}
export async function invalidateAll(): Promise<void> {}
export async function preloadData(): Promise<unknown> {
  return undefined;
}
export async function preloadCode(): Promise<unknown> {
  return undefined;
}
export function beforeNavigate(fn: BeforeNavigate): void {
  void fn;
}
export function afterNavigate(fn: AfterNavigate): void {
  void fn;
}
export function onNavigate(fn: (navigation: { complete: Promise<boolean> }) => void): void {
  void fn;
}
