import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createCamera } from "./cameraManager";
import { createRenderer } from "./rendererManager";
import { createControls } from "./controlsManager";
import {
  addDefaultLights,
  createAxesHelper,
  createNewShape,
  createGridHelper,
  createScene,
} from "./viewerHelpers";
import { DEFAULT_CAMERA_POSITION } from "../utils/constants";

export class SceneManager {
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly controls: OrbitControls;
  public readonly shape: THREE.Mesh;
  public readonly gridHelper: THREE.GridHelper;
  public readonly axesHelper: THREE.AxesHelper;
  private readonly viewer: HTMLDivElement;

  constructor(viewer: HTMLDivElement) {
    this.viewer = viewer;
    this.scene = createScene();
    this.camera = createCamera(1);
    this.renderer = createRenderer(viewer);
    this.controls = createControls(this.camera, this.renderer);

    addDefaultLights(this.scene);

    this.shape = createNewShape("cube");
    this.scene.add(this.shape);

    this.gridHelper = createGridHelper();
    this.axesHelper = createAxesHelper();
    this.scene.add(this.gridHelper);
    this.scene.add(this.axesHelper);
  }
  public changeShape(shapeName: string): void {
    console.log("chang shap");
    
    let newShape: THREE.Mesh = createNewShape(shapeName);
    if(this.shape.geometry){
      this.shape.geometry.dispose();
    }
    if(Array.isArray(this.shape.material)){
      this.shape.material.forEach((material) => {
        material.dispose()
      })
    } else{
      this.shape.material.dispose()
    }
    this.shape.material = newShape.material;
    this.shape.geometry = newShape.geometry;
    this.scene.add(this.shape);
  }

  public setBackground(colorHex: string): void {
    this.scene.background = new THREE.Color(colorHex);
  }

  public resizeToViewer(): void {
    const width = this.viewer.clientWidth;
    const height = this.viewer.clientHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  public resetCamera(): void {
    this.camera.position.set(
      DEFAULT_CAMERA_POSITION.x,
      DEFAULT_CAMERA_POSITION.y,
      DEFAULT_CAMERA_POSITION.z,
    );
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  public startAnimationLoop(): void {
    const animate = () => {
      requestAnimationFrame(animate);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  public observeResize(): void {
    window.addEventListener("resize", () => this.resizeToViewer());
    new ResizeObserver(() => this.resizeToViewer()).observe(this.viewer);
    this.resizeToViewer();
  }
}
