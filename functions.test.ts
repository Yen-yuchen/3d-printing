// functions.test.ts
import { getFileExtension, isValidModelFormat } from './src/utils/fileUtils';

// describe is a Jest function that groups related tests together. The first argument is a string that describes the group, and the second argument is a function that contains the tests.
describe("File Utility Functions Testing", () => {

  // --- for file extension ---
  
  test("1. Should correctly extract the file extension", () => {
    expect(getFileExtension("bunny.obj")).toBe("obj");
    expect(getFileExtension("model.GLB")).toBe("glb"); // test case-insensitivity
  });

  test("2. If the file has multiple periods, it should only extract the last one", () => {
    expect(getFileExtension("my.awesome.model.stl")).toBe("stl");
  });

  test("3. If the file has no extension, it should return an empty string", () => {
    expect(getFileExtension("justAFile")).toBe("");
  });

  test("4. If the file has only an extension (hidden file), it should extract it correctly", () => {
    expect(getFileExtension(".gitignore")).toBe("gitignore");
  });


  // --- for isValidModelFormat tests (2 tests) ---

  test("5. Supported 3D formats should return true", () => {
    expect(isValidModelFormat("test.obj")).toBe(true);
    expect(isValidModelFormat("car.glb")).toBe(true);
    expect(isValidModelFormat("part.stl")).toBe(true);
  });

  test("6. Unsupported formats or strange files should return false", () => {
    expect(isValidModelFormat("document.pdf")).toBe(false);
    expect(isValidModelFormat("virus.exe")).toBe(false);
    expect(isValidModelFormat("image.png")).toBe(false);
    expect(isValidModelFormat("no_extension_file")).toBe(false);
  });

});