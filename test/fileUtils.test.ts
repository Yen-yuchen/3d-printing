// src/utils/fileUtils.test.ts
import { baseName, collectExternalUris, getFileExtension, isValidModelFormat } from '../src/utils/fileUtils';

describe("File Utility Functions", () => {

  // ==========================================
  // Tests for baseName()
  // ==========================================
  describe("baseName()", () => {
    test("1. Should extract the file name from a standard URL path", () => {
      // It should ignore the folder path and return only the file name
      expect(baseName("models/characters/bunny.obj")).toBe("bunny.obj");
    });

    test("2. Should handle Windows-style backslashes correctly", () => {
      // It should convert backslashes to forward slashes and extract the name
      expect(baseName("C:\\Users\\Desktop\\model.glb")).toBe("model.glb");
    });

    test("3. Should decode URI components (e.g., spaces represented as %20)", () => {
      // It should translate %20 back to a normal space
      expect(baseName("my%20folder/my%20model.stl")).toBe("my model.stl");
    });

    test("4. Should return the original string if no path separators exist", () => {
      expect(baseName("simple_filename.gltf")).toBe("simple_filename.gltf");
    });
  });

  // ==========================================
  // Tests for collectExternalUris()
  // ==========================================
  describe("collectExternalUris()", () => {
    test("5. Should return an empty set if JSON is empty or malformed", () => {
      expect(collectExternalUris(null).size).toBe(0);
      expect(collectExternalUris({}).size).toBe(0);
    });
  });

  // ==========================================
  // Tests for getFileExtension()
  // ==========================================
  describe("getFileExtension()", () => {
    test("6. Should correctly extract the extension and convert to lowercase", () => {
      expect(getFileExtension("test_model.OBJ")).toBe("obj");
      expect(getFileExtension("scene.GLTF")).toBe("gltf");
    });

    test("7. Should return an empty string if there is no extension", () => {
      expect(getFileExtension("model_without_extension")).toBe("");
    });
  });

  // ==========================================
  // Tests for isValidModelFormat()
  // ==========================================
  describe("isValidModelFormat()", () => {
    test("8. Should return true for supported 3D formats", () => {
      expect(isValidModelFormat("print.stl")).toBe(true);
      expect(isValidModelFormat("avatar.glb")).toBe(true);
    });

    test("9. Should return false for unsupported formats", () => {
      expect(isValidModelFormat("document.pdf")).toBe(false);
      expect(isValidModelFormat("image.png")).toBe(false);
    });
  });

});