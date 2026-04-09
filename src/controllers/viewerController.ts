import type { ViewerState } from "../state/viewerState";
import type { AppElements } from "../utils/dom";
import type { SceneManager } from "../three/sceneManager";
import type { AuthState } from "../state/authState";
import type { ModelLoaderService } from "../three/modelLoader";
import {
  applyDensityHeatmap,
  applyHelperVisibility,
  applyModelColor,
  applyModelVisibility,
  applyScaleFromSlider,
  applyWireframe,
} from "../three/meshOperations";
import {
  downloadSavedModelFile,
  fetchUserModels,
  deleteModel,
} from "../services/modelService";
import { renderSavedModels } from "../views/saveModelsView";
import { setStatus } from "../views/statusView";
import { applySimulatedVonMises } from "../three/stressAnalysis";

type SavedModelOpenDetail = { modelId: number };
type SavedModelDeleteDetail = { modelId: number; modelName: string };

export class ViewerController {
  private readonly viewerState: ViewerState;
  private readonly elements: AppElements;
  private readonly sceneManager: SceneManager;
  private readonly authState: AuthState;
  private readonly loader: ModelLoaderService;

  constructor(
    viewerState: ViewerState,
    elements: AppElements,
    sceneManager: SceneManager,
    authState: AuthState,
    loader: ModelLoaderService,
  ) {
    this.viewerState = viewerState;
    this.elements = elements;
    this.sceneManager = sceneManager;
    this.authState = authState;
    this.loader = loader;
  }

  public init(): void {
    this.elements.gridToggle?.addEventListener("change", () => {
      applyHelperVisibility(this.sceneManager, this.elements);
    });

    this.elements.modelToggle?.addEventListener("change", () => {
      applyModelVisibility(this.viewerState, this.sceneManager, this.elements);
    });

    this.elements.wireToggle?.addEventListener("change", () => {
      applyWireframe(this.viewerState, this.sceneManager, this.elements);
    });

    this.elements.scaleSlider?.addEventListener("input", () => {
      applyScaleFromSlider(this.viewerState, this.sceneManager, this.elements);
      applyWireframe(this.viewerState, this.sceneManager, this.elements);
    });

    this.elements.resetCamBtn?.addEventListener("click", () => {
      this.sceneManager.resetCamera();
    });

    this.elements.bgColorPicker?.addEventListener("input", (event) => {
      this.sceneManager.setBackground((event.target as HTMLInputElement).value);
    });

    this.elements.modelColorPicker?.addEventListener("input", (event) => {
      applyModelColor(
        this.viewerState,
        (event.target as HTMLInputElement).value,
      );
    });

    // this.elements.viewer.addEventListener("click", () => {
    //   applyDensityHeatmap(this.viewerState);
    // });

    this.elements.sxSlider?.addEventListener("input", () => {
      if (this.elements.sxValue && this.elements.sxSlider) {
        this.elements.sxValue.textContent = this.elements.sxSlider.value;
      }
      applySimulatedVonMises(this.viewerState, this.sceneManager);
    });

    this.elements.sySlider?.addEventListener("input", () => {
      if (this.elements.syValue && this.elements.sySlider) {
        this.elements.syValue.textContent = this.elements.sySlider.value;
      }
      applySimulatedVonMises(this.viewerState, this.sceneManager);
    });

    this.elements.szSlider?.addEventListener("input", () => {
      if (this.elements.szValue && this.elements.szSlider) {
        this.elements.szValue.textContent = this.elements.szSlider.value;
      }
      applySimulatedVonMises(this.viewerState, this.sceneManager);
    });

    this.elements.txySlider?.addEventListener("input", () => {
      if (this.elements.txyValue && this.elements.txySlider) {
        this.elements.txyValue.textContent = this.elements.txySlider.value;
      }
      applySimulatedVonMises(this.viewerState, this.sceneManager);
    });

    this.elements.tyzSlider?.addEventListener("input", () => {
      if (this.elements.tyzValue && this.elements.tyzSlider) {
        this.elements.tyzValue.textContent = this.elements.tyzSlider.value;
      }
      applySimulatedVonMises(this.viewerState, this.sceneManager);
    });

    this.elements.txzSlider?.addEventListener("input", () => {
      if (this.elements.txzValue && this.elements.txzSlider) {
        this.elements.txzValue.textContent = this.elements.txzSlider.value;
      }
      applySimulatedVonMises(this.viewerState, this.sceneManager);
    });

    if (this.elements.shapeButtons) {
      for (const button of this.elements.shapeButtons) {
        button.addEventListener("click", () => {
          this.sceneManager.changeShape(button.value);
        });
      }
    }

    this.elements.loadCaseSelector?.addEventListener("change", () => {
      const caseSelector = this.elements.loadCaseSelector;
      const caseValue = this.elements.loadCaseValue;
      if (caseValue && caseSelector) {
        caseValue.textContent =
          caseSelector.options[caseSelector.selectedIndex].text;
      }
    });

    window.addEventListener("auth:changed", () => {
      void this.loadSavedModels();
    });

    window.addEventListener("saved-model:open", (event) => {
      const detail = (event as CustomEvent<SavedModelOpenDetail>).detail;
      const modelId = detail?.modelId;
      if (Number.isFinite(modelId)) {
        void this.openSavedModel(modelId);
      }
    });

    window.addEventListener("saved-model:delete", (event) => {
      const detail = (event as CustomEvent<SavedModelDeleteDetail>).detail;
      const modelId = detail?.modelId;
      const modelName = detail?.modelName ?? "this model";

      if (Number.isFinite(modelId)) {
        void this.deleteSavedModel(modelId, modelName);
      }
    });

    window.addEventListener("models:changed", () => {
      void this.loadSavedModels();
    });

    void this.loadSavedModels();
  }

  public async refreshSavedModels(): Promise<void> {
    await this.loadSavedModels();
  }

  private async loadSavedModels(): Promise<void> {
    const token = this.authState.token;

    if (!token) {
      renderSavedModels([]);
      return;
    }

    try {
      const models = await fetchUserModels(token);
      console.log("Fetched models:", models);
      renderSavedModels(models);
    } catch (error) {
      console.error("Failed to load saved models:", error);
      renderSavedModels([]);
    }
  }

  private async openSavedModel(modelId: number): Promise<void> {
    const token = this.authState.token;
    if (!token) {
      setStatus(this.elements.statusEl, "Please login first.");
      return;
    }

    try {
      setStatus(this.elements.statusEl, "Downloading saved model...");
      const file = await downloadSavedModelFile(modelId, token);
      await this.loader.loadFile(file, modelId);
      setStatus(this.elements.statusEl, `Loaded saved model: ${file.name}`);
    } catch (error) {
      console.error("Failed to open saved model:", error);
      setStatus(this.elements.statusEl, "Failed to load saved model.");
    }
  }

  private async deleteSavedModel(
    modelId: number,
    modelName: string,
  ): Promise<void> {
    const token = this.authState.token;
    if (!token) {
      setStatus(this.elements.statusEl, "Please login first.");
      return;
    }

    const confirmed = window.confirm(`Delete "${modelName}"?`);
    if (!confirmed) return;

    try {
      setStatus(this.elements.statusEl, `Deleting "${modelName}"...`);
      await deleteModel(modelId, token);
      setStatus(this.elements.statusEl, `Deleted "${modelName}".`);
      window.dispatchEvent(new Event("models:changed"));
    } catch (error) {
      console.error("Failed to delete saved model:", error);
      setStatus(this.elements.statusEl, "Failed to delete saved model.");
    }
  }
}
