import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { SimplifyModifier } from "three/examples/jsm/modifiers/SimplifyModifier.js";

// ---------- UI Elements for Meshmixer Tools ----------
const reduceTargetSelect = document.getElementById(
  "reduceTargetMode",
) as HTMLSelectElement;
const controlPercent = document.getElementById("control-percentage");
const controlBudget = document.getElementById("control-budget");

const meshSlider = document.getElementById(
  "meshDensitySlider",
) as HTMLInputElement;
const meshValue = document.getElementById("meshDensityValue") as HTMLElement;

const budgetInput = document.getElementById(
  "polyBudgetInput",
) as HTMLInputElement;
const btnApplyBudget = document.getElementById("btnApplyBudget");
const originalCountLabel = document.getElementById("originalCountLabel");

const polyCountLabel = document.getElementById("polyCount");
const modifier = new SimplifyModifier();

const viewer = document.getElementById("viewer") as HTMLDivElement;

const exportBtn = document.getElementById(
  "DbButton",
) as HTMLButtonElement | null;

// Create user UI elements
const newUserName = document.getElementById(
  "newUserName",
) as HTMLInputElement | null;
const newUserEmail = document.getElementById(
  "newUserEmail",
) as HTMLInputElement | null;
const btnCreateUser = document.getElementById(
  "btnCreateUser",
) as HTMLButtonElement | null;
const createUserStatus = document.getElementById(
  "createUserStatus",
) as HTMLElement | null;

// ---------- Auth & Save UI Elements ----------
const loginUser = document.getElementById(
  "loginUser",
) as HTMLInputElement | null;
const loginPass = document.getElementById(
  "loginPass",
) as HTMLInputElement | null;
const btnLogin = document.getElementById(
  "btnLogin",
) as HTMLButtonElement | null;
const btnLogout = document.getElementById(
  "btnLogout",
) as HTMLButtonElement | null;
const btnSaveModel = document.getElementById(
  "btnSaveModel",
) as HTMLButtonElement | null;
const authStatus = document.getElementById("authStatus") as HTMLElement | null;

/** Optional UI variant (email-only login + panels) */
const emailInput = document.getElementById("email") as HTMLInputElement | null;
const loginBtnEmail = document.getElementById(
  "loginBtn",
) as HTMLButtonElement | null;
const logoutBtnEmail = document.getElementById(
  "logoutBtn",
) as HTMLButtonElement | null;
const loggedOutPanel = document.getElementById(
  "loggedOutPannel",
) as HTMLElement | null;
const loggedInPanel = document.getElementById(
  "loggedInPannel",
) as HTMLElement | null;
const welcomeMsg = document.getElementById("welcomeMsg") as HTMLElement | null;

let lastLoadedFileName: string | null = null;

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// ---------- Camera ----------
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
camera.position.set(2, 2, 4);

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
viewer.appendChild(renderer.domElement);
const canvas = renderer.domElement;
canvas.style.display = "block";
canvas.style.width = "100%";
canvas.style.height = "100%";

// ---------- Controls ----------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// ---------- Lights ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dir = new THREE.DirectionalLight(0xffffff, 1);
dir.position.set(5, 10, 5);
scene.add(dir);

// ---------- Demo Mesh (until model is loaded) ----------
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: "orange" }),
);
scene.add(cube);

// ---------- Helpers (toggleable) ----------
const gridHelper = new THREE.GridHelper(10, 10);
const axesHelper = new THREE.AxesHelper(2);
scene.add(gridHelper);
scene.add(axesHelper);

// ---------- Current Model ----------
let currentModel: THREE.Object3D | null = null;

// ---------- UI Hooks ----------
const fileInput = document.getElementById(
  "fileInput",
) as HTMLInputElement | null;
const statusEl = document.getElementById("status") as HTMLDivElement | null;

const gridToggle = document.getElementById(
  "gridToggle",
) as HTMLInputElement | null;
const modelToggle = document.getElementById(
  "modelToggle",
) as HTMLInputElement | null;
const wireToggle = document.getElementById(
  "wireToggle",
) as HTMLInputElement | null;
const scaleSlider = document.getElementById("scale") as HTMLInputElement | null;

const resetCamBtn = document.getElementById(
  "resetCam",
) as HTMLButtonElement | null;
const bgColorPicker = document.getElementById(
  "bgColorPicker",
) as HTMLInputElement;
const modelColorPicker = document.getElementById(
  "modelColorPicker",
) as HTMLInputElement;

// ---------- Loaders ----------
const stlLoader = new STLLoader();
const objLoader = new OBJLoader();

// ---------- Helpers ----------
function setStatus(msg: string) {
  if (statusEl) statusEl.textContent = msg;
}

function getTargetObject(): THREE.Object3D {
  return currentModel ?? cube;
}

function applyHelperVisibility() {
  const showGrid = gridToggle?.checked ?? true;
  gridHelper.visible = showGrid;
  axesHelper.visible = showGrid;
}

function applyModelVisibility() {
  const showModel = modelToggle?.checked ?? true;
  if (currentModel) currentModel.visible = showModel;
  cube.visible = !currentModel && showModel;
}

function applyScaleFromSlider() {
  const sliderValue = Number(scaleSlider?.value ?? 100);
  const factor = sliderValue / 100;
  const target = getTargetObject();
  target.scale.set(factor, factor, factor);
}

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

function applyWireframe() {
  const enabled = wireToggle?.checked ?? false;
  const target = getTargetObject();
  setWireframe(target, enabled);
}

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

function baseName(pathLike: string): string {
  const cleaned = decodeURIComponent(pathLike).replace(/\\/g, "/");
  const parts = cleaned.split("/");
  return parts[parts.length - 1] || cleaned;
}

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
        // 如果還沒備份，當作當前就是原始
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
  const onLoaded = (object: THREE.Object3D, fileName: string) => {
    clearCurrentModel();

    // 1. Backup Geometry for Simplification
    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (!mesh.userData.originalGeometry) {
          mesh.userData.originalGeometry = mesh.geometry.clone();
        }
      }
    });

    currentModel = object;
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
        geo.center();
        // Default color or picked color
        const initialColor = modelColorPicker
          ? modelColorPicker.value
          : "#9a9a9a";
        const mat = new THREE.MeshStandardMaterial({
          color: initialColor,
          roughness: 0.5,
          metalness: 0.1,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
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
        onLoaded(obj, mainSingle.name);
        URL.revokeObjectURL(url);
      },
      undefined,
      onError,
    );
  }
}

// ---------- UI Event Listeners ----------

fileInput?.addEventListener("change", (e) => {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files.length > 0) loadSelection(input.files);
  input.value = "";
});

gridToggle?.addEventListener("change", applyHelperVisibility);
modelToggle?.addEventListener("change", applyModelVisibility);
wireToggle?.addEventListener("change", applyWireframe);
scaleSlider?.addEventListener("input", () => {
  applyScaleFromSlider();
  applyWireframe();
});
resetCamBtn?.addEventListener("click", () => {
  camera.position.set(2, 2, 4);
  controls.target.set(0, 0, 0);
  controls.update();
});

// 1. Background Color
if (bgColorPicker) {
  bgColorPicker.addEventListener("input", (e) => {
    scene.background = new THREE.Color((e.target as HTMLInputElement).value);
  });
}

// 2. Model Color
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

// 3. Toggle Mode (Percentage vs Budget)
if (reduceTargetSelect) {
  reduceTargetSelect.addEventListener("change", () => {
    const mode = reduceTargetSelect.value;
    if (mode === "percentage") {
      if (controlPercent) controlPercent.style.display = "block";
      if (controlBudget) controlBudget.style.display = "none";
    } else {
      if (controlPercent) controlPercent.style.display = "none";
      if (controlBudget) controlBudget.style.display = "block";
      // Update input with current vertex count
      updateBudgetInputFromCurrent();
    }
  });
}

function performSimplification(targetType: "ratio" | "count", value: number) {
  if (!currentModel) return;

  setStatus("Computing simplification...");

  setTimeout(() => {
    let currentTotalVerts = 0;

    currentModel!.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        if (!mesh.userData.originalGeometry) {
          mesh.userData.originalGeometry = mesh.geometry.clone();
        }
        const originalGeo = mesh.userData.originalGeometry;
        const origCount = originalGeo.attributes.position.count;

        let targetCount = 0;

        if (targetType === "ratio") {
          targetCount = Math.floor(origCount * (1 - value));
        } else {
          const globalOrig = parseInt(originalCountLabel?.textContent || "1");
          let removeRatio = value / globalOrig;

          if (removeRatio > 1) removeRatio = 1;
          if (removeRatio < 0) removeRatio = 0;

          targetCount = Math.floor(origCount * (1 - removeRatio));
          //const globalRatio = value / globalOrig;
          //targetCount = Math.floor(origCount * globalRatio);
        }

        //const minLimit = 10;
        //if (targetCount < minLimit) targetCount = minLimit;
        const absoluteMin = 50;

        const percentageMin = Math.floor(origCount * 0.01);

        const minLimit = Math.max(absoluteMin, percentageMin);

        if (targetCount < minLimit) {
          targetCount = minLimit;
        }

        if (targetCount >= origCount * 0.99) {
          mesh.geometry.dispose();
          mesh.geometry = originalGeo.clone();
          currentTotalVerts += origCount;
          return;
        }

        try {
          const simplified = modifier.modify(originalGeo.clone(), targetCount);

          mesh.geometry.dispose();
          mesh.geometry = simplified;
          currentTotalVerts += simplified.attributes.position.count;
        } catch (e) {
          console.error("Simplify failed", e);
          mesh.geometry.dispose();
          mesh.geometry = originalGeo.clone();
          currentTotalVerts += origCount;
        }
      }
    });

    if (polyCountLabel)
      polyCountLabel.textContent = `Current Vertices: ${currentTotalVerts}`;

    setStatus("Simplification complete");
  }, 50);
}

// 5. Slider Events
if (meshSlider) {
  meshSlider.addEventListener("input", () => {
    if (meshValue) {
      meshValue.textContent = `${meshSlider.value}% (Release)`;
      meshValue.style.color = "#ffff00";
    }
  });

  meshSlider.addEventListener("change", () => {
    const percent = parseInt(meshSlider.value);
    if (meshValue) {
      meshValue.textContent = `${percent}%`;
      meshValue.style.color = "#ff9800";
    }
    // Convert 0-100 to 0.0-1.0
    performSimplification("ratio", percent / 100);
  });
}

// 6. Budget Apply Button
if (btnApplyBudget && budgetInput) {
  btnApplyBudget.addEventListener("click", () => {
    const budget = parseInt(budgetInput.value);
    if (isNaN(budget) || budget < 4) {
      alert("Please enter a valid vertex count");
      return;
    }
    performSimplification("count", budget);
  });
}

// ---------- Resize & Animate ----------
function resizeToViewer() {
  const w = viewer.clientWidth;
  const h = viewer.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resizeToViewer);
new ResizeObserver(resizeToViewer).observe(viewer);
resizeToViewer();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// ---------- Auth Helpers ----------
function getAuthToken(): string | null {
  return localStorage.getItem("authToken");
}

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

function getAuthUser(): string | null {
  return localStorage.getItem("authUser");
}

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

function updateSaveButtonState() {
  if (!btnSaveModel) return;
  const hasToken = !!getAuthToken();
  // Enable save only if logged in and a model is loaded
  btnSaveModel.disabled = !(hasToken && !!lastLoadedFileName);
}

// ---------- Auth Event Handlers ----------
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

// ---------- Email-only Login (panel UI) ----------
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

// ---------- Save Model Handler ----------
if (btnSaveModel) {
  btnSaveModel.addEventListener("click", async () => {
    if (!lastLoadedFileName) {
      alert("No model loaded to save");
      return;
    }
    const token = getAuthToken();
    if (!token) {
      alert("Please login before saving");
      return;
    }

    // Build minimal metadata
    const payload = {
      name: lastLoadedFileName,
      uploadedAt: new Date().toISOString(),
      // optionally include vertex count if available
      vertices: (() => {
        if (!currentModel) return 0;
        let total = 0;
        currentModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            total += mesh.geometry.attributes.position.count;
          }
        });
        return total;
      })(),
    };

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        alert(`Save failed: ${res.status} ${txt}`);
        return;
      }
      const row = await res.json();
      console.log("Saved project", row);
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

// ------------ DataBase Functionality ------------
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
