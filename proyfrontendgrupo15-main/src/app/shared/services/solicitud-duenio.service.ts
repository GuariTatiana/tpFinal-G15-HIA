import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { environment } from "../../../environments/environment.development";
import { Observable } from "rxjs";

export interface CrearSolicitudDuenioRequest {
    nombre_complejo: string;
    direccion_complejo: string;
    provincia: string;
    telefono_contacto: string;
    mensaje?: string | null;
}

export interface SolicitudDuenio {
    id: string;
    usuario_id: string;
    nombre_complejo: string;
    direccion_complejo: string;
    provincia: string;
    telefono_contacto: string;
    mensaje: string | null;
    estado: "pendiente" | "aprobada" | "rechazada";
    respuesta_admin: string | null;
    fecha_respuesta: string | null;
    createdAt: string;
    updatedAt: string;
}

@Injectable({
    providedIn: 'root'
})



export class SolicitudDuenio {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrl}/solicitudes-duenio`;

    crearSolicitud(data: CrearSolicitudDuenioRequest): Observable<{
        message: string;
        solicitud: SolicitudDuenio;
    }> {
        return this.http.post<{ message: string, solicitud: SolicitudDuenio }>(
            this.baseUrl,
            data,
            { withCredentials: true }
        )
    }

    getMisSolicitudes(): Observable<{
        msg: string;
        solicitudes: SolicitudDuenio[];
    }> {
        return this.http.get<{ msg: string; solicitudes: SolicitudDuenio[] }>(
            `${this.baseUrl}/mis-solicitudes`,
            { withCredentials: true }
        );
    }
}