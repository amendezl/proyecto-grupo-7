/**
 * Lambda handlers for responsables domain with validation and telemetry
 */

const businessLogic = require('../../api/business/responsables.js');
const { registerHandlers } = require('../core/lambda/handlerFactory');

module.exports = registerHandlers(businessLogic, {
	createResponsable: {
		entityType: 'responsable',
		metricName: 'ResponsablesCreated'
	},
	updateResponsable: {
		entityType: 'responsable',
		validationOptions: { allowPartial: true },
		metricName: 'ResponsablesUpdated'
	}
});
