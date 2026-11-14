interface Reserva {
    id: number;
    jugador: string;
    cancha: string;
    fecha: string;
    horario: string;
    estado: "confirmada" | "pendiente" | "cancelada";
}
