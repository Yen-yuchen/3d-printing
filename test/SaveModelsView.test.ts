/**
 * @jest-environment jsdom
 */

/// <reference types="jest" />

import { renderSavedModels } from "../src/views/saveModelsView";

describe("saveModelsView", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="tool-panel"></div>
      <div id="savedModelsList"></div>
    `;
  });

  test("shows empty message when there are no saved models", () => {
    renderSavedModels([]);

    const list = document.getElementById("savedModelsList");
    expect(list).not.toBeNull();
    expect(list?.textContent).toContain("No saved models.");

    const emptyMessage = document.querySelector(".saved-model-empty");
    expect(emptyMessage).not.toBeNull();
  });

  test("renders one row per saved model", () => {
    renderSavedModels([
      { model_id: 1, model_name: "Cube", file_format: "obj" },
      { model_id: 2, model_name: "Sphere", file_format: "stl" },
    ] as any);

    const rows = document.querySelectorAll("#savedModelsList .saved-model-row");
    expect(rows.length).toBe(2);
  });

  test("renders row text with model name and file format", () => {
    renderSavedModels([
      { model_id: 1, model_name: "Cube", file_format: "obj" },
    ] as any);

    const row = document.querySelector(
      "#savedModelsList .saved-model-row"
    ) as HTMLDivElement;

    expect(row).not.toBeNull();
    expect(row.textContent).toContain("Cube");
    expect(row.textContent).toContain("obj");
    expect(row.textContent).toBe("Cube (obj)");
  });

  test("uses fallback name when model_name is blank", () => {
    renderSavedModels([
      { model_id: 7, model_name: "   ", file_format: "gltf" },
    ] as any);

    const row = document.querySelector(
      "#savedModelsList .saved-model-row"
    ) as HTMLDivElement;

    expect(row).not.toBeNull();
    expect(row.textContent).toContain("Model 7");
    expect(row.textContent).toContain("gltf");
    expect(row.textContent).toBe("Model 7 (gltf)");
  });

  test("dispatches saved-model:open event with modelId when row is clicked", () => {
    const eventHandler = jest.fn();
    window.addEventListener("saved-model:open", eventHandler);

    renderSavedModels([
      { model_id: 42, model_name: "Test Model", file_format: "obj" },
    ] as any);

    const row = document.querySelector(
      "#savedModelsList .saved-model-row"
    ) as HTMLDivElement;

    row.click();

    expect(eventHandler).toHaveBeenCalledTimes(1);

    const event = eventHandler.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({ modelId: 42 });

    window.removeEventListener("saved-model:open", eventHandler);
  });

  test("replaces previous rows on multiple renders instead of duplicating them", () => {
    renderSavedModels([
      { model_id: 1, model_name: "Cube", file_format: "obj" },
    ] as any);

    renderSavedModels([
      { model_id: 2, model_name: "Sphere", file_format: "stl" },
    ] as any);

    const rows = document.querySelectorAll("#savedModelsList .saved-model-row");
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toBe("Sphere (stl)");
  });

  test("stores model id in data-model-id", () => {
    renderSavedModels([
      { model_id: 99, model_name: "Bracket", file_format: "stl" },
    ] as any);

    const row = document.querySelector(
      "#savedModelsList .saved-model-row"
    ) as HTMLDivElement;

    expect(row.dataset.modelId).toBe("99");
  });

  test("throws an error if #savedModelsList is missing", () => {
    document.body.innerHTML = `<div id="tool-panel"></div>`;

    expect(() => renderSavedModels([])).toThrow(
      "Saved models list is missing. Expected #savedModelsList in index.html"
    );
  });
});
