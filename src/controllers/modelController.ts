import type { ViewerState } from "../state/viewerState";
import type { AppElements } from "../utils/dom";
import type { AuthController } from "./authController";
import type { ModelLoaderService } from "../three/modelLoader";
import { saveModel } from "../services/modelService";
import { fetchProjects } from "../services/projectService";
import { setStatus } from "../views/statusView";

/**
 * Controller responsible for model loading and save actions.
 *
 * This controller manages:
 * - local file selection from the user
 * - loading selected files into the viewer
 * - authenticated save requests to the backend
 * - project fetch/debug action tied to the export button
 */
export class ModelController {
  private readonly viewerState: ViewerState;
  private readonly elements: AppElements;
  private readonly authController: AuthController;
  private readonly loader: ModelLoaderService;

  /**
   * Creates a new ModelController.
   *
   * @param viewerState - Shared viewer state containing current model data
   * @param elements - Cached DOM references for model controls
   * @param authController - Auth controller used to check current login token
   * @param loader - Service responsible for reading/loading model files
   */
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

  /**
   * Initializes model-related UI event handlers.
   *
   * Registered actions:
   * - load selected file into viewer
   * - save current model to backend
   * - fetch project rows for debugging/export-related inspection
   */
  public init(): void {
    this.elements.fileInput?.addEventListener("change", async (event) => {
      const input = event.target as HTMLInputElement;

      if (input.files?.length) {
        await this.loader.loadSelection(input.files);

        /**
         * Re-render auth-dependent controls after loading a model
         * so save state updates immediately.
         */
        this.authController.render();
      }

      /**
       * Clear input so selecting the same file again still triggers change.
       */
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

        /**
         * If the backend returns a model_id, store it so future saves can
         * update the same record instead of creating a new one.
         */
        if (row.model_id != null) {
          this.viewerState.currentModelId = Number(row.model_id);
        }

        setStatus(this.elements.statusEl, "Model saved");

        /**
         * Notify other parts of the UI that the saved-model list changed.
         */
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
