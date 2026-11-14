import { Component, inject, signal, AfterViewInit, OnDestroy } from '@angular/core';
import { ComplejoService } from '../../../../shared/services/complejos.service';
import { Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import * as L from 'leaflet';

@Component({
  selector: 'app-crear-complejo',
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './crear-complejo.html',
  styleUrl: './crear-complejo.css'
})
export default class CrearComplejo implements AfterViewInit, OnDestroy {
  private complejoService = inject(ComplejoService);
  private router = inject(Router);

  errorMessage = signal<string | null>(null);
  isLoading = signal(false);


  private map: L.Map | undefined;
  private marker: L.Marker | undefined;

  complejoForm = new FormGroup({
    nombre: new FormControl('', [Validators.required, Validators.minLength(3)]),
    direccion: new FormControl('', Validators.required),
    provincia: new FormControl('', Validators.required),
    telefono: new FormControl('', Validators.required),
    latitud: new FormControl(''),
    longitud: new FormControl(''),
    hora_apertura: new FormControl("08:00", Validators.required),
    hora_cierre: new FormControl("23:00", Validators.required),
  });


  ngAfterViewInit(): void {
    this.iniciarMapa();
  }


  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private iniciarMapa(): void {

    this.map = L.map('mapa-complejo').setView([-24.1856, -65.2994], 13);


    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);


    const iconDefault = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });


    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;


      if (this.marker) {
        this.marker.setLatLng(e.latlng);
      } else {
        this.marker = L.marker(e.latlng, { icon: iconDefault }).addTo(this.map!);
      }


      this.complejoForm.patchValue({
        latitud: lat.toString(),
        longitud: lng.toString()
      });
    });
  }


  guardarComplejo(): void {
    if (this.complejoForm.invalid) {
      this.complejoForm.markAllAsTouched();
      return;
    }

    const formValue = this.complejoForm.getRawValue();
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const data = {
      ...formValue,
      latitud: formValue.latitud === "" ? null : Number(formValue.latitud),
      longitud: formValue.longitud === "" ? null : Number(formValue.longitud),
    };

    this.complejoService.createComplejo(data).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(["/panel"]);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.error?.error || "No se pudo crear el complejo."
        );
      },
    });
  }

  cancelar(): void {
    this.router.navigate(["/panel"]);
  }
}