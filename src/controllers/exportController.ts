import type { ViewerState } from "../state/viewerState";
import type { AppElements } from "../utils/dom";
import { getAppElements } from "../utils/dom";
import { exportCorrectedModel, saveModelLocally } from "../three/modelExporter";
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
        getAppElements().newModelNameInput?.value || "simplified_model";
      const userId = getAppElements().emailInput?.value || "Default_User";
      // find way to make and get project Id
      saveModelLocally(
        this.viewerState,
        fileName,
        userId,
        (message: string) => {
          setStatus(this.elements.statusEl, message);
        },
      );
    });
  }
}
