import * as THREE from "three";
import type { ViewerState } from "../state/viewerState";
import type { SceneManager } from "./sceneManager";
import type { AppElements } from "../utils/dom";
import { getFirstMesh } from "../utils/threeUtils";
import { renderBudgetInfo } from "../views/meshToolsView";

export class CheckpointManager {
  private checkpointGeometry: THREE.BufferGeometry | null = null;
  private checkpointMesh: THREE.Mesh | null = null;
  private isGhostVisible = false;

  constructor(
    private readonly state: ViewerState,
    private readonly sceneManager: SceneManager,
    private readonly elements: AppElements,
  ) {}

  public saveCheckpoint(): boolean {
    const mesh = getFirstMesh(this.state.currentModel);
    if (!mesh) return false;

    this.checkpointGeometry = mesh.geometry.clone();
    this.updateGhostOverlay();
    return true;
  }

  public restoreCheckpoint(): boolean {
    if (!this.state.currentModel || !this.checkpointGeometry) return false;

    this.state.currentModel.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      mesh.geometry.dispose();
      mesh.geometry = this.checkpointGeometry!.clone();

      const currentVertices = mesh.geometry.attributes.position.count;
      const originalVertices = mesh.userData.originalGeometry
        ? mesh.userData.originalGeometry.attributes.position.count
        : currentVertices;

      let restoredPercentage = Math.round((currentVertices / originalVertices) * 100);
      restoredPercentage = Math.max(0, Math.min(100, restoredPercentage));

      if (this.elements.meshSlider) {
        this.elements.meshSlider.value = restoredPercentage.toString();
      }
      if (this.elements.meshValue) {
        this.elements.meshValue.textContent = `${restoredPercentage}%`;
        this.elements.meshValue.style.color = "#ff9800";
      }

      renderBudgetInfo(this.elements, currentVertices, originalVertices);
    });

    return true;
  }

  public toggleOverlay(): boolean {
    if (!this.checkpointGeometry) return false;
    if (!this.checkpointMesh) {
      this.updateGhostOverlay();
    }
    this.isGhostVisible = !this.isGhostVisible;
    if (this.checkpointMesh) {
      this.checkpointMesh.visible = this.isGhostVisible;
    }
    return this.isGhostVisible;
  }

  public updateGhostOverlay(): void {
    if (!this.checkpointGeometry) return;

    if (this.checkpointMesh) {
      this.sceneManager.scene.remove(this.checkpointMesh);
      this.checkpointMesh.geometry.dispose();
      this.checkpointMesh = null;
    }

    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
      depthTest: true,
    });

    this.checkpointMesh = new THREE.Mesh(this.checkpointGeometry.clone(), material);
    this.checkpointMesh.visible = false;

    const targetMesh = getFirstMesh(this.state.currentModel);
    if (targetMesh) {
      const worldPos = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();
      const worldScale = new THREE.Vector3();

      targetMesh.getWorldPosition(worldPos);
      targetMesh.getWorldQuaternion(worldQuat);
      targetMesh.getWorldScale(worldScale);

      this.checkpointMesh.position.copy(worldPos);
      this.checkpointMesh.quaternion.copy(worldQuat);
      this.checkpointMesh.scale.copy(worldScale).multiplyScalar(1.01);
    }

    this.sceneManager.scene.add(this.checkpointMesh);
  }
}
