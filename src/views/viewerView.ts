import type { AppElements } from "../utils/dom";

export function syncViewerToggles(elements: AppElements): void {
  if (elements.gridToggle && elements.gridToggle.checked === undefined) {
    elements.gridToggle.checked = true;
  }
  if (elements.modelToggle && elements.modelToggle.checked === undefined) {
    elements.modelToggle.checked = true;
  }
}
