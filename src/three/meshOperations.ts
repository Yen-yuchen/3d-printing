import * as THREE from "three";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
import { SimplifyModifier } from "three/examples/jsm/modifiers/SimplifyModifier.js";
import { TessellateModifier } from "three/examples/jsm/modifiers/TessellateModifier.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";

import type { ViewerState } from "../state/viewerState";
import type { SceneManager } from "./sceneManager";
import type { AppElements } from "../utils/dom";

import { DEFAULT_MODEL_COLOR, SIMPLIFICATION } from "../utils/constants";
import { renderBudgetInfo } from "../views/meshToolsView";
import { setStatus } from "../views/statusView";
import {
  disposeObject3D,
  getFirstMesh,
  traverseMeshes,
} from "../utils/threeUtils";

const simplifyModifier = new SimplifyModifier();

export function getTargetObject(
  state: ViewerState,
  sceneManager: SceneManager,
): THREE.Object3D {
  return state.currentModel ?? sceneManager.shape;
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

export function clearCurrentModel(
  state: ViewerState,
  sceneManager: SceneManager,
): void {
  if (!state.currentModel) return;

  sceneManager.scene.remove(state.currentModel);
  disposeObject3D(state.currentModel);
  state.currentModel = null;
}

export function applyHelperVisibility(
  sceneManager: SceneManager,
  elements: AppElements,
): void {
  const showGrid = elements.gridToggle?.checked ?? true;
  sceneManager.gridHelper.visible = showGrid;
  sceneManager.axesHelper.visible = showGrid;
}

export function applyModelVisibility(
  state: ViewerState,
  sceneManager: SceneManager,
  elements: AppElements,
): void {
  const showModel = elements.modelToggle?.checked ?? true;
  if (state.currentModel) state.currentModel.visible = showModel;
  sceneManager.shape.visible = !state.currentModel && showModel;
}

export function applyScaleFromSlider(
  state: ViewerState,
  sceneManager: SceneManager,
  elements: AppElements,
): void {
  const sliderValue = Number(elements.scaleSlider?.value ?? 100);
  const factor = sliderValue / 100;
  const target = getTargetObject(state, sceneManager);
  target.scale.set(factor, factor, factor);
}

export function setWireframe(object: THREE.Object3D, enabled: boolean): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;

    const material = mesh.material;
    if (Array.isArray(material)) {
      material.forEach((entry) => {
        if (entry && "wireframe" in entry) {
          entry.wireframe = enabled;
        }
      });
    } else if (material && "wireframe" in material) {
      material.wireframe = enabled;
    }
  });
}

export function applyWireframe(
  state: ViewerState,
  sceneManager: SceneManager,
  elements: AppElements,
): void {
  const enabled = elements.wireToggle?.checked ?? false;
  const target = getTargetObject(state, sceneManager);
  setWireframe(target, enabled);
}

export function applyModelColor(state: ViewerState, colorHex: string): void {
  if (!state.currentModel) return;

  const color = new THREE.Color(colorHex || DEFAULT_MODEL_COLOR);
  traverseMeshes(state.currentModel, (mesh) => {
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];

    materials.forEach((material) => {
      if ((material as THREE.MeshStandardMaterial).color) {
        (material as THREE.MeshStandardMaterial).color.set(color);
      }
    });
  });
}

export function updateBudgetInputFromCurrent(
  state: ViewerState,
  elements: AppElements,
): void {
  if (!state.currentModel) return;

  let currentVertices = 0;
  let originalVertices = 0;

  traverseMeshes(state.currentModel, (mesh) => {
    currentVertices += mesh.geometry.attributes.position.count;

    if (mesh.userData.originalGeometry) {
      originalVertices +=
        mesh.userData.originalGeometry.attributes.position.count;
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
    if (!state.currentModel) return;

    let currentTotalVertices = 0;

    traverseMeshes(state.currentModel, (mesh) => {
      if (!mesh.userData.originalGeometry) {
        mesh.userData.originalGeometry = mesh.geometry.clone();
      }

      const originalGeometry = mesh.userData
        .originalGeometry as THREE.BufferGeometry;
      const originalCount = originalGeometry.attributes.position.count;

      let keepCount =
        targetType === "ratio" ? Math.floor(originalCount * value) : value;

      const absoluteMin = SIMPLIFICATION.absoluteMinVertices;
      const percentageMin = Math.floor(
        originalCount * SIMPLIFICATION.minPercentOfOriginal,
      );
      const minKeepLimit = Math.max(absoluteMin, percentageMin);

      if (keepCount < minKeepLimit) keepCount = minKeepLimit;
      if (keepCount > originalCount) keepCount = originalCount;

      if (keepCount >= originalCount * 0.99) {
        mesh.geometry.dispose();
        mesh.geometry = originalGeometry.clone();
        currentTotalVertices += originalCount;
        return;
      }

      const removeCount = originalCount - keepCount;

      try {
        const simplified = simplifyModifier.modify(
          originalGeometry.clone(),
          removeCount,
        );
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

    const a = new THREE.Vector3(
      position.getX(aIndex),
      position.getY(aIndex),
      position.getZ(aIndex),
    );
    const b = new THREE.Vector3(
      position.getX(bIndex),
      position.getY(bIndex),
      position.getZ(bIndex),
    );
    const c = new THREE.Vector3(
      position.getX(cIndex),
      position.getY(cIndex),
      position.getZ(cIndex),
    );

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
    const t =
      maxDensity !== minDensity
        ? (density[i] - minDensity) / (maxDensity - minDensity)
        : 0;
    color.setHSL(t * 0.66, 1, 0.5);
    colors.push(color.r, color.g, color.b);
  }

  mesh.geometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(colors, 3),
  );

  const materials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];
  materials.forEach((material) => {
    if (material instanceof THREE.MeshStandardMaterial) {
      material.vertexColors = true;
      material.needsUpdate = true;
    }
  });
}

export function performSubdivision(
  state: ViewerState,
  elements: AppElements,
  maxEdgeLength: number = 0.5,
  maxIterations: number = 2,
): void {
  if (!state.currentModel) return;

  setStatus(elements.statusEl, "Computing mesh subdivision...");

  state.currentModel.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;

    let geometry = mesh.geometry;
    if (geometry.index !== null) {
      geometry = geometry.toNonIndexed();
    }

    const modifier = new TessellateModifier(maxEdgeLength, maxIterations);

    try {
      const subdividedGeo = modifier.modify(geometry);
      mesh.geometry.dispose();
      mesh.geometry = subdividedGeo;

      const currentVerts = subdividedGeo.attributes.position.count;
      if (elements.polyCountLabel) {
        elements.polyCountLabel.textContent = `Current Vertices: ${currentVerts}`;
      }

      console.log(`Subdivision complete. New vertex count: ${currentVerts}`);
    } catch (error) {
      console.error("Subdivision failed", error);
    }
  });

  setStatus(elements.statusEl, "Subdivision complete");
}

export function createPrintableWireframe(
  originalGeometry: THREE.BufferGeometry,
  material: THREE.Material,
  thickness: number = 0.5,
): THREE.Mesh {
  const geometriesToMerge: THREE.BufferGeometry[] = [];
  const latticeCylinders: THREE.BufferGeometry[] = [];

  const sphereGeoTemplate = new THREE.SphereGeometry(thickness * 1.05, 8, 8);

  const edgesGeometry = new THREE.EdgesGeometry(originalGeometry);
  const positionAttribute = edgesGeometry.attributes.position;
  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();

  for (let i = 0; i < positionAttribute.count; i += 2) {
    p1.fromBufferAttribute(positionAttribute, i);
    p2.fromBufferAttribute(positionAttribute, i + 1);

    const distance = p1.distanceTo(p2);
    const cylinderGeo = new THREE.CylinderGeometry(
      thickness,
      thickness,
      distance,
      8,
      1,
      false,
    );
    cylinderGeo.translate(0, distance / 2, 0);
    cylinderGeo.rotateX(Math.PI / 2);
    const matrix = new THREE.Matrix4();
    matrix.lookAt(p2, p1, new THREE.Vector3(0, 1, 0));
    matrix.setPosition(p1);
    cylinderGeo.applyMatrix4(matrix);
    geometriesToMerge.push(cylinderGeo);
  }

  const posGeo = originalGeometry.attributes.position;
  for (let i = 0; i < posGeo.count; i++) {
    const p = new THREE.Vector3().fromBufferAttribute(posGeo, i);
    const sphere = sphereGeoTemplate.clone();
    sphere.translate(p.x, p.y, p.z);
    geometriesToMerge.push(sphere);
  }

  const surfaceWireframeGeo = mergeGeometries(geometriesToMerge);

  const spacing = thickness * 8;
  const fwdLatticeMatrix = new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler(Math.PI / 4, 0, Math.PI / 4),
  );
  const invLatticeMatrix = fwdLatticeMatrix.clone().invert();

  const raycastGeo = originalGeometry.clone().applyMatrix4(invLatticeMatrix);
  raycastGeo.computeBoundingBox();
  const box = raycastGeo.boundingBox!;

  const rayTarget = new THREE.Mesh(
    raycastGeo,
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
  );
  const raycaster = new THREE.Raycaster();
  const posAttr = rayTarget.geometry.attributes
    .position as THREE.BufferAttribute;

  const minX = box.min.x;
  const maxX = box.max.x;
  const minY = box.min.y;
  const maxY = box.max.y;
  const minZ = box.min.z;
  const maxZ = box.max.z;

  function addCylinder(
    startPoint: THREE.Vector3,
    endPoint: THREE.Vector3,
  ): void {
    const length = startPoint.distanceTo(endPoint);
    if (length < thickness) return;

    const cyl = new THREE.CylinderGeometry(
      thickness,
      thickness,
      length,
      8,
      1,
      false,
    );
    cyl.translate(0, length / 2, 0);
    cyl.rotateX(Math.PI / 2);
    const matrix = new THREE.Matrix4();
    matrix.lookAt(endPoint, startPoint, new THREE.Vector3(0, 1, 0));
    matrix.setPosition(startPoint);
    cyl.applyMatrix4(matrix);
    latticeCylinders.push(cyl);
  }

  function getSnappedPoint(intersect: THREE.Intersection): THREE.Vector3 {
    if (!intersect.face) return intersect.point;

    const vA = new THREE.Vector3().fromBufferAttribute(
      posAttr,
      intersect.face.a,
    );
    const vB = new THREE.Vector3().fromBufferAttribute(
      posAttr,
      intersect.face.b,
    );
    const vC = new THREE.Vector3().fromBufferAttribute(
      posAttr,
      intersect.face.c,
    );

    const hit = intersect.point;
    const dA = hit.distanceToSquared(vA);
    const dB = hit.distanceToSquared(vB);
    const dC = hit.distanceToSquared(vC);

    if (dA <= dB && dA <= dC) return vA;
    if (dB <= dA && dB <= dC) return vB;
    return vC;
  }

  function processRay(origin: THREE.Vector3, dir: THREE.Vector3): void {
    raycaster.set(origin, dir);
    const intersects = raycaster.intersectObject(rayTarget, false);

    const uniqueIntersects: THREE.Intersection[] = [];
    for (let i = 0; i < intersects.length; i++) {
      const last = uniqueIntersects[uniqueIntersects.length - 1];
      if (i === 0 || intersects[i].distance - (last?.distance ?? 0) > 0.01) {
        uniqueIntersects.push(intersects[i]);
      }
    }

    for (let i = 0; i < uniqueIntersects.length - 1; i += 2) {
      const hit1 = uniqueIntersects[i].point;
      const hit2 = uniqueIntersects[i + 1].point;
      const length = hit1.distanceTo(hit2);

      if (length > thickness * 2) {
        addCylinder(hit1, hit2);

        const snap1 = getSnappedPoint(uniqueIntersects[i]);
        const snap2 = getSnappedPoint(uniqueIntersects[i + 1]);

        addCylinder(hit1, snap1);
        addCylinder(hit2, snap2);

        const s1 = sphereGeoTemplate.clone();
        s1.translate(hit1.x, hit1.y, hit1.z);
        const s2 = sphereGeoTemplate.clone();
        s2.translate(hit2.x, hit2.y, hit2.z);
        latticeCylinders.push(s1, s2);
      }
    }
  }

  const eps = (maxX - minX) * 0.1;
  const dirX = new THREE.Vector3(1, 0, 0);
  const dirY = new THREE.Vector3(0, 1, 0);
  const dirZ = new THREE.Vector3(0, 0, 1);

  for (let y = minY; y <= maxY; y += spacing) {
    for (let z = minZ; z <= maxZ; z += spacing) {
      processRay(new THREE.Vector3(minX - eps, y, z), dirX);
    }
  }
  for (let x = minX; x <= maxX; x += spacing) {
    for (let z = minZ; z <= maxZ; z += spacing) {
      processRay(new THREE.Vector3(x, minY - eps, z), dirY);
    }
  }
  for (let x = minX; x <= maxX; x += spacing) {
    for (let y = minY; y <= maxY; y += spacing) {
      processRay(new THREE.Vector3(x, y, minZ - eps), dirZ);
    }
  }

  let mergedLatticeGeo = new THREE.BufferGeometry();
  if (latticeCylinders.length > 0) {
    mergedLatticeGeo = mergeGeometries(latticeCylinders);
    mergedLatticeGeo.applyMatrix4(fwdLatticeMatrix);
  }

  const finalElements: THREE.BufferGeometry[] = [surfaceWireframeGeo];
  if (latticeCylinders.length > 0) finalElements.push(mergedLatticeGeo);

  const finalMergedGeo = mergeGeometries(finalElements);
  finalMergedGeo.computeVertexNormals();

  return new THREE.Mesh(finalMergedGeo, material);
}

export function setupLatticeButton(
  state: ViewerState,
  sceneManager: SceneManager,
  elements: AppElements,
): void {
  const latticeBtn = document.getElementById(
    "generateLatticeBtn",
  ) as HTMLButtonElement | null;

  if (!latticeBtn) return;

  latticeBtn.addEventListener("click", () => {
    if (!state.currentModel) {
      alert("Please load a model first!");
      return;
    }

    if (state.currentModel.userData.isLattice) {
      const originalModel = state.currentModel.userData.originalModel as
        | THREE.Object3D
        | undefined;
      if (!originalModel) return;

      const latticeMesh = state.currentModel as THREE.Mesh;
      sceneManager.scene.remove(latticeMesh);
      latticeMesh.geometry.dispose();
      if (Array.isArray(latticeMesh.material)) {
        latticeMesh.material.forEach((material) => material.dispose());
      } else {
        latticeMesh.material.dispose();
      }

      sceneManager.scene.add(originalModel);
      state.currentModel = originalModel;
      latticeBtn.textContent = "Generate Lattice Wireframe";

      if (elements.polyCountLabel) {
        const origMesh = getFirstMesh(originalModel);
        if (origMesh && origMesh.geometry) {
          elements.polyCountLabel.textContent = `Current Vertices: ${origMesh.geometry.attributes.position.count}`;
        }
      }
      return;
    }

    latticeBtn.textContent = "Generating...";
    latticeBtn.disabled = true;

    setTimeout(() => {
      try {
        const currentMesh = getFirstMesh(state.currentModel);

        if (!currentMesh || !currentMesh.geometry) {
          alert("Cannot find geometry in this model.");
          return;
        }

        const latticeMaterial = new THREE.MeshStandardMaterial({
          color: elements.modelColorPicker?.value ?? 0xcccccc,
          roughness: 0.8,
          metalness: 0,
        });

        currentMesh.updateMatrixWorld(true);
        const bakedGeometry = currentMesh.geometry.clone();
        bakedGeometry.applyMatrix4(currentMesh.matrixWorld);

        bakedGeometry.computeBoundingBox();
        const boundingBox = bakedGeometry.boundingBox;
        let optimalThickness = 0.02;

        if (boundingBox) {
          const size = new THREE.Vector3();
          boundingBox.getSize(size);
          const maxDimension = Math.max(size.x, size.y, size.z);
          optimalThickness = maxDimension * 0.015;
        }

        const newLatticeMesh = createPrintableWireframe(
          bakedGeometry,
          latticeMaterial,
          optimalThickness,
        );

        newLatticeMesh.userData.isLattice = true;
        newLatticeMesh.userData.originalModel = state.currentModel;

        sceneManager.scene.remove(state.currentModel);
        sceneManager.scene.add(newLatticeMesh);
        state.currentModel = newLatticeMesh;

        if (elements.polyCountLabel) {
          elements.polyCountLabel.textContent = `Current Vertices: ${newLatticeMesh.geometry.attributes.position.count}`;
        }
      } catch (error) {
        console.error("Error generating lattice:", error);
        alert("Model is too complex! Try reducing the mesh first.");
      } finally {
        latticeBtn.textContent = "Restore Original Model";
        latticeBtn.disabled = false;
      }
    }, 100);
  });
}

export function createPerforatedMesh(
  originalObject: THREE.Object3D,
): THREE.Mesh {
  let targetMesh: THREE.Mesh | null = null;
  originalObject.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh && !targetMesh) {
      targetMesh = mesh;
    }
  });

  if (!targetMesh) {
    throw new Error("cannot find a valid mesh!");
  }

  const validMesh = targetMesh;

  const baseBrush = new Brush(validMesh.geometry, validMesh.material);
  validMesh.getWorldPosition(baseBrush.position);
  validMesh.getWorldQuaternion(baseBrush.quaternion);
  validMesh.getWorldScale(baseBrush.scale);
  baseBrush.updateMatrixWorld();

  const bbox = new THREE.Box3().setFromObject(validMesh);
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const center = new THREE.Vector3();
  bbox.getCenter(center);

  const holeRadius = 0.08;
  const spacing = 0.5;

  const maxDim = Math.max(size.x, size.y, size.z) + 10;
  const baseDrillGeo = new THREE.CylinderGeometry(
    holeRadius,
    holeRadius,
    maxDim,
    16,
  );
  const drillsGeometries: THREE.BufferGeometry[] = [];

  for (let x = bbox.min.x; x <= bbox.max.x; x += spacing) {
    for (let z = bbox.min.z; z <= bbox.max.z; z += spacing) {
      const drillY = baseDrillGeo.clone();
      drillY.translate(x, center.y, z);
      drillsGeometries.push(drillY);
    }
  }

  for (let y = bbox.min.y; y <= bbox.max.y; y += spacing) {
    for (let z = bbox.min.z; z <= bbox.max.z; z += spacing) {
      const drillX = baseDrillGeo.clone();
      drillX.rotateZ(Math.PI / 2);
      drillX.translate(center.x, y, z);
      drillsGeometries.push(drillX);
    }
  }

  for (let x = bbox.min.x; x <= bbox.max.x; x += spacing) {
    for (let y = bbox.min.y; y <= bbox.max.y; y += spacing) {
      const drillZ = baseDrillGeo.clone();
      drillZ.rotateX(Math.PI / 2);
      drillZ.translate(x, y, center.z);
      drillsGeometries.push(drillZ);
    }
  }

  if (drillsGeometries.length === 0) {
    throw new Error(
      "model is too small for the given spacing, no drills generated!",
    );
  }

  const mergedDrillGeo = BufferGeometryUtils.mergeGeometries(drillsGeometries);

  const drillMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  const drillBrush = new Brush(mergedDrillGeo, drillMat);
  drillBrush.updateMatrixWorld();

  const evaluator = new Evaluator();
  evaluator.useGroups = true;
  const resultBrush = evaluator.evaluate(baseBrush, drillBrush, SUBTRACTION);

  const materialArray: THREE.Material[] = Array.isArray(validMesh.material)
    ? [...validMesh.material, drillMat]
    : [validMesh.material as THREE.Material, drillMat];

  const perforatedMesh = new THREE.Mesh(resultBrush.geometry, materialArray);
  perforatedMesh.geometry.computeVertexNormals();

  materialArray.forEach((material) => {
    material.side = THREE.DoubleSide;
    material.needsUpdate = true;
  });

  perforatedMesh.castShadow = true;
  perforatedMesh.receiveShadow = true;
  perforatedMesh.position.copy(resultBrush.position);
  perforatedMesh.quaternion.copy(resultBrush.quaternion);
  perforatedMesh.scale.copy(resultBrush.scale);

  return perforatedMesh;
}

export function setupPerforationButton(
  viewerState: ViewerState,
  sceneManager: SceneManager,
): void {
  let isPerforated = false;
  let originalMesh: THREE.Object3D | null = null;
  let perforatedMesh: THREE.Mesh | null = null;

  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;

    if (!target || target.id !== "btn-perforate") return;

    const scene = sceneManager.scene;

    if (isPerforated && originalMesh && perforatedMesh) {
      console.log("restoring original model...");

      scene.remove(perforatedMesh);
      scene.add(originalMesh);
      viewerState.currentModel = originalMesh;
      target.innerText = "automatic perforation";

      isPerforated = false;
      return;
    }

    const currentMesh = viewerState.currentModel;
    if (!currentMesh) {
      alert("Please load a model first!");
      return;
    }

    target.innerText = "Processing...";

    setTimeout(() => {
      try {
        originalMesh = currentMesh;
        perforatedMesh = createPerforatedMesh(currentMesh);

        scene.remove(originalMesh);
        scene.add(perforatedMesh);
        viewerState.currentModel = perforatedMesh;

        isPerforated = true;
        target.innerText = "Restore Original Model";

        console.log("perforation completed successfully!");
      } catch (error) {
        console.error("failed perforation:", error);
        alert("Perforation failed. The model might be too complex.");
        target.innerText = "automatic perforation";
      }
    }, 50);
  });
}
