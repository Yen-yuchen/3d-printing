import * as THREE from "three";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
import { SimplifyModifier } from "three/examples/jsm/modifiers/SimplifyModifier.js";
import type { ViewerState } from "../state/viewerState";
import type { SceneManager } from "./sceneManager";
import type { AppElements } from "../utils/dom";
import { DEFAULT_MODEL_COLOR, SIMPLIFICATION } from "../utils/constants";
import { renderBudgetInfo } from "../views/meshToolsView";
import { setStatus } from "../views/statusView";
import { disposeObject3D, getFirstMesh, traverseMeshes } from "../utils/threeUtils";

const simplifyModifier = new SimplifyModifier();

export function getTargetObject(state: ViewerState, sceneManager: SceneManager): THREE.Object3D {
  return state.currentModel ?? sceneManager.cube;
}

export function mergeModelVertices(object: THREE.Object3D): void {
  traverseMeshes(object, (mesh) => {
    if (!mesh.geometry.isBufferGeometry) return;
    mesh.geometry = BufferGeometryUtils.mergeVertices(
      mesh.geometry,
      SIMPLIFICATION.mergeTolerance,
    );
    mesh.geometry.computeVertexNormals();

    if (!mesh.userData.originalGeometry) {
      mesh.userData.originalGeometry = mesh.geometry.clone();
    }
  });
}

export function clearCurrentModel(state: ViewerState, sceneManager: SceneManager): void {
  if (!state.currentModel) return;
  sceneManager.scene.remove(state.currentModel);
  disposeObject3D(state.currentModel);
  state.currentModel = null;
}

export function applyHelperVisibility(sceneManager: SceneManager, elements: AppElements): void {
  const showGrid = elements.gridToggle?.checked ?? true;
  sceneManager.gridHelper.visible = showGrid;
  sceneManager.axesHelper.visible = showGrid;
}

export function applyModelVisibility(state: ViewerState, sceneManager: SceneManager, elements: AppElements): void {
  const showModel = elements.modelToggle?.checked ?? true;
  if (state.currentModel) state.currentModel.visible = showModel;
  sceneManager.cube.visible = !state.currentModel && showModel;
}

export function applyScaleFromSlider(state: ViewerState, sceneManager: SceneManager, elements: AppElements): void {
  const sliderValue = Number(elements.scaleSlider?.value ?? 100);
  const factor = sliderValue / 100;
  const target = getTargetObject(state, sceneManager);
  target.scale.set(factor, factor, factor);
}

export function setWireframe(object: THREE.Object3D, enabled: boolean): void {
  object.traverse((child: any) => {
    if (!child?.isMesh) return;
    const material = child.material;
    if (Array.isArray(material)) {
      material.forEach((entry) => {
        if (entry) entry.wireframe = enabled;
      });
    } else if (material) {
      material.wireframe = enabled;
    }
  });
}

export function applyWireframe(state: ViewerState, sceneManager: SceneManager, elements: AppElements): void {
  const enabled = elements.wireToggle?.checked ?? false;
  const target = getTargetObject(state, sceneManager);
  setWireframe(target, enabled);
}

export function applyModelColor(state: ViewerState, colorHex: string): void {
  if (!state.currentModel) return;
  const color = new THREE.Color(colorHex || DEFAULT_MODEL_COLOR);
  traverseMeshes(state.currentModel, (mesh) => {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      if ((material as THREE.MeshStandardMaterial).color) {
        (material as THREE.MeshStandardMaterial).color.set(color);
      }
    });
  });
}

export function updateBudgetInputFromCurrent(state: ViewerState, elements: AppElements): void {
  if (!state.currentModel) return;

  let currentVertices = 0;
  let originalVertices = 0;

  traverseMeshes(state.currentModel, (mesh) => {
    currentVertices += mesh.geometry.attributes.position.count;
    if (mesh.userData.originalGeometry) {
      originalVertices += mesh.userData.originalGeometry.attributes.position.count;
    } else {
      originalVertices += mesh.geometry.attributes.position.count;
    }
  });

  renderBudgetInfo(elements, currentVertices, originalVertices);
}

export function performSimplification(
  state: ViewerState,
  elements: AppElements,
  targetType: "ratio" | "count",
  value: number,
): void {
  if (!state.currentModel) return;

  setStatus(elements.statusEl, "Computing simplification...");

  setTimeout(() => {
    let currentTotalVertices = 0;

    traverseMeshes(state.currentModel!, (mesh) => {
      if (!mesh.userData.originalGeometry) {
        mesh.userData.originalGeometry = mesh.geometry.clone();
      }

      const originalGeometry = mesh.userData.originalGeometry as THREE.BufferGeometry;
      const originalCount = originalGeometry.attributes.position.count;
      let targetCount = 0;

      if (targetType === "ratio") {
        targetCount = Math.floor(originalCount * (1 - value));
      } else {
        const globalOriginal = parseInt(elements.originalCountLabel?.textContent || "1", 10);
        let removeRatio = value / globalOriginal;
        removeRatio = Math.max(0, Math.min(1, removeRatio));
        targetCount = Math.floor(originalCount * (1 - removeRatio));
      }

      const absoluteMin = SIMPLIFICATION.absoluteMinVertices;
      const percentageMin = Math.floor(originalCount * SIMPLIFICATION.minPercentOfOriginal);
      const minLimit = Math.max(absoluteMin, percentageMin);

      if (targetCount < minLimit) {
        targetCount = minLimit;
      }

      if (targetCount >= originalCount * 0.99) {
        mesh.geometry.dispose();
        mesh.geometry = originalGeometry.clone();
        currentTotalVertices += originalCount;
        return;
      }

      try {
        const simplified = simplifyModifier.modify(originalGeometry.clone(), targetCount);
        mesh.geometry.dispose();
        mesh.geometry = simplified;
        currentTotalVertices += simplified.attributes.position.count;
      } catch (error) {
        console.error("Simplify failed", error);
        mesh.geometry.dispose();
        mesh.geometry = originalGeometry.clone();
        currentTotalVertices += originalCount;
      }
    });

    if (elements.polyCountLabel) {
      elements.polyCountLabel.textContent = `Current Vertices: ${currentTotalVertices}`;
    }

    setStatus(elements.statusEl, "Simplification complete");
  }, 50);
}

export function applyDensityHeatmap(state: ViewerState): void {
  const mesh = getFirstMesh(state.currentModel);
  if (!mesh || !mesh.geometry.isBufferGeometry) return;

  const position = mesh.geometry.attributes.position;
  const index = mesh.geometry.index;
  if (!position || !index) return;

  const vertexCount = position.count;
  const density = new Array<number>(vertexCount).fill(0);
  const numFaces = new Array<number>(vertexCount).fill(0);

  for (let j = 0; j < index.count; j += 3) {
    const aIndex = index.getX(j);
    const bIndex = index.getX(j + 1);
    const cIndex = index.getX(j + 2);

    const a = new THREE.Vector3(position.getX(aIndex), position.getY(aIndex), position.getZ(aIndex));
    const b = new THREE.Vector3(position.getX(bIndex), position.getY(bIndex), position.getZ(bIndex));
    const c = new THREE.Vector3(position.getX(cIndex), position.getY(cIndex), position.getZ(cIndex));

    const ab = b.clone().sub(a);
    const ac = c.clone().sub(a);
    const faceDensity = ab.cross(ac).length();

    numFaces[aIndex]++;
    numFaces[bIndex]++;
    numFaces[cIndex]++;

    density[aIndex] += faceDensity;
    density[bIndex] += faceDensity;
    density[cIndex] += faceDensity;
  }

  let maxDensity = -Infinity;
  let minDensity = Infinity;

  for (let i = 0; i < vertexCount; i++) {
    if (numFaces[i] > 0) density[i] /= numFaces[i];
    maxDensity = Math.max(maxDensity, density[i]);
    minDensity = Math.min(minDensity, density[i]);
  }

  const colors: number[] = [];
  const color = new THREE.Color();

  for (let i = 0; i < vertexCount; i++) {
    const t = maxDensity !== minDensity ? (density[i] - minDensity) / (maxDensity - minDensity) : 0;
    color.setHSL(t * 0.66, 1.0, 0.5);
    colors.push(color.r, color.g, color.b);
  }

  mesh.geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const material = mesh.material as THREE.MeshStandardMaterial;
  material.vertexColors = true;
  material.needsUpdate = true;
}
