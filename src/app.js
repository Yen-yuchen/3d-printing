var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var ALLOWED_EXIST = new Set(["stl", "obj", "gltf", "glb", "3mf", "ply"]);
var fileInput = document.getElementById("fileInput");
var dropzone = document.getElementById("dropzone");
var fileList = document.getElementById("fileList");
var empty = document.getElementById("empty");
var statusOne = document.getElementById("statusOne");
var count = document.getElementById("count");
var clearBtn = document.getElementById("clearBtn");
var store = [];
function uid() {
    // good enough for a demo
    return "".concat(Date.now(), "-").concat(Math.random().toString(16).slice(2));
}
function formatBytes(bytes) {
    var units = ["B", "KB", "MB", "GB", "TB"];
    var v = bytes;
    var i = 0;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i++;
    }
    return "".concat(v.toFixed(i === 0 ? 0 : 2), " ").concat(units[i]);
}
function setStatus(msg) {
    statusOne.textContent = msg;
    if (msg) {
        window.setTimeout(function () {
            if (statusOne.textContent === msg)
                statusOne.textContent = "";
        }, 2500);
    }
}
function getExt(name) {
    var i = name.lastIndexOf(".");
    return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}
function isAllowed(file) {
    return ALLOWED_EXIST.has(getExt(file.name));
}
function render() {
    fileList.innerHTML = "";
    empty.style.display = store.length === 0 ? "block" : "none";
    count.textContent = store.length === 0 ? "" : "".concat(store.length, " file(s)");
    var _loop_1 = function (item) {
        var li = document.createElement("li");
        li.className = "file-item";
        var top_1 = document.createElement("div");
        top_1.className = "file-top";
        var name_1 = document.createElement("div");
        name_1.className = "file-name";
        name_1.textContent = item.file.name;
        var meta = document.createElement("div");
        meta.className = "file-meta";
        meta.textContent = "".concat(formatBytes(item.file.size), " \u2022 ").concat(item.file.type || "unknown type", " \u2022 ").concat(new Date(item.addedAt).toLocaleString());
        if (item.details) {
            var details = document.createElement("div");
            details.className = "file-details";
            details.textContent = item.details;
            top_1.appendChild(details);
        }
        top_1.appendChild(name_1);
        top_1.appendChild(meta);
        var actions = document.createElement("div");
        actions.className = "file-actions";
        var downloadBtn = document.createElement("button");
        downloadBtn.className = "btn";
        downloadBtn.type = "button";
        downloadBtn.textContent = "Download";
        downloadBtn.addEventListener("click", function () { return downloadFile(item); });
        var removeBtn = document.createElement("button");
        removeBtn.className = "btn btn-danger";
        removeBtn.type = "button";
        removeBtn.textContent = "Remove";
        removeBtn.addEventListener("click", function () { return removeFile(item.id); });
        actions.appendChild(downloadBtn);
        actions.appendChild(removeBtn);
        li.appendChild(top_1);
        li.appendChild(actions);
        fileList.appendChild(li);
    };
    for (var _i = 0, store_1 = store; _i < store_1.length; _i++) {
        var item = store_1[_i];
        _loop_1(item);
    }
}
function summarizeModelFile(file) {
    return __awaiter(this, void 0, void 0, function () {
        var ext;
        return __generator(this, function (_a) {
            ext = getExt(file.name);
            if (ext === "stl")
                return [2 /*return*/, summarizeSTL(file)];
            if (ext === "obj")
                return [2 /*return*/, summarizeOBJ(file)];
            if (ext === "gltf")
                return [2 /*return*/, summarizeGLTF(file)];
            if (ext === "glb")
                return [2 /*return*/, summarizeGLB(file)];
            // 3MF/PLY are doable too, but they take a bit more code (ZIP/XML for 3MF).
            return [2 /*return*/, "".concat(ext.toUpperCase(), " file")];
        });
    });
}
function summarizeSTL(file) {
    return __awaiter(this, void 0, void 0, function () {
        var buf, dv, triCount, expected, text, facetCount;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, file.arrayBuffer()];
                case 1:
                    buf = _a.sent();
                    dv = new DataView(buf);
                    // Binary STL: 80-byte header + uint32 triangle count at offset 80
                    if (buf.byteLength >= 84) {
                        triCount = dv.getUint32(80, true);
                        expected = 84 + triCount * 50;
                        // Heuristic: if size matches the binary layout, treat as binary STL
                        if (expected === buf.byteLength) {
                            return [2 /*return*/, "STL (binary) \u2022 triangles: ".concat(triCount.toLocaleString())];
                        }
                    }
                    return [4 /*yield*/, file.text()];
                case 2:
                    text = _a.sent();
                    facetCount = (text.match(/\bfacet\s+normal\b/g) || []).length;
                    return [2 /*return*/, "STL (ascii) \u2022 facets: ".concat(facetCount.toLocaleString())];
            }
        });
    });
}
function summarizeOBJ(file) {
    return __awaiter(this, void 0, void 0, function () {
        var text, v, vt, vn, f, _i, _a, line;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, file.text()];
                case 1:
                    text = _b.sent();
                    v = 0, vt = 0, vn = 0, f = 0;
                    // Light parsing: count line prefixes
                    for (_i = 0, _a = text.split(/\r?\n/); _i < _a.length; _i++) {
                        line = _a[_i];
                        if (line.startsWith("v "))
                            v++;
                        else if (line.startsWith("vt "))
                            vt++;
                        else if (line.startsWith("vn "))
                            vn++;
                        else if (line.startsWith("f "))
                            f++;
                    }
                    return [2 /*return*/, "OBJ \u2022 v:".concat(v.toLocaleString(), " vt:").concat(vt.toLocaleString(), " vn:").concat(vn.toLocaleString(), " f:").concat(f.toLocaleString())];
            }
        });
    });
}
function summarizeGLTF(file) {
    return __awaiter(this, void 0, void 0, function () {
        var json, _a, _b, meshes, materials, nodes;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _b = (_a = JSON).parse;
                    return [4 /*yield*/, file.text()];
                case 1:
                    json = _b.apply(_a, [_c.sent()]);
                    meshes = Array.isArray(json.meshes) ? json.meshes.length : 0;
                    materials = Array.isArray(json.materials) ? json.materials.length : 0;
                    nodes = Array.isArray(json.nodes) ? json.nodes.length : 0;
                    return [2 /*return*/, "GLTF \u2022 meshes:".concat(meshes, " materials:").concat(materials, " nodes:").concat(nodes)];
            }
        });
    });
}
function summarizeGLB(file) {
    return __awaiter(this, void 0, void 0, function () {
        var buf, dv, magic, version, totalLen, jsonLen, jsonType, jsonBytes, jsonText, json, meshes, materials, nodes;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, file.arrayBuffer()];
                case 1:
                    buf = _a.sent();
                    dv = new DataView(buf);
                    magic = dv.getUint32(0, true);
                    if (magic !== 0x46546c67)
                        return [2 /*return*/, "GLB • invalid header"];
                    version = dv.getUint32(4, true);
                    totalLen = dv.getUint32(8, true);
                    jsonLen = dv.getUint32(12, true);
                    jsonType = dv.getUint32(16, true);
                    if (jsonType !== 0x4e4f534a)
                        return [2 /*return*/, "GLB v".concat(version, " \u2022 missing JSON chunk")];
                    jsonBytes = new Uint8Array(buf, 20, jsonLen);
                    jsonText = new TextDecoder("utf-8").decode(jsonBytes);
                    json = JSON.parse(jsonText);
                    meshes = Array.isArray(json.meshes) ? json.meshes.length : 0;
                    materials = Array.isArray(json.materials) ? json.materials.length : 0;
                    nodes = Array.isArray(json.nodes) ? json.nodes.length : 0;
                    return [2 /*return*/, "GLB v".concat(version, " \u2022 meshes:").concat(meshes, " materials:").concat(materials, " nodes:").concat(nodes, " \u2022 size:").concat(formatBytes(totalLen))];
            }
        });
    });
}
function addFiles(files) {
    return __awaiter(this, void 0, void 0, function () {
        var arr, added, rejected, _i, arr_1, file, details;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    arr = Array.from(files);
                    if (arr.length === 0)
                        return [2 /*return*/];
                    added = 0;
                    rejected = 0;
                    _i = 0, arr_1 = arr;
                    _a.label = 1;
                case 1:
                    if (!(_i < arr_1.length)) return [3 /*break*/, 4];
                    file = arr_1[_i];
                    if (!isAllowed(file)) {
                        rejected++;
                        return [3 /*break*/, 3];
                    }
                    return [4 /*yield*/, summarizeModelFile(file).catch(function () { return undefined; })];
                case 2:
                    details = _a.sent();
                    store.unshift({ id: uid(), file: file, addedAt: Date.now(), details: details });
                    added++;
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    if (added)
                        setStatus("Added ".concat(added, " file(s)."));
                    if (rejected)
                        setStatus("Rejected ".concat(rejected, " file(s) (unsupported type)."));
                    render();
                    return [2 /*return*/];
            }
        });
    });
}
function removeFile(id) {
    var idx = store.findIndex(function (f) { return f.id === id; });
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
function downloadFile(item) {
    // Turn the File into a download link without uploading anywhere.
    var url = URL.createObjectURL(item.file);
    var a = document.createElement("a");
    a.href = url;
    a.download = item.file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Clean up the blob URL to avoid memory leaks.
    URL.revokeObjectURL(url);
}
// Input change
fileInput.addEventListener("change", function () {
    if (fileInput.files)
        addFiles(fileInput.files);
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
dropzone.addEventListener("click", function (e) {
    if (e.target === dropzone) {
        fileInput.click();
    }
});
clearBtn.addEventListener("click", clearAll);
render();
