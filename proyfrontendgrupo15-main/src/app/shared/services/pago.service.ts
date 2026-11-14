import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { environment } from "../../../environments/environment.development";
import { Observable } from "rxjs";

export interface CrearPreferenciaRequest {
    reserva_id: string;
    titulo_cancha: string;
    precio: number;
}

export interface CrearPreferenciaResponse {
    preference_id: string;
    linkDePago: string;
}


@Injectable({
    providedIn: 'root'
})

export class PagoService {
    private readonly http = inject(HttpClient)
    private basuUrl = environment.apiUrl;

    crearPreferencia(data: CrearPreferenciaRequest): Observable<CrearPreferenciaResponse> {
        return this.http.post<CrearPreferenciaResponse>(
            `${this.basuUrl}/pagos/crear-preferencia`,
            data,
            { withCredentials: true }
        )
    }
}