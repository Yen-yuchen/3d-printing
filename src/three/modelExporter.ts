<<<<<<< HEAD
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";
import type { ViewerState } from "../state/viewerState";
import { downloadFile } from "../utils/fileUtils";

export async function uploadModelToServer(
  fileData: Blob,
  fileName: string,
  token: string,
  modelName?: string,
  modelId?: number,
): Promise<any> {
  const formData = new FormData();

  formData.append("file", fileData, fileName);

  if (modelName) {
    formData.append("model_name", modelName);
  }

  if (modelId !== undefined) {
    formData.append("model_id", String(modelId));
  }

  const response = await fetch("http://localhost:3001/api/models", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to save model");
  }

  return response.json();
}

function buildExportScene(state: ViewerState): THREE.Scene {
  const exportScene = new THREE.Scene();
  state.currentModel!.updateMatrixWorld(true);

  state.currentModel!.traverse((child) => {
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

  return exportScene;
}
/**
 * Packages the currently modified 3D model and exports it to the user's local machine.
 * This function builds an isolated export scene and utilizes Three.js exporters to generate 
 * either a binary glTF (.glb) or a standard Wavefront (.obj) file.
 *
 * @param state - The current viewer state containing the `currentModel` ready for export.
 * @param exporterType - The target file format for the export. Accepts `"glb"` (optimized binary) or `"obj"` (standard text).
 * @param onStatus - A callback function used to asynchronously report progress, success, or error messages back to the UI.
 * @returns {void} Does not return a value. It triggers a direct file download in the user's browser upon completion.
 */
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
  const exportScene = buildExportScene(state);

  try {
    if (exporterType === "glb") {
      const exporter = new GLTFExporter();

      exporter.parse(
        exportScene,
        (result) => {
          downloadFile(
            result as BlobPart,
            "simplified_model.glb",
            "application/octet-stream",
          );
          onStatus("GLB downloaded successfully.");
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
      onStatus("OBJ downloaded successfully.");
    }
  } catch (error) {
    console.error("Export Error", error);
    onStatus(`Failed to export ${exporterType.toUpperCase()}`);
  }
}
/**
 * Saves the current model locally by uploading it to the server.
 * @param state - The current viewer state containing the `currentModel` to save.
 * @param fileName - The name for the saved file.
 * @param token - The authentication token for the API request.
 * @param onStatus - A callback function to report save progress or errors.
 * @returns 
 */
export function saveModelLocally(
  state: ViewerState,
  fileName: string,
  token: string,
  onStatus: (message: string) => void,
): void {
  if (!state.currentModel) {
    alert("No model to save!");
    return;
  }

  onStatus("Preparing local save...");
  const exportScene = buildExportScene(state);

  try {
    const exporter = new GLTFExporter();

    exporter.parse(
      exportScene,
      async (result) => {
        try {
          const blob = new Blob([result as BlobPart], {
            type: "application/octet-stream",
          });

          await uploadModelToServer(blob, `${fileName}.glb`, token, fileName);

          onStatus("Model saved successfully.");
        } catch (error) {
          console.error("Local save upload error:", error);
          onStatus("Failed to save model.");
        }
      },
      (error) => {
        console.error("GLB Export Error:", error);
        onStatus("Failed to prepare model for save.");
      },
      { binary: true },
    );
  } catch (error) {
    console.error("Local Save Error", error);
    onStatus("Failed to save model.");
  }
}
=======
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";
import type { ViewerState } from "../state/viewerState";
import { downloadFile } from "../utils/fileUtils";

export async function uploadModelToServer(
  fileData: Blob,
  fileName: string,
  token: string,
  modelName?: string,
  modelId?: number,
): Promise<any> {
  const formData = new FormData();

  formData.append("file", fileData, fileName);

  if (modelName) {
    formData.append("model_name", modelName);
  }

  if (modelId !== undefined) {
    formData.append("model_id", String(modelId));
  }

  const response = await fetch("http://localhost:3001/api/models", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to save model");
  }

  return response.json();
}

function buildExportScene(state: ViewerState): THREE.Scene {
  const exportScene = new THREE.Scene();
  state.currentModel!.updateMatrixWorld(true);

  state.currentModel!.traverse((child) => {
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

  return exportScene;
}
/**
 * Packages the currently modified 3D model and exports it to the user's local machine.
 * This function builds an isolated export scene and utilizes Three.js exporters to generate 
 * either a binary glTF (.glb) or a standard Wavefront (.obj) file.
 *
 * @param state - The current viewer state containing the `currentModel` ready for export.
 * @param exporterType - The target file format for the export. Accepts `"glb"` (optimized binary) or `"obj"` (standard text).
 * @param onStatus - A callback function used to asynchronously report progress, success, or error messages back to the UI.
 * @returns {void} Does not return a value. It triggers a direct file download in the user's browser upon completion.
 */
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
  const exportScene = buildExportScene(state);

  try {
    if (exporterType === "glb") {
      const exporter = new GLTFExporter();

      exporter.parse(
        exportScene,
        (result) => {
          downloadFile(
            result as BlobPart,
            "simplified_model.glb",
            "application/octet-stream",
          );
          onStatus("GLB downloaded successfully.");
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
      onStatus("OBJ downloaded successfully.");
    }
  } catch (error) {
    console.error("Export Error", error);
    onStatus(`Failed to export ${exporterType.toUpperCase()}`);
  }
}

export function saveModelLocally(
  state: ViewerState,
  fileName: string,
  token: string,
  onStatus: (message: string) => void,
): void {
  if (!state.currentModel) {
    alert("No model to save!");
    return;
  }

  onStatus("Preparing local save...");
  const exportScene = buildExportScene(state);

  try {
    const exporter = new GLTFExporter();

    exporter.parse(
      exportScene,
      async (result) => {
        try {
          const blob = new Blob([result as BlobPart], {
            type: "application/octet-stream",
          });

          await uploadModelToServer(blob, `${fileName}.glb`, token, fileName);

          onStatus("Model saved successfully.");
        } catch (error) {
          console.error("Local save upload error:", error);
          onStatus("Failed to save model.");
        }
      },
      (error) => {
        console.error("GLB Export Error:", error);
        onStatus("Failed to prepare model for save.");
      },
      { binary: true },
    );
  } catch (error) {
    console.error("Local Save Error", error);
    onStatus("Failed to save model.");
  }
}
>>>>>>> 4abe2b1e7881671d1a00b61dc43909e47a2dabd9
