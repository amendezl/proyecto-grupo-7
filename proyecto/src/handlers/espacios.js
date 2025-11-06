/**
 * Lambda handlers for espacios domain with input validation and telemetry
 */

const businessLogic = require('../../api/business/espacios.js');
const { registerHandlers } = require('../core/lambda/handlerFactory');

module.exports = registerHandlers(businessLogic, {
	createEspacio: {
		entityType: 'espacio',
		metricName: 'EspaciosCreated'
	},
	updateEspacio: {
		entityType: 'espacio',
		validationOptions: { allowPartial: true },
		metricName: 'EspaciosUpdated'
	}
});
