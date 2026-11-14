import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SolicitudDuenio } from '../../../shared/services/solicitud-duenio.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-solicitar-duenio',
  imports: [ReactiveFormsModule],
  templateUrl: './solicitar-duenio.html',
  styleUrl: './solicitar-duenio.css'
})
export default class SolicitarDuenio implements OnInit {
  private router = inject(Router);
  private solicitudDuenioService = inject(SolicitudDuenio);

  isLoading = signal(false);

  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  solicitudActual = signal<SolicitudDuenio | null>(null);
  cargandoSolicitud = signal(false);


  solicitudForm = new FormGroup({
    nombre_complejo: new FormControl('', { validators: [Validators.required, Validators.minLength(3)], nonNullable: true }),
    direccion_complejo: new FormControl('', { validators: [Validators.required, Validators.minLength(5)], nonNullable: true }),
    provincia: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    telefono_contacto: new FormControl('', { validators: [Validators.required, Validators.minLength(6)], nonNullable: true }),
    mensaje: new FormControl('', { nonNullable: true })
  })

  ngOnInit(): void {

  }

  obtenerMisSolicitudes(): void {
    this.cargandoSolicitud.set(true);
    this.errorMessage.set(null);

    this.solicitudDuenioService.getMisSolicitudes().subscribe({
      next: (response) => {
        const ultimaSolicitud = response.solicitudes[0] ?? null;
        this.solicitudActual.set(ultimaSolicitud);
        this.cargandoSolicitud.set(false);
      },
      error: (err) => {
        console.error(err);
        this.cargandoSolicitud.set(false);
      },
    });
  }

  enviarSolicitud(): void {
    if (this.solicitudForm.invalid) {
      this.solicitudForm.markAllAsTouched();
      return;
    }

    const solicitud = this.solicitudActual();

    if (solicitud?.estado === "pendiente") {
      this.errorMessage.set("Ya tenés una solicitud pendiente de revisión.");
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const formValue = this.solicitudForm.getRawValue();

    const data = {
      nombre_complejo: formValue.nombre_complejo.trim(),
      direccion_complejo: formValue.direccion_complejo.trim(),
      provincia: formValue.provincia.trim(),
      telefono_contacto: formValue.telefono_contacto.trim(),
      mensaje: formValue.mensaje?.trim() || null,
    };

    this.solicitudDuenioService
      .crearSolicitud(data)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.successMessage.set(response.message);
          this.solicitudActual.set(response.solicitud);
          this.solicitudForm.reset();
        },
        error: (err) => {
          console.error("ERROR BACKEND:", err.error);

          this.errorMessage.set(
            err.error?.msg ||
            err.error?.error ||
            "No se pudo enviar la solicitud."
          );
        },
      });
  }

  volverAlPerfil(): void {
    this.router.navigate(["/perfil"]);
  }

  volverAlInicio(): void {
    this.router.navigate(["/inicio"]);
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case "pendiente":
        return "text-bg-warning";
      case "aprobada":
        return "text-bg-success";
      case "rechazada":
        return "text-bg-danger";
      default:
        return "text-bg-secondary";
    }
  }

}
