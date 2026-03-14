import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";
import type { ViewerState } from "../state/viewerState";
import { downloadFile } from "../utils/fileUtils";

export function exportCorrectedModel(
  state: ViewerState,
  exporterType: "glb" | "obj",
  onStatus: (message: string) => void,
): void {
  if (!state.currentModel) {
    alert("No model to export!");
    return;
  }

  onStatus(`Preparing ${exporterType.toUpperCase()} for export...`);

  const exportScene = new THREE.Scene();
  state.currentModel.updateMatrixWorld(true);

  state.currentModel.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;

    const mesh = child as THREE.Mesh;
    const cloneGeometry = mesh.geometry.clone();
    const cloneMaterial = Array.isArray(mesh.material)
      ? mesh.material.map((material) => {
          const cloned = material.clone();
          if ("wireframe" in cloned) {
            (cloned as any).wireframe = false;
          }
          return cloned;
        })
      : (() => {
          const cloned = mesh.material.clone();
          if ("wireframe" in cloned) {
            (cloned as any).wireframe = false;
          }
          return cloned;
        })();

    const cloneMesh = new THREE.Mesh(cloneGeometry, cloneMaterial);
    cloneGeometry.applyMatrix4(mesh.matrixWorld);
    exportScene.add(cloneMesh);
  });

  try {
    if (exporterType === "glb") {
      const exporter = new GLTFExporter();
      exporter.parse(
        exportScene,
        (result) => {
          downloadFile(result as BlobPart, "simplified_model.glb", "application/octet-stream");
          onStatus("GLB Exported Successfully!");
        },
        (error) => {
          console.error("GLB Export Error:", error);
          onStatus("Failed to export GLB");
        },
        { binary: true },
      );
    } else {
      const exporter = new OBJExporter();
      const result = exporter.parse(exportScene);
      downloadFile(result, "simplified_model.obj", "text/plain");
      onStatus("OBJ Exported Successfully!");
    }
  } catch (error) {
    console.error("Export Error", error);
    onStatus(`Failed to export ${exporterType.toUpperCase()}`);
  }
}
