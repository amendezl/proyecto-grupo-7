const { withPermissions } = require('../../core/auth/auth');
const { PERMISSIONS, ROLE_PERMISSIONS } = require('../../core/auth/permissions');
const { success } = require('../../shared/utils/responses');

const getPermissionsCatalog = withPermissions(async () => {
    return success({
        permissions: PERMISSIONS,
        roles: ROLE_PERMISSIONS
    });
}, [PERMISSIONS.ADMIN_SYSTEM_CONFIG]);

const getRoleDesign = withPermissions(async () => {
    return success({
        roles: ROLE_PERMISSIONS
    });
}, [PERMISSIONS.ADMIN_SYSTEM_CONFIG]);

module.exports = {
    getPermissionsCatalog,
    getRoleDesign
};
