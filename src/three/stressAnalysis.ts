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

    for (let i = 0; i < count; i++) {
      const dx = position.getX(i) - centerPoint.x;
      const dy = position.getY(i) - centerPoint.y;
      const dz = position.getZ(i) - centerPoint.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const stress = distance;

      stressValues.push(stress);
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
