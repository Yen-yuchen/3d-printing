import type { ViewerState } from "../state/viewerState";
import type { AppElements } from "../utils/dom";
import { exportCorrectedModel } from "../three/modelExporter";
import { setStatus } from "../views/statusView";

export class ExportController {
  private readonly viewerState: ViewerState;
  private readonly elements: AppElements;
  constructor(viewerState: ViewerState, elements: AppElements) {
    this.viewerState = viewerState;
    this.elements = elements;
  }

  public init(): void {
    this.elements.btnExportGLB?.addEventListener("click", () => {
      exportCorrectedModel(this.viewerState, "glb", (message) => {
        setStatus(this.elements.statusEl, message);
      });
    });

    this.elements.btnExportOBJ?.addEventListener("click", () => {
      exportCorrectedModel(this.viewerState, "obj", (message) => {
        setStatus(this.elements.statusEl, message);
      });
    });
  }
}
