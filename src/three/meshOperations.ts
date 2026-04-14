// Three.js library and utilities for 3D mesh manipulation
import * as THREE from "three";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
import { SimplifyModifier } from "three/examples/jsm/modifiers/SimplifyModifier.js";
import { TessellateModifier } from "three/examples/jsm/modifiers/TessellateModifier.js";

// Type imports for viewer state, scene management, and UI elements
import type { ViewerState } from "../state/viewerState";
import type { SceneManager } from "./sceneManager";
import type { AppElements } from "../utils/dom";

// Constants and utility functions for mesh operations
import { DEFAULT_MODEL_COLOR, SIMPLIFICATION } from "../utils/constants";
import { renderBudgetInfo } from "../views/meshToolsView";
import { setStatus } from "../views/statusView";
import {
  disposeObject3D,
  getFirstMesh,
  traverseMeshes,
} from "../utils/threeUtils";

import { Brush, Evaluator, INTERSECTION, ADDITION, SUBTRACTION } from 'three-bvh-csg';

// Initialize the simplify modifier for mesh reduction
const simplifyModifier = new SimplifyModifier();

// Retrieves the target object for operations - either the currently loaded model or the default cube
export function getTargetObject(
  state: ViewerState,
  sceneManager: SceneManager,
): THREE.Object3D {
  return state.currentModel ?? sceneManager.shape;
}
/**
 * Pre-processes and optimizes a 3D object by traversing its meshes and merging coincident vertices.
 * This is a critical topology repair step that converts raw 'polygon soups' (common in STL files) 
 * into continuous, manifold geometries required for successful CSG boolean operations and FEA simulations.
 * It also caches the optimized geometry to allow for non-destructive mesh reduction later.
 * * @param {THREE.Object3D} object - The loaded 3D object or scene to be processed.
 * @returns {void}
 */
export function mergeModelVertices(object: THREE.Object3D): void {
  traverseMeshes(object, (mesh) => {
    if (!mesh.geometry.isBufferGeometry) return;
    // Merge vertices that are within a tolerance distance
    mesh.geometry = BufferGeometryUtils.mergeVertices(
      mesh.geometry,
      SIMPLIFICATION.mergeTolerance,
    );
    // Recalculate normals for proper lighting
    mesh.geometry.computeVertexNormals();

    // Store original geometry as backup for later use
    if (!mesh.userData.originalGeometry) {
      mesh.userData.originalGeometry = mesh.geometry.clone();
    }
  });
}

/**
 * Safely unloads the current 3D model from the WebGL scene and forces GPU garbage collection.
 * This is a critical memory management routine that prevents memory leaks and WebGL context loss 
 * by ensuring all associated geometries, materials, and textures are permanently flushed from the VRAM
 * before the JavaScript garbage collector clears the CPU references.
 * * @param {ViewerState} state - The global application state object containing the active model.
 * @param {SceneManager} sceneManager - The core scene manager handling the Three.js scene graph.
 * @returns {void}
 */
export function clearCurrentModel(
  state: ViewerState,
  sceneManager: SceneManager,
): void {
  if (!state.currentModel) return;
  // Remove from THREE.js scene
  sceneManager.scene.remove(state.currentModel);
  // Dispose of all geometry and material resources
  disposeObject3D(state.currentModel);
  // Clear the reference
  state.currentModel = null;
}

// Controls visibility of grid and axes helper based on UI toggle
export function applyHelperVisibility(
  sceneManager: SceneManager,
  elements: AppElements,
): void {
  const showGrid = elements.gridToggle?.checked ?? true;
  sceneManager.gridHelper.visible = showGrid;
  sceneManager.axesHelper.visible = showGrid;
}

// Shows or hides the model in the 3D scene based on the model visibility toggle
// If no model is loaded, shows the default cube instead
export function applyModelVisibility(
  state: ViewerState,
  sceneManager: SceneManager,
  elements: AppElements,
): void {
  const showModel = elements.modelToggle?.checked ?? true;
  if (state.currentModel) state.currentModel.visible = showModel;
  sceneManager.shape.visible = !state.currentModel && showModel;
}

// Scales the target object (model or cube) based on the slider value
// Slider value of 100 = 1.0 scale, 50 = 0.5 scale, etc.
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

/**
 * Recursively traverses a 3D object hierarchy and toggles the wireframe rendering mode on all underlying materials.
 * This function robustly handles both single material assignments and multi-material arrays, 
 * ensuring complex imported models (e.g., GLTF/OBJ) are safely updated without runtime errors.
 * * @param {THREE.Object3D} object - The root Three.js object or scene graph to traverse.
 * @param {boolean} enabled - The target wireframe state (true for wireframe, false for solid shading).
 * @returns {void}
 */
export function setWireframe(object: THREE.Object3D, enabled: boolean): void {
  object.traverse((child: any) => {
    if (!child?.isMesh) return;
    const material = child.material;
    // Handle multiple materials assigned to the same mesh
    if (Array.isArray(material)) {
      material.forEach((entry) => {
        if (entry) entry.wireframe = enabled;
      });
    } else if (material) {
      material.wireframe = enabled;
    }
  });
}

/**
 * Controller function that syncs the visual wireframe state of the active 3D model 
 * with the corresponding HTML checkbox element in the user interface.
 * * @param {ViewerState} state - The global application state containing active model references.
 * @param {SceneManager} sceneManager - The manager handling the Three.js scene environment.
 * @param {AppElements} elements - The DOM elements reference object containing the UI toggles.
 * @returns {void}
 */export function applyWireframe(
  state: ViewerState,
  sceneManager: SceneManager,
  elements: AppElements,
): void {
  const enabled = elements.wireToggle?.checked ?? false;
  const target = getTargetObject(state, sceneManager);
  setWireframe(target, enabled);
}

// Changes the color of all materials in the current model
// Uses either the provided hex color or defaults to the model's default color
export function applyModelColor(state: ViewerState, colorHex: string): void {
  if (!state.currentModel) return;
  // Convert hex string to THREE.js Color object
  const color = new THREE.Color(colorHex || DEFAULT_MODEL_COLOR);
  // Apply the color to all meshes in the model
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

// Updates the budget display with current and original vertex counts
// Shows how much the model has been simplified from its original state
export function updateBudgetInputFromCurrent(
  state: ViewerState,
  elements: AppElements,
): void {
  if (!state.currentModel) return;

  let currentVertices = 0;
  let originalVertices = 0;

  traverseMeshes(state.currentModel, (mesh) => {
    // Count vertices in current geometry
    currentVertices += mesh.geometry.attributes.position.count;
    // Count vertices in original geometry (before simplification), or use current if not saved
    if (mesh.userData.originalGeometry) {
      originalVertices +=
        mesh.userData.originalGeometry.attributes.position.count;
    } else {
      originalVertices += mesh.geometry.attributes.position.count;
    }
  });

  // Update the UI display
  renderBudgetInfo(elements, currentVertices, originalVertices);
}
/**
 *  Reduces the number of vertices in the model using the SimplifyModifier
 *  Can simplify by ratio (e.g., reduce to 50% of original) or by absolute vertex count
 *  Respects minimum vertex limits to prevent over-simplification
 * @param state - The current state of the 3D viewer, which contains the active model (`currentModel`) to be modified.
 * @param elements - The DOM elements used to update the UI (e.g., status message and current vertex count label).
 * @param targetType - The mode of simplification: `"ratio"` (percentage) or `"count"` (absolute number).
 * @param value - The target numerical value. Represents a percentage (e.g., 0.5 for 50%) if `targetType` is "ratio", or an exact vertex count if "count".
 * @returns {void} This function does not return a value. It modifies the 3D meshes in-place and updates the UI asynchronously.
 */
export function performSimplification(
  state: ViewerState,
  elements: AppElements,
  targetType: "ratio" | "count",
  value: number,
): void {
  if (!state.currentModel) return;

  setStatus(elements.statusEl, "Computing simplification...");

  // Defer processing to allow UI to update status message
  setTimeout(() => {
    let currentTotalVertices = 0;

    traverseMeshes(state.currentModel!, (mesh) => {
      // Save original geometry if not already saved
      if (!mesh.userData.originalGeometry) {
        mesh.userData.originalGeometry = mesh.geometry.clone();
      }

      const originalGeometry = mesh.userData
        .originalGeometry as THREE.BufferGeometry;
      const originalCount = originalGeometry.attributes.position.count;
      //let targetCount = 0;

      let keepCount = 0;

      // 1. calculate the target vertex count based on the chosen simplification mode
      if (targetType === "ratio") {
        // value from MeshController
        keepCount = Math.floor(originalCount * value);
      } else {
        // targetType is "count"，
        keepCount = value;
      }

      // 2. calculate the minimum vertex count to keep based on absolute and percentage limits
      const absoluteMin = SIMPLIFICATION.absoluteMinVertices;
      const percentageMin = Math.floor(
        originalCount * SIMPLIFICATION.minPercentOfOriginal,
      );
      const minKeepLimit = Math.max(absoluteMin, percentageMin);

      // 3. make sure the target keep count is not below the minimum limit and not above the original count
      if (keepCount < minKeepLimit) {
        keepCount = minKeepLimit;
      }
      if (keepCount > originalCount) {
        keepCount = originalCount;
      }

      // 4. if the target keep count is very close to the original count (e.g., 99% or more), skip simplification and restore original geometry
      if (keepCount >= originalCount * 0.99) {
        mesh.geometry.dispose();
        mesh.geometry = originalGeometry.clone();
        currentTotalVertices += originalCount;
        return;
      }

      // 5. calculate how many vertices to remove based on the target keep count
      const removeCount = originalCount - keepCount;

      // Perform simplification using the SimplifyModifier
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
        // Fallback to original geometry if simplification fails
        mesh.geometry.dispose();
        mesh.geometry = originalGeometry.clone();
        currentTotalVertices += originalCount;
      }
    });

    // Update UI with new vertex count
    if (elements.polyCountLabel) {
      elements.polyCountLabel.textContent = `Current Vertices: ${currentTotalVertices}`;
    }

    setStatus(elements.statusEl, "Simplification complete");
  }, 50);
}

/**
 * Calculates and applies a topological density heatmap to the active 3D mesh.
 * This algorithm evaluates localized mesh density by calculating the average area of the faces 
 * connected to each vertex using vector cross products. The resulting scalar field is normalized 
 * and mapped to an HSL color gradient, providing immediate visual feedback on mesh complexity.
 * * - High Vertex Density (Small face area) ➔ Warm colors (Red / Hue: 0.0)
 * - Low Vertex Density (Large face area)  ➔ Cool colors (Blue / Hue: 0.66)
 * * @param {ViewerState} state - The global application state object containing the active model.
 * @returns {void}
 */
export function applyDensityHeatmap(state: ViewerState): void {
  const mesh = getFirstMesh(state.currentModel);
  if (!mesh || !mesh.geometry.isBufferGeometry) return;

  const position = mesh.geometry.attributes.position;
  const index = mesh.geometry.index;
  if (!position || !index) return;

  const vertexCount = position.count;
  // Initialize density arrays for each vertex
  const density = new Array<number>(vertexCount).fill(0);
  const numFaces = new Array<number>(vertexCount).fill(0);

  // Calculate density for each vertex based on connected face areas
  for (let j = 0; j < index.count; j += 3) {
    // Get triangle vertex indices
    const aIndex = index.getX(j);
    const bIndex = index.getX(j + 1);
    const cIndex = index.getX(j + 2);

    // Get vertex positions
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

    // Calculate face area using cross product
    const ab = b.clone().sub(a);
    const ac = c.clone().sub(a);
    const faceDensity = ab.cross(ac).length();

    // Accumulate density for all vertices of this face
    numFaces[aIndex]++;
    numFaces[bIndex]++;
    numFaces[cIndex]++;

    density[aIndex] += faceDensity;
    density[bIndex] += faceDensity;
    density[cIndex] += faceDensity;
  }

  // Calculate average density for each vertex
  let maxDensity = -Infinity;
  let minDensity = Infinity;

  for (let i = 0; i < vertexCount; i++) {
    if (numFaces[i] > 0) density[i] /= numFaces[i];
    maxDensity = Math.max(maxDensity, density[i]);
    minDensity = Math.min(minDensity, density[i]);
  }

  // Map density values to colors
  const colors: number[] = [];
  const color = new THREE.Color();

  for (let i = 0; i < vertexCount; i++) {
    // Normalize density to 0-1 range
    const t =
      maxDensity !== minDensity
        ? (density[i] - minDensity) / (maxDensity - minDensity)
        : 0;
    // HSL color: high density (t=1) = red, low density (t=0) = blue
    color.setHSL(t * 0.66, 1.0, 0.5);
    colors.push(color.r, color.g, color.b);
  }

  // Apply colors to mesh
  mesh.geometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(colors, 3),
  );
  const material = mesh.material as THREE.MeshStandardMaterial;
  material.vertexColors = true;
  material.needsUpdate = true;
}


/**
 * Subdivides the 3D mesh to increase vertex density and create finer geometric detail.
 * This function utilizes the Three.js `TessellateModifier`. It automatically converts 
 * indexed geometries to non-indexed format before recursively splitting edges that exceed 
 * the specified maximum length.
 *
 * @param state - The global viewer state containing the active `currentModel` to be subdivided.
 * @param elements - The UI elements collection used to display loading and status messages.
 * @param maxEdgeLength - The maximum allowed edge length. Any edge longer than this threshold will be split in half. (Default: 0.5)
 * @param maxIterations - The maximum number of algorithmic passes the modifier will execute. (Default: 2)
 * @returns {void} Modifies the loaded 3D meshes in-place and directly updates the UI vertex count.
 */
export function performSubdivision(
  state: ViewerState,
  elements: AppElements,
  maxEdgeLength: number = 0.5,
  maxIterations: number = 2,
) {
  if (!state.currentModel) return;

  setStatus(elements.statusEl, "Computing mesh subdivision...");

  // Process each mesh in the model
  state.currentModel.traverse((child: THREE.Object3D) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      let geometry = mesh.geometry;

      // Convert indexed geometry to non-indexed for tessellation
      if (geometry.index !== null) {
        geometry = geometry.toNonIndexed();
      }

      // Create tessellation modifier with user-defined parameters
      const modifier = new TessellateModifier(maxEdgeLength, maxIterations);

      try {
        // Apply subdivision to create finer mesh
        const subdividedGeo = modifier.modify(geometry);

        // Replace old geometry with subdivided version
        mesh.geometry.dispose();
        mesh.geometry = subdividedGeo;

        // Update the vertex count display in UI
        const currentVerts = subdividedGeo.attributes.position.count;
        const polyCountLabel = document.getElementById("polyCount");
        if (polyCountLabel) {
          polyCountLabel.textContent = `Current Vertices: ${currentVerts}`;
        }

        console.log(`Subdivision complete. New vertex count: ${currentVerts}`);
      } catch (e) {
        console.error("Subdivision failed", e);
      }
    }
  });

  setStatus(elements.statusEl, "Subdivision complete");
}

import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Generates a 3D-printable volumetric wireframe (lattice) from a base geometry using a strut-and-node approach.
 * This function iterates through the topological edges and vertices of the input mesh, creating cylindrical struts 
 * and spherical joints to ensure a continuous, manifold structure optimized for additive manufacturing.
 * * @param {THREE.BufferGeometry} originalGeometry - The base surface geometry to extract the topology from.
 * @param {THREE.Material} material - The physical material to apply to the final merged mesh.
 * @param {number} [thickness=0.5] - The radius of the cylindrical struts. Joint spheres will be scaled to 105% of this value.
 * @returns {THREE.Mesh} A single merged mesh representing the printable volumetric lattice.
 */
export function createPrintableWireframe(
    originalGeometry: THREE.BufferGeometry, 
    material: THREE.Material, 
    thickness: number = 0.5
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
        const cylinderGeo = new THREE.CylinderGeometry(thickness, thickness, distance, 8, 1, false);
        cylinderGeo.translate(0, distance / 2, 0);
        cylinderGeo.rotateX(Math.PI / 2);
        const matrix = new THREE.Matrix4();
        matrix.lookAt(p2, p1, new THREE.Vector3(0, 1, 0));
        matrix.setPosition(p1);
        cylinderGeo.applyMatrix4(matrix);
        geometriesToMerge.push(cylinderGeo);
    }

    const posGeo = originalGeometry.attributes.position;
    for(let i = 0; i < posGeo.count; i++) {
        const p = new THREE.Vector3().fromBufferAttribute(posGeo, i);
        const sphere = sphereGeoTemplate.clone();
        sphere.translate(p.x, p.y, p.z);
        geometriesToMerge.push(sphere);
    }
    const surfaceWireframeGeo = mergeGeometries(geometriesToMerge);

   
    const spacing = thickness * 8; 
    const fwdLatticeMatrix = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(Math.PI / 4, 0, Math.PI / 4));
    const invLatticeMatrix = fwdLatticeMatrix.clone().invert();
    
    const raycastGeo = originalGeometry.clone().applyMatrix4(invLatticeMatrix);
    raycastGeo.computeBoundingBox();
    const box = raycastGeo.boundingBox!;

    const rayTarget = new THREE.Mesh(raycastGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    const raycaster = new THREE.Raycaster();
    const posAttr = rayTarget.geometry.attributes.position as THREE.BufferAttribute;

    const minX = box.min.x; const maxX = box.max.x;
    const minY = box.min.y; const maxY = box.max.y;
    const minZ = box.min.z; const maxZ = box.max.z;

    function addCylinder(startPoint: THREE.Vector3, endPoint: THREE.Vector3) {
        const length = startPoint.distanceTo(endPoint);
        if (length < thickness) return; 
        const cyl = new THREE.CylinderGeometry(thickness, thickness, length, 8, 1, false);
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
        const vA = new THREE.Vector3().fromBufferAttribute(posAttr, intersect.face.a);
        const vB = new THREE.Vector3().fromBufferAttribute(posAttr, intersect.face.b);
        const vC = new THREE.Vector3().fromBufferAttribute(posAttr, intersect.face.c);
        
        const hit = intersect.point;
        const dA = hit.distanceToSquared(vA);
        const dB = hit.distanceToSquared(vB);
        const dC = hit.distanceToSquared(vC);
        
        if (dA <= dB && dA <= dC) return vA;
        if (dB <= dA && dB <= dC) return vB;
        return vC;
    }

    function processRay(origin: THREE.Vector3, dir: THREE.Vector3) {
        raycaster.set(origin, dir);
        const intersects = raycaster.intersectObject(rayTarget, false);
        
        const uniqueIntersects = [];
        for (let i = 0; i < intersects.length; i++) {
            if (i === 0 || intersects[i].distance - uniqueIntersects[uniqueIntersects.length - 1].distance > 0.01) {
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
                
                const s1 = sphereGeoTemplate.clone(); s1.translate(hit1.x, hit1.y, hit1.z);
                const s2 = sphereGeoTemplate.clone(); s2.translate(hit2.x, hit2.y, hit2.z);
                latticeCylinders.push(s1, s2);
            }
        }
    }

    const eps = (maxX - minX) * 0.1;
    const dirX = new THREE.Vector3(1, 0, 0);
    const dirY = new THREE.Vector3(0, 1, 0);
    const dirZ = new THREE.Vector3(0, 0, 1);

    for (let y = minY; y <= maxY; y += spacing) {
        for (let z = minZ; z <= maxZ; z += spacing) processRay(new THREE.Vector3(minX - eps, y, z), dirX);
    }
    for (let x = minX; x <= maxX; x += spacing) {
        for (let z = minZ; z <= maxZ; z += spacing) processRay(new THREE.Vector3(x, minY - eps, z), dirY);
    }
    for (let x = minX; x <= maxX; x += spacing) {
        for (let y = minY; y <= maxY; y += spacing) processRay(new THREE.Vector3(x, y, minZ - eps), dirZ);
    }

   
    let mergedLatticeGeo = new THREE.BufferGeometry();
    if (latticeCylinders.length > 0) {
        mergedLatticeGeo = mergeGeometries(latticeCylinders);
        mergedLatticeGeo.applyMatrix4(fwdLatticeMatrix);
    }

    const finalElements = [surfaceWireframeGeo];
    if (latticeCylinders.length > 0) finalElements.push(mergedLatticeGeo);
    
    const finalMergedGeo = mergeGeometries(finalElements);
    finalMergedGeo.computeVertexNormals();

    return new THREE.Mesh(finalMergedGeo, material);
}
/**
 * Initializes the event listener for the Lattice Generation button.
 * This function acts as a state toggle: it generates a 3D printable lattice wireframe 
 * from the current model, or restores the original model if the lattice is currently active.
 * * @param {any} state - The global application state object, containing `currentModel`.
 * @param {any} sceneManager - The Three.js scene manager responsible for rendering and scene graph manipulation.
 * @param {any} elements - DOM elements reference object (e.g., polyCountLabel, modelColorPicker).
 * @returns {void}
 */
export function setupLatticeButton(state: any, sceneManager: any, elements: any) {
  const latticeBtn = document.getElementById('generateLatticeBtn') as HTMLButtonElement;
  
  if (!latticeBtn) return;

  latticeBtn.addEventListener('click', () => {
    if (!state.currentModel) {
      alert("Please load a model first!");
      return;
    }

   
    if (state.currentModel.userData.isLattice) {
        // 1. Take out the original model from the treasure bag
        const originalModel = state.currentModel.userData.originalModel;
        
        // 2. Removes the current lattice from the scene and destroys it to free up memory
        const latticeMesh = state.currentModel as THREE.Mesh;
        sceneManager.scene.remove(latticeMesh);
        latticeMesh.geometry.dispose();
        if (Array.isArray(latticeMesh.material)) {
            latticeMesh.material.forEach(m => m.dispose());
        } else {
            (latticeMesh.material as THREE.Material).dispose();
        }

        // 3. Add the original model back to the scene and update the system status
        sceneManager.scene.add(originalModel);
        state.currentModel = originalModel;

        // 4. Restore button text
        latticeBtn.textContent = "Generate Lattice Wireframe";
        
        // 5. Update vertex count label
        if (elements.polyCountLabel) {
            const origMesh = getFirstMesh(originalModel);
            if (origMesh && origMesh.geometry) {
                elements.polyCountLabel.textContent = `Current Vertices: ${origMesh.geometry.attributes.position.count}`;
            }
        }
        return; 
    }

    // ==========================================
    //  1：Generate new lattice structures
    // ==========================================
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

        // Baking world coordinates
        currentMesh.updateMatrixWorld(true);
        const bakedGeometry = currentMesh.geometry.clone();
        bakedGeometry.applyMatrix4(currentMesh.matrixWorld);

        // Automatically calculate perfect thickness
        bakedGeometry.computeBoundingBox();
        const boundingBox = bakedGeometry.boundingBox;
        let optimalThickness = 0.02; 
        
        if (boundingBox) {
            const size = new THREE.Vector3();
            boundingBox.getSize(size);
            const maxDimension = Math.max(size.x, size.y, size.z);
            optimalThickness = maxDimension * 0.015; 
        }

        // Call the arsenal to generate a lattice
        const newLatticeMesh = createPrintableWireframe(bakedGeometry, latticeMaterial, optimalThickness);

        //  put a label on the new lattice and secretly hide the "original model" inside!
        newLatticeMesh.userData.isLattice = true;
        newLatticeMesh.userData.originalModel = state.currentModel;

        //  Remove the old model from the scene 
        sceneManager.scene.remove(state.currentModel);

        // Add a clean lattice structure
        sceneManager.scene.add(newLatticeMesh);
        state.currentModel = newLatticeMesh;

        if (elements.polyCountLabel) {
            elements.polyCountLabel.textContent = `Current Vertices: ${newLatticeMesh.geometry.attributes.position.count}`;
        }
        
      } catch (error) {
        console.error("Error generating lattice:", error);
        alert("Model is too complex! Try reducing the mesh first.");
      } finally {
        // After the generation is successful, the button text changes to "Restore Model"
        latticeBtn.textContent = "Restore Original Model";
        latticeBtn.disabled = false;
      }
    }, 100); 
  });
}


//////

export function createPerforatedMesh(originalObject: THREE.Object3D) {
    let targetMesh: THREE.Mesh | null = null;
    originalObject.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && !targetMesh) {
            targetMesh = child as THREE.Mesh;
        }
    });

    if (!targetMesh) {
        throw new Error("cannot find a valid mesh!");
    }

    const validMesh = targetMesh as THREE.Mesh;

    const baseBrush = new Brush(validMesh.geometry, validMesh.material);
    baseBrush.updateMatrixWorld();

    const bbox = new THREE.Box3().setFromObject(validMesh);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const center = new THREE.Vector3();
    bbox.getCenter(center);

   
    const holeRadius = 0.08;   
    const spacing = 0.5;        
    
    const maxDim = Math.max(size.x, size.y, size.z) + 10; 
    const baseDrillGeo = new THREE.CylinderGeometry(holeRadius, holeRadius, maxDim, 16);
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
        throw new Error("model is too small for the given spacing, no drills generated!");
    }

    const mergedDrillGeo = BufferGeometryUtils.mergeGeometries(drillsGeometries);
    
    const drillMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const drillBrush = new Brush(mergedDrillGeo, drillMat);
    drillBrush.updateMatrixWorld();

    const evaluator = new Evaluator();
    evaluator.useGroups = true;
    const resultBrush = evaluator.evaluate(baseBrush, drillBrush, SUBTRACTION);

    let materialArray: THREE.Material[] = [];
    if (Array.isArray(validMesh.material)) {
        materialArray = [...validMesh.material, drillMat];
    } else {
        materialArray = [validMesh.material as THREE.Material, drillMat];
    }

    const perforatedMesh = new THREE.Mesh(resultBrush.geometry, materialArray);
    perforatedMesh.geometry.computeVertexNormals();

    materialArray.forEach(m => {
        m.side = THREE.DoubleSide;
        m.needsUpdate = true;
    });

    perforatedMesh.castShadow = true;
    perforatedMesh.receiveShadow = true;
    perforatedMesh.position.copy(originalObject.position);
    perforatedMesh.rotation.copy(originalObject.rotation);
    perforatedMesh.scale.copy(originalObject.scale);

    return perforatedMesh;
}
export function setupPerforationButton(viewerState: ViewerState, sceneManager: SceneManager) {

    let isPerforated = false;
    let originalMesh: THREE.Object3D | null = null;
    let perforatedMesh: THREE.Mesh | null = null;

    document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;

        if (target && target.id === 'btn-perforate') {
            const scene = sceneManager.scene;

           
            if (isPerforated && originalMesh && perforatedMesh) {
                console.log("restoring original model...");
                
                scene.remove(perforatedMesh);
                
                scene.add(originalMesh);
                viewerState.currentModel = originalMesh as THREE.Mesh;
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

                    perforatedMesh = createPerforatedMesh(currentMesh as THREE.Mesh);

                    scene.remove(originalMesh);
                    scene.add(perforatedMesh);
                    viewerState.currentModel = perforatedMesh;
                    
                    isPerforated = true;
                    target.innerText = "Restore Original Model"; 
                    
                    console.log("perforation completed successfully!");
                    
                } catch (error) {
                    console.error("failed perforation：", error);
                    alert("Perforation failed. The model might be too complex.");
                    target.innerText = "automatic perforation"; 
                }
            }, 50);
        }
    });
}