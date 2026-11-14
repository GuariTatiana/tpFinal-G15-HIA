import { Component, computed, inject, signal } from '@angular/core';
import { AdminService, SolicitudDuenio } from '../../../shared/services/admin.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-solicitudes',
  imports: [CommonModule, FormsModule],
  templateUrl: './solicitudes.html',
  styleUrl: './solicitudes.css'
})
export default class Solicitudes {
  private readonly solicitudService = inject(AdminService);

  solicitudes = signal<SolicitudDuenio[]>([]);
  isLoading = signal(false);
  accionLoadingId = signal<string | null>(null);

  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  filtroEstado = signal<"todas" | "pendiente" | "aprobada" | "rechazada">(
    "todas"
  );

  solicitudSeleccionada = signal<SolicitudDuenio | null>(null);
  respuestaAdmin = signal("");

  solicitudesFiltradas = computed(() => {
    const estado = this.filtroEstado();

    if (estado === "todas") {
      return this.solicitudes();
    }

    return this.solicitudes().filter((s) => s.estado === estado);
  });

  totalPendientes = computed(
    () => this.solicitudes().filter((s) => s.estado === "pendiente").length
  );

  totalAprobadas = computed(
    () => this.solicitudes().filter((s) => s.estado === "aprobada").length
  );

  totalRechazadas = computed(
    () => this.solicitudes().filter((s) => s.estado === "rechazada").length
  );

  ngOnInit(): void {
    this.cargarSolicitudes();
  }

  cargarSolicitudes(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.solicitudService.getSolicitudesAdmin().subscribe({
      next: (response) => {
        this.solicitudes.set(response.solicitudes);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage.set(
          err.error?.msg || "No se pudieron cargar las solicitudes."
        );
        this.isLoading.set(false);
      },
    });
  }

  cambiarFiltro(
    estado: "todas" | "pendiente" | "aprobada" | "rechazada"
  ): void {
    this.filtroEstado.set(estado);
  }

  aprobarSolicitud(solicitud: SolicitudDuenio): void {
    const confirmar = confirm(
      `¿Seguro que querés aprobar la solicitud de ${solicitud.usuario?.nombre ?? "este usuario"}?`
    );

    if (!confirmar) return;

    this.accionLoadingId.set(solicitud.id);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.solicitudService.aprobarSolicitud(solicitud.id).subscribe({
      next: (response) => {
        this.successMessage.set(response.msg);
        this.actualizarSolicitudEnLista(response.solicitud);
        this.accionLoadingId.set(null);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage.set(
          err.error?.msg || "No se pudo aprobar la solicitud."
        );
        this.accionLoadingId.set(null);
      },
    });
  }

  abrirModalRechazo(solicitud: SolicitudDuenio): void {
    this.solicitudSeleccionada.set(solicitud);
    this.respuestaAdmin.set("");
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  cerrarModalRechazo(): void {
    this.solicitudSeleccionada.set(null);
    this.respuestaAdmin.set("");
  }

  confirmarRechazo(): void {
    const solicitud = this.solicitudSeleccionada();

    if (!solicitud) return;

    this.accionLoadingId.set(solicitud.id);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const respuesta =
      this.respuestaAdmin().trim() ||
      "Solicitud rechazada por el administrador.";

    this.solicitudService.rechazarSolicitud(solicitud.id, respuesta).subscribe({
      next: (response) => {
        this.successMessage.set(response.msg);
        this.actualizarSolicitudEnLista(response.solicitud);
        this.accionLoadingId.set(null);
        this.cerrarModalRechazo();
      },
      error: (err) => {
        console.error(err);
        this.errorMessage.set(
          err.error?.msg || "No se pudo rechazar la solicitud."
        );
        this.accionLoadingId.set(null);
      },
    });
  }

  actualizarSolicitudEnLista(solicitudActualizada: SolicitudDuenio): void {
    this.solicitudes.update((solicitudes) =>
      solicitudes.map((s) =>
        s.id === solicitudActualizada.id
          ? { ...s, ...solicitudActualizada }
          : s
      )
    );
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

  formatearFecha(fecha: string | null): string {
    if (!fecha) return "Sin fecha";

    return new Date(fecha).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
}
