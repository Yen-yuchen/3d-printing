import * as THREE from "three";
import type { ViewerState } from "../state/viewerState";

export function applySimulatedVonMises(state: ViewerState): void {
  if (!state.currentModel) return;

  state.currentModel.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;

    const mesh = child as THREE.Mesh;
    const geometry = mesh.geometry;

    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    const centerPoint = new THREE.Vector3();
    geometry.boundingBox!.getCenter(centerPoint);

    const count = geometry.attributes.position.count;
    const colors = new Float32Array(count * 3);
    const position = geometry.attributes.position;

    const stressValues: number[] = [];
    let maxStress = 0;
    let minStress = Infinity;

    let sxVal: number | null = Number(document.getElementById("sx-val")?.textContent);
    let syVal: number | null = Number(document.getElementById("sy-val")?.textContent);
    let szVal: number | null = Number(document.getElementById("sz-val")?.textContent);
    let txVal: number | null = Number(document.getElementById("tx-val")?.textContent);
    let tyVal: number | null = Number(document.getElementById("ty-val")?.textContent);
    let tzVal: number | null = Number(document.getElementById("tz-val")?.textContent);
    for (let i = 0; i < count; i++) {
      // const dx = position.getX(i) - centerPoint.x;
      // const dy = position.getY(i) - centerPoint.y;
      // const dz = position.getZ(i) - centerPoint.z;
      // const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      // const stress = distance;
      /*
      sx-val
      sy-val
      sz-val
      tx-val
      ty-val
      tz-val
      */
      

      let stress: number = calcVonMises(sxVal, syVal, szVal, txVal, tyVal, tzVal);
      stressValues.push();
      maxStress = Math.max(maxStress, stress);
      minStress = Math.min(minStress, stress);
    }

    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const value = stressValues[i];
      const t = maxStress > minStress ? (value - minStress) / (maxStress - minStress) : 0;
      color.setHSL(0.66 * (1 - t), 1.0, 0.5);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    mesh.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.5,
      metalness: 0.1,
    });
  });
}

function calcVonMises(sx: number, sy: number, sz: number, txy: number, tyz: number, txz: number): number{
  return Math.sqrt(0.5 * (
    Math.pow(sx - sy, 2) +
    Math.pow(sy - sz, 2) +
    Math.pow(sz - sx, 2) +
    6 * (txy * txy + tyz * tyz + txz * txz)
  ));
}