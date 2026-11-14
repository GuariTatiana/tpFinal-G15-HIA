import type { Routes } from '@angular/router';
import { authGuard, publicGuard } from './shared/services';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [publicGuard],
    loadComponent: () => import('./auth/login/login.component'),
  },
  {
    path: 'register',
    canActivate: [publicGuard],
    loadComponent: () => import('./auth/register/register.component'),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'inicio',
  },
  {
    path: 'inicio',
    loadComponent: () => import('./shared/components/home/home')
  },
  // Protegidas
  {
    path: 'perfil',
    canActivateChild: [authGuard],
    loadComponent: () => import('./features/perfil/perfil')
  },
  {
    path: 'panel',
    canActivateChild: [authGuard],
    loadComponent: () => import('./features/duenio/panel/panel')
  },
  {
    path: 'panel/crear-complejo',
    canActivateChild: [authGuard],
    loadComponent: () => import('./features/duenio/complejo/crear-complejo/crear-complejo')
  },

  {
    path: 'crear-cancha/:complejoId',
    canActivateChild: [authGuard],
    loadComponent: () => import('./features/duenio/complejo/crear-cancha/crear-cancha')
  },
  {
    path: 'solicitar-duenio',
    canActivateChild: [authGuard],
    loadComponent: () => import('./features/jugador/solicitar-duenio/solicitar-duenio')
  },
  {
    path: 'admin/solicitudes-duenio',
    canActivateChild: [authGuard],
    loadComponent: () => import('./features/admin/solicitudes/solicitudes')
  },
  {
    path: 'admin-panel',
    canActivateChild: [authGuard],
    loadComponent: () => import('./features/admin/panel/panel')
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/jugador/dashboard-jugador/dashboard-jugador'),
  },
  {
    path: '**',
    redirectTo: 'inicio',
  },
];
