import { Component, inject, signal } from "@angular/core";
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../shared/services";

type UserRole = "jugador" | "duenio" | "admin";

@Component({
  selector: "register-component",
  imports: [ReactiveFormsModule],
  templateUrl: "./register.component.html",
  styleUrl: "./register.component.css",
})
export default class RegisterComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  public errorMessage = signal<string | null>(null);
  public isLoading = signal<boolean>(false);

  previewImage = signal<string | null>(null);

  mostrarPassword = signal(false);

  togglePassword(): void {
    this.mostrarPassword.update(valor => !valor)
  }

  public rolesDisponibles = [
    { value: "jugador", label: "Jugador (Quiero reservar canchas)" },
  ];

  public registerForm = this.fb.group({
    nombre: ["", [Validators.required, Validators.minLength(2)]],
    apellido: ["", [Validators.required, Validators.minLength(2)]],
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(6)]],
    rol: ["jugador" as UserRole, [Validators.required]],
    foto_perfil: [""],
  });

  irAlLogin(): void {
    this.router.navigate(["/login"]);
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const datosRegistro = this.registerForm.getRawValue();

    this.authService.register(datosRegistro).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(["/inicio"]);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.error?.error || "Ocurrió un error inesperado al registrarse.",
        );
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    const formatosPermitidos = ["image/png", "image/jpeg", "image/webp"];

    if (!formatosPermitidos.includes(file.type)) {
      this.errorMessage.set("Solo se permiten imágenes PNG, JPG o WebP.");
      input.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.errorMessage.set("La imagen no puede superar los 2 MB.");
      input.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const base64 = reader.result as string;

      this.previewImage.set(base64);

      this.registerForm.patchValue({
        foto_perfil: base64,
      });

      this.errorMessage.set(null);
    };

    reader.readAsDataURL(file);
  }
}
