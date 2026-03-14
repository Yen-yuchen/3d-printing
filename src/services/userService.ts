import { fetchOptionalJson } from "./apiClient";

export interface CreatedUser {
  email: string;
  name?: string;
}

export async function createUser(name: string, email: string): Promise<{
  status: number;
  data: CreatedUser | null;
  text: string;
}> {
  const result = await fetchOptionalJson<CreatedUser>("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email }),
  });

  return {
    status: result.status,
    data: result.data,
    text: result.text,
  };
}
