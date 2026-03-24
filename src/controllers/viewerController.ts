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
} from "../services/modelService";
import { renderSavedModels } from "../views/saveModelsView";
import { setStatus } from "../views/statusView";

type SavedModelOpenDetail = { modelId: number };

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

    // Refresh list immediately on login/logout
    window.addEventListener("auth:changed", () => {
      void this.loadSavedModels();
    });

    // Click on a saved model button -> download + load into viewer
    window.addEventListener("saved-model:open", (event) => {
      const detail = (event as CustomEvent<SavedModelOpenDetail>).detail;
      const modelId = detail?.modelId;
      if (Number.isFinite(modelId)) {
        void this.openSavedModel(modelId);
      }
    });

    // Refresh list after saving a model
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
}
