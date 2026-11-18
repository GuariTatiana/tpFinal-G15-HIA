import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { Cancha, CanchasComplejoResponse } from "../interface/cancha.interface";
import { environment } from "../../../environments/environment";

@Injectable({
    providedIn: 'root'
})

export class CanchaService {
    private http = inject(HttpClient);
    private baseApi = environment.apiUrl

    getCanchas(): Observable<Cancha[]> {
        return this.http.get<Cancha[]>(`${this.baseApi}/canchas`)
    }

    getCanchasPorComplejo(complejoId: string): Observable<CanchasComplejoResponse> {
        return this.http.get<CanchasComplejoResponse>(
            `${this.baseApi}/canchas/complejo/${complejoId}`,
            { withCredentials: true }
        )
    }

    crearCancha(credenciales: any): Observable<Cancha> {
        return this.http.post<Cancha>(`${this.baseApi}/canchas`, credenciales, {
            withCredentials: true
        })
    }
}