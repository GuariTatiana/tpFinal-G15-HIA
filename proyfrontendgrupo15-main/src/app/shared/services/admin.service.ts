import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { environment } from "../../../environments/environment.development";
import { Observable } from "rxjs";
import SolicitarDuenio from "../../features/jugador/solicitar-duenio/solicitar-duenio";

export interface CrearSolicitudDuenioRequest {
    nombre_complejo: string;
    direccion_complejo: string;
    provincia: string;
    telefono_contacto: string;
    mensaje?: string | null;
}

export interface UsuarioSolicitudDuenio {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    rol: "admin" | "duenio" | "jugador";
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
    usuario?: UsuarioSolicitudDuenio;
}

@Injectable({
    providedIn: 'root'
})

export class AdminService {
    private http = inject(HttpClient)
    private baseUrl = `${environment.apiUrl}/solicitudes-duenio`

    getSolicitudesAdmin(): Observable<{
        msg: string;
        solicitudes: SolicitudDuenio[];
    }> {
        return this.http.get<{ msg: string; solicitudes: SolicitudDuenio[] }>(
            `${this.baseUrl}/admin`,
            { withCredentials: true }
        );
    }

    aprobarSolicitud(id: string): Observable<{
        msg: string;
        solicitud: SolicitudDuenio;
        usuario: UsuarioSolicitudDuenio;
    }> {
        return this.http.patch<{
            msg: string;
            solicitud: SolicitudDuenio;
            usuario: UsuarioSolicitudDuenio;
        }>(
            `${this.baseUrl}/admin/${id}/aprobar`,
            {},
            { withCredentials: true }
        );
    }

    rechazarSolicitud(
        id: string,
        respuesta_admin: string
    ): Observable<{
        msg: string;
        solicitud: SolicitudDuenio;
    }> {
        return this.http.patch<{ msg: string; solicitud: SolicitudDuenio }>(
            `${this.baseUrl}/admin/${id}/rechazar`,
            { respuesta_admin },
            { withCredentials: true }
        );
    }
}
