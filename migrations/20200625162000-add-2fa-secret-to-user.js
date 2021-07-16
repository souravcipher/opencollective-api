export default {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Users', 'twoFactorAuthToken', {
      type: Sequelize.STRING,
    });
  },

  down: queryInterface => {
    return queryInterface.removeColumn('Users', 'twoFactorAuthToken');
  },
};
