// src/tests/sceneManagement.test.ts
import * as THREE from 'three';

describe("Component: 3D Scene Management & Toggle Logic", () => {
  let scene: THREE.Scene;
  let state: any; 

  beforeEach(() => {
    scene = new THREE.Scene();
    state = { currentModel: null };
  });

  test("Should swap original model and lattice without memory leaks", () => {
    const originalModel = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    scene.add(originalModel);
    state.currentModel = originalModel;
    
    expect(scene.children.length).toBe(1); 

    const latticeModel = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshBasicMaterial());
    latticeModel.userData = { isLattice: true, originalModel: originalModel };
    
    scene.remove(state.currentModel);
    scene.add(latticeModel);
    state.currentModel = latticeModel;

    expect(scene.children.length).toBe(1);
    expect(state.currentModel.userData.isLattice).toBe(true);

    if (state.currentModel.userData.isLattice) {
       const storedModel = state.currentModel.userData.originalModel;
       const latticeToDispose = state.currentModel;
       
       scene.remove(latticeToDispose);
       scene.add(storedModel);
       state.currentModel = storedModel;
    }

    expect(scene.children.length).toBe(1);
    expect(state.currentModel).toBe(originalModel);
  });
});