import { createAuthState } from "./state/authState";
import { createViewerState } from "./state/viewerState";
import { getAppElements } from "./utils/dom";
import { SceneManager } from "./three/sceneManager";
import { ModelLoaderService } from "./three/modelLoader";
import { CheckpointManager } from "./three/checkpointManager";
import { AuthController } from "./controllers/authController";
import { ModelController } from "./controllers/modelController";
import { ViewerController } from "./controllers/viewerController";
import { MeshController } from "./controllers/meshController";
import { ExportController } from "./controllers/exportController";
import {
  applyHelperVisibility,
  applyModelVisibility,
  applyScaleFromSlider,
  applyWireframe,
} from "./three/meshOperations";

const authState = createAuthState();
const viewerState = createViewerState();
const elements = getAppElements();
const sceneManager = new SceneManager(elements.viewer);

const authController = new AuthController(authState, viewerState, elements);
const checkpointManager = new CheckpointManager(
  viewerState,
  sceneManager,
  elements,
);
const loader = new ModelLoaderService(viewerState, sceneManager, elements, {
  onModelLoaded: () => authController.render(),
});

const modelController = new ModelController(
  viewerState,
  elements,
  authController,
  loader,
);
const viewerController = new ViewerController(
  viewerState,
  elements,
  sceneManager,
  authState,
);
const meshController = new MeshController(
  viewerState,
  elements,
  sceneManager,
  checkpointManager,
);
const exportController = new ExportController(viewerState, elements, authState);

authController.init();
modelController.init();
viewerController.init();
meshController.init();
exportController.init();

applyHelperVisibility(sceneManager, elements);
applyModelVisibility(viewerState, sceneManager, elements);
applyScaleFromSlider(viewerState, sceneManager, elements);
applyWireframe(viewerState, sceneManager, elements);

sceneManager.observeResize();
sceneManager.startAnimationLoop();
