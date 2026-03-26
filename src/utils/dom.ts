export interface AppElements {
  viewer: HTMLDivElement;
  statusEl: HTMLDivElement | null;
  fileInput: HTMLInputElement | null;
  gridToggle: HTMLInputElement | null;
  modelToggle: HTMLInputElement | null;
  wireToggle: HTMLInputElement | null;
  scaleSlider: HTMLInputElement | null;
  resetCamBtn: HTMLButtonElement | null;
  bgColorPicker: HTMLInputElement | null;
  modelColorPicker: HTMLInputElement | null;

  reduceTargetSelect: HTMLSelectElement | null;
  controlPercent: HTMLElement | null;
  controlBudget: HTMLElement | null;
  meshSlider: HTMLInputElement | null;
  meshValue: HTMLElement | null;
  budgetInput: HTMLInputElement | null;
  btnApplyBudget: HTMLElement | null;
  btnSubdivision: HTMLButtonElement | null;
  subdivisionEdgeSlider: HTMLInputElement | null;
  subdivisionEdgeValue: HTMLElement | null;
  subdivisionIterInput: HTMLInputElement | null;
  originalCountLabel: HTMLElement | null;
  polyCountLabel: HTMLElement | null;

  btnSaveCheckpoint: HTMLButtonElement | null;
  btnRestoreCheckpoint: HTMLButtonElement | null;
  btnToggleCheckpoint: HTMLButtonElement | null;
  checkpointStatus: HTMLElement | null;
  btnStressAnalysis: HTMLElement | null;

  btnExportGLB: HTMLElement | null;
  btnExportOBJ: HTMLElement | null;
  exportBtn: HTMLButtonElement | null;

  loginUser: HTMLInputElement | null;
  loginPass: HTMLInputElement | null;
  btnLogin: HTMLButtonElement | null;
  btnLogout: HTMLButtonElement | null;
  btnSaveModel: HTMLButtonElement | null;
  authStatus: HTMLElement | null;

  emailInput: HTMLInputElement | null;
  newModelNameInput: HTMLInputElement | null;
  loginBtnEmail: HTMLButtonElement | null;
  logoutBtnEmail: HTMLButtonElement | null;
  loggedOutPanel: HTMLElement | null;
  loggedInPanel: HTMLElement | null;
  welcomeMsg: HTMLElement | null;
  btnLocalSave: HTMLButtonElement | null;

  newUserName: HTMLInputElement | null;
  newUserEmail: HTMLInputElement | null;
  btnCreateUser: HTMLButtonElement | null;
  createUserStatus: HTMLElement | null;

  sxValue: HTMLLabelElement | null;
  syValue: HTMLLabelElement | null;
  szValue: HTMLLabelElement | null;
  txyValue: HTMLLabelElement | null;
  tyzValue: HTMLLabelElement | null;
  txzValue: HTMLLabelElement | null;

  sxSlider: HTMLInputElement | null;
  sySlider: HTMLInputElement | null;
  szSlider: HTMLInputElement | null;
  txySlider: HTMLInputElement | null;
  tyzSlider: HTMLInputElement | null;
  txzSlider: HTMLInputElement | null;

  loadCaseSelector: HTMLSelectElement | null;
  loadCaseValue: HTMLSpanElement | null;

  shapeButtons: HTMLCollectionOf<HTMLButtonElement> | null;
}

function byId<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function byClass<T extends HTMLElement>(className: string): HTMLCollectionOf<T>  | null {
  return document.getElementsByClassName(className) as HTMLCollectionOf<T> |  null;
}


export function getRequiredElement<T extends HTMLElement>(id: string): T {
  const element = byId<T>(id);
  if (!element) {
    throw new Error(`Missing required element: #${id}`);
  }
  return element;
}

export function getAppElements(): AppElements {
  return {
    viewer: getRequiredElement<HTMLDivElement>("viewer"),
    statusEl: byId<HTMLDivElement>("status"),
    fileInput: byId<HTMLInputElement>("fileInput"),
    gridToggle: byId<HTMLInputElement>("gridToggle"),
    modelToggle: byId<HTMLInputElement>("modelToggle"),
    wireToggle: byId<HTMLInputElement>("wireToggle"),
    scaleSlider: byId<HTMLInputElement>("scale"),
    resetCamBtn: byId<HTMLButtonElement>("resetCam"),
    bgColorPicker: byId<HTMLInputElement>("bgColorPicker"),
    modelColorPicker: byId<HTMLInputElement>("modelColorPicker"),

    reduceTargetSelect: byId<HTMLSelectElement>("reduceTargetMode"),
    controlPercent: byId("control-percentage"),
    controlBudget: byId("control-budget"),
    meshSlider: byId<HTMLInputElement>("meshDensitySlider"),
    meshValue: byId("meshDensityValue"),
    budgetInput: byId<HTMLInputElement>("polyBudgetInput"),
    btnApplyBudget: byId("btnApplyBudget"),
    btnSubdivision: byId<HTMLButtonElement>("btnSubdivision"),
    subdivisionEdgeSlider: byId<HTMLInputElement>("subdivisionEdgeSlider"),
    subdivisionEdgeValue: byId("subdivisionEdgeValue"),
    subdivisionIterInput: byId<HTMLInputElement>("subdivisionIterInput"),
    originalCountLabel: byId("originalCountLabel"),
    polyCountLabel: byId("polyCount"),

    btnSaveCheckpoint: byId<HTMLButtonElement>("btnSaveCheckpoint"),
    btnRestoreCheckpoint: byId<HTMLButtonElement>("btnRestoreCheckpoint"),
    btnToggleCheckpoint: byId<HTMLButtonElement>("btnToggleCheckpoint"),
    checkpointStatus: byId("checkpointStatus"),
    btnStressAnalysis: byId("btnStressAnalysis"),

    btnExportGLB: byId("btnExportGLB"),
    btnExportOBJ: byId("btnExportOBJ"),
    exportBtn: byId<HTMLButtonElement>("DbButton"),

    btnLocalSave: byId("btnLocalSave"),

    loginUser: byId<HTMLInputElement>("loginUser"),
    loginPass: byId<HTMLInputElement>("loginPass"),
    btnLogin: byId<HTMLButtonElement>("btnLogin"),
    btnLogout: byId<HTMLButtonElement>("btnLogout"),
    btnSaveModel: byId<HTMLButtonElement>("btnSaveModel"),
    authStatus: byId("authStatus"),

    emailInput: byId<HTMLInputElement>("email"),
    newModelNameInput: byId<HTMLInputElement>("newModelName"),
    loginBtnEmail: byId<HTMLButtonElement>("loginBtn"),
    logoutBtnEmail: byId<HTMLButtonElement>("logoutBtn"),
    loggedOutPanel: byId("loggedOutPannel"),
    loggedInPanel: byId("loggedInPannel"),
    welcomeMsg: byId("welcomeMsg"),

    newUserName: byId<HTMLInputElement>("newUserName"),
    newUserEmail: byId<HTMLInputElement>("newUserEmail"),
    btnCreateUser: byId<HTMLButtonElement>("btnCreateUser"),
    createUserStatus: byId("createUserStatus"),

    sxValue: byId<HTMLLabelElement>("sx-val"),
    syValue: byId<HTMLLabelElement>("sy-val"),
    szValue: byId<HTMLLabelElement>("sz-val"),
    txyValue: byId<HTMLLabelElement>("txy-val"),
    tyzValue: byId<HTMLLabelElement>("tyz-val"),
    txzValue: byId<HTMLLabelElement>("txz-val"),

    sxSlider: byId<HTMLInputElement>("sigma-x"),
    sySlider: byId<HTMLInputElement>("sigma-y"),
    szSlider: byId<HTMLInputElement>("sigma-z"),
    txySlider: byId<HTMLInputElement>("tau-xy"),
    tyzSlider: byId<HTMLInputElement>("tau-yz"),
    txzSlider: byId<HTMLInputElement>("tau-xz"),

    loadCaseSelector: byId<HTMLSelectElement>("load-case"),
    loadCaseValue: byId<HTMLSpanElement>("load-case-val"),

    shapeButtons: byClass<HTMLButtonElement>("shape-buttons")
  };
}
