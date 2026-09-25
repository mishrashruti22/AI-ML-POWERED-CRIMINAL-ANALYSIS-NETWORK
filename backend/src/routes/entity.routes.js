const express = require('express');
const router = express.Router({ mergeParams: true });
const entityController = require('../controllers/entity.controller');

router.post('/extract', entityController.extractEntities);
router.get('/', entityController.getEntities);
router.get('/summary', entityController.getEntitySummary);
router.get('/:entityId', entityController.getEntityById);

module.exports = router;
