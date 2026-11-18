// Build de producción (Docker): la API se consume por ruta relativa y nginx
// la reenvía al backend. Así hay un solo origen (un único puerto/túnel HTTPS).
export const environment = {
  production: true,
  apiUrl: '/api',
  googleClientId:
    '777543051752-cfk4e9fs5ukva5o10sla0bchgmlsuaoc.apps.googleusercontent.com',
};
