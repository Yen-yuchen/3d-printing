import * as THREE from "three";

export function traverseMeshes(object: THREE.Object3D, visitor: (mesh: THREE.Mesh) => void): void {
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      visitor(child as THREE.Mesh);
    }
  });
}

export function getFirstMesh(object: THREE.Object3D | null): THREE.Mesh | null {
  if (!object) return null;
  if ((object as THREE.Mesh).isMesh) {
    return object as THREE.Mesh;
  }

  for (const child of object.children) {
    const mesh = getFirstMesh(child);
    if (mesh) return mesh;
  }

  return null;
}

export function disposeObject3D(object: THREE.Object3D): void {
  object.traverse((child: any) => {
    if (child?.geometry) child.geometry.dispose?.();
    const material = child?.material;
    if (Array.isArray(material)) {
      material.forEach((entry) => entry?.dispose?.());
    } else {
      material?.dispose?.();
    }
  });
}

export function fitCameraToObject(
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update(): void },
  object: THREE.Object3D,
  fitOffset = 1.2,
): void {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(maxSize) || maxSize <= 0) return;

  const fitHeightDistance = maxSize / (2 * Math.atan((Math.PI * camera.fov) / 360));
  const fitWidthDistance = fitHeightDistance / camera.aspect;
  const distance = fitOffset * Math.max(fitHeightDistance, fitWidthDistance);

  controls.target.copy(center);
  camera.near = distance / 100;
  camera.far = distance * 100;
  camera.updateProjectionMatrix();

  const direction = new THREE.Vector3(1, 1, 1).normalize();
  camera.position.copy(center).add(direction.multiplyScalar(distance));
  controls.update();
}
