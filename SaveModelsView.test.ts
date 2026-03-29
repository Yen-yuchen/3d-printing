/**
 * @jest-environment jsdom
 */

import { renderSavedModels } from "./src/views/saveModelsView";

describe("saveModelsView", () => {
    beforeEach(() => {
        document.body.innerHTML = `
      <div id="tool-panel"></div>
    `;
    });

    test("shows empty message when there are no saved models", () => {
        renderSavedModels([]);

        const list = document.getElementById("savedModelsList");
        expect(list).not.toBeNull();
        expect(list?.textContent).toContain("No saved models");
    });

    test("renders one button per saved model", () => {
        renderSavedModels([
            { model_id: 1, model_name: "Cube", file_format: "obj" },
            { model_id: 2, model_name: "Sphere", file_format: "stl" },
        ] as any);

        const buttons = document.querySelectorAll("#savedModelsList button");
        expect(buttons.length).toBe(2);
    });

    test("renders button text with model name and file format", () => {
        renderSavedModels([
            { model_id: 1, model_name: "Cube", file_format: "obj" },
        ] as any);

        const button = document.querySelector(
            "#savedModelsList button"
        ) as HTMLButtonElement;

        expect(button).not.toBeNull();
        expect(button.textContent).toContain("Cube");
        expect(button.textContent).toContain("obj");
    });

    test("uses fallback name when model_name is blank", () => {
        renderSavedModels([
            { model_id: 7, model_name: "   ", file_format: "gltf" },
        ] as any);

        const button = document.querySelector(
            "#savedModelsList button"
        ) as HTMLButtonElement;

        expect(button.textContent).toContain("Model 7");
        expect(button.textContent).toContain("gltf");
    });

    test("dispatches saved-model:open event with modelId when button is clicked", () => {
        const eventHandler = jest.fn();
        window.addEventListener("saved-model:open", eventHandler);

        renderSavedModels([
            { model_id: 42, model_name: "Test Model", file_format: "obj" },
        ] as any);

        const button = document.querySelector(
            "#savedModelsList button"
        ) as HTMLButtonElement;

        button.click();

        expect(eventHandler).toHaveBeenCalledTimes(1);

        const event = eventHandler.mock.calls[0][0] as CustomEvent;
        expect(event.detail).toEqual({ modelId: 42 });
    });

    test("does not create duplicate panels on multiple renders", () => {
        renderSavedModels([
            { model_id: 1, model_name: "Cube", file_format: "obj" },
        ] as any);

        renderSavedModels([
            { model_id: 2, model_name: "Sphere", file_format: "stl" },
        ] as any);

        const panels = document.querySelectorAll("#savedModelsPanel");
        expect(panels.length).toBe(1);
    });
});