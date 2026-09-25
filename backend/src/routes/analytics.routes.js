const express = require('express');
const router = express.Router({ mergeParams: true });
const analyticsController = require('../controllers/analytics.controller');

// AI Analytics Pipeline execution & data endpoints
router.post('/run', analyticsController.runAnalytics);
router.get('/', analyticsController.getAnalytics);
router.get('/key-players', analyticsController.getKeyPlayers);
router.get('/communities', analyticsController.getCommunities);
router.get('/suspicious-patterns', analyticsController.getSuspiciousPatterns);
router.get('/risk', analyticsController.getRiskEntities);

// Link predictions sub-routes (also accessible under /analytics/)
router.post('/link-predictions/run', analyticsController.runLinkPredictions);
router.get('/link-predictions', analyticsController.getLinkPredictions);

// Explainability & per-entity intelligence
router.get('/explanations', analyticsController.getExplanations);
router.get('/entities/:entityId/intelligence', analyticsController.getEntityIntelligence);

module.exports = router;
