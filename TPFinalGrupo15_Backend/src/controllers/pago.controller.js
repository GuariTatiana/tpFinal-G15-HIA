const pagoCtrl = {};

// Crear preferencia de pago (placeholder para Mercado Pago)
pagoCtrl.crearPreferencia = async (req, res) => {
    try {
        const { reserva_id, titulo_cancha, precio } = req.body;

        // TODO: Integrar con Mercado Pago API
        // Por ahora retornamos un preference_id simulado
        const preferenceId = `pref_${Date.now()}_${reserva_id}`;
        const linkDePago = `https://mercadopago.com/checkout/${preferenceId}`;

        res.status(200).json({
            preference_id: preferenceId,
            linkDePago
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al crear preferencia de pago', error: error.message });
    }
};

module.exports = pagoCtrl;
