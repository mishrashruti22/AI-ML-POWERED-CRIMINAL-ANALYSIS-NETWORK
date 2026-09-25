const express = require('express');
const router = express.Router();
const caseController = require('../controllers/case.controller');
const firRoutes = require('./fir.routes');
const callRoutes = require('./call.routes');
const transactionRoutes = require('./transaction.routes');
const entityRoutes = require('./entity.routes');
const relationshipRoutes = require('./relationship.routes');
const analyticsRoutes = require('./analytics.routes');
const relationshipController = require('../controllers/relationship.controller');
const analyticsController = require('../controllers/analytics.controller');
const summaryController = require('../controllers/summary.controller');
const { requireAuth } = require('../middleware/auth.middleware');

// All case routes require authentication
router.use(requireAuth);

// Case management routes
router.post('/', caseController.createCase);
router.get('/', caseController.getCases);

// Investigation ingestion, entity & relationship subroutes
router.use('/:caseId/firs', firRoutes);
router.use('/:caseId/calls', callRoutes);
router.use('/:caseId/transactions', transactionRoutes);
router.use('/:caseId/entities', entityRoutes);
router.use('/:caseId/relationships', relationshipRoutes);
router.get('/:caseId/network', relationshipController.getNetwork);
router.get('/:caseId/data-summary', summaryController.getDataSummary);

// AI / ML Analytics & Intelligence routes (SIH26189)
router.use('/:caseId/analytics', analyticsRoutes);
router.post('/:caseId/link-predictions/run', analyticsController.runLinkPredictions);
router.get('/:caseId/link-predictions', analyticsController.getLinkPredictions);
router.get('/:caseId/explanations', analyticsController.getExplanations);
router.get('/:caseId/entities/:entityId/intelligence', analyticsController.getEntityIntelligence);

// Single case routes
router.get('/:id', caseController.getCaseById);
router.put('/:id', caseController.updateCase);
router.delete('/:id', caseController.deleteCase);
router.get('/:id/stats', caseController.getCaseStats);

module.exports = router;


