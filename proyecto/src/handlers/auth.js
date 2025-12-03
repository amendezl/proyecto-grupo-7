const { register } = require('../api/business/auth');

module.exports.register = async (event) => {
    return await register(event);
};
