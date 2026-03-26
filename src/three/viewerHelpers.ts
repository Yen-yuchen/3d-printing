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

export function createGridHelper(): THREE.GridHelper {
  return new THREE.GridHelper(10, 10);
}

export function createAxesHelper(): THREE.AxesHelper {
  return new THREE.AxesHelper(2);
}

export function createNewShape(shapeType: string){
  switch(shapeType){
    case("cube"): return createDemoCube();
    case("cylinder"): return createDemoCylinder();
    case("sphere"): return createDemoSphere();
    case("beam"): return createDemoBeam();
    case("plate"): return createDemoPlate();
    case("bracket"): return createDemoBracket();
    default: return createDemoCube();
  }
}

function createDemoCube(): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: "orange" }),
  );
}

function createDemoCylinder(): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 3, 40, 30, false),
    new THREE.MeshStandardMaterial({ color: "orange" }),
  );
}

function createDemoSphere(): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 48, 48),
    new THREE.MeshStandardMaterial({ color: "orange" }),
  );
}

function createDemoBeam(): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.5, 0.5, 40, 8, 8),
    new THREE.MeshStandardMaterial({ color: "orange" }),
  );
}

export function createDemoPlate(): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.3, 3, 30, 4, 30),
    new THREE.MeshStandardMaterial({ color: "orange" }),
  );
}

export function createDemoBracket(): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 2, 0.4, 15, 20, 4),
    new THREE.MeshStandardMaterial({ color: "orange" }),
  );
}
