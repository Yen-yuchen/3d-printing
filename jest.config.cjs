const { createDefaultPreset } = require("ts-jest");

const tsJestPreset = createDefaultPreset({
  tsconfig: "tsconfig.jest.json",
});

/** @type {import("jest").Config} */
module.exports = {
  testEnvironment: "jsdom",
  transform: {
    ...tsJestPreset.transform,
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  testMatch: ["**/?(*.)+(test).ts"],
};