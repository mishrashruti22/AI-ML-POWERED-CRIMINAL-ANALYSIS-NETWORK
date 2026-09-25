const express = require('express');
const router = express.Router({ mergeParams: true });
const firController = require('../controllers/fir.controller');

router.post('/', firController.createFir);
router.get('/', firController.getFirs);
router.get('/:firId', firController.getFirById);
router.put('/:firId', firController.updateFir);
router.delete('/:firId', firController.deleteFir);

module.exports = router;
