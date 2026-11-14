export interface UserRegisterInput {
  nombre: string;
  apellido: string;
  email: string;
  password?: string;
  rol: "admin" | "duenio" | "jugador";
}

export interface AuthResponse {
  msg?: string;
  usuario: {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
    rol: "admin" | "duenio" | "jugador";
    estado: boolean;
  };
}
