export default {
  up: async queryInterface => {
    await queryInterface.sequelize.query(`ALTER TYPE "enum_ExpenseHistories_type" ADD VALUE 'CHARGE';`);
  },

  down: async () => {
    // Can't undo this without loosing data
  },
};
