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

export async function saveModel(params: SaveModelParams): Promise<SaveModelResponse> {
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
