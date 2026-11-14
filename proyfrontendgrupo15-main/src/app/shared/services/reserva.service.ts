import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { environment } from "../../../environments/environment.development";
import { Observable } from "rxjs";
import { ReservasComplejoResponse } from "../interface/cancha.interface";

@Injectable({
    providedIn: 'root'
})

export class ReservaService {
    private http = inject(HttpClient);
    private baseUrl = environment.apiUrl;

    getHorariosDisponibles(canchaId: string, fecha: string): Observable<{ msg: string, horarios: any[] }> {
        return this.http.get<any>(`${this.baseUrl}/reservas/cancha/${canchaId}/horarios?fecha=${fecha}`, {
            withCredentials: true
        });
    }

    crearReserva(datosReserva: { cancha_id: string, fecha: string, hora_inicio: string, hora_fin: string, monto_total: number }): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/reservas`, datosReserva, {
            withCredentials: true
        });
    }

    buscarCanchasPorNombre(nombre: string): Observable<{ canchas: any[] }> {
        return this.http.get<{ canchas: any[] }>(`${this.baseUrl}/canchas/buscar?nombre=${nombre}`, {
            withCredentials: true
        });
    }
    getMisReservas(): Observable<any> {
        return this.http.get<any>(`${this.baseUrl}/reservas/mis-reservas`, {
            withCredentials: true
        });
    }

    getReservasPorComplejo(complejoId: string): Observable<ReservasComplejoResponse> {
        return this.http.get<ReservasComplejoResponse>(
            `${this.baseUrl}/reservas/complejo/${complejoId}`,
            { withCredentials: true }
        )
    }

    getReservas(): Observable<any> {
        return this.http.get<any>(`${this.baseUrl}/reservas`,
            { withCredentials: true }
        )
    }

}