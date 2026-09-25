const express = require('express');
const router = express.Router({ mergeParams: true });
const relationshipController = require('../controllers/relationship.controller');

router.post('/build', relationshipController.buildRelationships);
router.get('/', relationshipController.getRelationships);
router.get('/summary', relationshipController.getRelationshipSummary);

module.exports = router;
