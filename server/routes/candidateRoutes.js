const express = require('express');
const candidate = require('../controllers/candidateController');
const { validateAdmin, validateAdminView } = require('../middlewares/auth');
const { publicFormLimiter } = require('../middlewares/rateLimit');

const router = express.Router();

// Public: apply, and submit a resume through the emailed link.
router.post('/', publicFormLimiter, candidate.registerCandidate);
router.get('/submission/:emailHash', candidate.getSubmission);
router.post('/submission/:emailHash', publicFormLimiter, candidate.submitResume);

// Admin: lists. `:id` in /admin-candidate is the admin making the request.
router.get('/admin-candidate/:id', validateAdmin, candidate.getAdminCandidates);
router.post('/pending', validateAdminView, candidate.listByStatus('pending'));
router.post('/shortlisted', validateAdminView, candidate.listByStatus('shortlisted'));
router.post('/discarded', validateAdminView, candidate.listByStatus('discarded'));

// Admin: invitations. `/sendemail/:id` takes the candidate ID.
router.post('/sendemail', validateAdminView, candidate.sendEmailToShortlisted);
router.post('/sendemail/:id', validateAdminView, candidate.sendEmailToCandidate);

// Admin: status changes. `:id` is the acting admin; the candidate is `candidateId` in the body.
router.post('/shortlist/:id', validateAdmin, candidate.changeStatus('shortlisted'));
router.post('/discard/:id', validateAdmin, candidate.changeStatus('discarded'));
router.post('/pending/:id', validateAdmin, candidate.changeStatus('pending'));
router.post('/invited/:id', validateAdmin, candidate.changeStatus('invited'));
router.post('/employee/:id', validateAdmin, candidate.convertToEmployee);

router.get('/:id', validateAdminView, candidate.getCandidate);

module.exports = router;
