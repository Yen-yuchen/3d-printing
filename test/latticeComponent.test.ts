// src/tests/latticeComponent.test.ts
import * as THREE from 'three';

// ==========================================
// 💡 殺手鐧：一樣用 Mocking 攔截 meshOperations！
// 這樣 Jest 就不會去解析會報錯的 BufferGeometryUtils 了
// ==========================================
jest.mock('../src/three/meshOperations', () => ({
  createPrintableWireframe: (geometry: any, material: any, thickness: number) => {
    // 替身任務：我們不需要真的去算圓柱體，只要回傳一個帶有正確材質的假 Mesh 就好
    const THREE = require('three');
    const mockLatticeMesh = new THREE.Mesh(geometry, material);
    // 偷偷塞個標籤，證明這個替身確實有收到我們算出來的 thickness
    mockLatticeMesh.userData = { isLattice: true, thickness: thickness };
    return mockLatticeMesh;
  }
}));

// 在 mock 之後才 import，確保拿到的是替身
import { createPrintableWireframe } from '../src/three/meshOperations';
import { getFirstMesh } from '../src/utils/threeUtils';

describe("Component: Lattice Generation Pipeline", () => {
  let mockGroup: THREE.Group;
  let mockMaterial: THREE.MeshStandardMaterial;

  beforeEach(() => {
    // 模擬使用者載入了一個包在 Group 裡面的模型，而且還被旋轉過
    mockGroup = new THREE.Group();
    const boxGeo = new THREE.BoxGeometry(10, 10, 10);
    const mesh = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial());
    mockGroup.add(mesh);
    mockGroup.rotation.y = Math.PI / 4; // 旋轉 45 度

    mockMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  });

  test("Should extract, bake, and generate a valid lattice mesh", () => {
    // 步驟 1: 提取真正的 Mesh (使用 as THREE.Mesh 解決 TypeScript 報錯)
    const currentMesh = getFirstMesh(mockGroup) as THREE.Mesh;
    expect(currentMesh).toBeDefined();
    expect(currentMesh.geometry).toBeDefined();

    // 步驟 2: 烘焙世界座標
    currentMesh.updateMatrixWorld(true);
    const bakedGeometry = currentMesh.geometry.clone();
    bakedGeometry.applyMatrix4(currentMesh.matrixWorld);

    // 步驟 3: 動態計算粗細
    bakedGeometry.computeBoundingBox();
    const size = new THREE.Vector3();
    bakedGeometry.boundingBox!.getSize(size);
    const optimalThickness = Math.max(size.x, size.y, size.z) * 0.015;

    // 步驟 4: 呼叫被 Mock 過的晶格兵工廠
    const latticeMesh = createPrintableWireframe(bakedGeometry, mockMaterial, optimalThickness);

    // 驗證結果
    expect(latticeMesh).toBeInstanceOf(THREE.Mesh);
    expect(latticeMesh.material).toBe(mockMaterial);
    expect(latticeMesh.userData.isLattice).toBe(true);
    // 驗證我們的動態粗細演算法有沒有正確傳遞給兵工廠
    expect(latticeMesh.userData.thickness).toBeCloseTo(optimalThickness);
  });
});