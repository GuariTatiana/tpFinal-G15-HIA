export interface Complejo {
    id: string;
    nombre: string;
    direccion: string;
    provincia: string;
    telefono: string;
    latitud: string | null;
    longitud: string | null;
    hora_apertura: string;
    hora_cierre: string;
    estado: "pendiente" | "aprobado" | "suspendido";
    usuario_duenio: string;
}

// Interfaz principal para la Cancha
export interface Cancha {
    id: string;
    nombre: string;
    tipo: string;
    precio: string;
    duracion_turno: number;
    estado: boolean;
    complejo_id: string;
    foto: string;
    complejo?: Complejo;
    createdAt?: string;
    updatedAt?: string;
}

export interface Reserva {
    id: string;
    jugador_id: string;
    cancha_id: string;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    monto_total: number;
    estado: "pendiente" | "confirmada" | "cancelada" | "completada";
    pagada: boolean;
    createdAt?: string;
    updatedAt?: string;

    cancha?: {
        id: string;
        nombre: string;
        tipo: string;
        precio: number;
    };

    jugador?: {
        id: string;
        nombre: string;
        apellido: string;
        email: string;
    };
}

export interface ComplejosResponse {
    msg: string;
    complejos: Complejo[];
}

export interface ReservasComplejoResponse {
    msg: string;
    reservas: Reserva[];
}

export interface CanchasComplejoResponse {
    msg: string;
    canchas: Cancha[];
}