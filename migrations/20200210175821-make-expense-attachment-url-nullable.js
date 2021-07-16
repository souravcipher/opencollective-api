export default {
  up: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('ExpenseAttachments', 'url', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('ExpenseAttachments', 'url', {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },
};
