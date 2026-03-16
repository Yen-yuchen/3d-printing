export function setStatus(statusEl: HTMLElement | null, message: string): void {
  if (statusEl) {
    statusEl.textContent = message;
  }
}
