import * as THREE from "three";
import { DEFAULT_CAMERA_POSITION } from "../utils/constants";

export function createCamera(aspect: number): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
  camera.position.set(
    DEFAULT_CAMERA_POSITION.x,
    DEFAULT_CAMERA_POSITION.y,
    DEFAULT_CAMERA_POSITION.z,
  );
  return camera;
}
