// ==========================================
// 3D Printing Model Viewer & Meshmixer Tools
// ==========================================
// Main application combining Three.js 3D viewer with mesh simplification
// and model analysis features.
//
// Key Features:
//  - Load & display 3D models (GLB, GLTF, STL, OBJ)
//  - Mesh simplification using SimplifyModifier (percentage & budget modes)
//  - Checkpoint system for geometry versioning
//  - Von Mises stress visualization
//  - Model export (GLB, OBJ formats)
//  - User authentication & project saving
// ==========================================

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { SimplifyModifier } from "three/examples/jsm/modifiers/SimplifyModifier.js";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
// 把 STLExporter 換成 GLTFExporter
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";

// ---  checkpoint system  ---
let checkpointGeometry: THREE.BufferGeometry | null = null;
let checkpointMesh: THREE.Mesh | null = null;

// ---  catch UI  ---
const btnSaveCheckpoint = document.getElementById(
  "btnSaveCheckpoint",
) as HTMLButtonElement;
const btnRestoreCheckpoint = document.getElementById(
  "btnRestoreCheckpoint",
) as HTMLButtonElement;
const btnToggleCheckpoint = document.getElementById(
  "btnToggleCheckpoint",
) as HTMLButtonElement;
const checkpointStatus = document.getElementById("checkpointStatus");

// ---------- UI Elements for Meshmixer Tools (Reduce Logic) ----------
// Used by: Meshmixer Style: Reduce Logic section (lines ~640+)
// Purpose: Enable percentage-based and budget-based mesh simplification
const reduceTargetSelect = document.getElementById(
  "reduceTargetMode",
) as HTMLSelectElement;  // Toggle between percentage and budget modes
const controlPercent = document.getElementById("control-percentage");  // Percentage mode controls
const controlBudget = document.getElementById("control-budget");  // Budget mode controls

const meshSlider = document.getElementById(
  "meshDensitySlider",
) as HTMLInputElement;  // Percentage slider (0-100%)
const meshValue = document.getElementById("meshDensityValue") as HTMLElement;  // Display percentage value

const budgetInput = document.getElementById(
  "polyBudgetInput",
) as HTMLInputElement;  // Target vertex count input
const btnApplyBudget = document.getElementById("btnApplyBudget");  // Apply budget reduction button
const originalCountLabel = document.getElementById("originalCountLabel");  // Display original vertex count

const polyCountLabel = document.getElementById("polyCount");  // Display current vertex count
const modifier = new SimplifyModifier();  // Instance used by performSimplification() function

const viewer = document.getElementById("viewer") as HTMLDivElement;  // Main 3D canvas container

// ---------- UI Elements for Export Logic ----------
// Used by: Export Logic section (lines ~900+)
const exportBtn = document.getElementById(
  "DbButton",
) as HTMLButtonElement | null;  // Database/Export button

// ---------- UI Elements for User Creation ----------
// Used by: Create User functionality section (lines ~1050+)
const newUserName = document.getElementById(
  "newUserName",
) as HTMLInputElement | null;  // User name input
const newUserEmail = document.getElementById(
  "newUserEmail",
) as HTMLInputElement | null;  // User email input
const btnCreateUser = document.getElementById(
  "btnCreateUser",
) as HTMLButtonElement | null;  // Create user button
const createUserStatus = document.getElementById(
  "createUserStatus",
) as HTMLElement | null;  // Status message for user creation

// ---------- UI Elements for Auth & Save ----------
// Used by: Auth Helpers, Auth Event Handlers, Save Model Handler sections (lines ~970+)
const loginUser = document.getElementById(
  "loginUser",
) as HTMLInputElement | null;  // Username input (old UI)
const loginPass = document.getElementById(
  "loginPass",
) as HTMLInputElement | null;  // Password input (old UI)
const btnLogin = document.getElementById(
  "btnLogin",
) as HTMLButtonElement | null;  // Login button (old UI)
const btnLogout = document.getElementById(
  "btnLogout",
) as HTMLButtonElement | null;  // Logout button (old UI)
const btnSaveModel = document.getElementById(
  "btnSaveModel",
) as HTMLButtonElement | null;  // Save model to database button
const authStatus = document.getElementById("authStatus") as HTMLElement | null;  // Auth status display (old UI)

let currentModelId: number | null = null; // set after first save

/** Optional UI variant (email-only login + panels) */
const emailInput = document.getElementById("email") as HTMLInputElement | null;
const loginBtnEmail = document.getElementById(
  "loginBtn",
) as HTMLButtonElement | null;  // Login button (new UI)
const logoutBtnEmail = document.getElementById(
  "logoutBtn",
) as HTMLButtonElement | null;  // Logout button (new UI)
const loggedOutPanel = document.getElementById(
  "loggedOutPannel",
) as HTMLElement | null;  // Panel shown when logged out
const loggedInPanel = document.getElementById(
  "loggedInPannel",
) as HTMLElement | null;  // Panel shown when logged in
const welcomeMsg = document.getElementById("welcomeMsg") as HTMLElement | null;  // Welcome message display

let lastLoadedFileName: string | null = null;  // Tracks loaded file name for saving

// ==========================================
// THREE.JS SCENE SETUP
// Initializes 3D rendering environment
// Used by: All visualization sections
// ==========================================

// ---------- Scene ----------
// Main container for all 3D objects
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// ---------- Camera ----------
// Orthographic perspective with adjustable view
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
camera.position.set(2, 2, 4);

// ---------- Renderer ----------
// WebGL renderer for displaying scene
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
viewer.appendChild(renderer.domElement);
const canvas = renderer.domElement;
canvas.style.display = "block";
canvas.style.width = "100%";
canvas.style.height = "100%";

// ---------- Controls ----------
// OrbitControls used by: Viewer interaction (camera rotation/zoom)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// ---------- Lights ----------
// Lighting setup for proper model visualization
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dir = new THREE.DirectionalLight(0xffffff, 1);
dir.position.set(5, 10, 5);
scene.add(dir);

// ---------- Demo Mesh (until model is loaded) ----------
// Placeholder geometry shown before user loads a model
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: "orange" }),
);
scene.add(cube);

// ---------- Helpers (toggleable) ----------
// Grid and axes helpers for orientation reference
// Used by: Helpers toggleable section (UI controls)
const gridHelper = new THREE.GridHelper(10, 10);
const axesHelper = new THREE.AxesHelper(2);
scene.add(gridHelper);
scene.add(axesHelper);

// ---------- Current Model ----------
// Holds the loaded 3D model (replaces cube when loaded)
let currentModel: THREE.Object3D | null = null;

// ==========================================
// UI HOOKS FOR MAIN INTERACTIVE CONTROLS
// Used by: UI Event Listeners section
// ==========================================

// ---------- File Input & Status ----------
// Used by: Loader Logic section
const fileInput = document.getElementById(
  "fileInput",
) as HTMLInputElement | null;  // Load 3D model file input
const statusEl = document.getElementById("status") as HTMLDivElement | null;  // Status messages display

// ---------- View Toggle Controls ----------
// Used by: Helper visibility functions and Event Listeners
const gridToggle = document.getElementById(
  "gridToggle",
) as HTMLInputElement | null;  // Toggle grid/axes display
const modelToggle = document.getElementById(
  "modelToggle",
) as HTMLInputElement | null;  // Toggle model visibility
const wireToggle = document.getElementById(
  "wireToggle",
) as HTMLInputElement | null;  // Toggle wireframe mode
const scaleSlider = document.getElementById("scale") as HTMLInputElement | null;  // Model scale adjustment

// ---------- Camera & Display Controls ----------
// Used by: Camera and rendering functions
const resetCamBtn = document.getElementById(
  "resetCam",
) as HTMLButtonElement | null;  // Reset camera to default position
const bgColorPicker = document.getElementById(
  "bgColorPicker",
) as HTMLInputElement;  // Background color control
const modelColorPicker = document.getElementById(
  "modelColorPicker",
) as HTMLInputElement;  // Model color control

// ---------- Loaders ----------
// Used by: Loader Logic section for file format support
const stlLoader = new STLLoader();  // Loads STL format files
const objLoader = new OBJLoader();  // Loads OBJ format files

// ==========================================
// HELPER FUNCTIONS
// Core utilities used throughout application
// ==========================================

// ---------- Helpers ----------
// Display status messages to user
function setStatus(msg: string) {
  if (statusEl) statusEl.textContent = msg;
}

// Return current model or demo cube
function getTargetObject(): THREE.Object3D {
  return currentModel ?? cube;
}

// Apply grid/axes visibility toggle
// Used by: UI Event Listeners section
function applyHelperVisibility() {
  const showGrid = gridToggle?.checked ?? true;
  gridHelper.visible = showGrid;
  axesHelper.visible = showGrid;
}

// Apply model visibility toggle
// Used by: UI Event Listeners section & Loader Logic
function applyModelVisibility() {
  const showModel = modelToggle?.checked ?? true;
  if (currentModel) currentModel.visible = showModel;
  cube.visible = !currentModel && showModel;
}

// Apply scale slider to model
// Used by: UI Event Listeners section
function applyScaleFromSlider() {
  const sliderValue = Number(scaleSlider?.value ?? 100);
  const factor = sliderValue / 100;
  const target = getTargetObject();
  target.scale.set(factor, factor, factor);
}

// Apply wireframe mode to object
// Used by: Wireframe toggle and Model Color sections
function setWireframe(object: THREE.Object3D, enabled: boolean) {
  object.traverse((child: any) => {
    if (!child || !child.isMesh) return;
    const mat = child.material;
    if (Array.isArray(mat)) {
      mat.forEach((m) => {
        if (m) m.wireframe = enabled;
      });
    } else if (mat) {
      mat.wireframe = enabled;
    }
  });
}

// Toggle wireframe display
// Used by: UI Event Listeners section
function applyWireframe() {
  const enabled = wireToggle?.checked ?? false;
  const target = getTargetObject();
  setWireframe(target, enabled);
}

// Clean up current model and release resources
// Used by: Loader Logic section (onLoaded function)
function clearCurrentModel() {
  if (currentModel) {
    scene.remove(currentModel);
    currentModel.traverse((child: any) => {
      if (child?.geometry) child.geometry.dispose?.();
      const mat = child?.material;
      if (Array.isArray(mat)) mat.forEach((m) => m?.dispose?.());
      else mat?.dispose?.();
    });
    currentModel = null;
  }
  applyModelVisibility();
  applyScaleFromSlider();
  applyWireframe();
}

// Adjust camera to frame object in view
// Used by: Loader Logic section (onLoaded function)
function fitCameraToObject(object: THREE.Object3D, fitOffset = 1.2) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(maxSize) || maxSize <= 0) return;

  const fitHeightDistance =
    maxSize / (2 * Math.atan((Math.PI * camera.fov) / 360));
  const fitWidthDistance = fitHeightDistance / camera.aspect;
  const distance = fitOffset * Math.max(fitHeightDistance, fitWidthDistance);

  controls.target.copy(center);
  camera.near = distance / 100;
  camera.far = distance * 100;
  camera.updateProjectionMatrix();

  const direction = new THREE.Vector3(1, 1, 1).normalize();
  camera.position.copy(center).add(direction.multiplyScalar(distance));
  controls.update();
}

// Extract filename from path
// Used by: collectExternalUris and gltfLoader
function baseName(pathLike: string): string {
  const cleaned = decodeURIComponent(pathLike).replace(/\\/g, "/");
  const parts = cleaned.split("/");
  return parts[parts.length - 1] || cleaned;
}

// Collect external file references from glTF JSON
// Used by: Loader Logic section (gltfFiles loading)
function collectExternalUris(gltfJson: any): Set<string> {
  const uris = new Set<string>();
  const addUri = (uri?: string) => {
    if (!uri || uri.startsWith("data:")) return;
    uris.add(baseName(uri));
  };
  if (Array.isArray(gltfJson?.buffers)) {
    for (const b of gltfJson.buffers) addUri(b?.uri);
  }
  if (Array.isArray(gltfJson?.images)) {
    for (const img of gltfJson.images) addUri(img?.uri);
  }
  return uris;
}

// ==========================================
// Meshmixer Style Logic: Update Budget UI
// ==========================================
// Updates UI to reflect current vertex counts
// Used by: Budget mode toggle and simplification results display
function updateBudgetInputFromCurrent() {
  if (!currentModel) return;
  let totalVerts = 0;
  let totalOrig = 0;

  currentModel.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      totalVerts += mesh.geometry.attributes.position.count;
      if (mesh.userData.originalGeometry) {
        totalOrig += mesh.userData.originalGeometry.attributes.position.count;
      } else {
        totalOrig += mesh.geometry.attributes.position.count;
      }
    }
  });

  if (budgetInput) budgetInput.value = totalVerts.toString();
  if (originalCountLabel) originalCountLabel.textContent = totalOrig.toString();
  if (polyCountLabel)
    polyCountLabel.textContent = `Current Vertices: ${totalVerts}`;
}

// ==========================================
// Loader Logic
// ==========================================
// Handles file loading and model initialization
// Formats supported: GLB, GLTF, STL, OBJ
// Called by: fileInput change event listener
async function loadSelection(files: FileList) {
  const selected = Array.from(files);
  if (selected.length === 0) return;

  const gltfFiles = selected.filter((f) =>
    f.name.toLowerCase().endsWith(".gltf"),
  );
  const glbFiles = selected.filter((f) =>
    f.name.toLowerCase().endsWith(".glb"),
  );
  const stlFiles = selected.filter((f) =>
    f.name.toLowerCase().endsWith(".stl"),
  );
  const objFiles = selected.filter((f) =>
    f.name.toLowerCase().endsWith(".obj"),
  );

  // Helper: Shared logic after any model is loaded
  // Helper: Shared logic after any model is loaded
  const onLoaded = (object: THREE.Object3D, fileName: string) => {
    clearCurrentModel();

    currentModel = object;

    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        if (mesh.geometry.isBufferGeometry) {
          console.log(
            "Before merge: ",
            mesh.geometry.attributes.position.count,
          );
          mesh.geometry = BufferGeometryUtils.mergeVertices(
            mesh.geometry,
            0.001,
          );
          mesh.geometry.computeVertexNormals();
          console.log("After merge: ", mesh.geometry.attributes.position.count);
        }

        if (!mesh.userData.originalGeometry) {
          mesh.userData.originalGeometry = mesh.geometry.clone();
        }
      }
    });

    scene.add(object);
    cube.visible = false;

    applyModelVisibility();
    applyHelperVisibility();
    applyScaleFromSlider();
    applyWireframe();
    fitCameraToObject(object);

    setStatus(`Loaded: ${fileName}`);

    // Reset Meshmixer UI
    if (meshSlider) meshSlider.value = "100";
    if (meshValue) {
      meshValue.textContent = "100%";
      meshValue.style.color = "#ff9800";
    }
    updateBudgetInputFromCurrent();

    // record last loaded file name (used when saving)
    lastLoadedFileName = fileName;
    updateSaveButtonState();
  };

  // ---- glTF JSON package ----
  if (gltfFiles.length > 0) {
    if (gltfFiles.length !== 1) {
      setStatus("Select exactly one .gltf + deps.");
      return;
    }
    const gltfFile = gltfFiles[0];
    let gltfJson: any;
    try {
      gltfJson = JSON.parse(await gltfFile.text());
    } catch (e) {
      console.error(e);
      setStatus("Invalid JSON.");
      return;
    }

    const required = collectExternalUris(gltfJson);
    const allowed = new Set<string>([gltfFile.name, ...required]);
    const extra = selected.map((f) => f.name).filter((n) => !allowed.has(n));
    if (extra.length > 0) {
      setStatus(`Unrelated files: ${extra.join(", ")}`);
      return;
    }
    const missing = Array.from(required).filter(
      (n) => !selected.some((f) => f.name === n),
    );
    if (missing.length > 0) {
      setStatus(`Missing: ${missing.join(", ")}`);
      return;
    }

    const fileMap = new Map<string, string>();
    const urlsToRevoke: string[] = [];
    for (const f of selected) {
      const u = URL.createObjectURL(f);
      fileMap.set(f.name, u);
      urlsToRevoke.push(u);
    }

    const manager = new THREE.LoadingManager();
    manager.setURLModifier((url) => fileMap.get(baseName(url)) ?? url);
    const gltfLoader = new GLTFLoader(manager);

    gltfLoader.load(
      fileMap.get(gltfFile.name)!,
      (gltf) => {
        onLoaded(gltf.scene, gltfFile.name);
        urlsToRevoke.forEach(URL.revokeObjectURL);
      },
      undefined,
      (e) => {
        console.error(e);
        setStatus(`Failed: ${gltfFile.name}`);
        urlsToRevoke.forEach(URL.revokeObjectURL);
      },
    );
    return;
  }

  // ---- Single file ----
  const mainSingle = glbFiles[0] ?? stlFiles[0] ?? objFiles[0];
  if (!mainSingle || selected.length !== 1) {
    setStatus("Unsupported or multiple single files selected.");
    return;
  }
  const name = mainSingle.name.toLowerCase();
  const url = URL.createObjectURL(mainSingle);

  const onError = (e: any) => {
    console.error(e);
    setStatus(`Failed: ${mainSingle.name}`);
    URL.revokeObjectURL(url);
  };

  if (name.endsWith(".glb")) {
    new GLTFLoader().load(
      url,
      (gltf) => {
        onLoaded(gltf.scene, mainSingle.name);
        URL.revokeObjectURL(url);
      },
      undefined,
      onError,
    );
  } else if (name.endsWith(".stl")) {
    stlLoader.load(
      url,
      (geo) => {
        //geo.center();
        // Default color or picked color
        const initialColor = modelColorPicker
          ? modelColorPicker.value
          : "#9a9a9a";
        const mat = new THREE.MeshStandardMaterial({
          color: initialColor,
          roughness: 0.8,
          metalness: 0.0,
        });
        const mesh = new THREE.Mesh(geo, mat);
        //mesh.rotation.x = -Math.PI / 2;
        onLoaded(mesh, mainSingle.name);
        URL.revokeObjectURL(url);
      },
      undefined,
      onError,
    );
  } else if (name.endsWith(".obj")) {
    objLoader.load(
      url,
      (obj) => {
        const initialColor = modelColorPicker
          ? modelColorPicker.value
          : "#9a9a9a";
        const mat = new THREE.MeshStandardMaterial({
          color: initialColor,
          roughness: 0.8,
          metalness: 0.0,
        });

        obj.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            (child as THREE.Mesh).material = mat;
          }
        });
        onLoaded(obj, mainSingle.name);
        URL.revokeObjectURL(url);
      },
      undefined,
      onError,
    );
  }
}

// ==========================================
// UI Event Listeners
// Attaches interactive handlers to controls
// ==========================================

// File loader event
fileInput?.addEventListener("change", (e) => {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files.length > 0) loadSelection(input.files);
  input.value = "";
});

// Helper visibility controls
gridToggle?.addEventListener("change", applyHelperVisibility);
modelToggle?.addEventListener("change", applyModelVisibility);
wireToggle?.addEventListener("change", applyWireframe);

// Scale slider adjusts model size
scaleSlider?.addEventListener("input", () => {
  applyScaleFromSlider();
  applyWireframe();
});

// Reset camera button
resetCamBtn?.addEventListener("click", () => {
  camera.position.set(2, 2, 4);
  controls.target.set(0, 0, 0);
  controls.update();
});

// 1. Background Color Picker
if (bgColorPicker) {
  bgColorPicker.addEventListener("input", (e) => {
    scene.background = new THREE.Color((e.target as HTMLInputElement).value);
  });
}

// Density Visualization: Click on model to visualize face density
// Calculates surface area density at each vertex using face information
// Used by: Viewer canvas click event
viewer.addEventListener("click", () => {
  let mesh = getMesh(currentModel);
  if (mesh) {
    if (mesh.geometry.isBufferGeometry) {
      const position = mesh.geometry.attributes.position;
      const index = mesh.geometry.index;

      if (position && index) {
        const vertexCount = position.count;
        const density: number[] = new Array(vertexCount).fill(0);
        const numFaces: number[] = new Array(vertexCount).fill(0);

        for (let j = 0; j < index.count; j += 3) {
          const aIndex = index.getX(j);
          const bIndex = index.getY(j);
          const cIndex = index.getZ(j);

          const a = new THREE.Vector3(
            position.getX(aIndex),
            position.getY(aIndex),
            position.getZ(aIndex),
          );
          const b = new THREE.Vector3(
            position.getX(bIndex),
            position.getY(cIndex),
            position.getZ(bIndex),
          );
          const c = new THREE.Vector3(
            position.getX(cIndex),
            position.getY(cIndex),
            position.getZ(cIndex),
          );
          const ab = b.sub(a);
          const ac = c.sub(a);
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
        for (let j = 0; j < numFaces.length; j++) {
          if (numFaces[j] > 0) {
            density[j] /= numFaces[j];
          }

          if (density[j] > maxDensity) {
            maxDensity = density[j];
          }
          if (density[j] < minDensity) {
            minDensity = density[j];
          }
        }

        console.log("MAX FACE (Density): ", maxDensity);
        console.log("MIN FACE (Density): ", minDensity);

        const colors = [];
        const color = new THREE.Color();

        for (let i = 0; i < vertexCount; i++) {
          let heatValue = 0;
          if (maxDensity != minDensity) {
            heatValue = (density[i] - minDensity) / (maxDensity - minDensity);
          }

          color.setHSL(heatValue * 0.66, 1.0, 0.5);
          if (heatValue > 1 && heatValue < 0) {
            console.log("bad heat value");
          }
          colors.push(color.r, color.g, color.b);
        }

        mesh.geometry.setAttribute(
          "color",
          new THREE.Float32BufferAttribute(colors, 3),
        );
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.vertexColors = true;
        material.needsUpdate = true;
      } else {
        console.warn("");
      }
    }
  }
});

function getMesh(object: THREE.Object3D | null): THREE.Mesh | null {
  if (object?.type == "Mesh") {
    return object as THREE.Mesh;
  }
  if (!(object instanceof THREE.Object3D)) {
    console.error("Provided object is not a THREE.Object3D or Group.");
    return null;
  }

  // Search through children
  for (let child of object.children) {
    if (child.type == "Mesh") {
      return child as THREE.Mesh; // Found the first mesh
    }
    // If the child is another group or Object3D, search inside it
    if (child.children && child.children.length > 0) {
      const mesh = getMesh(child);
      if (mesh) return mesh;
    }
  }

  // No mesh found
  return null;
}

// 2. Model Color Picker
// Changes material color of all meshes in current model
// Used by: Material color control
if (modelColorPicker) {
  modelColorPicker.addEventListener("input", (e) => {
    if (!currentModel) return;
    const colorHex = (e.target as HTMLInputElement).value;
    const newColor = new THREE.Color(colorHex);
    currentModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        materials.forEach((mat) => {
          if ((mat as THREE.MeshStandardMaterial).color) {
            (mat as THREE.MeshStandardMaterial).color.set(newColor);
          }
        });
      }
    });
  });
}

// ==========================================
// Meshmixer Style: Reduce Logic
// ==========================================
// Provides mesh simplification using SimplifyModifier from Three.js
// 
// SimplifyModifier Reference:
//  - Import: 'three/examples/jsm/modifiers/SimplifyModifier.js' (line 6)
//  - Instance: const modifier = new SimplifyModifier(); (line 45)
//  - Purpose: Reduces vertex count while preserving geometry shape
//  - Method: modifier.modify(geometry, targetVertexCount)
//  - Usage: Supports both percentage-based and budget-based reduction modes
//
// Two reduction modes:
//  1. Percentage Mode: Reduce by percentage (0-100%)
//  2. Budget Mode: Target a specific vertex count

// 3. Toggle Mode (Percentage vs Budget)
if (reduceTargetSelect) {
  reduceTargetSelect.addEventListener("change", () => {
    const mode = reduceTargetSelect.value;
    if (mode === "percentage") {
      // Show percentage controls
      if (controlPercent) controlPercent.style.display = "block";
      if (controlBudget) controlBudget.style.display = "none";
    } else {
      // Show budget controls and update with current vertex count
      if (controlPercent) controlPercent.style.display = "none";
      if (controlBudget) controlBudget.style.display = "block";
      // Update input with current vertex count
      updateBudgetInputFromCurrent();
    }
  });
}

function performSimplification(targetType: "ratio" | "count", value: number) {
  // SimplifyModifier.modify(geometry, targetVertexCount) reduces vertex count
  // This function orchestrates the simplification process across all meshes
  
  if (!currentModel) return;

  setStatus("Computing simplification...");

  setTimeout(() => {
    let currentTotalVerts = 0;

    currentModel!.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        // Store original geometry for reference
        if (!mesh.userData.originalGeometry) {
          mesh.userData.originalGeometry = mesh.geometry.clone();
        }
        const originalGeo = mesh.userData.originalGeometry;
        const origCount = originalGeo.attributes.position.count;

        let targetCount = 0;

        // Calculate target vertex count based on mode
        if (targetType === "ratio") {
          // Percentage mode: convert slider value (0-1) to vertex reduction
          targetCount = Math.floor(origCount * (1 - value));
        } else {
          // Budget mode: target specific vertex count across all meshes
          const globalOrig = parseInt(originalCountLabel?.textContent || "1");
          let removeRatio = value / globalOrig;

          if (removeRatio > 1) removeRatio = 1;
          if (removeRatio < 0) removeRatio = 0;

          targetCount = Math.floor(origCount * (1 - removeRatio));
          //const globalRatio = value / globalOrig;
          //targetCount = Math.floor(origCount * globalRatio);
        }

        const absoluteMin = 50;
        const percentageMin = Math.floor(origCount * 0.3);
        const minLimit = Math.max(absoluteMin, percentageMin);

        // Ensure minimum vertex count for stability
        if (targetCount < minLimit) {
          targetCount = minLimit;
        }

        // Skip simplification if target is too close to original
        if (targetCount >= origCount * 0.99) {
          mesh.geometry.dispose();
          mesh.geometry = originalGeo.clone();
          currentTotalVerts += origCount;
          return;
        }

        try {
          // SimplifyModifier.modify(geometry, targetCount)
          // Performs vertex reduction while maintaining shape fidelity
          const simplified = modifier.modify(originalGeo.clone(), targetCount);

          mesh.geometry.dispose();
          mesh.geometry = simplified;
          currentTotalVerts += simplified.attributes.position.count;
        } catch (e) {
          console.error("Simplify failed", e);
          // Fallback to original if simplification fails
          mesh.geometry.dispose();
          mesh.geometry = originalGeo.clone();
          currentTotalVerts += origCount;
        }
      }
    });

    // Update UI with new vertex count
    if (polyCountLabel)
      polyCountLabel.textContent = `Current Vertices: ${currentTotalVerts}`;

    setStatus("Simplification complete");
  }, 50);
}

// 5. Slider Events - Percentage-based reduction with SimplifyModifier
if (meshSlider) {
  meshSlider.addEventListener("input", () => {
    // Shows live feedback while dragging
    if (meshValue) {
      meshValue.textContent = `${meshSlider.value}% (Release)`;
      meshValue.style.color = "#ffff00";
    }
  });

  meshSlider.addEventListener("change", () => {
    // On release, triggers simplification with percentage-based reduction
    // SimplifyModifier.modify() is called in performSimplification()
    const percent = parseInt(meshSlider.value);
    if (meshValue) {
      meshValue.textContent = `${percent}%`;
      meshValue.style.color = "#ff9800";
    }
    // Convert 0-100 slider to 0.0-1.0 ratio for SimplifyModifier
    performSimplification("ratio", percent / 100);
  });
}

// 6. Budget Apply Button - Target vertex count with SimplifyModifier
if (btnApplyBudget && budgetInput) {
  btnApplyBudget.addEventListener("click", () => {
    const budget = parseInt(budgetInput.value);
    if (isNaN(budget) || budget < 4) {
      alert("Please enter a valid vertex count");
      return;
    }
    // Triggers simplification with budget-based reduction
    // SimplifyModifier.modify(geometry, budget) targets specific vertex count
    performSimplification("count", budget);
  });
}
// ==========================================
// Checkpoint System
// ==========================================

// make sure all buttons exist before adding event listeners
if (btnSaveCheckpoint && btnRestoreCheckpoint && btnToggleCheckpoint) {
  // --- (Save) ---
  btnSaveCheckpoint.addEventListener("click", () => {
    if (!currentModel) return;

    let found = false;
    currentModel.traverse((child) => {
      if (!found && (child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        checkpointGeometry = mesh.geometry.clone();
        found = true;
      }
    });

    if (found) {
      btnRestoreCheckpoint.disabled = false;
      btnToggleCheckpoint.disabled = false;

      if (checkpointStatus) {
        const time = new Date().toLocaleTimeString();
        checkpointStatus.textContent = `Saved at ${time}`;
        checkpointStatus.style.color = "#4caf50";
      }

      updateGhostOverlay();

      console.log("Checkpoint saved!");
    }
  });

  // --- Restore ---
  btnRestoreCheckpoint.addEventListener("click", () => {
    if (!currentModel || !checkpointGeometry) return;

    currentModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        mesh.geometry.dispose();
        mesh.geometry = checkpointGeometry!.clone();

        const currentVerts = mesh.geometry.attributes.position.count;

        const polyCountLabel = document.getElementById("polyCount");
        if (polyCountLabel) {
          polyCountLabel.textContent = `Current Vertices: ${currentVerts}`;
        }

        if (mesh.userData.originalGeometry) {
          const origVerts =
            mesh.userData.originalGeometry.attributes.position.count;

          let restoredPercentage = Math.round((currentVerts / origVerts) * 100);

          if (restoredPercentage > 100) restoredPercentage = 100;
          if (restoredPercentage < 0) restoredPercentage = 0;

          if (meshSlider) {
            meshSlider.value = restoredPercentage.toString();
          }
          if (meshValue) {
            meshValue.textContent = `${restoredPercentage}%`;
            meshValue.style.color = "#ff9800";
          }

          if (budgetInput) {
            budgetInput.value = currentVerts.toString();
          }
        }
      }
    });

    console.log("Model restored from checkpoint and UI synced.");
  });

  // ---  Overlay ---
  let isGhostVisible = false;

  btnToggleCheckpoint.addEventListener("click", () => {
    if (!checkpointMesh) {
      updateGhostOverlay();
    }

    isGhostVisible = !isGhostVisible;

    if (checkpointMesh) {
      checkpointMesh.visible = isGhostVisible;
    }

    btnToggleCheckpoint.style.background = isGhostVisible ? "#d9534f" : "";
    btnToggleCheckpoint.innerHTML = isGhostVisible
      ? '<i class="fa-solid fa-ghost"></i> Hide Overlay'
      : '<i class="fa-solid fa-ghost"></i> Show Overlay';
  });
}

//
function updateGhostOverlay() {
  if (!checkpointGeometry) return;

  if (checkpointMesh) {
    scene.remove(checkpointMesh);
    if (checkpointMesh.geometry) checkpointMesh.geometry.dispose();
    checkpointMesh = null;
  }

  const material = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
    depthTest: true, //  should always be visible on top
  });

  // create Mesh
  checkpointMesh = new THREE.Mesh(checkpointGeometry, material);
  checkpointMesh.visible = false;

  let targetMesh: THREE.Mesh | null = null;

  currentModel!.traverse((child) => {
    if (!targetMesh && (child as THREE.Mesh).isMesh) {
      targetMesh = child as THREE.Mesh;
    }
  });

  if (targetMesh !== null) {
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();

    (targetMesh as THREE.Mesh).getWorldPosition(worldPos);
    (targetMesh as THREE.Mesh).getWorldQuaternion(worldQuat);
    (targetMesh as THREE.Mesh).getWorldScale(worldScale);

    checkpointMesh.position.copy(worldPos);
    checkpointMesh.quaternion.copy(worldQuat);
    checkpointMesh.scale.copy(worldScale);

    checkpointMesh.scale.multiplyScalar(1.01);
  }

  scene.add(checkpointMesh);
}

// ==========================================
// Von Mises Stress Visualization
// ==========================================

const btnStressAnalysis = document.getElementById("btnStressAnalysis");

if (btnStressAnalysis) {
  btnStressAnalysis.addEventListener("click", () => {
    if (!currentModel) return;

    setStatus("Computing Von Mises Stress (Simulated)...");

    currentModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const geometry = mesh.geometry;

        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        const centerPoint = new THREE.Vector3();
        geometry.boundingBox!.getCenter(centerPoint);

        const count = geometry.attributes.position.count;
        const colors = new Float32Array(count * 3);
        const pos = geometry.attributes.position;
        const norm = geometry.attributes.normal;

        const stressValues: number[] = [];
        let maxStress = 0;
        let minStress = Infinity;

        for (let i = 0; i < count; i++) {
          const x = pos.getX(i);
          const y = pos.getY(i);
          const z = pos.getZ(i);

          const dx = x - centerPoint.x;
          const dy = y - centerPoint.y;
          const dz = z - centerPoint.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const stress = dist * 1.0;

          stressValues.push(stress);
          if (stress > maxStress) maxStress = stress;
          if (stress < minStress) minStress = stress;
        }

        const color = new THREE.Color();
        for (let i = 0; i < count; i++) {
          const val = stressValues[i];

          let t = 0;
          if (maxStress > minStress) {
            t = (val - minStress) / (maxStress - minStress);
          }

          color.setHSL(0.66 * (1.0 - t), 1.0, 0.5);

          colors[i * 3] = color.r;
          colors[i * 3 + 1] = color.g;
          colors[i * 3 + 2] = color.b;
        }

        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        mesh.material = new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.5,
          metalness: 0.1,
        });
      }
    });

    setStatus("Von Mises Analysis Complete: Red = High Stress");
  });
}

// ==========================================
// Export Logic
// ==========================================

const btnExportGLB = document.getElementById("btnExportGLB");
const btnExportOBJ = document.getElementById("btnExportOBJ");

function downloadFile(data: any, filename: string, mimeType: string) {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.style.display = "none";
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportCorrectedModel(exporterType: "glb" | "obj") {
  if (!currentModel) {
    alert("No model to export!");
    return;
  }

  setStatus(`Preparing ${exporterType.toUpperCase()} for export...`);

  const exportScene = new THREE.Scene();
  currentModel.updateMatrixWorld(true);

  currentModel.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;

      const cloneGeo = mesh.geometry.clone();

      let cloneMat;
      if (Array.isArray(mesh.material)) {
        cloneMat = mesh.material.map((m) => {
          const newMat = m.clone();
          if ("wireframe" in newMat) {
            (newMat as any).wireframe = false;
          }
          return newMat;
        });
      } else {
        cloneMat = mesh.material.clone();
        if ("wireframe" in cloneMat) {
          (cloneMat as any).wireframe = false;
        }
      }

      const cloneMesh = new THREE.Mesh(cloneGeo, cloneMat);
      cloneGeo.applyMatrix4(mesh.matrixWorld);
      exportScene.add(cloneMesh);
    }
  });

  try {
    if (exporterType === "glb") {
      const exporter = new GLTFExporter();
      exporter.parse(
        exportScene,
        (result) => {
          downloadFile(
            result,
            "simplified_model.glb",
            "application/octet-stream",
          );
          setStatus("GLB Exported Successfully!");
        },
        (error) => {
          console.error("GLB Export Error:", error);
          setStatus("Failed to export GLB");
        },
        { binary: true },
      );
    } else {
      const exporter = new OBJExporter();
      const result = exporter.parse(exportScene);
      downloadFile(result, "simplified_model.obj", "text/plain");
      setStatus("OBJ Exported Successfully!");
    }
  } catch (e) {
    console.error("Export Error", e);
    setStatus(`Failed to export ${exporterType.toUpperCase()}`);
  }
}

if (btnExportGLB) {
  btnExportGLB.addEventListener("click", () => exportCorrectedModel("glb"));
}

if (btnExportOBJ) {
  btnExportOBJ.addEventListener("click", () => exportCorrectedModel("obj"));
}

// ==========================================
// Resize & Animate Loop
// ==========================================
// Maintains responsive canvas and animation frame
// Used by: Main render loop

// Handle window resize and canvas scaling
function resizeToViewer() {
  const w = viewer.clientWidth;
  const h = viewer.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

// Listen for window and container resize events
window.addEventListener("resize", resizeToViewer);
new ResizeObserver(resizeToViewer).observe(viewer);
resizeToViewer();

// Main animation loop - renders scene continuously
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// ==========================================
// Authentication System
// ==========================================
// Manages user login/logout and session tokens
// Supports two UI variants: old (username/password) and new (email-based)
// Related sections: Auth Event Handlers, Save Model Handler, Email-only Login

// ---------- Auth Helpers ----------
// Retrieve auth token from localStorage
function getAuthToken(): string | null {
  return localStorage.getItem("authToken");
}

// Store/clear auth token and session user
// Updates UI after token change
function setAuthToken(token: string | null, username?: string | null) {
  if (token) {
    localStorage.setItem("authToken", token);
    if (username) localStorage.setItem("authUser", username);
  } else {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
  }
  updateAuthUI();
}

// Retrieve logged-in user from localStorage
function getAuthUser(): string | null {
  return localStorage.getItem("authUser");
}

// Update UI to reflect auth state
// Shows/hides panels and buttons based on login status
// Used by: setAuthToken, initial load, all auth event handlers
function updateAuthUI() {
  const token = getAuthToken();
  const user = getAuthUser();

  // Status text (old UI)
  if (authStatus) {
    authStatus.textContent = token
      ? `Logged in as ${user ?? "user"}`
      : "Not logged in";
  }

  // Panel swap (new UI)
  if (loggedOutPanel) loggedOutPanel.style.display = token ? "none" : "";
  if (loggedInPanel) loggedInPanel.style.display = token ? "" : "none";
  if (welcomeMsg)
    welcomeMsg.textContent = token
      ? `Welcome, ${user ?? "User"}!`
      : "Welcome, User!";

  updateSaveButtonState();
}

// Enable save button only if logged in and model loaded
// Used by: updateAuthUI, onLoaded (Loader Logic)
function updateSaveButtonState() {
  if (!btnSaveModel) return;
  const hasToken = !!getAuthToken();
  // Enable save only if logged in and a model is loaded
  btnSaveModel.disabled = !(hasToken && !!lastLoadedFileName);
}

// ==========================================
// Auth Event Handlers (Old UI - Username/Password)
// ==========================================
// Traditional login handler using username and password
// API Endpoint: POST /api/login
// Related to: Auth Helpers, updateAuthUI

if (btnLogin) {
  btnLogin.addEventListener("click", async () => {
    const user = loginUser?.value ?? "";
    const pass = loginPass?.value ?? "";
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password: pass }),
      });
      if (!res.ok) {
        const txt = await res.text();
        alert(`Login failed: ${res.status} ${txt}`);
        return;
      }
      const data = await res.json();
      if (data?.token) {
        setAuthToken(data.token, user);
        setStatus("Login successful");
      } else {
        alert("Login response missing token");
      }
    } catch (err) {
      console.error("Login error", err);
      alert("Login request failed");
    }
  });
}

// ==========================================
// Email-only Login (New Panel UI)
// ==========================================
// Alternative login using email address only
// Checks if user exists in database and logs in
// API Endpoint: GET /api/users/exists?email=...
// Related to: Auth Helpers, updateAuthUI

// this will log in by checking the users table.
if (loginBtnEmail) {
  loginBtnEmail.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = emailInput?.value?.trim() ?? "";
    if (!email) {
      alert("Please enter an email");
      return;
    }
    try {
      const res = await fetch(
        `/api/users/exists?email=${encodeURIComponent(email)}`,
      );
      if (!res.ok) {
        const txt = await res.text();
        alert(`Login check failed: ${res.status} ${txt}`);
        return;
      }
      const data = await res.json();
      if (data?.exists) {
        // For now, store a dev token (not secure). This just drives the UI.
        setAuthToken(`devemail-${Date.now()}`, email);
        setStatus("Login successful");
      } else {
        alert("No user found with that email");
      }
    } catch (err) {
      console.error("Email login error", err);
      alert("Login request failed");
    }
  });
}

// Logout handlers for both UI variants
if (logoutBtnEmail) {
  logoutBtnEmail.addEventListener("click", (e) => {
    e.preventDefault();
    setAuthToken(null);
    setStatus("Logged out");
  });
}

if (btnLogout) {
  btnLogout.addEventListener("click", () => {
    setAuthToken(null);
    setStatus("Logged out");
  });
}

// ==========================================
// Save Model Handler
// ==========================================
// Saves current model metadata to database
// Collects: model name, timestamp, vertex count
// API Endpoint: POST /api/projects
// Requires: Authentication token, loaded model
// Related to: Auth Helpers, Loader Logic (lastLoadedFileName)

if (btnSaveModel) {
  btnSaveModel.addEventListener("click", async () => {
    console.log("Attempting to save model");

    if (!lastLoadedFile || !lastLoadedFileName) {
      alert("No model file loaded to save");
      return;
    }

    const token = getAuthToken();
    if (!token) {
      alert("Please login before saving");
      return;
    }

    // optional: compute vertices for logging/metadata (not stored in DB currently)
    const uploadedAt = new Date().toISOString();

    const fd = new FormData();
    fd.append("file", lastLoadedFile); // multer expects field name "file"
    fd.append("model_name", lastLoadedFileName); // backend reads req.body.model_name
    fd.append("uploadedAt", uploadedAt);

    // IMPORTANT: send model_id if we have one, so backend can UPDATE
    if (currentModelId !== null) {
      fd.append("model_id", String(currentModelId));
    }

    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // DO NOT set Content-Type when sending FormData
        },
        body: fd,
      });

      if (!res.ok) {
        const txt = await res.text();
        alert(`Save failed: ${res.status} ${txt}`);
        return;
      }

      const row = await res.json();

      // Store the id so future saves update instead of insert
      if (row?.model_id != null) currentModelId = Number(row.model_id);

      console.log("Saved model row:", row);
      setStatus("Model saved");
    } catch (err) {
      console.error("Save error", err);
      alert("Save request failed");
    }
  });
}
// Create User functionality
if (btnCreateUser) {
  btnCreateUser.addEventListener("click", async () => {
    const name = newUserName?.value?.trim();
    const email = newUserEmail?.value?.trim();
    if (!name || !email) {
      if (createUserStatus)
        createUserStatus.textContent = "Name and email required";
      return;
    }
    if (createUserStatus) createUserStatus.textContent = "Creating...";
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      if (res.status === 201) {
        const row = await res.json();
        if (createUserStatus)
          createUserStatus.textContent = `Created: ${row.email}`;
        newUserName!.value = "";
        newUserEmail!.value = "";
      } else if (res.status === 409) {
        if (createUserStatus)
          createUserStatus.textContent = "Email already exists";
      } else {
        const txt = await res.text();
        if (createUserStatus)
          createUserStatus.textContent = `Failed: ${res.status} ${txt}`;
      }
    } catch (err) {
      console.error("Create user failed", err);
      if (createUserStatus)
        createUserStatus.textContent = "Create request failed";
    }
  });
}

// Initialize UI from stored state
updateAuthUI();

// ==========================================
// Database Functionality
// ==========================================
// Exports projects to database or diagnostic output
// Used by: Export button (DbButton)
// Related to: Save Model Handler section

exportBtn?.addEventListener("click", async () => {
  try {
    const res = await fetch("/api/projects");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    console.log("Projects table:", rows);
  } catch (err) {
    console.error("Failed to fetch projects:", err);
  }
});
