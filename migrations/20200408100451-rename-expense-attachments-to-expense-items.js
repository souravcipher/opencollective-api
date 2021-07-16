export default {
  up: queryInterface => {
    return queryInterface.renameTable('ExpenseAttachments', 'ExpenseItems');
  },

  down: queryInterface => {
    return queryInterface.renameTable('ExpenseItems', 'ExpenseAttachments');
  },
};
