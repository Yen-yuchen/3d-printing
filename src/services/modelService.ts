import { fetchJson } from "./apiClient";

export interface SaveModelParams {
  token: string;
  file: File;
  fileName: string;
  modelId: number | null;
}

export interface SaveModelResponse {
  model_id?: number;
  [key: string]: unknown;
}

export async function saveModel(
  params: SaveModelParams,
): Promise<SaveModelResponse> {
  console.log("saveModel called with:", {
    file: params.file,
    fileName: params.fileName,
    modelId: params.modelId,
    token: params.token,
  });

  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("model_name", params.fileName);
  formData.append("uploadedAt", new Date().toISOString());

  if (params.modelId !== null) {
    formData.append("model_id", String(params.modelId));
  }

  return fetchJson<SaveModelResponse>("/api/models", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.token}`,
    },
    body: formData,
  });
}

export type SavedModel = {
  model_id: number;
  user_id: number;
  model_name: string;
  file_format: string;
  uploaded_at: string;
};

export async function fetchUserModels(token: string): Promise<SavedModel[]> {
  const response = await fetch("/api/models", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch saved models");
  }

  return response.json();
}

export async function downloadSavedModelFile(
  modelId: number,
  token: string,
): Promise<File> {
  const response = await fetch(
    `/api/models/${modelId}/file`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to download saved model");
  }

  const blob = await response.blob();

  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  const fileName = match?.[1] || `model-${modelId}.glb`;

  return new File([blob], fileName, {
    type: blob.type || "application/octet-stream",
  });
}

export async function deleteModel(
  modelId: number,
  token: string,
): Promise<void> {
  const response = await fetch(`/api/models/${modelId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete model");
  }
}
