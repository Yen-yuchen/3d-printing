import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';




let currentModel: THREE.Object3D | null = null;

const container = document.getElementById('three-container') as HTMLElement;
if (!container) throw new Error("找不到 #three-container");

// scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.set(0, 3, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

// light setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// controller setup
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Loaders
const gltfLoader = new GLTFLoader();
const stlLoader = new STLLoader();


//  UI 
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const fileList = document.getElementById('fileList') as HTMLUListElement;
const emptyMsg = document.getElementById('empty') as HTMLElement;
const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
const statusOne = document.getElementById('statusOne') as HTMLElement;

// toolbar buttons
const btnVisible = document.getElementById('btn-visible') as HTMLButtonElement;
const btnWireframe = document.getElementById('btn-wireframe') as HTMLButtonElement;
const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;



// reset App 
function resetApp() {
    // A. clear scene
    for (let i = scene.children.length - 1; i >= 0; i--) {
        const obj = scene.children[i];
        // make sure not to remove lights or camera
        if (obj.type === 'Mesh' || obj.type === 'Group') {
            scene.remove(obj);
        }
    }
    currentModel = null; 

    // B. clear file list UI
    if (fileList) fileList.innerHTML = '';
    
    // C. status & empty message
    if (emptyMsg) emptyMsg.style.display = 'block';
    if (statusOne) statusOne.textContent = '';
    
    // D. reset file input
    if (fileInput) fileInput.value = '';
    
    // E. reset toolbar buttons
    if (btnVisible) btnVisible.textContent = "Hide";
    
    console.log("App reset completed.");
}

// update UI
function addFileToUI(file: File) {
    if (emptyMsg) emptyMsg.style.display = 'none';

    const li = document.createElement('li');
    li.className = 'file-item'; 
    
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    
    li.innerHTML = `
        <div class="file-info">
            <strong>${file.name}</strong> 
            <span class="muted">(${sizeMB} MB)</span>
        </div>
        <button class="btn-delete" style="color: #ff4d4d; border: none; background: none; cursor: pointer; font-weight: bold;">Delete</button>
    `;

    // delete button event
    const deleteBtn = li.querySelector('.btn-delete') as HTMLButtonElement;
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        resetApp(); 
    });

    if (fileList) fileList.appendChild(li);
    if (statusOne) statusOne.textContent = `Loaded: ${file.name}`;
}

// model loaded callback
function onModelLoaded(object: THREE.Object3D) {
    
    currentModel = object;
    
    
    scene.add(object);
    
    
    fitCameraToSelection(camera, controls, [object]);
    
    console.log("模型載入完成", object);
}

// unified file load handler
function handleFileLoad(url: string, fileType: string, file: File) {
    resetApp(); // clear previous
    addFileToUI(file); // update UI

    if (fileType === 'glb' || fileType === 'gltf') {
        gltfLoader.load(url, (gltf) => {
            onModelLoaded(gltf.scene);
        }, undefined, (err) => console.error(err));

    } else if (fileType === 'stl') {
        stlLoader.load(url, (geometry) => {
            // STL normally only has geometry, so we need to create a mesh
            const material = new THREE.MeshStandardMaterial({ 
                color: 0x606060, 
                roughness: 0.5, 
                metalness: 0.1 
            });
            const mesh = new THREE.Mesh(geometry, material);
            
            // STL model adjustments
            geometry.center(); 
            mesh.rotation.x = -Math.PI / 2; 
            
            onModelLoaded(mesh);
        }, undefined, (err) => console.error(err));
    }
}



// file listener
if (fileInput) {
    fileInput.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];

        if (file) {
            const url = URL.createObjectURL(file);
            const fileName = file.name.toLowerCase();

            if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
                handleFileLoad(url, 'glb', file);
            } else if (fileName.endsWith('.stl')) {
                handleFileLoad(url, 'stl', file);
            } else {
                alert('only support .glb, .gltf, .stl types');
                resetApp();
            }
        }
    });
}

// clear button
if (clearBtn) {
    clearBtn.addEventListener('click', resetApp);
}



// function: Show/Hide
if (btnVisible) {
    btnVisible.addEventListener('click', () => {
        if (currentModel) {
            currentModel.visible = !currentModel.visible;
            btnVisible.textContent = currentModel.visible ? " Hide" : " Show";
        } else {
            alert("Please upload model！");
        }
    });
}

// Wireframe
if (btnWireframe) {
    btnWireframe.addEventListener('click', () => {
        if (currentModel) {
            currentModel.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                    materials.forEach((mat: any) => {
                        if ('wireframe' in mat) {
                            mat.wireframe = !mat.wireframe;
                        }
                    });
                }
            });
        } else {
            alert("please upload model！");
        }
    });
}

// Reset View
if (btnReset) {
    btnReset.addEventListener('click', () => {
        controls.reset();
        if (currentModel) {
            fitCameraToSelection(camera, controls, [currentModel]);
        } else {
            camera.position.set(0, 3, 5);
            camera.lookAt(0, 0, 0);
        }
    });
}

// window resize handler
window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

// animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// auto fit camera to selection
function fitCameraToSelection(camera: THREE.PerspectiveCamera, controls: OrbitControls, selection: THREE.Object3D[], fitOffset = 1.2) {
    const box = new THREE.Box3();
    for (const object of selection) box.expandByObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z);
    const fitHeightDistance = maxSize / (2 * Math.atan(Math.PI * camera.fov / 360));
    const fitWidthDistance = fitHeightDistance / camera.aspect;
    const distance = fitOffset * Math.max(fitHeightDistance, fitWidthDistance);
    const direction = controls.target.clone().sub(camera.position).normalize().multiplyScalar(distance);

    controls.maxDistance = distance * 10;
    controls.target.copy(center);
    camera.near = distance / 100;
    camera.far = distance * 100;
    camera.updateProjectionMatrix();
    camera.position.copy(controls.target).sub(direction);
    controls.update();
}