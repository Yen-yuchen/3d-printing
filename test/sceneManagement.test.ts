// src/tests/sceneManagement.test.ts
import * as THREE from 'three';

describe("Component: 3D Scene Management & Toggle Logic", () => {
  let scene: THREE.Scene;
  let state: any; // 模擬你們的 ViewerState

  beforeEach(() => {
    scene = new THREE.Scene();
    state = { currentModel: null };
  });

  test("Should swap original model and lattice without memory leaks", () => {
    // 1. 模擬載入原始模型
    const originalModel = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    scene.add(originalModel);
    state.currentModel = originalModel;
    
    expect(scene.children.length).toBe(1); // 場景裡只有一個東西

    // 2. 模擬點擊 Generate Lattice (切換成晶格)
    const latticeModel = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshBasicMaterial());
    latticeModel.userData = { isLattice: true, originalModel: originalModel };
    
    // 移除舊的，加入新的
    scene.remove(state.currentModel);
    scene.add(latticeModel);
    state.currentModel = latticeModel;

    // 驗證：場景裡依然只能有一個東西，而且是晶格
    expect(scene.children.length).toBe(1);
    expect(state.currentModel.userData.isLattice).toBe(true);

    // 3. 模擬點擊 Restore (還原模型)
    if (state.currentModel.userData.isLattice) {
       const storedModel = state.currentModel.userData.originalModel;
       const latticeToDispose = state.currentModel;
       
       scene.remove(latticeToDispose);
       scene.add(storedModel);
       state.currentModel = storedModel;
    }

    // 驗證：成功切換回原始模型，且場景裡還是只有一個東西
    expect(scene.children.length).toBe(1);
    expect(state.currentModel).toBe(originalModel);
  });
});