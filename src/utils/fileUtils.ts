export function baseName(pathLike: string): string {
  const cleaned = decodeURIComponent(pathLike).replace(/\\/g, "/");
  const parts = cleaned.split("/");
  return parts[parts.length - 1] || cleaned;
}

export function collectExternalUris(gltfJson: any): Set<string> {
  const uris = new Set<string>();
  const addUri = (uri?: string) => {
    if (!uri || uri.startsWith("data:")) return;
    uris.add(baseName(uri));
  };

  if (Array.isArray(gltfJson?.buffers)) {
    for (const buffer of gltfJson.buffers) addUri(buffer?.uri);
  }
  if (Array.isArray(gltfJson?.images)) {
    for (const image of gltfJson.images) addUri(image?.uri);
  }

  return uris;
}

export function downloadFile(data: BlobPart, filename: string, mimeType: string): void {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.style.display = "none";
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
