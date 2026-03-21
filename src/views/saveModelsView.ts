import type { SavedModel } from "../services/modelService";

export function renderSavedModels(
  models: SavedModel[],
  onModelClick?: (model: SavedModel) => void,
): void {
  const container = document.getElementById("savedModelsList");
  if (!container) return;

  container.innerHTML = "";

  if (models.length === 0) {
    container.innerHTML = `<div class="status-text">No saved models yet.</div>`;
    return;
  }

  for (const model of models) {
    const item = document.createElement("div");
    item.className = "saved-model-item";
    item.dataset.modelId = String(model.model_id);

    item.innerHTML = `
      <div class="saved-model-name">${model.model_name}</div>
      <div class="saved-model-meta">
        ${model.file_format.toUpperCase()} • ${new Date(model.uploaded_at).toLocaleString()}
      </div>
    `;

    if (onModelClick) {
      item.addEventListener("click", () => onModelClick(model));
    }

    container.appendChild(item);
  }
}
