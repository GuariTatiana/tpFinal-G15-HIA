import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReservaService } from '../../../shared/services/reserva.service';

@Component({
  selector: 'app-dashboard-jugador',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard-jugador.html',
  styleUrl: './dashboard-jugador.css'
})
export default class DashboardJugador implements OnInit {

  private reservaService = inject(ReservaService);
  private router = inject(Router);

  canchaSeleccionada = signal<any | null>(null);

  constructor() {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      const state = navigation.extras.state as { cancha: any };
      if (state.cancha) {
        this.canchaSeleccionada.set(state.cancha);
      }
    }
  }

  seleccionarCancha(cancha: any) {
    this.canchaSeleccionada.set(cancha);
    this.buscarHorarios();
  }

  fechaElegida = signal<string>(new Date().toISOString().split('T')[0]);
  horariosDisponibles = signal<{ hora_inicio: string, hora_fin: string }[]>([]);
  horarioElegido = signal<{ hora_inicio: string, hora_fin: string } | null>(null);

  tiposCancha = ['Futbol 5', 'Futbol 7', 'Futbol 11'];
  tipoElegido = signal<string>('Futbol 5');

  ngOnInit(): void {
    this.buscarHorarios()
  }

  buscarHorarios() {
    const cancha = this.canchaSeleccionada();
    if (!cancha || !this.fechaElegida()) return;

    this.reservaService.getHorariosDisponibles(cancha.id, this.fechaElegida())
      .subscribe({
        next: (res) => {
          this.horariosDisponibles.set(res.horarios);
          this.horarioElegido.set(null);
        },
        error: (err) => console.error('Error al cargar horarios:', err)
      });
  }

  seleccionarHorario(horario: { hora_inicio: string, hora_fin: string }) {
    this.horarioElegido.set(horario);
  }

  seleccionarTipo(tipo: string) {
    this.tipoElegido.set(tipo);
  }

  cambiarFecha(event: any) {
    const nuevaFecha = event.target.value;
    this.fechaElegida.set(nuevaFecha);
    this.buscarHorarios();
  }

  reservar() {
    const horario = this.horarioElegido();
    if (!horario) return;

    // Estructura exacta que espera tu reserva.controllers.js
    const cancha = this.canchaSeleccionada();
    if (!cancha) return;

    const nuevaReserva = {
      cancha_id: cancha.id,
      fecha: this.fechaElegida(),
      hora_inicio: horario.hora_inicio,
      hora_fin: horario.hora_fin,
      monto_total: cancha.precio_hora
    };

    this.reservaService.crearReserva(nuevaReserva).subscribe({
      next: (res) => {
        alert('¡Turno reservado con éxito!');
        this.buscarHorarios();
      },
      error: (err) => {
        alert(err.error?.msg || 'Error al reservar');
      }
    });
  }

  abrirMapa(): void {
    const cancha = this.canchaSeleccionada();

    if (!cancha?.complejo) {
      alert("No hay datos de ubicación para esta cancha.");
      return;
    }

    const complejo = cancha.complejo;

    if (complejo.latitud && complejo.longitud) {
      const url = `https://www.google.com/maps?q=${complejo.latitud},${complejo.longitud}`;
      window.open(url, "_blank");
      return;
    }

    if (complejo.direccion) {
      const direccion = `${complejo.direccion}, ${complejo.provincia ?? ""}`;
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
      window.open(url, "_blank");
      return;
    }

    alert("Este complejo no tiene una ubicación cargada.");
  }
}
