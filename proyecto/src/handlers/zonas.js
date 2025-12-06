/**
 * Lambda handlers for zonas domain with validation and telemetry
 */

const businessLogic = require('../api/business/zonas.js');
const { registerHandlers } = require('../core/lambda/handlerFactory');

module.exports = registerHandlers(businessLogic, {
	createZona: {
		entityType: 'zona',
		metricName: 'ZonasCreated'
	},
	updateZona: {
		entityType: 'zona',
		validationOptions: { allowPartial: true },
		metricName: 'ZonasUpdated'
	}
});
