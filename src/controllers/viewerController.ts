import type { ViewerState } from "../state/viewerState";
import type { AppElements } from "../utils/dom";
import type { SceneManager } from "../three/sceneManager";
import type { AuthState } from "../state/authState";
import {
  applyDensityHeatmap,
  applyHelperVisibility,
  applyModelColor,
  applyModelVisibility,
  applyScaleFromSlider,
  applyWireframe,
} from "../three/meshOperations";
import { fetchUserModels } from "../services/modelService";
import { renderSavedModels } from "../views/saveModelsView";

export class ViewerController {
  private readonly viewerState: ViewerState;
  private readonly elements: AppElements;
  private readonly sceneManager: SceneManager;
  private readonly authState: AuthState;

  constructor(
    viewerState: ViewerState,
    elements: AppElements,
    sceneManager: SceneManager,
    authState: AuthState,
  ) {
    this.viewerState = viewerState;
    this.elements = elements;
    this.sceneManager = sceneManager;
    this.authState = authState;
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

    this.elements.viewer.addEventListener("click", () => {
      applyDensityHeatmap(this.viewerState);
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
}
