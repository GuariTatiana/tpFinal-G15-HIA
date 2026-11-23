import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CanchaService } from '../../services/cancha.service';
import { Cancha, CanchasPaginadasResponse } from '../../interface/cancha.interface';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export default class Home implements OnInit {
  private canchaService = inject(CanchaService)
  authService = inject(AuthService)
  canchas = signal<Cancha[]>([]);
  paginaActual = signal<number>(1);
  totalPaginas = signal<number>(1);
  totalCanchas = signal<number>(0);
  limite = 20;

  nombreFiltro = signal<string>('');
  tipoFiltro = signal<string>('');

  canfchasFiltradas = computed(() => {
    const nombre = this.nombreFiltro().toLowerCase();
    const tipo = this.tipoFiltro().toLowerCase();

    return this.canchas().filter(cancha =>
      cancha.nombre.toLowerCase().includes(nombre) &&
      cancha.tipo.toLowerCase().includes(tipo)
    )
  })

  ngOnInit(): void {
    this.obtenerCanchas()
  }

  obtenerCanchas() {
    this.canchaService.getCanchas(this.paginaActual(), this.limite).subscribe({
      next: (response: CanchasPaginadasResponse) => {
        this.canchas.set(response.canchas)
        this.totalCanchas.set(response.total)
        this.totalPaginas.set(response.totalPages)
      },
      error: (e) => {
        console.error('Error al obtener las canchas', e);
      }
    })
  }

  paginaAnterior() {
    if (this.paginaActual() > 1) {
      this.paginaActual.update(p => p - 1);
      this.obtenerCanchas();
    }
  }

  paginaSiguiente() {
    if (this.paginaActual() < this.totalPaginas()) {
      this.paginaActual.update(p => p + 1);
      this.obtenerCanchas();
    }
  }

  irAPagina(pagina: number) {
    if (pagina >= 1 && pagina <= this.totalPaginas()) {
      this.paginaActual.set(pagina);
      this.obtenerCanchas();
    }
  }
}
