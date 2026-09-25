const {
  buildRelationshipsForCase,
  getRelationshipsForCase,
  getRelationshipSummaryForCase,
  getNetworkForCase
} = require('../services/relationship.service');

exports.buildRelationships = async (req, res) => {
  try {
    const { caseId } = req.params;
    const result = await buildRelationshipsForCase(caseId);

    if (!result) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.status(200).json({
      message: 'Relationships built successfully',
      caseId: result.caseId,
      caseNumber: result.caseNumber,
      newRelationships: result.newRelationships,
      existingRelationshipsReused: result.existingRelationshipsReused,
      totalRelationships: result.totalRelationships
    });
  } catch (error) {
    console.error('Build Relationships Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getRelationships = async (req, res) => {
  try {
    const { caseId } = req.params;
    const { type } = req.query;

    const result = await getRelationshipsForCase(caseId, type);

    if (!result) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Get Relationships Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getRelationshipSummary = async (req, res) => {
  try {
    const { caseId } = req.params;
    const result = await getRelationshipSummaryForCase(caseId);

    if (!result) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Get Relationship Summary Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getNetwork = async (req, res) => {
  try {
    const { caseId } = req.params;
    const result = await getNetworkForCase(caseId);

    if (!result) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Get Network Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
