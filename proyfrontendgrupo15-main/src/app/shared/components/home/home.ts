import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CanchaService } from '../../services/cancha.service';
import { Cancha } from '../../interface/cancha.interface';
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
    this.canchaService.getCanchas().subscribe({
      next: (response: Cancha[]) => {
        this.canchas.set(response)
      },
      error: (e) => {
        console.error('Error al obtener las canchas', e);
      }
    })
  }

}
