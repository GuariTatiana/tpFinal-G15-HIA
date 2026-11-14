import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CanchaService } from '../../../../shared/services/cancha.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-crear-cancha',
  imports: [ReactiveFormsModule],
  templateUrl: './crear-cancha.html',
  styleUrl: './crear-cancha.css'
})
export default class CrearCancha {
  private canchaService = inject(CanchaService);
  private router = inject(Router)
  private readonly route = inject(ActivatedRoute);


  isLoading = signal<boolean>(false)
  errorMessage = signal<string | null>(null)
  previewImage = signal<string | null>(null)

  complejoId = this.route.snapshot.paramMap.get("complejoId") ?? "";


  canchaForm = new FormGroup({
    nombre: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
    }),
    tipo: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    precio_hora: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
    duracion_turno: new FormControl<number | null>(60, {
      validators: [Validators.required, Validators.min(30)],
    }),
    estado: new FormControl(true, {
      nonNullable: true,
    }),
    foto: new FormControl<string | null>(null),
  });

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    if (!file.type.startsWith("image/")) {
      this.errorMessage.set("El archivo debe ser una imagen.");
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
      this.canchaForm.patchValue({
        foto: base64,
      });
    };

    reader.readAsDataURL(file);
  }

  guardarCancha(): void {
    if (this.canchaForm.invalid) {
      this.canchaForm.markAllAsTouched();
      return;
    }

    if (!this.complejoId) {
      this.errorMessage.set('No se encontro el complejo seleccionado')
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const formValue = this.canchaForm.getRawValue();

    const data = {
      nombre: formValue.nombre,
      tipo: formValue.tipo,
      precio_hora: Number(formValue.precio_hora),
      duracion_turno: Number(formValue.duracion_turno),
      estado: formValue.estado,
      foto: formValue.foto || null,
      complejo_id: this.complejoId,
    };

    this.canchaService.crearCancha(data).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(["/panel-duenio"])
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.error?.error || err.error?.msg || "No se pudo crear la cancha."
        );
      },
    })
  }

  cancelar(): void {
    this.router.navigate(["/panel-duenio"])
  }
}
