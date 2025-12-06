/**
 * Lambda handlers for usuarios domain with validation and observability
 */

const businessLogic = require('../api/business/usuarios.js');
const { registerHandlers } = require('../core/lambda/handlerFactory');

module.exports = registerHandlers(businessLogic, {
	createUsuario: {
		entityType: 'user',
		metricName: 'UsuariosCreated'
	},
	updateUsuario: {
		entityType: 'user',
		validationOptions: { allowPartial: true },
		metricName: 'UsuariosUpdated'
	},
	getSettingsActual: {
		metricName: 'UserSettingsRetrieved'
	},
	updateSettingsActual: {
		metricName: 'UserSettingsUpdated'
	}
});
