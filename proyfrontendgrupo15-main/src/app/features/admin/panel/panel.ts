import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminService, SolicitudDuenio } from '../../../shared/services/admin.service';
import { AuthService, Usuario } from '../../../shared/services';
import { ComplejoService } from '../../../shared/services/complejos.service';
import { Complejo } from '../../../shared/interface/cancha.interface';
import { ReservaService } from '../../../shared/services/reserva.service';

@Component({
  selector: 'app-panel',
  imports: [RouterLink],
  templateUrl: './panel.html',
  styleUrl: './panel.css'
})
export default class Panel implements OnInit {
  solicitudes = signal<SolicitudPreview[]>([])
  private adminService = inject(AdminService)
  private authService = inject(AuthService);
  private complejoService = inject(ComplejoService)
  private reservaService = inject(ReservaService)

  usuarios = signal<Usuario[]>([])
  complejos = signal<Complejo[]>([])
  reservas = signal<any>(null)


  isLoading = signal(false);
  accionLoadingId = signal<string | null>(null);

  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  totalUsuarios = signal(0);
  totalComplejos = signal(0);
  totalReservas = signal(0);
  ingresosMes = signal(845000);



  totalSolicitudesPendientes = computed(() =>
    this.solicitudes().filter((s) => s.estado === "pendiente").length
  );

  ngOnInit(): void {
    this.cargarSolicitudes();
    this.obtenerUsuarios();
    this.obtenerComplejos();
    this.obtenerReservas()
  }

  obtenerUsuarios(): void {
    this.authService.getUsuarios().subscribe({
      next: (response) => {
        this.usuarios.set(response.usuarios);
        this.totalUsuarios.set(this.usuarios().length)
      }
    })
  }

  obtenerReservas(): void {
    this.reservaService.getReservas().subscribe({
      next: (response) => {
        this.reservas.set(response.reservas);
        console.log(this.reservas());

        this.totalReservas.set(this.reservas().length)
      }
    })
  }

  obtenerComplejos(): void {
    this.complejoService.getComplejos().subscribe({
      next: (response) => {
        this.complejos.set(response.complejos);
        this.totalComplejos.set(this.complejos().length)
      }
    })
  }

  cargarSolicitudes(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.adminService.getSolicitudesAdmin().subscribe({
      next: (response) => {
        const mapped: SolicitudPreview[] = response.solicitudes.map((s: SolicitudDuenio) => ({
          id: s.id,
          usuario: s.usuario ? `${s.usuario.nombre} ${s.usuario.apellido}` : 'Usuario desconocido',
          email: s.usuario?.email || '',
          complejo: s.nombre_complejo,
          provincia: s.provincia,
          estado: s.estado,
          fecha: s.createdAt
        }));
        this.solicitudes.set(mapped);
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

  solicitudesVisibles = computed(() => {
    return this.solicitudes().slice(0, 4)
  })

  getEstadoClass(estado: SolicitudPreview["estado"]): string {
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

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(valor);
  }
}


interface SolicitudPreview {
  id: string;
  usuario: string;
  email: string;
  complejo: string;
  provincia: string;
  estado: "pendiente" | "aprobada" | "rechazada";
  fecha: string;
}
