import { inject } from "@angular/core";
import { type CanActivateFn, Router } from "@angular/router";
import { map } from "rxjs";
import { AuthService } from "../services/auth.service";

export const publicGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.authReady$.pipe(
    map(() => {
      if (authService.isAuthenticated()) {
        return router.createUrlTree(["/inicio"]);
      }
      return true;
    }),
  );
};
