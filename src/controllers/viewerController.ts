import type { ViewerState } from "../state/viewerState";
import type { AppElements } from "../utils/dom";
import type { SceneManager } from "../three/sceneManager";
import {
  applyDensityHeatmap,
  applyHelperVisibility,
  applyModelColor,
  applyModelVisibility,
  applyScaleFromSlider,
  applyWireframe,
} from "../three/meshOperations";

export class ViewerController {
  constructor(
    private readonly viewerState: ViewerState,
    private readonly elements: AppElements,
    private readonly sceneManager: SceneManager,
  ) {}

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
      applyModelColor(this.viewerState, (event.target as HTMLInputElement).value);
    });

    this.elements.viewer.addEventListener("click", () => {
      applyDensityHeatmap(this.viewerState);
    });
  }
}
