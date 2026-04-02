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


// Initialize the simplify modifier for mesh reduction
const simplifyModifier = new SimplifyModifier();

// Retrieves the target object for operations - either the currently loaded model or the default cube
export function getTargetObject(
  state: ViewerState,
  sceneManager: SceneManager,
): THREE.Object3D {
  return state.currentModel ?? sceneManager.shape;
}

// Merges duplicate vertices in all meshes of an object to optimize geometry
// Also stores the original geometry for later restoration if needed
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

// Removes the currently loaded model from the scene and frees up its memory
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

// Toggles wireframe mode for all materials in an object
// Works with both single materials and arrays of materials (multi-material objects)
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

// Applies wireframe display mode based on the wireframe toggle checkbox
export function applyWireframe(
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

// Applies a color-based density heatmap to the mesh
// Shows areas of high vertex density in red/warm colors and low density in blue/cool colors
// Uses HSL color space: Hue ranges from 0 (red) to 0.66 (blue)
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

export function createPrintableWireframe(
    originalGeometry: THREE.BufferGeometry, 
    material: THREE.Material, 
    thickness: number = 0.5
): THREE.Mesh {
    const geometriesToMerge: THREE.BufferGeometry[] = [];

    
    const edgesGeometry = new THREE.EdgesGeometry(originalGeometry);
    const positionAttribute = edgesGeometry.attributes.position;
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();

    // Paint surface tube
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

    // Draw surface of joint ball
    const posGeo = originalGeometry.attributes.position;
    const sphereGeoTemplate = new THREE.SphereGeometry(thickness * 1.05, 8, 8);
    for(let i = 0; i < posGeo.count; i++) {
        const p = new THREE.Vector3().fromBufferAttribute(posGeo, i);
        const sphere = sphereGeoTemplate.clone();
        sphere.translate(p.x, p.y, p.z);
        geometriesToMerge.push(sphere);
    }

    originalGeometry.computeBoundingBox();
    const box = originalGeometry.boundingBox!;
    
    const spacing = thickness * 8; 
    const latticeCylinders: THREE.BufferGeometry[] = [];
    
    
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    
    const sizeX = (box.max.x - box.min.x) * 1.5;
    const sizeY = (box.max.y - box.min.y) * 1.5;
    const sizeZ = (box.max.z - box.min.z) * 1.5;

    const minX = center.x - sizeX / 2; const maxX = center.x + sizeX / 2;
    const minY = center.y - sizeY / 2; const maxY = center.y + sizeY / 2;
    const minZ = center.z - sizeZ / 2; const maxZ = center.z + sizeZ / 2;

    // Generate columns in three directions: X, Y, Z (使用擴大後的範圍)
    for (let x = minX; x <= maxX; x += spacing) {
        for (let z = minZ; z <= maxZ; z += spacing) {
            const cylinderY = new THREE.CylinderGeometry(thickness, thickness, sizeY, 8);
            cylinderY.translate(x, center.y, z);
            latticeCylinders.push(cylinderY);
        }
    }
    for (let y = minY; y <= maxY; y += spacing) {
        for (let z = minZ; z <= maxZ; z += spacing) {
            const cylinderX = new THREE.CylinderGeometry(thickness, thickness, sizeX, 8);
            cylinderX.rotateZ(Math.PI / 2);
            cylinderX.translate(center.x, y, z);
            latticeCylinders.push(cylinderX);
        }
    }
    for (let x = minX; x <= maxX; x += spacing) {
        for (let y = minY; y <= maxY; y += spacing) {
            const cylinderZ = new THREE.CylinderGeometry(thickness, thickness, sizeZ, 8);
            cylinderZ.rotateX(Math.PI / 2);
            cylinderZ.translate(x, y, center.z);
            latticeCylinders.push(cylinderZ);
        }
    }

    // Convert internal mesh to brush for CSG cropping
    const mergedLatticeGeo = mergeGeometries(latticeCylinders);
    const latticeBrush = new Brush(mergedLatticeGeo, material);
    
    
    latticeBrush.rotation.set(Math.PI / 4, 0, Math.PI / 4);
    latticeBrush.updateMatrixWorld(true);

    const targetBrush = new Brush(originalGeometry, material);
    targetBrush.updateMatrixWorld(true);

    const evaluator = new Evaluator();
    const csgResult = evaluator.evaluate(targetBrush, latticeBrush, INTERSECTION);
    
    // Add the cut "innards" and combine them with the "skin"!
    geometriesToMerge.push(csgResult.geometry);

    
    const finalMergedGeo = mergeGeometries(geometriesToMerge);
    return new THREE.Mesh(finalMergedGeo, material);
}
// ==========================================
// 2. UI Binding: Button with "Restore" switching function
// ==========================================
export function setupLatticeButton(state: any, sceneManager: any, elements: any) {
  const latticeBtn = document.getElementById('generateLatticeBtn') as HTMLButtonElement;
  
  if (!latticeBtn) return;

  latticeBtn.addEventListener('click', () => {
    if (!state.currentModel) {
      alert("Please load a model first!");
      return;
    }

    // ==========================================
    // Mode 2: If it is already a lattice, perform "Restore"！
    // ==========================================
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

import { Brush, Evaluator, INTERSECTION } from 'three-bvh-csg';


export function createVolumetricLattice(targetMesh: THREE.Mesh, material: THREE.Material): THREE.Mesh {
    
    // 1. Get the Bounding Box of the model, so you know how big the tofu needs to be cut into
    targetMesh.geometry.computeBoundingBox();
    const box = targetMesh.geometry.boundingBox!;
    
    //2. Make "Lattice Block"
    //In order to demonstrate and prevent the browser from crashing, we make the simplest "vertical stripe" grid here
    //In the actual topic, you can write three circles (X, Y, Z) to draw an intersecting grid
    const latticeMaterial = new THREE.MeshBasicMaterial();
    const latticeGroup = new THREE.Scene(); // Use Scene as a staging container
    
    // Draw a column at regular intervals (assuming the spacing is 2)
    const spacing = 2;
    const thickness = 0.5;
    const height = box.max.y - box.min.y + 2; //The column height is slightly higher than the model

    for (let x = box.min.x; x <= box.max.x; x += spacing) {
        for (let z = box.min.z; z <= box.max.z; z += spacing) {
            const cylinderGeo = new THREE.CylinderGeometry(thickness, thickness, height, 8);
            const cylinder = new THREE.Mesh(cylinderGeo, latticeMaterial);
            cylinder.position.set(x, (box.max.y + box.min.y) / 2, z);
            cylinder.updateMatrixWorld(true);
            latticeGroup.add(cylinder);
        }
    }

//Merge all scattered pillars into a huge "lattice block" Geometry
    //(Note: In real projects, you may need to use BufferGeometryUtils.mergeGeometries)
    //Here we assume that you already have a merged massiveLatticeMesh
    //To simplify, we assume that there is only one complex Mesh in latticeGroup called massiveLatticeMesh

//A. Convert your original model into a CSG-specific "Brush"    targetMesh.updateMatrixWorld(true);
    const targetBrush = new Brush(targetMesh.geometry, material);
    
//Synchronize the position, angle, and scaling of the original model to the brush, otherwise the calculation will be at the origin.    targetBrush.position.copy(targetMesh.position);
    targetBrush.rotation.copy(targetMesh.rotation);
    targetBrush.scale.copy(targetMesh.scale);
    targetBrush.updateMatrixWorld(true);
    
    // B.Make a test ball brush (used to replace the complex lattice tofu)
    //Put it in the exact same position as the rabbit
    const sphereGeo = new THREE.SphereGeometry(15, 32, 32);
    const testSphereBrush = new Brush(sphereGeo, material);
    testSphereBrush.position.copy(targetMesh.position); 
    testSphereBrush.updateMatrixWorld(true);
    
    // C. Summon the Evaluator and perform INTERSECTION
    //This line will automatically use the A and B brushes to calculate overlapping geometry!
    const evaluator = new Evaluator();
    const finalMesh = evaluator.evaluate(targetBrush, testSphereBrush, INTERSECTION);
    
    // D. The Evaluator has already packaged the result into a THREE.Mesh, so just return it!
    return finalMesh;
}