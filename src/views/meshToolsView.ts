import type { AppElements } from "../utils/dom";

export function syncReduceTargetMode(elements: AppElements): void {
  const mode = elements.reduceTargetSelect?.value;
  if (elements.controlPercent) {
    elements.controlPercent.style.display = mode === "percentage" ? "block" : "none";
  }
  if (elements.controlBudget) {
    elements.controlBudget.style.display = mode === "percentage" ? "none" : "block";
  }
}

export function renderMeshSliderLive(elements: AppElements, percent: number): void {
  if (elements.meshValue) {
    elements.meshValue.textContent = `${percent}% (Release)`;
    elements.meshValue.style.color = "#ffff00";
  }
}

export function renderMeshSliderCommitted(elements: AppElements, percent: number): void {
  if (elements.meshValue) {
    elements.meshValue.textContent = `${percent}%`;
    elements.meshValue.style.color = "#ff9800";
  }
}

export function renderBudgetInfo(
  elements: AppElements,
  currentVertices: number,
  originalVertices: number,
): void {
  if (elements.budgetInput) {
    elements.budgetInput.value = currentVertices.toString();
  }
  if (elements.originalCountLabel) {
    elements.originalCountLabel.textContent = originalVertices.toString();
  }
  if (elements.polyCountLabel) {
    elements.polyCountLabel.textContent = `Current Vertices: ${currentVertices}`;
  }
}
