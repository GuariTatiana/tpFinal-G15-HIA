import { HttpClient } from "@angular/common/http";
import { inject, Injectable, signal } from "@angular/core";
import { environment } from "../../../environments/environment";
import { BehaviorSubject, catchError, filter, Observable, of, take, tap } from "rxjs";
import { AuthResponse } from "../interface/auth.interface";
import { PerfilResponse, UsuarioPerfil } from "../interface/usuario.interface";

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: "admin" | "duenio" | "jugador";
  estado: boolean;
  foto_perfil: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/auth`;
  private authChecked$ = new BehaviorSubject<boolean>(false)

  currentUser = signal<any | null>(null);
  isAuthenticated = signal<boolean>(false);

  //Login tradicional
  login(credenciales: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, credenciales, {
      withCredentials: true,
    }).pipe(
      tap((response) => {
        this.currentUser.set(response.usuario);
        this.isAuthenticated.set(true);
      })
    )
  }

  //Login con google
  loginWithGoogle(token: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/google-login`, { token }, {
      withCredentials: true,
    }).pipe(
      tap((response) => {
        this.currentUser.set(response.usuario);
        this.isAuthenticated.set(true);
      })
    )
  }

  checkAuthStatus(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/me`, { withCredentials: true }).pipe(
      tap((res) => {
        this.currentUser.set(res.user);
        this.isAuthenticated.set(true);
        this.authChecked$.next(true);
      }),
      catchError((err) => {
        this.currentUser.set(null);
        this.isAuthenticated.set(false);

        this.authChecked$.next(true);
        return of(null);
      })
    );
  }

  logout() {
    return this.http.post(`${this.baseUrl}/logout`, {}, { withCredentials: true }).pipe(
      tap(() => {
        this.currentUser.set(null);
        this.isAuthenticated.set(false);
      })
    )
  }

  get authReady$(): Observable<boolean> {
    return this.authChecked$.pipe(
      filter(checked => checked), // Solo emite cuando sea true
      take(1)
    );
  }

  // Registro de nuevo usuario
  register(datosRegistro: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/register`, datosRegistro, {
      withCredentials: true, // Fundamental para que el navegador guarde la cookie del JWT
    }).pipe(
      tap((response: any) => {
        // Usamos response.usuario para mantener la consistencia con el fix que hablamos antes
        this.currentUser.set(response.usuario);
        this.isAuthenticated.set(true);
      })
    );
  }

  getPerfil(): Observable<PerfilResponse> {
    return this.http.get<PerfilResponse>(`${this.baseUrl}/perfil`, { withCredentials: true })
  }

  actualizarFotoPerfil(foto_perfil: string) {
    return this.http.patch<{ message: string; usuario: UsuarioPerfil }>(
      `${this.baseUrl}/perfil/foto`,
      { foto_perfil },
      { withCredentials: true }
    )
  }

  getUsuarios(): Observable<{ message: string; usuarios: Usuario[] }> {
    return this.http.get<{ message: string; usuarios: Usuario[] }>(
      this.baseUrl,
      { withCredentials: true }
    )
  }
} 
