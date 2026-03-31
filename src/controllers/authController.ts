import type { AuthState } from "../state/authState";
import type { ViewerState } from "../state/viewerState";
import type { AppElements } from "../utils/dom";
import { renderAuthUI, updateSaveButtonState } from "../views/authView";
import { setStatus } from "../views/statusView";
import {
  login,
  loginByKnownEmail,
  readStoredAuth,
  writeStoredAuth,
} from "../services/authService";
import { createUser } from "../services/userService";

/**
 * Controller responsible for authentication-related UI actions.
 *
 * This controller manages:
 * - restoring stored login state
 * - username/password login
 * - email-based login
 * - logout
 * - user creation
 * - re-rendering auth-dependent UI
 *
 * It also coordinates with viewer state so that actions like saving
 * a model are enabled only when the user is authenticated and a model
 * is currently loaded.
 */
export class AuthController {
  private readonly authState: AuthState;
  private readonly viewerState: ViewerState;
  private readonly elements: AppElements;

  /**
   * Creates a new AuthController.
   *
   * @param authState - Shared authentication state for the application
   * @param viewerState - Shared viewer state used to determine save availability
   * @param elements - Cached DOM references used by auth-related UI
   */
  constructor(
    authState: AuthState,
    viewerState: ViewerState,
    elements: AppElements,
  ) {
    this.authState = authState;
    this.viewerState = viewerState;
    this.elements = elements;
  }

  /**
   * Initializes authentication UI event handlers and restores
   * any previously saved authentication state from storage.
   *
   * Registered actions include:
   * - admin/dev login
   * - email login
   * - logout from either login section
   * - create user
   */
  public init(): void {
    const stored = readStoredAuth();
    this.authState.token = stored.token;
    this.authState.user = stored.user;
    this.render();

    this.elements.btnLogin?.addEventListener("click", async () => {
      const user = this.elements.loginUser?.value ?? "";
      const pass = this.elements.loginPass?.value ?? "";
      try {
        const response = await login(user, pass);
        if (!response?.token) {
          alert("Login response missing token");
          return;
        }
        this.setAuth(response.token, user);
        setStatus(this.elements.statusEl, "Login successful");
      } catch (error) {
        console.error("Login error", error);
        alert(`Login failed: ${String(error)}`);
      }
    });

    this.elements.loginBtnEmail?.addEventListener("click", async (event) => {
      event.preventDefault();
      const email = this.elements.emailInput?.value?.trim() ?? "";
      if (!email) {
        alert("Please enter an email");
        return;
      }
      try {
        const response = await loginByKnownEmail(email);
        if (!response?.token) {
          alert("No user found with that email");
          return;
        }
        this.setAuth(response.token, response.user?.email ?? email);
        setStatus(this.elements.statusEl, "Login successful");
      } catch (error) {
        console.error("Email login error", error);
        alert("Login request failed");
      }
    });

    this.elements.logoutBtnEmail?.addEventListener("click", (event) => {
      event.preventDefault();
      this.clearAuth();
      setStatus(this.elements.statusEl, "Logged out");
    });

    this.elements.btnLogout?.addEventListener("click", () => {
      this.clearAuth();
      setStatus(this.elements.statusEl, "Logged out");
    });

    this.elements.btnCreateUser?.addEventListener("click", async () => {
      const name = this.elements.newUserName?.value?.trim();
      const email = this.elements.newUserEmail?.value?.trim();
      if (!name || !email) {
        if (this.elements.createUserStatus) {
          this.elements.createUserStatus.textContent =
            "Name and email required";
        }
        return;
      }

      if (this.elements.createUserStatus) {
        this.elements.createUserStatus.textContent = "Creating...";
      }

      try {
        const result = await createUser(name, email);
        if (result.status === 201 && result.data) {
          if (this.elements.createUserStatus) {
            this.elements.createUserStatus.textContent = `Created: ${result.data.email}`;
          }
          if (this.elements.newUserName) this.elements.newUserName.value = "";
          if (this.elements.newUserEmail) this.elements.newUserEmail.value = "";
        } else if (result.status === 409) {
          if (this.elements.createUserStatus) {
            this.elements.createUserStatus.textContent = "Email already exists";
          }
        } else if (this.elements.createUserStatus) {
          this.elements.createUserStatus.textContent = `Failed: ${result.status} ${result.text}`;
        }
      } catch (error) {
        console.error("Create user failed", error);
        if (this.elements.createUserStatus) {
          this.elements.createUserStatus.textContent = "Create request failed";
        }
      }
    });
  }

  /**
   * Re-renders authentication-related UI and updates save button state.
   *
   * Save is enabled only when:
   * - a valid auth token exists
   * - a model has been loaded into the viewer
   */
  public render(): void {
    renderAuthUI(this.elements, this.authState);
    updateSaveButtonState(
      this.elements,
      !!this.authState.token,
      !!this.viewerState.lastLoadedFileName,
    );
  }

  /**
   * Returns the currently stored auth token.
   *
   * @returns JWT or login token, or null if not logged in
   */
  public getToken(): string | null {
    return this.authState.token;
  }

  /**
   * Writes authentication data to persistent storage, updates shared state,
   * re-renders the UI, and emits an application-wide auth change event.
   *
   * @param token - Newly issued auth token, or null to clear auth
   * @param username - Optional username or email associated with the token
   */
  private setAuth(token: string | null, username?: string | null): void {
    const next = writeStoredAuth(token, username);
    this.authState.token = next.token;
    this.authState.user = next.user;

    this.render();

    /**
     * Notify other controllers that authentication changed so they can
     * refresh protected UI such as saved model lists.
     */
    window.dispatchEvent(new CustomEvent("auth:changed"));
  }

  /**
   * Clears the current authentication state and stored credentials.
   */
  private clearAuth(): void {
    this.setAuth(null);
  }
}
