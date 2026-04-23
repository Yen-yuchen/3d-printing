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

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "saved-model-open-btn";
    openButton.textContent = `${name} (${model.file_format})`;

    openButton.addEventListener("click", () => {
      window.dispatchEvent(
        new CustomEvent<SavedModelOpenDetail>("saved-model:open", {
          detail: { modelId: model.model_id },
        }),
      );
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "saved-model-delete-btn";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();

      window.dispatchEvent(
        new CustomEvent<SavedModelDeleteDetail>("saved-model:delete", {
          detail: {
            modelId: model.model_id,
            modelName: name,
          },
        }),
      );
    });

    row.appendChild(openButton);
    row.appendChild(deleteButton);
    list.appendChild(row);
  }
}
