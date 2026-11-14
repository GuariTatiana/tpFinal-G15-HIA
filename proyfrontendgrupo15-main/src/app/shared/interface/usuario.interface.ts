export interface UsuarioPerfil {
    nombre: string;
    apellido: string;
    email: string;
    rol: string;
    foto_perfil: string | null;
}

export interface PerfilResponse {
    usuario: UsuarioPerfil;
}