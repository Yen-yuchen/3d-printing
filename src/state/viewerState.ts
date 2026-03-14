import * as THREE from "three";

export interface ViewerState {
  currentModel: THREE.Object3D | null;
  currentModelId: number | null;
  lastLoadedFileName: string | null;
  lastLoadedFile: File | null;
}

export function createViewerState(): ViewerState {
  return {
    currentModel: null,
    currentModelId: null,
    lastLoadedFileName: null,
    lastLoadedFile: null,
  };
}
