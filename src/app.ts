type StoredFile = {
    id: string;
    file: File;        // keeps bytes in memory
    addedAt: number;
    details?: string;
};
const ALLOWED_EXIST = new Set(["stl", "obj", "gltf", "glb", "3mf", "ply"]);

const fileInput = document.getElementById("fileInput") as HTMLInputElement;
const dropzone = document.getElementById("dropzone") as HTMLDivElement;
const fileList = document.getElementById("fileList") as HTMLUListElement;
const empty = document.getElementById("empty") as HTMLDivElement;
const statusOne = document.getElementById("statusOne") as HTMLDivElement;
const count = document.getElementById("count") as HTMLDivElement;
const clearBtn = document.getElementById("clearBtn") as HTMLButtonElement;

const store: StoredFile[] = [];

function uid(): string {
    // good enough for a demo
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatBytes(bytes: number): string {
    const units: string[] = ["B", "KB", "MB", "GB", "TB"];
    let v: number = bytes;
    let i: number = 0;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i++;
    }
    return `${v.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

function setStatus(msg: string) {
    statusOne.textContent = msg;
    if (msg) {
        window.setTimeout(() => {
            if (statusOne.textContent === msg) statusOne.textContent = "";
        }, 2500);
    }
}
function getExt(name: string): string {
    const i = name.lastIndexOf(".");
    return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function isAllowed(file: File): boolean {
    return ALLOWED_EXIST.has(getExt(file.name));
}

function render() {
    fileList.innerHTML = "";

    empty.style.display = store.length === 0 ? "block" : "none";
    count.textContent = store.length === 0 ? "" : `${store.length} file(s)`;

    for (const item of store) {
        const li = document.createElement("li");
        li.className = "file-item";

        const top = document.createElement("div");
        top.className = "file-top";

        const name = document.createElement("div");
        name.className = "file-name";
        name.textContent = item.file.name;

        const meta = document.createElement("div");
        meta.className = "file-meta";
        meta.textContent = `${formatBytes(item.file.size)} • ${item.file.type || "unknown type"} • ${new Date(item.addedAt).toLocaleString()}`;

        if (item.details){
            const details = document.createElement("div");
            details.className = "file-details";
            details.textContent = item.details;
            top.appendChild(details);
        }

        top.appendChild(name);
        top.appendChild(meta);

        const actions = document.createElement("div");
        actions.className = "file-actions";

        const downloadBtn = document.createElement("button");
        downloadBtn.className = "btn";
        downloadBtn.type = "button";
        downloadBtn.textContent = "Download";
        downloadBtn.addEventListener("click", () => downloadFile(item));

        const removeBtn = document.createElement("button");
        removeBtn.className = "btn btn-danger";
        removeBtn.type = "button";
        removeBtn.textContent = "Remove";
        removeBtn.addEventListener("click", () => removeFile(item.id));

        actions.appendChild(downloadBtn);
        actions.appendChild(removeBtn);

        li.appendChild(top);
        li.appendChild(actions);

        fileList.appendChild(li);
    }
}


async function summarizeModelFile(file: File): Promise<string> {
    const ext = getExt(file.name);

    if (ext === "stl") return summarizeSTL(file);
    if (ext === "obj") return summarizeOBJ(file);
    if (ext === "gltf") return summarizeGLTF(file);
    if (ext === "glb") return summarizeGLB(file);

    // 3MF/PLY are doable too, but they take a bit more code (ZIP/XML for 3MF).
    return `${ext.toUpperCase()} file`;
}

async function summarizeSTL(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    const dv = new DataView(buf);

    // Binary STL: 80-byte header + uint32 triangle count at offset 80
    if (buf.byteLength >= 84) {
        const triCount = dv.getUint32(80, true);
        const expected = 84 + triCount * 50;
        // Heuristic: if size matches the binary layout, treat as binary STL
        if (expected === buf.byteLength) {
            return `STL (binary) • triangles: ${triCount.toLocaleString()}`;
        }
    }

    // Otherwise assume ASCII STL
    const text = await file.text();
    const facetCount = (text.match(/\bfacet\s+normal\b/g) || []).length;
    return `STL (ascii) • facets: ${facetCount.toLocaleString()}`;
}

async function summarizeOBJ(file: File): Promise<string> {
    const text = await file.text();

    let v = 0, vt = 0, vn = 0, f = 0;

    // Light parsing: count line prefixes
    for (const line of text.split(/\r?\n/)) {
        if (line.startsWith("v ")) v++;
        else if (line.startsWith("vt ")) vt++;
        else if (line.startsWith("vn ")) vn++;
        else if (line.startsWith("f ")) f++;
    }

    return `OBJ • v:${v.toLocaleString()} vt:${vt.toLocaleString()} vn:${vn.toLocaleString()} f:${f.toLocaleString()}`;
}

async function summarizeGLTF(file: File): Promise<string> {
    const json = JSON.parse(await file.text());
    const meshes = Array.isArray(json.meshes) ? json.meshes.length : 0;
    const materials = Array.isArray(json.materials) ? json.materials.length : 0;
    const nodes = Array.isArray(json.nodes) ? json.nodes.length : 0;
    return `GLTF • meshes:${meshes} materials:${materials} nodes:${nodes}`;
}

async function summarizeGLB(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    const dv = new DataView(buf);

    // GLB header: magic "glTF" (0x46546C67), version, length
    const magic = dv.getUint32(0, true);
    if (magic !== 0x46546c67) return "GLB • invalid header";

    const version = dv.getUint32(4, true);
    const totalLen = dv.getUint32(8, true);

    // First chunk: JSON
    const jsonLen = dv.getUint32(12, true);
    const jsonType = dv.getUint32(16, true); // should be "JSON" (0x4E4F534A)
    if (jsonType !== 0x4e4f534a) return `GLB v${version} • missing JSON chunk`;

    const jsonBytes = new Uint8Array(buf, 20, jsonLen);
    const jsonText = new TextDecoder("utf-8").decode(jsonBytes);
    const json = JSON.parse(jsonText);

    const meshes = Array.isArray(json.meshes) ? json.meshes.length : 0;
    const materials = Array.isArray(json.materials) ? json.materials.length : 0;
    const nodes = Array.isArray(json.nodes) ? json.nodes.length : 0;

    return `GLB v${version} • meshes:${meshes} materials:${materials} nodes:${nodes} • size:${formatBytes(totalLen)}`;
}


async function addFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (arr.length === 0) return;

    let added = 0;
    let rejected = 0;

    for (const file of arr) {
        if (!isAllowed(file)) {
            rejected++;
            continue;
        }
        const details = await summarizeModelFile(file).catch(() => undefined);
        store.unshift({ id: uid(), file, addedAt: Date.now(), details: details });
        added++;
    }

    if (added) setStatus(`Added ${added} file(s).`);
    if (rejected) setStatus(`Rejected ${rejected} file(s) (unsupported type).`);

    render();
}

function removeFile(id: string) {
    const idx = store.findIndex(f => f.id === id);
    if (idx >= 0) {
        store.splice(idx, 1);
        render();
    }
}

function clearAll() {
    store.splice(0, store.length);
    render();
    setStatus("Cleared.");
}

function downloadFile(item: StoredFile) {
    // Turn the File into a download link without uploading anywhere.
    const url = URL.createObjectURL(item.file);

    const a = document.createElement("a");
    a.href = url;
    a.download = item.file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();

    // Clean up the blob URL to avoid memory leaks.
    URL.revokeObjectURL(url);
}

// Input change
fileInput.addEventListener("change", () => {
    if (fileInput.files) addFiles(fileInput.files);
    fileInput.value = ""; // allow re-selecting same file
});

// // Drag and drop
// dropzone.addEventListener("dragover", (e) => {
//     e.preventDefault();
//     dropzone.classList.add("dragover");
// });
// dropzone.addEventListener("dragleave", () => {
//     dropzone.classList.remove("dragover");
// });
// dropzone.addEventListener("drop", (e) => {
//     e.preventDefault();
//     dropzone.classList.remove("dragover");
//     const dt = e.dataTransfer;
//     if (dt?.files) addFiles(dt.files);
// });

// Keyboard accessibility: pressing Enter/Space opens file picker
// dropzone.addEventListener("keydown", (e) => {
//     if (e.key === "Enter" || e.key === " ") {
//         e.preventDefault();
//         fileInput.click();
//     }
// });
dropzone.addEventListener("click", (e) => {
    if (e.target === dropzone) {
        fileInput.click();
    }
});
clearBtn.addEventListener("click", clearAll);

render();

