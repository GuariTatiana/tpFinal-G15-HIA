const getHello = (req, res) => {
  try {
    res.status(200).json({ 
      message: '¡Backend de Canchas funcionando correctamente!',
      status: 'online'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getHello
};
