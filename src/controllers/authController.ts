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

export class AuthController {
  constructor(
    private readonly authState: AuthState,
    private readonly viewerState: ViewerState,
    private readonly elements: AppElements,
  ) {}

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
        const exists = await loginByKnownEmail(email);
        if (!exists) {
          alert("No user found with that email");
          return;
        }
        this.setAuth(`devemail-${Date.now()}`, email);
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
          this.elements.createUserStatus.textContent = "Name and email required";
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

  public render(): void {
    renderAuthUI(this.elements, this.authState);
    updateSaveButtonState(
      this.elements,
      !!this.authState.token,
      !!this.viewerState.lastLoadedFileName,
    );
  }

  public getToken(): string | null {
    return this.authState.token;
  }

  private setAuth(token: string | null, username?: string | null): void {
    const next = writeStoredAuth(token, username);
    this.authState.token = next.token;
    this.authState.user = next.user;
    this.render();
  }

  private clearAuth(): void {
    this.setAuth(null);
  }
}
