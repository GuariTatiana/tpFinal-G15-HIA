require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const sequelize = require("./config/database");
const { cargarDatosDePrueba } = require("./config/seed");
 
// Importación de rutas
const helloRoutes = require("./src/routes/hello.routes");
const authRoutes = require("./src/routes/auth.routes");
const complejoRoutes = require("./src/routes/complejo.routes");
const canchaRoutes = require("./src/routes/cancha.routes");
const reservaRoutes = require("./src/routes/reserva.routes");
const solicitudDuenioRoutes = require("./src/routes/solicitud-duenio.routes");
const pagoRoutes = require("./src/routes/pago.routes");

// === IMPORTACIÓN DE MODELOS PARA LAS RELACIONES ===
const Usuario = require("./src/models/usuario.model");
const Complejo = require("./src/models/complejo.model");
const Cancha = require("./src/models/cancha.model");
const Reserva = require("./src/models/reserva.model");
const SolicitudDuenio = require("./src/models/solicitud-duenio.model");

// === DEFINICION DE RELACIONES ===
// Usuario -> Complejo (un usuario puede tener varios complejos)
Usuario.hasMany(Complejo, { foreignKey: 'duenio_id', as: 'complejos' });
Complejo.belongsTo(Usuario, { foreignKey: 'duenio_id', as: 'duenio' });

// Usuario -> SolicitudDuenio
Usuario.hasMany(SolicitudDuenio, { foreignKey: 'usuario_id', as: 'solicitudes_duenio' });
SolicitudDuenio.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// Usuario -> Reserva (como jugador)
Usuario.hasMany(Reserva, { foreignKey: 'jugador_id', as: 'reservas' });
Reserva.belongsTo(Usuario, { foreignKey: 'jugador_id', as: 'jugador' });

// Complejo -> Cancha
Complejo.hasMany(Cancha, { foreignKey: 'complejo_id', as: 'canchas' });
Cancha.belongsTo(Complejo, { foreignKey: 'complejo_id', as: 'complejo' });

// Cancha -> Reserva
Cancha.hasMany(Reserva, { foreignKey: 'cancha_id', as: 'reservas' });
Reserva.belongsTo(Cancha, { foreignKey: 'cancha_id', as: 'cancha' });

var app = express();

// Middlewares
app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:4201').split(','),
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Rutas de la API
app.use("/api", helloRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/complejos", complejoRoutes);
app.use("/api/canchas", canchaRoutes);
app.use("/api/reservas", reservaRoutes);
app.use("/api/solicitudes-duenio", solicitudDuenioRoutes);
app.use("/api/pagos", pagoRoutes);

// Settings
app.set("port", process.env.PORT || 3000);

// Sincronizar Base de Datos y arrancar el servidor
sequelize
  .sync({ force: false, alter: process.env.DB_SYNC_ALTER !== 'false' })
  .then(async () => {
    console.log("Tablas de PostgreSQL sincronizadas");

    await cargarDatosDePrueba();
    const serverPort = app.get("port");

    app.listen(serverPort, () => {
      console.log(`Servidor corriendo en http://localhost:${serverPort}`);
      console.log(
        `Documentación Swagger disponible en http://localhost:${serverPort}/api-docs`,
      );
    });
  })
  .catch((err) => {
    console.error("Error al sincronizar: ", err);
  });
