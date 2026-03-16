import type { AppElements } from "../utils/dom";
import type { AuthState } from "../state/authState";

export function renderAuthUI(elements: AppElements, authState: AuthState): void {
  const { authStatus, loggedOutPanel, loggedInPanel, welcomeMsg } = elements;

  if (authStatus) {
    authStatus.textContent = authState.token
      ? `Logged in as ${authState.user ?? "user"}`
      : "Not logged in";
  }

  if (loggedOutPanel) loggedOutPanel.style.display = authState.token ? "none" : "";
  if (loggedInPanel) loggedInPanel.style.display = authState.token ? "" : "none";

  if (welcomeMsg) {
    welcomeMsg.textContent = authState.token
      ? `Welcome, ${authState.user ?? "User"}!`
      : "Welcome, User!";
  }
}

export function updateSaveButtonState(
  elements: AppElements,
  hasToken: boolean,
  hasLoadedModel: boolean,
): void {
  if (elements.btnSaveModel) {
    elements.btnSaveModel.disabled = !(hasToken && hasLoadedModel);
  }
}
