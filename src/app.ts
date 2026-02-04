import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js';

const meshSlider = document.getElementById('meshDensitySlider') as HTMLInputElement;
const meshValue = document.getElementById('meshDensityValue') as HTMLElement;
const polyCountLabel = document.getElementById('polyCount') as HTMLElement;
const simplifyModifier = new SimplifyModifier();

if (meshSlider) {
    
    meshSlider.addEventListener('input', () => {
        const percent = Math.round(parseFloat(meshSlider.value) * 100);
        if (meshValue) {
            meshValue.textContent = `${percent}% (preview)`;
            meshValue.style.color = '#ffff00'; 
        }
    });

    
    meshSlider.addEventListener('change', () => {
        if (!currentModel) return;
        
        const ratio = parseFloat(meshSlider.value);
        if (meshValue) {
            meshValue.textContent = `${Math.round(ratio * 100)}%`;
            meshValue.style.color = '#ff9800'; 
        }

        setStatus("Mesh simplification is being calculated....");

        
        setTimeout(() => {
            let totalFaces = 0;

            currentModel!.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    
                    
                    if (!mesh.userData.originalGeometry) {
                        mesh.userData.originalGeometry = mesh.geometry.clone();
                    }

                    const originalGeo = mesh.userData.originalGeometry;
                    
                    
                    if (ratio >= 0.95) {
                        mesh.geometry.dispose();
                        mesh.geometry = originalGeo.clone();
                        totalFaces += (mesh.geometry.index ? mesh.geometry.index.count / 3 : mesh.geometry.attributes.position.count / 3);
                        return;
                    }

                    
                    const count = originalGeo.attributes.position.count;
                    const target = Math.floor(count * ratio);
                    
                    if (target < 10) return;

                    try {
                        const simplified = simplifyModifier.modify(originalGeo.clone(), target);
                        mesh.geometry.dispose();
                        mesh.geometry = simplified;
                        
                        
                        totalFaces += (simplified.index ? simplified.index.count / 3 : simplified.attributes.position.count / 3);
                    } catch (e) {
                        console.error(e);
                    }
                }
            });

            if (polyCountLabel) polyCountLabel.textContent = `Faces: ${Math.floor(totalFaces)}`;
            setStatus("Simplified");
        }, 50);
    });
}

const viewer = document.getElementById("viewer") as HTMLDivElement;

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
    new THREE.MeshStandardMaterial({ color: "orange" })
);
scene.add(cube);

// ---------- Helpers (toggleable) ----------
const gridHelper = new THREE.GridHelper(10, 10);
const axesHelper = new THREE.AxesHelper(2);
scene.add(gridHelper);
scene.add(axesHelper);

// ---------- Current Model ----------
let currentModel: THREE.Object3D | null = null;

// ---------- UI ----------
const fileInput = document.getElementById("fileInput") as HTMLInputElement | null;
const statusEl = document.getElementById("status") as HTMLDivElement | null;

const gridToggle = document.getElementById("gridToggle") as HTMLInputElement | null;
const modelToggle = document.getElementById("modelToggle") as HTMLInputElement | null;
const wireToggle = document.getElementById("wireToggle") as HTMLInputElement | null;
const scaleSlider = document.getElementById("scale") as HTMLInputElement | null;

const resetCamBtn = document.getElementById("resetCam") as HTMLButtonElement | null;

// ---------- Loaders ----------
// Note: for .gltf packages (gltf + .bin + textures), we create a loader with a custom LoadingManager
// so dependent files can be resolved from the user's uploaded FileList.
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
    axesHelper.visible = showGrid; // tied to grid; can split later if you want
}

function applyModelVisibility() {
    const showModel = modelToggle?.checked ?? true;

    if (currentModel) currentModel.visible = showModel;

    // If no model loaded, cube acts like "the model"
    cube.visible = !currentModel && showModel;
}

function applyScaleFromSlider() {
    const sliderValue = Number(scaleSlider?.value ?? 100); // 100 = normal
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

        // Best-effort GPU cleanup
        currentModel.traverse((child: any) => {
            if (child?.geometry) child.geometry.dispose?.();
            const mat = child?.material;
            if (Array.isArray(mat)) mat.forEach((m) => m?.dispose?.());
            else mat?.dispose?.();
        });

        currentModel = null;
    }

    // Show cube again (respect toggles)
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

    const fitHeightDistance = maxSize / (2 * Math.atan((Math.PI * camera.fov) / 360));
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
    // Handles urls like "textures/wood.png" or "C:\\foo\\bar.bin"
    const cleaned = decodeURIComponent(pathLike).replace(/\\/g, "/");
    const parts = cleaned.split("/");
    return parts[parts.length - 1] || cleaned;
}

function collectExternalUris(gltfJson: any): Set<string> {
    const uris = new Set<string>();

    const addUri = (uri?: string) => {
        if (!uri) return;
        // data: URIs are embedded; not external.
        if (uri.startsWith("data:")) return;
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

async function loadSelection(files: FileList) {
    const selected = Array.from(files);
    if (selected.length === 0) return;

    // Prefer a single "main" model file.
    const gltfFiles = selected.filter((f) => f.name.toLowerCase().endsWith(".gltf"));
    const glbFiles = selected.filter((f) => f.name.toLowerCase().endsWith(".glb"));
    const stlFiles = selected.filter((f) => f.name.toLowerCase().endsWith(".stl"));
    const objFiles = selected.filter((f) => f.name.toLowerCase().endsWith(".obj"));

    // ---- glTF JSON package (.gltf + external .bin/.png/etc) ----
    if (gltfFiles.length > 0) {
        if (gltfFiles.length !== 1) {
            setStatus("Please select exactly one .gltf file (plus its associated .bin/.png/etc files).");
            return;
        }

        const gltfFile = gltfFiles[0];
        let gltfJson: any;
        try {
            gltfJson = JSON.parse(await gltfFile.text());
        } catch (e) {
            console.error(e);
            setStatus("That .gltf file is not valid JSON.");
            return;
        }

        const required = collectExternalUris(gltfJson);
        const allowed = new Set<string>([gltfFile.name, ...required]);

        // Rule the user asked for:
        // If ANY selected file doesn't belong to the .gltf package, don't load anything.
        const extra = selected
            .map((f) => f.name)
            .filter((name) => !allowed.has(name));
        if (extra.length > 0) {
            setStatus(
                `Selection contains unrelated file(s): ${extra.join(", ")}. ` +
                "Please select ONLY the .gltf and its referenced files."
            );
            return;
        }

        // Ensure all referenced external files are present.
        const missing = Array.from(required).filter((name) => !selected.some((f) => f.name === name));
        if (missing.length > 0) {
            setStatus(
                `Missing required file(s): ${missing.join(", ")}. ` +
                "Select the .gltf AND all required .bin/.png/etc in the same upload."
            );
            return;
        }

        // Build blob URLs for everything in the package.
        const fileMap = new Map<string, string>();
        const urlsToRevoke: string[] = [];
        for (const f of selected) {
            const u = URL.createObjectURL(f);
            fileMap.set(f.name, u);
            urlsToRevoke.push(u);
        }

        const manager = new THREE.LoadingManager();
        manager.setURLModifier((requestedUrl) => {
            const key = baseName(requestedUrl);
            return fileMap.get(key) ?? requestedUrl;
        });

        const gltfLoader = new GLTFLoader(manager);
        const mainUrl = fileMap.get(gltfFile.name)!;

        const onLoaded = (object: THREE.Object3D) => {
            clearCurrentModel();
            currentModel = object;
            scene.add(object);
            cube.visible = false;

            applyModelVisibility();
            applyHelperVisibility();
            applyScaleFromSlider();
            applyWireframe();
            fitCameraToObject(object);

            setStatus(`Loaded: ${gltfFile.name}`);
            urlsToRevoke.forEach(URL.revokeObjectURL);
        };

        const onError = (err: any) => {
            console.error(err);
            setStatus(`Failed to load: ${gltfFile.name}`);
            urlsToRevoke.forEach(URL.revokeObjectURL);
        };

        gltfLoader.load(mainUrl, (gltf) => onLoaded(gltf.scene), undefined, onError);
        return;
    }

    // ---- Single-file formats (.glb/.stl/.obj) ----
    const mainSingle = glbFiles[0] ?? stlFiles[0] ?? objFiles[0];
    if (!mainSingle) {
        setStatus("Unsupported selection. Choose a .glb/.stl/.obj, or a .gltf package.");
        return;
    }

    // Enforce the same “no unrelated files” idea for non-.gltf uploads:
    // if you picked a single-file format, do not allow extra files.
    if (selected.length !== 1) {
        setStatus(`"${mainSingle.name}" is a single-file format. Please select only that one file.`);
        return;
    }

    const name = mainSingle.name.toLowerCase();
    const url = URL.createObjectURL(mainSingle);

    const onLoaded = (object: THREE.Object3D) => {
        clearCurrentModel();

        currentModel = object;
        scene.add(object);
        cube.visible = false;

        applyModelVisibility();
        applyHelperVisibility();
        applyScaleFromSlider();
        applyWireframe();
        fitCameraToObject(object);

        setStatus(`Loaded: ${mainSingle.name}`);
        URL.revokeObjectURL(url);
    };

    const onError = (err: any) => {
        console.error(err);
        setStatus(`Failed to load: ${mainSingle.name}`);
        URL.revokeObjectURL(url);
    };

    if (name.endsWith(".glb")) {
        const gltfLoader = new GLTFLoader();
        gltfLoader.load(url, (gltf) => onLoaded(gltf.scene), undefined, onError);
    } else if (name.endsWith(".stl")) {
        stlLoader.load(
            url,
            (geometry) => {
                geometry.center();
                const material = new THREE.MeshStandardMaterial({
                    color: 0x9a9a9a,
                    roughness: 0.55,
                    metalness: 0.1,
                });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.rotation.x = -Math.PI / 2;
                onLoaded(mesh);
            },
            undefined,
            onError
        );
    } else if (name.endsWith(".obj")) {
        objLoader.load(url, (obj) => onLoaded(obj), undefined, onError);
    } else {
        setStatus("Unsupported file. Use .glb, .gltf (+ package files), .stl, or .obj");
        URL.revokeObjectURL(url);
    }
}

// ---------- Resize ----------
function resizeToViewer() {
    const w = viewer.clientWidth;
    const h = viewer.clientHeight;

    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
}

resizeToViewer();
window.addEventListener("resize", resizeToViewer);
new ResizeObserver(resizeToViewer).observe(viewer);

// ---------- UI Hooks ----------
fileInput?.addEventListener("change", (event) => {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    // Load based on the entire selection (supports .gltf packages).
    loadSelection(input.files);

    // Allow selecting the same files again without needing to pick something else first.
    input.value = "";
});

gridToggle?.addEventListener("change", applyHelperVisibility);

modelToggle?.addEventListener("change", () => {
    applyModelVisibility();
});

wireToggle?.addEventListener("change", () => {
    applyWireframe();
});

scaleSlider?.addEventListener("input", () => {
    applyScaleFromSlider();
    // Keep wireframe consistent (in case you swap targets later)
    applyWireframe();
});

resetCamBtn?.addEventListener("click", () => {
    camera.position.set(2, 2, 4);
    controls.target.set(0, 0, 0);
    controls.update();
});

// Apply initial states
applyHelperVisibility();
applyModelVisibility();
applyScaleFromSlider();
applyWireframe();

// if "infinite" rerendering keeps occurring, uncomment below and replace render loop with this
// const ro = new ResizeObserver(resizeToViewer);
// ro.observe(viewer);
//
// let rafId = 0;
// function animate() {
//     rafId = requestAnimationFrame(animate);
//     controls.update();
//     renderer.render(scene, camera);
// }
// animate();
//
// // ---- Vite HMR cleanup ----
// if (import.meta.hot) {
//     import.meta.hot.dispose(() => {
//         cancelAnimationFrame(rafId);
//         ro.disconnect();
//         controls.dispose();
//         renderer.dispose();
//         renderer.domElement.remove();
//     });
// }


// ---------- Render Loop ----------
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();
