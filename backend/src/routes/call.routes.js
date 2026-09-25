const express = require('express');
const router = express.Router({ mergeParams: true });
const callController = require('../controllers/call.controller');

router.post('/', callController.createCall);
router.get('/', callController.getCalls);
router.get('/:callId', callController.getCallById);
router.put('/:callId', callController.updateCall);
router.delete('/:callId', callController.deleteCall);

module.exports = router;
