import { Component, inject } from "@angular/core";
import { Router, RouterLink } from "@angular/router"; // 🌟 Agregamos RouterLink
import { AuthService } from "../../services";

@Component({
  selector: "app-navbar",
  templateUrl: "./navbar.component.html",
  imports: [RouterLink],
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  authService = inject(AuthService);
  private readonly router = inject(Router);

  // Exponemos la señal mapeada de tu servicio directamente
  public user = this.authService.currentUser;

  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(["/login"]);
      },
    });
  }
}
