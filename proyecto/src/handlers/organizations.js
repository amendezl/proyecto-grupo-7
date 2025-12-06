/**
 * Lambda handlers for organizations
 */

const businessLogic = require('../api/business/organizations.js');

module.exports = {
    getMyOrganizationConfig: businessLogic.getMyOrganizationConfig,
    getMyOrganizationTerminology: businessLogic.getMyOrganizationTerminology,
    updateMyOrganizationConfig: businessLogic.updateMyOrganizationConfig,
    updateMyOrganizationTerminology: businessLogic.updateMyOrganizationTerminology,
    getMyOrganizationStats: businessLogic.getMyOrganizationStats,
    listOrganizations: businessLogic.listOrganizations,
    getAvailableIndustries: businessLogic.getAvailableIndustries
};
