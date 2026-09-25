const analyticsService = require('../services/analytics.service');

exports.runAnalytics = async (req, res) => {
  try {
    const { caseId } = req.params;
    const result = await analyticsService.runAnalyticsForCase(caseId);

    if (!result) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.status(200).json({
      message: 'AI/ML network analytics completed successfully',
      ...result
    });
  } catch (error) {
    console.error('Run Analytics Error:', error);
    res.status(500).json({ error: 'Failed to execute network analytics: ' + error.message });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const { caseId } = req.params;
    const result = await analyticsService.getAnalyticsForCase(caseId);

    if (!result) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Get Analytics Error:', error);
    res.status(500).json({ error: 'Failed to retrieve analytics: ' + error.message });
  }
};

exports.getKeyPlayers = async (req, res) => {
  try {
    const { caseId } = req.params;
    const result = await analyticsService.getKeyPlayersForCase(caseId);

    if (!result) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Get Key Players Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getCommunities = async (req, res) => {
  try {
    const { caseId } = req.params;
    const result = await analyticsService.getCommunitiesForCase(caseId);

    if (!result) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Get Communities Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getSuspiciousPatterns = async (req, res) => {
  try {
    const { caseId } = req.params;
    const result = await analyticsService.getSuspiciousPatternsForCase(caseId);

    if (!result) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Get Suspicious Patterns Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getRiskEntities = async (req, res) => {
  try {
    const { caseId } = req.params;
    const result = await analyticsService.getRiskEntitiesForCase(caseId);

    if (!result) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Get Risk Entities Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.runLinkPredictions = async (req, res) => {
  try {
    const { caseId } = req.params;
    const result = await analyticsService.runLinkPredictionsForCase(caseId);

    if (!result) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Run Link Predictions Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getLinkPredictions = async (req, res) => {
  try {
    const { caseId } = req.params;
    const result = await analyticsService.getLinkPredictionsForCase(caseId);

    if (!result) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Get Link Predictions Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getExplanations = async (req, res) => {
  try {
    const { caseId } = req.params;
    const result = await analyticsService.getExplanationsForCase(caseId);

    if (!result) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Get Explanations Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getEntityIntelligence = async (req, res) => {
  try {
    const { caseId, entityId } = req.params;
    const result = await analyticsService.getEntityIntelligence(caseId, entityId);

    if (!result || result.error) {
      return res.status(404).json({ error: result?.error || 'Entity not found' });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Get Entity Intelligence Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
