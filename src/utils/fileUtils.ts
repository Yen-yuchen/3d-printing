export function baseName(pathLike: string): string {
  const cleaned = decodeURIComponent(pathLike).replace(/\\/g, "/");
  const parts = cleaned.split("/");
  return parts[parts.length - 1] || cleaned;
}
/**
 * Parses a glTF JSON object to find all external file dependencies (buffers and images).
 * Ignores embedded base64 "data:" URIs.
 * * @param gltfJson - The parsed JSON structure of the glTF file.
 * @returns A Set containing the base filenames of all external URIs.
 */
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
/**
 * Triggers a browser download of the provided data.
 * * @param data - The content of the file (String, ArrayBuffer, Blob, etc.)
 * @param filename - The name of the file to save as
 * @param mimeType - The MIME type of the file (e.g., 'application/json', 'model/gltf-binary')
 */
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



/**
 * convert all kinds of path-like strings to just the file extension, in lowercase. If no extension, return empty string.
 */
export function getFileExtension(filename: string): string {
  if (!filename.includes('.')) return "";
  return filename.split('.').pop()?.toLowerCase() || "";
}

/**
 *check if the file extension is one of the supported 3D model formats: obj, glb, gltf, stl. Case-insensitive. If no extension, return false.
 */
export function isValidModelFormat(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ["obj", "glb", "gltf", "stl"].includes(ext);
}