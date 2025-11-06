/**
 * Lambda handlers for reservas domain with validation and telemetry
 */

const businessLogic = require('../../api/business/reservas.js');
const { registerHandlers } = require('../core/lambda/handlerFactory');

module.exports = registerHandlers(businessLogic, {
	createReserva: {
		entityType: 'reserva',
		metricName: 'ReservasCreated'
	},
	updateReserva: {
		entityType: 'reserva',
		validationOptions: { allowPartial: true },
		metricName: 'ReservasUpdated'
	}
});
