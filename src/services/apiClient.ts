export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchOptionalJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<{
  ok: boolean;
  status: number;
  data: T | null;
  text: string;
}> {
  const response = await fetch(input, init);
  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    data: text ? (JSON.parse(text) as T) : null,
    text,
  };
}
