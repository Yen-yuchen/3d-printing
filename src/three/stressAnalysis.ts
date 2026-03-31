import * as THREE from "three";
import type { ViewerState } from "../state/viewerState";
import { getAppElements, type AppElements } from "../utils/dom";
import { SceneManager } from "./sceneManager";

export function applySimulatedVonMises(state: ViewerState, sceneManager: SceneManager): void {
  console.log("hello")
  let model = state.currentModel; 
  if (!state.currentModel){
    model = sceneManager.shape;
  }
  if(!model){
    return;
  }
    

  model.traverse((child) => {
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
    const elements: AppElements = getAppElements();

    let sxVal: number | null = Number(elements.sxValue?.textContent);
    // console.log("sxVal: " + sxVal);
    // console.log("sxValText: " + elements.sxValue?.textContent);
    let syVal: number | null = Number(elements.syValue?.textContent);
    let szVal: number | null = Number(elements.szValue?.textContent);
    let txyVal: number | null = Number(elements.txyValue?.textContent);
    let tyzVal: number | null = Number(elements.tyzValue?.textContent);
    let txzVal: number | null = Number(elements.txzValue?.textContent);
    let loadCase: string = "";
    if(elements.loadCaseSelector?.textContent){
      loadCase = elements.loadCaseSelector?.value;
    }


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
      
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      //console.log("xyz: " + x + " " + y + " " + z);
      let stress: number = stressAtPoint(x, y, z, sxVal, syVal, szVal, txyVal, tyzVal, txzVal, loadCase);
      // console.log("Stress: " + stress);
      //console.log("sx sy sz tx ty tz: " + sxVal + syVal +szVal + txyVal + tyzVal +txzVal);
      stressValues.push(stress);
      maxStress = Math.max(maxStress, stress);
      minStress = Math.min(minStress, stress);
    }
    //console.log("max: " + maxStress);
    //console.log("min: " + minStress);
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const value = stressValues[i];
      //console.log("value: " + value);
      const t = maxStress > minStress ? (value - minStress) / (maxStress - minStress) : 0;
      color.setHSL(0.66 * (1 - t), 1.0, 0.5);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
   
    
  });
}

export function calcVonMises(sx: number, sy: number, sz: number, txy: number, tyz: number, txz: number): number{
  return Math.sqrt(0.5 * (
    Math.pow(sx - sy, 2) +
    Math.pow(sy - sz, 2) +
    Math.pow(sz - sx, 2) +
    6 * (txy * txy + tyz * tyz + txz * txz)
  ));
}

export function stressAtPoint(
  x: number, y: number, z: number, 
  sx: number, sy: number, sz: number, 
  txy: number, tyz: number, txz: number, 
  loadCase: string
): number {
  let lx = x, ly = y, lz = z;
  let mod = 1.0;
  //console.log("1- sx sy sz txy tyz txz: " + sx + " " + sy + " " + sz + " " + txy + " " + tyz + " " + txz);
  switch(loadCase) {
    case 'bending':
      mod = 1 + Math.abs(ly) * 1.5 + Math.abs(lx) * 0.3;
      sx *= mod; sy *= 0.2; txy *= (1 + Math.abs(lx)*0.8);
      break;
    case 'torsion':
      const r2 = Math.sqrt(lx*lx + lz*lz) + 0.01;
      txy *= (1 + r2 * 1.2); tyz *= (1 + r2 * 0.9); txz *= (1 + r2 * 0.7);
      sx *= 0.3; sy *= 0.3;
      break;
    case 'combined':
      mod = 1 + Math.abs(lx)*0.4 + Math.abs(ly)*0.3 + Math.abs(lz)*0.2;
      sx *= mod; txy *= (1 + Math.abs(ly)*0.5);
      break;
    case 'pressure':
      const rad = Math.sqrt(lx*lx + ly*ly + lz*lz) + 0.1;
      mod = 1 / (rad * 0.5 + 0.2);
      sx *= mod; sy *= mod; sz *= mod; txy *= 0.3; tyz *= 0.3;
      break;
  }
  //console.log("2- sx sy sz txy tyz txz: " + sx + " " + sy + " " + sz + " " + txy + " " + tyz + " " + txz);

  return calcVonMises(sx, sy, sz, txy, txz, tyz)
}