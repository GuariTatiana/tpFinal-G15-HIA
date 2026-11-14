import { Component, inject, signal } from "@angular/core";
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { AuthService } from "../../shared/services";
import { Router, RouterLink } from "@angular/router";
import { environment } from "../../../environments/environment.development";

declare var google: any;

@Component({
  selector: "app-login",
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: "./login.component.html",
  styleUrl: "./login.component.css"
})
export default class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  public errorMessage = signal<string | null>(null);

  mostrarPassword = signal(false)

  loginForm = new FormGroup({
    email: new FormControl("", [Validators.required, Validators.email]),
    password: new FormControl("", [
      Validators.required,
      Validators.minLength(6),
    ]),
  });

  ngAfterViewInit(): void {
    this.inicializarGoogleSignIn();
  }

  togglePassword(): void {
    this.mostrarPassword.update(valor => !valor)
  }

  onLogin() {
    if (this.loginForm.invalid) return;

    this.errorMessage.set(null);
    const credentials = this.loginForm.getRawValue() as {
      email: string;
      password: string;
    };
    this.authService.login(credentials).subscribe({
      next: () => {
        this.router.navigate(["/inicio"]);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.error || "Error al iniciar sesión.");
      },
    });
  }

  private inicializarGoogleSignIn() {
    google.accounts.id.initialize({
      client_id: `${environment.googleClientId}`,
      callback: (response: any) => this.manejarRespuestaGoogle(response),
    });

    google.accounts.id.renderButton(document.getElementById("googleBtn"), {
      theme: "outline",
      size: "large",
      type: "standard",
      text: "signin_with",
    });
  }

  private manejarRespuestaGoogle(response: any) {
    if (response.credential) {
      this.authService.loginWithGoogle(response.credential).subscribe({
        next: () => {
          this.router.navigate(["/canchas"]);
        },
        error: (err) => {
          this.errorMessage.set(
            err.error?.error || "Error al autenticar con Google.",
          );
        },
      });
    }
  }
}
