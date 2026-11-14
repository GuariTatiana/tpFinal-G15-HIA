# Backend - Sistema de Reservas de Canchas

Backend para el sistema de reservas de canchas deportivas. API REST construida con Express, PostgreSQL y Sequelize.

## Tecnologías

- Node.js
- Express
- PostgreSQL
- Sequelize ORM
- JWT (autenticación)
- bcrypt (hash de contraseñas)
- Swagger (documentación)

## Configuración

1. Copiar el archivo `.env.example` a `.env`:
```bash
cp .env.example .env
```

2. Configurar las variables de entorno en `.env`:
```
DB_NAME=canchas_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
JWT_SECRET=SECRET_KEY_CANCHAS_2026
PORT=3000
NODE_ENV=development
```

3. Instalar dependencias:
```bash
npm install
```

4. Iniciar el servidor:
```bash
npm start
# O en modo desarrollo con hot reload:
npm run dev
```

El servidor estará disponible en `http://localhost:3000`
La documentación de Swagger estará en `http://localhost:3000/api-docs`

## Datos de Prueba

Al iniciar el servidor por primera vez, se cargarán automáticamente los siguientes datos de prueba:

- **Admin**: admin@canchas.com / admin123
- **Jugador**: juan@mail.com / jugador123
- **Dueño**: carlos@mail.com / duenio123
- 1 Complejo con 3 canchas

## APIs Externas Necesarias

### 1. Google OAuth API (Opcional - para login con Google)

Para habilitar el login con Google, necesitas:

1. Crear un proyecto en [Google Cloud Console](https://console.cloud.google.com/)
2. Habilitar Google Sign-In
3. Crear credenciales OAuth 2.0
4. Configurar las credenciales en el backend

**Archivos a modificar:**
- `src/controllers/auth.controller.js` - Método `loginWithGoogle`
- Agregar variables de entorno en `.env`:
  ```
  GOOGLE_CLIENT_ID=your_client_id
  GOOGLE_CLIENT_SECRET=your_client_secret
  ```

### 2. Mercado Pago API (Requerido - para pagos)

Para habilitar los pagos con Mercado Pago, necesitas:

1. Crear una cuenta en [Mercado Pago](https://www.mercadopago.com.ar/)
2. Obtener tus credenciales de acceso (Access Token y Public Key)
3. Instalar el SDK de Mercado Pago:
   ```bash
   npm install mercadopago
   ```

**Archivos a modificar:**
- `src/controllers/pago.controller.js` - Ya configurado con el SDK de Mercado Pago
- Agregar variables de entorno en `.env`:
  ```
  MERCADO_PAGO_ACCESS_TOKEN=your_access_token
  MERCADO_PAGO_PUBLIC_KEY=your_public_key
  FRONTEND_URL=http://localhost:4201
  ```

**Configurar Webhook en Mercado Pago:**
1. Ve a tu cuenta de Mercado Pago
2. Configura el webhook con la URL: `https://tu-backend.com/api/pagos/webhook`
3. Selecciona los eventos: `payment`
4. En desarrollo, puedes usar ngrok para exponer tu backend local

## Endpoints de la API

### Autenticación (`/api/auth`)
- `POST /login` - Login tradicional
- `POST /google-login` - Login con Google
- `GET /me` - Verificar sesión
- `POST /logout` - Cerrar sesión
- `POST /register` - Registro
- `GET /perfil` - Obtener perfil
- `PATCH /perfil/foto` - Actualizar foto de perfil
- `GET /` - Listar usuarios (admin)

### Complejos (`/api/complejos`)
- `POST /` - Crear complejo
- `GET /` - Listar todos los complejos
- `GET /auth/mis-complejos` - Mis complejos (dueño)
- `GET /:id` - Obtener complejo por ID

### Canchas (`/api/canchas`)
- `GET /` - Listar todas las canchas
- `GET /complejo/:complejoId` - Canchas por complejo
- `GET /buscar?nombre=` - Buscar por nombre
- `POST /` - Crear cancha

### Reservas (`/api/reservas`)
- `GET /cancha/:canchaId/horarios?fecha=` - Horarios disponibles
- `POST /` - Crear reserva
- `GET /mis-reservas` - Mis reservas
- `GET /complejo/:complejoId` - Reservas por complejo
- `GET /` - Todas las reservas (admin)

### Solicitudes Dueño (`/api/solicitudes-duenio`)
- `POST /` - Crear solicitud
- `GET /mis-solicitudes` - Mis solicitudes
- `GET /admin` - Todas las solicitudes (admin)
- `PATCH /admin/:id/aprobar` - Aprobar solicitud
- `PATCH /admin/:id/rechazar` - Rechazar solicitud

### Pagos (`/api/pagos`)
- `POST /crear-preferencia` - Crear preferencia de pago (Mercado Pago)
- `POST /webhook` - Webhook para notificaciones de Mercado Pago

## Estructura del Proyecto

```
TPFinalGrupo15_Backend/
├── config/
│   ├── database.js      # Configuración de PostgreSQL
│   └── seed.js          # Datos de prueba
├── src/
│   ├── controllers/     # Lógica de negocio
│   ├── models/          # Modelos Sequelize
│   ├── routes/          # Definición de rutas
│   └── middlewares/     # Middlewares personalizados
├── docs/
│   └── swagger.yaml     # Documentación Swagger
├── .env.example         # Variables de entorno ejemplo
├── index.js             # Punto de entrada
└── package.json         # Dependencias
```

## Modelos de Datos

### Usuario
- id, nombre, apellido, email, password
- rol: admin | duenio | jugador
- estado, foto_perfil, google_id

### Complejo
- id, nombre, direccion, provincia, telefono
- latitud, longitud, duenio_id

### Cancha
- id, nombre, tipo, precio_hora
- techada, iluminacion, capacidad, descripcion, imagen
- complejo_id

### Reserva
- id, fecha, hora_inicio, hora_fin, monto_total
- estado: pendiente | confirmada | cancelada | completada
- pagada, jugador_id, cancha_id

### SolicitudDuenio
- id, nombre_complejo, direccion_complejo, provincia
- telefono_contacto, mensaje
- estado: pendiente | aprobada | rechazada
- respuesta_admin, fecha_respuesta, usuario_id

## Notas

- Las contraseñas se hashean con bcrypt
- La autenticación usa JWT con cookies httpOnly
- El backend usa CORS para permitir peticiones desde el frontend
- Swagger está configurado para documentación automática
