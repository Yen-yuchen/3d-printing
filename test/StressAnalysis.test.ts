import { calcVonMises, stressAtPoint } from '../src/three/stressAnalysis';

describe('Stress Analysis Function', () => {
  describe('calcVonMises()', () => {
    it('returns zero for an all-zero stress state', () => {
      expect(calcVonMises(0, 0, 0, 0, 0, 0)).toBe(0);
    });

    it('computes a known Von Mises value for simple axial stress', () => {
      // For sx=1, sy=0, sz=0 and no shear, the Von Mises equivalent is 1.
      expect(calcVonMises(1, 0, 0, 0, 0, 0)).toBeCloseTo(1);
    });
  });

  describe('stressAtPoint()', () => {
    it('returns the same Von Mises value as calcVonMises when no load case is applied', () => {
      const expected = calcVonMises(10, 5, -2, 2, 2, 2);
      expect(stressAtPoint(1, 2, 3, 10, 5, -2, 2, 2, 2, '')).toBeCloseTo(expected);
    });

    it('applies bending modifiers before computing Von Mises', () => {
      const x = 1;
      const y = 2;
      const sx = 10;
      const sy = 5;
      const sz = 0;
      const txy = 2;
      const tyz = 2;
      const txz = 2;
      const mod = 1 + Math.abs(y) * 1.5 + Math.abs(x) * 0.3; // 4.3
      const expected = calcVonMises(sx * mod, sy * 0.2, sz, txy * (1 + Math.abs(x) * 0.8), tyz, txz);

      expect(stressAtPoint(x, y, 0, sx, sy, sz, txy, tyz, txz, 'bending')).toBeCloseTo(expected);
    });

    it('applies torsion modifiers before computing Von Mises', () => {
      const x = 0;
      const z = 0;
      const sx = 3;
      const sy = 1.5;
      const sz = 0;
      const txy = 2;
      const tyz = 2;
      const txz = 2;
      const r2 = Math.sqrt(x * x + z * z) + 0.01; // 0.01
      const expected = calcVonMises(
        sx * 0.3,
        sy * 0.3,
        sz,
        txy * (1 + r2 * 1.2),
        tyz * (1 + r2 * 0.9),
        txz * (1 + r2 * 0.7)
      );

      expect(stressAtPoint(x, 0, z, sx, sy, sz, txy, tyz, txz, 'torsion')).toBeCloseTo(expected);
    });

    it('applies pressure modifiers before computing Von Mises', () => {
      const x = 1;
      const y = 0;
      const z = 0;
      const sx = 8;
      const sy = 6;
      const sz = 4;
      const txy = 2;
      const tyz = 2;
      const txz = 2;
      const rad = Math.sqrt((x * x) + (y * y) + (z * z)) + 0.1; // 1.1
      const mod = 1 / (rad * 0.5 + 0.2);
      const expected = calcVonMises(
        sx * mod,
        sy * mod,
        sz * mod,
        txy * 0.3,
        tyz * 0.3,
        //txz * 0.3
        txz
      );

      expect(stressAtPoint(x, y, z, sx, sy, sz, txy, tyz, txz, 'pressure')).toBeCloseTo(expected);
    });
  });
});