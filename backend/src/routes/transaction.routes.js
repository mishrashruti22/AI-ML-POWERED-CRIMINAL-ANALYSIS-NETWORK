const express = require('express');
const router = express.Router({ mergeParams: true });
const transactionController = require('../controllers/transaction.controller');

router.post('/', transactionController.createTransaction);
router.get('/', transactionController.getTransactions);
router.get('/:transactionId', transactionController.getTransactionById);
router.put('/:transactionId', transactionController.updateTransaction);
router.delete('/:transactionId', transactionController.deleteTransaction);

module.exports = router;
