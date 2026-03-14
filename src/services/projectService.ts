import { fetchJson } from "./apiClient";

export async function fetchProjects(): Promise<unknown[]> {
  return fetchJson<unknown[]>("/api/projects");
}
