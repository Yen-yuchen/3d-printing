/**
 * Service responsible for loading 3D model files into the viewer.
 *
 * Supports: .gltf, .glb, .stl, .obj
 *
 * Responsibilities:
 *  - Parse file blobs and create Three.js objects
 *  - Clear prior model and add new model to scene
 *  - Apply default materials / visibility / scale settings
 *  - Update UI status and vertex count indicators
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import type { ViewerState } from "../state/viewerState";
import type { SceneManager } from "./sceneManager";
import type { AppElements } from "../utils/dom";
import { collectExternalUris } from "../utils/fileUtils";
import { fitCameraToObject } from "../utils/threeUtils";
import {
  applyHelperVisibility,
  applyModelColor,
  applyModelVisibility,
  applyScaleFromSlider,
  applyWireframe,
  clearCurrentModel,
  mergeModelVertices,
  updateBudgetInputFromCurrent,
} from "./meshOperations";
import { setStatus } from "../views/statusView";
import { renderMeshSliderCommitted } from "../views/meshToolsView";
import { DEFAULT_MODEL_COLOR } from "../utils/constants";

export interface ModelLoaderCallbacks {
  onModelLoaded?: () => void;
}

export class ModelLoaderService {
  private readonly stlLoader = new STLLoader();
  private readonly objLoader = new OBJLoader();

  private readonly state: ViewerState;
  private readonly sceneManager: SceneManager;
  private readonly elements: AppElements;
  private readonly callbacks: ModelLoaderCallbacks = {};

  constructor(
    state: ViewerState,
    sceneManager: SceneManager,
    elements: AppElements,
    callbacks: ModelLoaderCallbacks = {},
  ) {
    this.state = state;
    this.sceneManager = sceneManager;
    this.elements = elements;
    this.callbacks = callbacks;
  }

  public async loadSelection(files: FileList): Promise<void> {
    const selected = Array.from(files);
    if (selected.length === 0) return;

    const gltfFiles = selected.filter((file) =>
      file.name.toLowerCase().endsWith(".gltf"),
    );
    const glbFiles = selected.filter((file) =>
      file.name.toLowerCase().endsWith(".glb"),
    );
    const stlFiles = selected.filter((file) =>
      file.name.toLowerCase().endsWith(".stl"),
    );
    const objFiles = selected.filter((file) =>
      file.name.toLowerCase().endsWith(".obj"),
    );

    if (gltfFiles.length > 0) {
      await this.loadGltfPackage(selected, gltfFiles);
      return;
    }

    const mainSingle = glbFiles[0] ?? stlFiles[0] ?? objFiles[0];
    if (!mainSingle || selected.length !== 1) {
      setStatus(
        this.elements.statusEl,
        "Unsupported or multiple single files selected.",
      );
      return;
    }

    await this.loadSingle(mainSingle, null);
  }

  /** Public entry for loading an already-obtained File (e.g., downloaded saved model). */
  public async loadFile(
    file: File,
    modelId: number | null = null,
  ): Promise<void> {
    await this.loadSingle(file, modelId);
  }

  private onLoaded(
    object: THREE.Object3D,
    file: File,
    modelId: number | null,
  ): void {
    clearCurrentModel(this.state, this.sceneManager);
    this.state.currentModel = object;
    this.state.lastLoadedFile = file;
    this.state.lastLoadedFileName = file.name;
    this.state.currentModelId = modelId;

    mergeModelVertices(object);
    this.sceneManager.scene.add(object);
    this.sceneManager.shape.visible = false;

    applyModelVisibility(this.state, this.sceneManager, this.elements);
    applyHelperVisibility(this.sceneManager, this.elements);
    applyScaleFromSlider(this.state, this.sceneManager, this.elements);
    applyWireframe(this.state, this.sceneManager, this.elements);

    const selectedColor =
      this.elements.modelColorPicker?.value ?? DEFAULT_MODEL_COLOR;
    applyModelColor(this.state, selectedColor);

    fitCameraToObject(
      this.sceneManager.camera,
      this.sceneManager.controls,
      object,
    );
    setStatus(this.elements.statusEl, `Loaded: ${file.name}`);

    if (this.elements.meshSlider) {
      this.elements.meshSlider.value = "100";
    }
    renderMeshSliderCommitted(this.elements, 100);
    updateBudgetInputFromCurrent(this.state, this.elements);
    this.callbacks.onModelLoaded?.();
  }

  private async loadGltfPackage(
    selected: File[],
    gltfFiles: File[],
  ): Promise<void> {
    if (gltfFiles.length !== 1) {
      setStatus(this.elements.statusEl, "Select exactly one .gltf + deps.");
      return;
    }

    const gltfFile = gltfFiles[0];
    let gltfJson: any;

    try {
      gltfJson = JSON.parse(await gltfFile.text());
    } catch (error) {
      console.error(error);
      setStatus(this.elements.statusEl, "Invalid JSON.");
      return;
    }

    const required = collectExternalUris(gltfJson);
    const allowed = new Set<string>([gltfFile.name, ...required]);
    const extra = selected
      .map((file) => file.name)
      .filter((name) => !allowed.has(name));
    if (extra.length > 0) {
      setStatus(this.elements.statusEl, `Unrelated files: ${extra.join(", ")}`);
      return;
    }

    const missing = Array.from(required).filter(
      (name) => !selected.some((file) => file.name === name),
    );
    if (missing.length > 0) {
      setStatus(this.elements.statusEl, `Missing: ${missing.join(", ")}`);
      return;
    }

    const fileMap = new Map<string, string>();
    const urlsToRevoke: string[] = [];
    for (const file of selected) {
      const url = URL.createObjectURL(file);
      fileMap.set(file.name, url);
      urlsToRevoke.push(url);
    }

    const manager = new THREE.LoadingManager();
    manager.setURLModifier(
      (url) => fileMap.get(url.split("/").pop() ?? url) ?? url,
    );
    const gltfLoader = new GLTFLoader(manager);

    await new Promise<void>((resolve) => {
      gltfLoader.load(
        fileMap.get(gltfFile.name)!,
        (gltf) => {
          this.onLoaded(gltf.scene, gltfFile, null);
          urlsToRevoke.forEach(URL.revokeObjectURL);
          resolve();
        },
        undefined,
        (error) => {
          console.error(error);
          setStatus(this.elements.statusEl, `Failed: ${gltfFile.name}`);
          urlsToRevoke.forEach(URL.revokeObjectURL);
          resolve();
        },
      );
    });
  }

  private async loadSingle(file: File, modelId: number | null): Promise<void> {
    const name = file.name.toLowerCase();
    const url = URL.createObjectURL(file);

    const onError = (error: unknown) => {
      console.error(error);
      setStatus(this.elements.statusEl, `Failed: ${file.name}`);
      URL.revokeObjectURL(url);
    };

    await new Promise<void>((resolve) => {
      if (name.endsWith(".glb")) {
        new GLTFLoader().load(
          url,
          (gltf) => {
            this.onLoaded(gltf.scene, file, modelId);
            URL.revokeObjectURL(url);
            resolve();
          },
          undefined,
          (error) => {
            onError(error);
            resolve();
          },
        );
        return;
      }

      if (name.endsWith(".stl")) {
        this.stlLoader.load(
          url,
          (geometry) => {
            const material = new THREE.MeshStandardMaterial({
              color:
                this.elements.modelColorPicker?.value ?? DEFAULT_MODEL_COLOR,
              roughness: 0.8,
              metalness: 0,
            });
            this.onLoaded(new THREE.Mesh(geometry, material), file, modelId);
            URL.revokeObjectURL(url);
            resolve();
          },
          undefined,
          (error) => {
            onError(error);
            resolve();
          },
        );
        return;
      }

      if (name.endsWith(".obj")) {
        this.objLoader.load(
          url,
          (object) => {
            const material = new THREE.MeshStandardMaterial({
              color:
                this.elements.modelColorPicker?.value ?? DEFAULT_MODEL_COLOR,
              roughness: 0.8,
              metalness: 0,
            });
            object.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                (child as THREE.Mesh).material = material;
              }
            });
            this.onLoaded(object, file, modelId);
            URL.revokeObjectURL(url);
            resolve();
          },
          undefined,
          (error) => {
            onError(error);
            resolve();
          },
        );
        return;
      }

      setStatus(this.elements.statusEl, "Unsupported file type.");
      URL.revokeObjectURL(url);
      resolve();
    });
  }
}
