import * as THREE from "three";
import { DEFAULT_BACKGROUND } from "../utils/constants";

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(DEFAULT_BACKGROUND);
  return scene;
}

export function addDefaultLights(scene: THREE.Scene): void {
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const directional = new THREE.DirectionalLight(0xffffff, 1);
  directional.position.set(5, 10, 5);
  scene.add(directional);
}

export function createDemoCube(): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: "orange" }),
  );
}

export function createGridHelper(): THREE.GridHelper {
  return new THREE.GridHelper(10, 10);
}

export function createAxesHelper(): THREE.AxesHelper {
  return new THREE.AxesHelper(2);
}
