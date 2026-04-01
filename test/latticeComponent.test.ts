import * as THREE from 'three';


jest.mock('../src/three/meshOperations', () => ({
  createPrintableWireframe: (geometry: any, material: any, thickness: number) => {
    const THREE = require('three');
    const mockLatticeMesh = new THREE.Mesh(geometry, material);
    mockLatticeMesh.userData = { isLattice: true, thickness: thickness };
    return mockLatticeMesh;
  }
}));

import { createPrintableWireframe } from '../src/three/meshOperations';
import { getFirstMesh } from '../src/utils/threeUtils';

describe("Component: Lattice Generation Pipeline", () => {
  let mockGroup: THREE.Group;
  let mockMaterial: THREE.MeshStandardMaterial;

  beforeEach(() => {
    mockGroup = new THREE.Group();
    const boxGeo = new THREE.BoxGeometry(10, 10, 10);
    const mesh = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial());
    mockGroup.add(mesh);
    mockGroup.rotation.y = Math.PI / 4; 

    mockMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  });

  test("Should extract, bake, and generate a valid lattice mesh", () => {
    const currentMesh = getFirstMesh(mockGroup) as THREE.Mesh;
    expect(currentMesh).toBeDefined();
    expect(currentMesh.geometry).toBeDefined();

    currentMesh.updateMatrixWorld(true);
    const bakedGeometry = currentMesh.geometry.clone();
    bakedGeometry.applyMatrix4(currentMesh.matrixWorld);

    bakedGeometry.computeBoundingBox();
    const size = new THREE.Vector3();
    bakedGeometry.boundingBox!.getSize(size);
    const optimalThickness = Math.max(size.x, size.y, size.z) * 0.015;

    const latticeMesh = createPrintableWireframe(bakedGeometry, mockMaterial, optimalThickness);

    expect(latticeMesh).toBeInstanceOf(THREE.Mesh);
    expect(latticeMesh.material).toBe(mockMaterial);
    expect(latticeMesh.userData.isLattice).toBe(true);
    expect(latticeMesh.userData.thickness).toBeCloseTo(optimalThickness);
  });
});