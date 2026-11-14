import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../shared/services';
import { ReservaService } from '../../shared/services/reserva.service';
import { PagoService } from '../../shared/services/pago.service';
import { Reserva } from '../../shared/interface/cancha.interface';

@Component({
  selector: 'app-perfil',
  imports: [ReactiveFormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export default class Perfil implements OnInit {
  private authService = inject(AuthService);
  private reservaService = inject(ReservaService);
  private pagoService = inject(PagoService)

  usuario = signal<any>(null);
  reservas = signal<any[]>([]);
  cargandoReservas = signal<boolean>(true);

  reservaPagandoId = signal<string | null>(null)
  errorPago = signal<string | null>(null)


  //Editar foto
  modalFotoAbierto = signal(false)
  previewFoto = signal<string | null>(null)
  fotoSeleccionada = signal<string | null>(null)

  guardandoFoto = signal(false);
  errorFoto = signal<string | null>(null);

  ngOnInit(): void {
    this.cargarPerfil();
    this.cargarReservas();
  }

  cargarPerfil(): void {
    this.authService.getPerfil().subscribe({
      next: (response) => {
        this.usuario.set(response.usuario);
        console.log("Datos del usuario logueado:", this.usuario());
      },
      error: (e) => {
        console.error("Error al cargar perfil:", e);
      }
    });
  }

  abrirModalFoto(): void {
    this.errorFoto.set(null);
    this.fotoSeleccionada.set(null);
    this.previewFoto.set(this.usuario()?.foto_perfil ?? null);
    this.modalFotoAbierto.set(true);
  }

  cerrarModalFoto(): void {
    this.modalFotoAbierto.set(false);
    this.errorFoto.set(null);
    this.fotoSeleccionada.set(null);
    this.previewFoto.set(null);
  }

  onFotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    const formatosPermitidos = ["image/png", "image/jpeg", "image/webp"];

    if (!formatosPermitidos.includes(file.type)) {
      this.errorFoto.set("Solo se permiten imágenes PNG, JPG o WebP.");
      input.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.errorFoto.set("La imagen no puede superar los 2 MB.");
      input.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const base64 = reader.result as string;

      this.previewFoto.set(base64);
      this.fotoSeleccionada.set(base64);
      this.errorFoto.set(null);
    };

    reader.readAsDataURL(file);
  }

  guardarFotoPerfil(): void {
    const foto = this.fotoSeleccionada();

    if (!foto) {
      this.errorFoto.set("Seleccioná una imagen antes de guardar.");
      return;
    }

    this.guardandoFoto.set(true);
    this.errorFoto.set(null);

    this.authService.actualizarFotoPerfil(foto).subscribe({
      next: (response) => {
        this.usuario.set(response.usuario);
        this.guardandoFoto.set(false);
        this.cerrarModalFoto();
      },
      error: (err) => {
        this.guardandoFoto.set(false);
        this.errorFoto.set(
          err.error?.error || "No se pudo actualizar la foto de perfil."
        );
      },
    });
  }

  cargarReservas(): void {
    this.reservaService.getMisReservas().subscribe({
      next: (response) => {
        const data = Array.isArray(response) ? response : (response.reservas ?? response.data ?? []);
        this.reservas.set(data);
        this.cargandoReservas.set(false);
        console.log(this.reservas());

      },
      error: (e) => {
        console.error("Error al cargar reservas:", e);
        this.cargandoReservas.set(false);
      }
    });
  }

  pagarReserva(reserva: Reserva): void {
    this.errorPago.set(null);
    this.reservaPagandoId.set(reserva.id)

    const tituloCancha = reserva.cancha?.nombre
      ? `Reserva ${reserva.cancha.nombre}`
      : "Reserva de cancha";

    const data = {
      reserva_id: reserva.id,
      titulo_cancha: tituloCancha,
      precio: Number(reserva.monto_total),
    };

    this.pagoService.crearPreferencia(data).subscribe({
      next: (response) => {
        this.reservaPagandoId.set(null);

        if (response.linkDePago) {
          window.location.href = response.linkDePago;
        } else {
          this.errorPago.set('No se recibio el link de pago')
        }
      },
      error: (err) => {
        this.reservaPagandoId.set(null);

        this.errorPago.set(
          err.error?.msg ||
          err.error?.error ||
          "No se pudo iniciar el pago."
        );

        console.error(err);
      }
    })
  }

  getBadgeClass(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'confirmada':
        return 'text-bg-success';
      case 'pendiente':
        return 'text-bg-warning';
      case 'cancelada':
        return 'text-bg-danger';
      case 'completada':
        return 'text-bg-secondary';
      default:
        return 'text-bg-light';
    }
  }

  mostrarTodasReservas = signal(false);

  reservasVisibles = computed(() => {
    return this.mostrarTodasReservas()
      ? this.reservas()
      : this.reservas().slice(0, 3);
  });

  toggleReservas(): void {
    this.mostrarTodasReservas.update(valor => !valor);
  }

}
