/**
 * window.confirm() throws (or is simply unavailable) in some preview
 * contexts — e.g. an embedded webview that blocks synchronous dialogs —
 * which otherwise crashes the click handler with an uncaught exception,
 * tripping Vite's full-page error overlay and freezing every input on the
 * page behind it. Falls back to proceeding rather than blocking: every
 * caller here guards a recoverable action (a form field overwrite, or
 * deleting only regenerable simulation artifacts), so a missed confirmation
 * is far cheaper than a frozen page.
 */
export function safeConfirm(message: string): boolean {
  try {
    return window.confirm(message);
  } catch {
    return true;
  }
}
