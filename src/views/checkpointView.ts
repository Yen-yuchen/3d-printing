import type { AppElements } from "../utils/dom";

export function renderCheckpointSaved(elements: AppElements): void {
  if (elements.btnRestoreCheckpoint) elements.btnRestoreCheckpoint.disabled = false;
  if (elements.btnToggleCheckpoint) elements.btnToggleCheckpoint.disabled = false;

  if (elements.checkpointStatus) {
    const time = new Date().toLocaleTimeString();
    elements.checkpointStatus.textContent = `Saved at ${time}`;
    elements.checkpointStatus.style.color = "#4caf50";
  }
}

export function renderCheckpointToggle(elements: AppElements, visible: boolean): void {
  if (!elements.btnToggleCheckpoint) return;
  elements.btnToggleCheckpoint.style.background = visible ? "#d9534f" : "";
  elements.btnToggleCheckpoint.innerHTML = visible
    ? '<i class="fa-solid fa-ghost"></i> Hide Overlay'
    : '<i class="fa-solid fa-ghost"></i> Show Overlay';
}
