import type { SavedModel } from "../services/modelService";

const SAVED_MODELS_PANEL_ID = "savedModelsPanel";
const SAVED_MODELS_LIST_ID = "savedModelsList";

type SavedModelOpenDetail = { modelId: number };

function ensureSavedModelsPanel(): {
  panel: HTMLDivElement;
  list: HTMLDivElement;
} {
  const host =
    (document.getElementById("panel-import") as HTMLDivElement | null) ??
    (document.getElementById("tool-panel") as HTMLDivElement | null) ??
    (document.body as unknown as HTMLDivElement);

  let panel = document.getElementById(
    SAVED_MODELS_PANEL_ID,
  ) as HTMLDivElement | null;
  let list = document.getElementById(
    SAVED_MODELS_LIST_ID,
  ) as HTMLDivElement | null;

  if (!panel) {
    panel = document.createElement("div");
    panel.id = SAVED_MODELS_PANEL_ID;
    panel.className = "tool-group";

    const titleRow = document.createElement("div");
    titleRow.className = "control-group";

    const title = document.createElement("label");
    title.className = "label-title";
    title.textContent = "Saved Models";

    titleRow.appendChild(title);

    list = document.createElement("div");
    list.id = SAVED_MODELS_LIST_ID;
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.gap = "6px";
    list.style.marginTop = "6px";

    panel.appendChild(titleRow);
    panel.appendChild(list);
    host.appendChild(panel);
  }

  if (!list) {
    list = document.createElement("div");
    list.id = SAVED_MODELS_LIST_ID;
    panel.appendChild(list);
  }

  // Bind once: delegate clicks to buttons inside the panel.
  if (panel.dataset.bound !== "1") {
    panel.addEventListener("click", (event) => {
      const target = event.target as HTMLElement | null;
      const btn = target?.closest(
        "button[data-model-id]",
      ) as HTMLButtonElement | null;
      if (!btn) return;

      const modelId = Number(btn.dataset.modelId);
      if (!Number.isFinite(modelId)) return;

      window.dispatchEvent(
        new CustomEvent<SavedModelOpenDetail>("saved-model:open", {
          detail: { modelId },
        }),
      );
    });

    panel.dataset.bound = "1";
  }

  return { panel, list };
}

export function renderSavedModels(models: SavedModel[]): void {
  const { list } = ensureSavedModelsPanel();
  list.replaceChildren();

  if (!models.length) {
    const empty = document.createElement("div");
    empty.style.fontSize = "12px";
    empty.style.color = "#888";
    empty.textContent = "No saved models (login to see your models).";
    list.appendChild(empty);
    return;
  }

  for (const model of models) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-tool";
    btn.dataset.modelId = String(model.model_id);

    const name = model.model_name?.trim() || `Model ${model.model_id}`;
    btn.textContent = `${name} (${model.file_format})`;

    list.appendChild(btn);
  }
}
