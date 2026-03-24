import type { ViewerState } from "../state/viewerState";
import type { AppElements } from "../utils/dom";
import type { AuthController } from "./authController";
import type { ModelLoaderService } from "../three/modelLoader";
import { saveModel } from "../services/modelService";
import { fetchProjects } from "../services/projectService";
import { setStatus } from "../views/statusView";

export class ModelController {
  private readonly viewerState: ViewerState;
  private readonly elements: AppElements;
  private readonly authController: AuthController;
  private readonly loader: ModelLoaderService;

  constructor(
    viewerState: ViewerState,
    elements: AppElements,
    authController: AuthController,
    loader: ModelLoaderService,
  ) {
    this.viewerState = viewerState;
    this.elements = elements;
    this.authController = authController;
    this.loader = loader;
  }

  public init(): void {
    this.elements.fileInput?.addEventListener("change", async (event) => {
      const input = event.target as HTMLInputElement;
      if (input.files?.length) {
        await this.loader.loadSelection(input.files);
        this.authController.render();
      }
      input.value = "";
    });

    this.elements.btnSaveModel?.addEventListener("click", async () => {
      if (
        !this.viewerState.lastLoadedFile ||
        !this.viewerState.lastLoadedFileName
      ) {
        alert("No model file loaded to save");
        return;
      }

      const token = this.authController.getToken();
      if (!token) {
        alert("Please login before saving");
        return;
      }

      try {
        const row = await saveModel({
          token,
          file: this.viewerState.lastLoadedFile,
          fileName: this.viewerState.lastLoadedFileName,
          modelId: this.viewerState.currentModelId,
        });

        if (row.model_id != null) {
          this.viewerState.currentModelId = Number(row.model_id);
        }

        setStatus(this.elements.statusEl, "Model saved");
        window.dispatchEvent(new Event("models:changed"));
      } catch (error) {
        console.error("Save error", error);
        alert(`Save failed: ${String(error)}`);
      }
    });

    this.elements.exportBtn?.addEventListener("click", async () => {
      try {
        const rows = await fetchProjects();
        console.log("Projects table:", rows);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      }
    });
  }
}
