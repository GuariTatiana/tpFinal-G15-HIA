const Usuario = require('../src/models/usuario.model');
const Complejo = require('../src/models/complejo.model');
const Cancha = require('../src/models/cancha.model');
const Reserva = require('../src/models/reserva.model');
const bcrypt = require('bcrypt');

const cargarDatosDePrueba = async () => {
  try {
    console.log('?? Verificando datos de prueba...');

    // Buscar o crear Admin
    let admin = await Usuario.findOne({ where: { email: 'admin@canchas.com' } });
    if (admin) {
      await admin.update({ password: await bcrypt.hash('admin123', 10) });
      console.log('? Admin actualizado');
    } else {
      admin = await Usuario.create({
        nombre: 'Admin',
        apellido: 'Sistema',
        email: 'admin@canchas.com',
        password: await bcrypt.hash('admin123', 10),
        rol: 'admin',
        estado: true
      });
      console.log('? Admin creado');
    }

    // Buscar o crear Jugador
    let jugador = await Usuario.findOne({ where: { email: 'juan@mail.com' } });
    if (jugador) {
      await jugador.update({ password: await bcrypt.hash('jugador123', 10) });
      console.log('? Jugador actualizado');
    } else {
      jugador = await Usuario.create({
        nombre: 'Juan',
        apellido: 'Pérez',
        email: 'juan@mail.com',
        password: await bcrypt.hash('jugador123', 10),
        rol: 'jugador',
        estado: true
      });
      console.log('? Jugador creado');
    }

    // Buscar o crear Dueño
    let duenio = await Usuario.findOne({ where: { email: 'carlos@mail.com' } });
    if (duenio) {
      await duenio.update({ password: await bcrypt.hash('duenio123', 10) });
      console.log('? Dueño actualizado');
    } else {
      duenio = await Usuario.create({
        nombre: 'Carlos',
        apellido: 'Gómez',
        email: 'carlos@mail.com',
        password: await bcrypt.hash('duenio123', 10),
        rol: 'duenio',
        estado: true
      });
      console.log('? Dueño creado');
    }

    // Verificar si ya existe el complejo
    let complejo = await Complejo.findOne({ where: { duenio_id: duenio.id } });
    if (!complejo) {
      complejo = await Complejo.create({
        nombre: 'Complejo Deportivo Central',
        direccion: 'Av. Libertador 1234',
        provincia: 'Buenos Aires',
        telefono: '11-1234-5678',
        latitud: -34.6037,
        longitud: -58.3816,
        duenio_id: duenio.id
      });
      console.log('? Complejo creado');
    }

    // Verificar canchas
    const canchaCount = await Cancha.count({ where: { complejo_id: complejo.id } });
    if (canchaCount === 0) {
      await Cancha.create({
        nombre: 'Cancha 1 - Fútbol 5',
        tipo: 'futbol_5',
        precio_hora: 5000,
        techada: true,
        iluminacion: true,
        capacidad: 10,
        descripcion: 'Cancha de césped sintético techada',
        complejo_id: complejo.id
      });

      await Cancha.create({
        nombre: 'Cancha 2 - Fútbol 7',
        tipo: 'futbol_7',
        precio_hora: 7000,
        techada: false,
        iluminacion: true,
        capacidad: 14,
        descripcion: 'Cancha de césped natural con iluminación',
        complejo_id: complejo.id
      });

      await Cancha.create({
        nombre: 'Cancha 3 - Basketball',
        tipo: 'basketball',
        precio_hora: 4000,
        techada: true,
        iluminacion: true,
        capacidad: 12,
        descripcion: 'Pista de basketball profesional',
        complejo_id: complejo.id
      });
      console.log('? 3 Canchas creadas');
    }

    // Crear reserva de prueba para el jugador
    const cancha = await Cancha.findOne({ where: { complejo_id: complejo.id } });
    const reservaCount = await Reserva.count({ where: { jugador_id: jugador.id } });
    if (reservaCount === 0 && cancha) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + 1); // Mañana
      
      await Reserva.create({
        fecha: fecha.toISOString().split('T')[0],
        hora_inicio: '18:00',
        hora_fin: '19:00',
        monto_total: 5000,
        estado_reserva: 'pendiente',
        pagada: false,
        jugador_id: jugador.id,
        cancha_id: cancha.id
      });
      console.log('? Reserva de prueba creada para el jugador');
    }

    console.log('? Datos de prueba listos!');
    console.log('   - Admin: admin@canchas.com / admin123');
    console.log('   - Jugador: juan@mail.com / jugador123');
    console.log('   - Dueño: carlos@mail.com / duenio123');
  } catch (error) {
    console.error('? Error al cargar los datos del semillero (seed):', error.message);
  }
};

module.exports = { cargarDatosDePrueba };
