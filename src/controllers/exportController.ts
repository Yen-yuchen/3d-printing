/**
 * Controller responsible for wiring export UI buttons to the export logic.
 *
 * This controller does not perform export itself; it delegates to
 * `exportCorrectedModel` in `three/modelExporter`.
 */
import type { ViewerState } from "../state/viewerState";
import type { AppElements } from "../utils/dom";
import type { AuthState } from "../state/authState";
import { getAppElements } from "../utils/dom";
import { exportCorrectedModel, saveModelLocally } from "../three/modelExporter";
import { setStatus } from "../views/statusView";

export class ExportController {
  private readonly viewerState: ViewerState;
  private readonly elements: AppElements;
  private readonly authState: AuthState;

  constructor(
    viewerState: ViewerState,
    elements: AppElements,
    authState: AuthState,
  ) {
    this.viewerState = viewerState;
    this.elements = elements;
    this.authState = authState;
  }

  public init(): void {
    this.elements.btnExportGLB?.addEventListener("click", () => {
      exportCorrectedModel(this.viewerState, "glb", (message: string) => {
        setStatus(this.elements.statusEl, message);
      });
    });

    this.elements.btnExportOBJ?.addEventListener("click", () => {
      exportCorrectedModel(this.viewerState, "obj", (message: string) => {
        setStatus(this.elements.statusEl, message);
      });
    });
    this.elements.btnLocalSave?.addEventListener("click", () => {
      const fileName =
        getAppElements().newModelNameInput?.value.trim() || "simplified_model";

      const token = this.authState.token;
      if (!token) {
        setStatus(this.elements.statusEl, "Please log in before saving.");
        return;
      }

      saveModelLocally(this.viewerState, fileName, token, (message: string) => {
        setStatus(this.elements.statusEl, message);
      });
    });
  }
}
