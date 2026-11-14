import { CommonModule } from "@angular/common";
import { Component, computed, inject, OnInit, signal } from "@angular/core";
import { Router } from "@angular/router";
import { finalize } from "rxjs";
import { ComplejoService } from "../../../shared/services/complejos.service";
import { CanchaService } from "../../../shared/services/cancha.service";
import { ReservaService } from "../../../shared/services/reserva.service";

import { Reserva, Cancha, Complejo } from "../../../shared/interface/cancha.interface";

@Component({
  selector: "app-duenio-panel",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./panel.html",
  styleUrl: "./panel.css",
})
export default class Panel implements OnInit {
  private readonly complejoService = inject(ComplejoService);
  private readonly canchaService = inject(CanchaService);
  private readonly reservaService = inject(ReservaService);
  private readonly router = inject(Router);

  complejos = signal<Complejo[]>([]);
  canchas = signal<Cancha[]>([]);
  reservas = signal<Reserva[]>([]);

  complejoSeleccionadoId = signal<string>("");

  cargandoComplejos = signal(false);
  cargandoCanchas = signal(false);
  cargandoReservas = signal(false);

  errorMessage = signal<string | null>(null);

  complejoSeleccionado = computed(() => {
    return (
      this.complejos().find(
        (complejo) => complejo.id === this.complejoSeleccionadoId()
      ) ?? null
    );
  });

  reservasTotales = computed(() => this.reservas().length);

  reservasConfirmadas = computed(() =>
    this.reservas().filter((r) => r.estado === "confirmada").length
  );

  reservasPendientes = computed(() =>
    this.reservas().filter((r) => r.estado === "pendiente").length
  );

  ingresosTotales = computed(() =>
    this.reservas()
      .filter(
        (r) =>
          r.estado === "confirmada" ||
          r.estado === "completada"
      )
      .reduce((total, r) => total + Number(r.monto_total), 0)
  );

  pendientesDePago = computed(() =>
    this.reservas()
      .filter((r) => r.estado === "pendiente")
      .reduce((total, r) => total + Number(r.monto_total), 0)
  );

  horasReservadas = computed(() => {
    return this.reservas()
      .filter(
        (r) =>
          r.estado === "confirmada" ||
          r.estado === "completada"
      )
      .reduce((total, r) => {
        const inicio = this.horaToMinutos(r.hora_inicio);
        const fin = this.horaToMinutos(r.hora_fin);

        if (fin <= inicio) return total;

        return total + (fin - inicio) / 60;
      }, 0);
  });

  canchasActivas = computed(() =>
    this.canchas().filter((cancha) => cancha.estado).length
  );

  reservasRecientes = computed(() => {
    return [...this.reservas()]
      .sort((a, b) => {
        const fechaA = `${a.fecha} ${a.hora_inicio}`;
        const fechaB = `${b.fecha} ${b.hora_inicio}`;
        return fechaB.localeCompare(fechaA);
      })
      .slice(0, 5);
  });

  ngOnInit(): void {
    this.obtenerComplejos();
  }

  obtenerComplejos(): void {
    this.cargandoComplejos.set(true);
    this.errorMessage.set(null);

    this.complejoService
      .getMisComplejos()
      .pipe(finalize(() => this.cargandoComplejos.set(false)))
      .subscribe({
        next: (response) => {
          this.complejos.set(response.complejos);

          if (response.complejos.length > 0) {
            const primerComplejoId = response.complejos[0].id;

            this.complejoSeleccionadoId.set(primerComplejoId);
            this.obtenerDatosDelComplejo(primerComplejoId);
          }
        },
        error: (err) => {
          console.error(err);
          this.errorMessage.set("No se pudieron cargar los complejos.");
        },
      });
  }

  obtenerDatosDelComplejo(complejoId: string): void {
    this.obtenerCanchas(complejoId);
    this.obtenerReservas(complejoId);
  }

  obtenerCanchas(complejoId: string): void {
    this.cargandoCanchas.set(true);

    this.canchaService
      .getCanchasPorComplejo(complejoId)
      .pipe(finalize(() => this.cargandoCanchas.set(false)))
      .subscribe({
        next: (response) => {
          this.canchas.set(response.canchas);
        },
        error: (err) => {
          console.error(err);
          this.errorMessage.set("No se pudieron cargar las canchas.");
        },
      });
  }

  obtenerReservas(complejoId: string): void {
    this.cargandoReservas.set(true);

    this.reservaService
      .getReservasPorComplejo(complejoId)
      .pipe(finalize(() => this.cargandoReservas.set(false)))
      .subscribe({
        next: (response) => {
          this.reservas.set(response.reservas);
        },
        error: (err) => {
          console.error(err);
          this.errorMessage.set("No se pudieron cargar las reservas.");
        },
      });
  }

  onComplejoChange(event: Event): void {
    const complejoId = (event.target as HTMLSelectElement).value;

    this.complejoSeleccionadoId.set(complejoId);
    this.obtenerDatosDelComplejo(complejoId);
  }

  agregarComplejo(): void {
    this.router.navigate(["/panel/crear-complejo"]);
  }

  agregarCancha(): void {
    const complejoId = this.complejoSeleccionadoId();

    if (!complejoId) {
      this.errorMessage.set("Seleccioná un complejo antes de agregar una cancha.");
      return;
    }

    this.router.navigate(["/crear-cancha", complejoId]);
  }

  verReservas(): void {
    console.log("Ver todas las reservas");
  }

  editarCancha(canchaId: string): void {
    console.log("Editar cancha:", canchaId);
  }

  private horaToMinutos(hora: string): number {
    const [horas, minutos] = hora.split(":").map(Number);
    return horas * 60 + minutos;
  }
}