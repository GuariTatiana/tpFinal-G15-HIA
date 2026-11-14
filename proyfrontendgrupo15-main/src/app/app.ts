import { Component, inject, OnInit } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { NavbarComponent } from "./shared/components/navbar/navbar.component";
import { AuthService } from "./shared/services";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: "./app.html",
  styleUrl: "./app.css",
})
export class App implements OnInit {
  public authService = inject(AuthService);

  ngOnInit() {
    this.authService.checkAuthStatus().subscribe();
  }
}
