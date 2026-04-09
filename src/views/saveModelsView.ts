import type { SavedModel } from "../services/modelService";

const SAVED_MODELS_LIST_ID = "savedModelsList";

type SavedModelOpenDetail = { modelId: number };
type SavedModelDeleteDetail = { modelId: number; modelName: string };

function getSavedModelsList(): HTMLDivElement {
  const list = document.getElementById(
    SAVED_MODELS_LIST_ID,
  ) as HTMLDivElement | null;

  if (!list) {
    throw new Error(
      "Saved models list is missing. Expected #savedModelsList in index.html",
    );
  }

  return list;
}

export function renderSavedModels(models: SavedModel[]): void {
  const list = getSavedModelsList();
  list.replaceChildren();

  if (!models.length) {
    const empty = document.createElement("div");
    empty.className = "saved-model-empty";
    empty.textContent = "No saved models.";
    list.appendChild(empty);
    return;
  }

  for (const model of models) {
    const row = document.createElement("div");
    row.className = "saved-model-row";
    row.dataset.modelId = String(model.model_id);

    const name = model.model_name?.trim() || `Model ${model.model_id}`;

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "saved-model-open-btn";
    openBtn.textContent = `${name} (${model.file_format})`;

    openBtn.addEventListener("click", () => {
      window.dispatchEvent(
        new CustomEvent<SavedModelOpenDetail>("saved-model:open", {
          detail: { modelId: model.model_id },
        }),
      );
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "saved-model-delete-btn";
    deleteBtn.textContent = "Delete";

    deleteBtn.addEventListener("click", () => {
      window.dispatchEvent(
        new CustomEvent<SavedModelDeleteDetail>("saved-model:delete", {
          detail: {
            modelId: model.model_id,
            modelName: name,
          },
        }),
      );
    });

    row.appendChild(openBtn);
    row.appendChild(deleteBtn);
    list.appendChild(row);
  }
}
