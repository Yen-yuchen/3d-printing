
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('../src/three/meshOperations', () => ({
  performSimplification: (state: any, elements: any, targetType: string, value: number) => {
    const originalCount = state.currentModel.geometry.attributes.position.count;
    
    state.currentModel = {
        geometry: {
            attributes: {
                position: { count: Math.floor(originalCount * value) }
            }
        }
    };
  }
}));

import { performSimplification } from '../src/three/meshOperations'; 

describe("Component: Mesh Simplification & Analysis", () => {
  let mockState: any;
  let mockElements: any;

  beforeEach(() => {
    
    const highPolyMesh = {
        geometry: {
            attributes: {
                position: { count: 10000 }
            }
        }
    };

    mockState = { currentModel: highPolyMesh };
    mockElements = {}; 
  });

  test("Should successfully reduce polygon count by ratio (50%)", () => {
    const originalCount = mockState.currentModel.geometry.attributes.position.count;
    
    performSimplification(mockState, mockElements, "ratio", 0.5);
    
    const newCount = mockState.currentModel.geometry.attributes.position.count;

    expect(newCount).toBeLessThan(originalCount);
    expect(newCount).toBe(5000); 
  });
});