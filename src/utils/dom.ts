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
  txValue: HTMLLabelElement | null;
  tyValue: HTMLLabelElement | null;
  tzValue: HTMLLabelElement | null;

  sxSlider: HTMLInputElement | null;
  sySlider: HTMLInputElement | null;
  szSlider: HTMLInputElement | null;
  txSlider: HTMLInputElement | null;
  tySlider: HTMLInputElement | null;
  tzSlider: HTMLInputElement | null;

}

function byId<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
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

    sxValue: byId<HTMLLabelElement>("sx-value"),
    syValue: byId<HTMLLabelElement>("sy-value"),
    szValue: byId<HTMLLabelElement>("sz-value"),
    txValue: byId<HTMLLabelElement>("tx-value"),
    tyValue: byId<HTMLLabelElement>("ty-value"),
    tzValue: byId<HTMLLabelElement>("tz-value"),

    sxSlider: byId<HTMLInputElement>("sigma-x"),
    sySlider: byId<HTMLInputElement>("sigma-y"),
    szSlider: byId<HTMLInputElement>("sigma-z"),
    txSlider: byId<HTMLInputElement>("tau-x"),
    tySlider: byId<HTMLInputElement>("tau-y"),
    tzSlider: byId<HTMLInputElement>("tau-z"),
  };
}
