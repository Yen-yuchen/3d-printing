import type { ViewerState } from "../state/viewerState";
import type { AppElements } from "../utils/dom";
import type { SceneManager } from "../three/sceneManager";
import { CheckpointManager } from "../three/checkpointManager";
import { applySimulatedVonMises } from "../three/stressAnalysis";
import { performSimplification, updateBudgetInputFromCurrent, performSubdivision } from "../three/meshOperations";
import {
  renderCheckpointSaved,
  renderCheckpointToggle,
} from "../views/checkpointView";
import {
  renderMeshSliderCommitted,
  renderMeshSliderLive,
  syncReduceTargetMode,
} from "../views/meshToolsView";
import { setStatus } from "../views/statusView";

export class MeshController {
  constructor(
    private readonly viewerState: ViewerState,
    private readonly elements: AppElements,
    private readonly sceneManager: SceneManager,
    private readonly checkpointManager: CheckpointManager,
  ) {}

  public init(): void {
    syncReduceTargetMode(this.elements);

    this.elements.reduceTargetSelect?.addEventListener("change", () => {
      syncReduceTargetMode(this.elements);
      if (this.elements.reduceTargetSelect?.value !== "percentage") {
        updateBudgetInputFromCurrent(this.viewerState, this.elements);
      }
    });

    this.elements.meshSlider?.addEventListener("input", () => {
      renderMeshSliderLive(this.elements, parseInt(this.elements.meshSlider!.value, 10));
    });

    this.elements.meshSlider?.addEventListener("change", () => {
      const percent = parseInt(this.elements.meshSlider!.value, 10);
      renderMeshSliderCommitted(this.elements, percent);
      performSimplification(this.viewerState, this.elements, "ratio", percent / 100);
    });

    this.elements.btnApplyBudget?.addEventListener("click", () => {
      const budget = parseInt(this.elements.budgetInput?.value ?? "", 10);
      if (Number.isNaN(budget) || budget < 4) {
        alert("Please enter a valid vertex count");
        return;
      }
      performSimplification(this.viewerState, this.elements, "count", budget);
    });

    this.elements.btnSubdivision?.addEventListener("click", () => {
      if (!this.viewerState.currentModel) {
        setStatus(this.elements.statusEl, "No model loaded");
        return;
      }
      const maxEdgeLength = parseFloat(this.elements.subdivisionEdgeSlider?.value ?? "0.5");
      const maxIterations = parseInt(this.elements.subdivisionIterInput?.value ?? "2", 10);
      performSubdivision(this.viewerState, this.elements, maxEdgeLength, maxIterations);
    });

    this.elements.subdivisionEdgeSlider?.addEventListener("input", () => {
      if (this.elements.subdivisionEdgeValue) {
        this.elements.subdivisionEdgeValue.textContent = 
          parseFloat(this.elements.subdivisionEdgeSlider!.value).toFixed(1);
      }
    });

    this.elements.btnSaveCheckpoint?.addEventListener("click", () => {
      const saved = this.checkpointManager.saveCheckpoint();
      if (!saved) return;
      renderCheckpointSaved(this.elements);
      console.log("Checkpoint saved");
    });

    this.elements.btnRestoreCheckpoint?.addEventListener("click", () => {
      const restored = this.checkpointManager.restoreCheckpoint();
      if (restored) {
        console.log("Model restored from checkpoint and UI synced.");
      }
    });

    this.elements.btnToggleCheckpoint?.addEventListener("click", () => {
      const visible = this.checkpointManager.toggleOverlay();
      renderCheckpointToggle(this.elements, visible);
    });

    this.elements.btnStressAnalysis?.addEventListener("click", () => {
      if (!this.viewerState.currentModel) return;
      setStatus(this.elements.statusEl, "Computing Von Mises Stress (Simulated)...");
      applySimulatedVonMises(this.viewerState);
      setStatus(this.elements.statusEl, "Von Mises Analysis Complete: Red = High Stress");
    });
  }
}
