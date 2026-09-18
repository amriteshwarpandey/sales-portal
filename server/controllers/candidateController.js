const Candidate = require('../models/Candidate');
const Employee = require('../models/Employee');
const { hashPassword } = require('./accountController');
const { sendEmail, sendEmailToHR } = require('../utils/sendEmail');
const templates = require('../utils/emailTemplates');
const { logAudit } = require('../utils/audit');
const { emitToAdmins } = require('../socket');
const { emailHash, generatePassword, generateReferralId } = require('../utils/security');
const { CANDIDATE_STATUSES } = require('../models/Candidate');
const { isEmail, isObjectId, isHttpUrl, missingFields, escapeRegex, toStr } = require('../utils/validators');

const REQUIRED_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'college', 'state', 'branch', 'degree', 'passingYear'];

const adminName = (req) => `${req.account.firstName} ${req.account.lastName}`;

/** Internal notifications must not fail the request that triggered them. */
async function notifyHR(subject, html) {
  try {
    await sendEmailToHR(subject, html);
  } catch (error) {
    console.warn('[candidate] HR notification failed:', error.message);
  }
}

function applyStatus(candidate, status, by) {
  candidate.status = status;
  candidate.actionBy = by;
  candidate.statusHistory.push({ status, by, at: new Date() });
}

function broadcast(candidate) {
  emitToAdmins('candidateUpdate', { id: String(candidate._id), status: candidate.status });
}

async function getAdminCandidates(req, res, next) {
  try {
    const filter = {};
    if (CANDIDATE_STATUSES.includes(req.query.status)) filter.status = req.query.status;
    const search = toStr(req.query.q);
    if (search) {
      const re = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ firstName: re }, { lastName: re }, { email: re }, { college: re }, { branch: re }];
    }

    const [candidates, counts] = await Promise.all([
      Candidate.find(filter).sort({ createdAt: -1 }),
      Candidate.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    return res.status(200).json({
      candidates,
      counts: Object.fromEntries(counts.map((row) => [row._id, row.count])),
    });
  } catch (error) {
    return next(error);
  }
}

async function getCandidate(req, res, next) {
  try {
    const candidate = isObjectId(req.params.id) ? await Candidate.findById(req.params.id) : null;
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    return res.status(200).json({ candidate });
  } catch (error) {
    return next(error);
  }
}

async function registerCandidate(req, res, next) {
  try {
    const missing = missingFields(req.body, REQUIRED_FIELDS);
    if (missing.length) return res.status(400).json({ message: `Missing fields: ${missing.join(', ')}` });

    const email = toStr(req.body.email).toLowerCase();
    if (!isEmail(email)) return res.status(400).json({ message: 'Invalid email address' });

    const passingYear = Number(req.body.passingYear);
    const thisYear = new Date().getFullYear();
    if (!Number.isInteger(passingYear) || passingYear < 1970 || passingYear > thisYear + 6) {
      return res.status(400).json({ message: 'Invalid passing year' });
    }

    if (await Candidate.exists({ email })) {
      return res.status(409).json({ message: 'An application with this email already exists' });
    }

    const fields = Object.fromEntries(REQUIRED_FIELDS.map((f) => [f, toStr(req.body[f])]));
    const candidate = await Candidate.create({
      ...fields,
      email,
      passingYear,
      message: toStr(req.body.message).slice(0, 2000) || undefined,
      emailHash: emailHash(email),
      statusHistory: [{ status: 'pending', by: 'applicant' }],
    });

    await notifyHR('New candidate application', templates.newApplication(candidate));
    broadcast(candidate);

    return res.status(200).json({
      message: 'Application submitted successfully',
      candidate: { _id: candidate._id, firstName: candidate.firstName, status: candidate.status },
    });
  } catch (error) {
    return next(error);
  }
}

const listByStatus = (status) => async (req, res, next) => {
  try {
    const candidates = await Candidate.find({ status }).sort({ updatedAt: -1 });
    return res.status(200).json({ candidates });
  } catch (error) {
    return next(error);
  }
};

async function loadCandidate(req, res) {
  const { candidateId } = req.body || {};
  if (!isObjectId(candidateId)) {
    res.status(401).json({ message: 'Invalid candidate ID' });
    return null;
  }
  const candidate = await Candidate.findById(candidateId);
  if (!candidate) {
    res.status(401).json({ message: 'Candidate not found' });
    return null;
  }
  return candidate;
}

/** Shortlist / discard / pending / invited. `:id` is the acting admin (checked by validateAdmin). */
const changeStatus = (status) => async (req, res, next) => {
  try {
    const candidate = await loadCandidate(req, res);
    if (!candidate) return undefined;

    if (candidate.status === status) {
      return res.status(400).json({ message: `Candidate is already ${status}` });
    }
    if (candidate.status === 'employee') {
      return res.status(400).json({ message: 'Candidate has already been converted to an employee' });
    }

    const by = adminName(req);
    applyStatus(candidate, status, by);
    await candidate.save();

    await logAudit(req, `candidate.${status}`, { target: candidate._id, meta: { email: candidate.email } });
    await notifyHR(`Candidate ${status}`, templates.candidateStatus(candidate, status, by));
    broadcast(candidate);

    return res.status(200).json({ message: `Candidate marked as ${status}`, candidate });
  } catch (error) {
    return next(error);
  }
};

async function convertToEmployee(req, res, next) {
  try {
    const { candidateId } = req.body || {};
    if (!isObjectId(candidateId)) return res.status(401).json({ message: 'Invalid candidate ID' });

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    if (candidate.status === 'employee') {
      return res.status(400).json({ message: 'Candidate is already an employee' });
    }
    if (candidate.status === 'discarded') {
      return res.status(400).json({ message: 'A discarded candidate cannot be hired. Move them back to pending first.' });
    }
    // Check for duplicates before touching the candidate, so a failure leaves nothing half-done.
    if (await Employee.exists({ email: candidate.email })) {
      return res.status(409).json({ message: 'An employee with this email already exists' });
    }

    let referralId;
    do {
      referralId = generateReferralId();
      // eslint-disable-next-line no-await-in-loop
    } while (await Employee.exists({ referralId }));

    const password = generatePassword();
    const by = adminName(req);
    const employee = await Employee.create({
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone,
      college: candidate.college,
      state: candidate.state,
      branch: candidate.branch,
      degree: candidate.degree,
      passingYear: candidate.passingYear,
      candidate: candidate._id,
      password: await hashPassword(password),
      referralId,
      createdBy: by,
    });

    applyStatus(candidate, 'employee', by);
    await candidate.save();

    let emailSent = true;
    try {
      await sendEmail({
        to: employee.email,
        subject: 'Welcome to the Sales Portal - your login details',
        html: templates.welcomeEmployee(employee, password),
      });
    } catch {
      emailSent = false;
    }

    await logAudit(req, 'candidate.converted', {
      target: candidate._id,
      meta: { employeeId: String(employee._id), referralId },
    });
    await notifyHR('Candidate hired', templates.candidateStatus(candidate, 'employee', by));
    broadcast(candidate);

    return res.status(200).json({
      message: emailSent
        ? 'Candidate converted to employee. Login details were emailed to them.'
        : 'Candidate converted to employee, but the welcome email could not be sent.',
      candidate,
      employee,
      emailSent,
    });
  } catch (error) {
    return next(error);
  }
}

async function inviteCandidate(candidate, req) {
  await sendEmail({
    to: candidate.email,
    subject: 'Sales Portal: please submit your resume',
    html: templates.resumeInvite(candidate),
  });
  applyStatus(candidate, 'invited', adminName(req));
  await candidate.save();
  broadcast(candidate);
}

/** Emails every shortlisted candidate their personal resume link and marks them invited. */
async function sendEmailToShortlisted(req, res, next) {
  try {
    const candidates = await Candidate.find({ status: 'shortlisted' });
    if (!candidates.length) {
      return res.status(400).json({ message: 'No shortlisted candidates found' });
    }

    const results = await Promise.allSettled(candidates.map((candidate) => inviteCandidate(candidate, req)));
    const failed = results
      .map((result, i) => (result.status === 'rejected' ? candidates[i].email : null))
      .filter(Boolean);
    const sent = candidates.length - failed.length;

    await logAudit(req, 'candidate.bulkInvite', { meta: { sent, failed } });
    if (!sent) return res.status(500).json({ message: 'Failed to send emails', failed });

    return res.status(200).json({ message: `Emails sent to ${sent} candidate(s)`, sent, failed });
  } catch (error) {
    return next(error);
  }
}

/** `:id` is the candidate. */
async function sendEmailToCandidate(req, res, next) {
  try {
    const candidate = isObjectId(req.params.id) ? await Candidate.findById(req.params.id) : null;
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    if (['invited', 'employee'].includes(candidate.status)) {
      return res.status(400).json({ message: `Candidate is already ${candidate.status}` });
    }

    try {
      await inviteCandidate(candidate, req);
    } catch (error) {
      return res.status(500).json({ message: 'Failed to send the email', error: error.message });
    }

    await logAudit(req, 'candidate.invited', { target: candidate._id, meta: { email: candidate.email } });
    return res.status(200).json({ message: 'Email sent and candidate marked as invited', candidate });
  } catch (error) {
    return next(error);
  }
}

/** Minimal info for the public resume page, so it can greet the candidate. */
async function getSubmission(req, res, next) {
  try {
    const candidate = await Candidate.findOne({ emailHash: String(req.params.emailHash) });
    if (!candidate) return res.status(404).json({ message: 'This link is invalid' });
    return res.status(200).json({
      firstName: candidate.firstName,
      submitted: Boolean(candidate.resumeLink),
    });
  } catch (error) {
    return next(error);
  }
}

async function submitResume(req, res, next) {
  try {
    const email = toStr(req.body?.email).toLowerCase();
    const resumeLink = toStr(req.body?.resumeLink);
    if (!email || !resumeLink) return res.status(400).json({ message: 'Email and resume link are required' });
    if (!isHttpUrl(resumeLink)) return res.status(400).json({ message: 'Resume link must be a valid http(s) URL' });

    const candidate = await Candidate.findOne({ emailHash: String(req.params.emailHash) });
    if (!candidate) return res.status(404).json({ message: 'This link is invalid' });
    if (candidate.email !== email) {
      return res.status(400).json({ message: 'Email does not match this invitation' });
    }

    candidate.resumeLink = resumeLink;
    candidate.resumeSubmittedAt = new Date();
    await candidate.save();
    broadcast(candidate);

    return res.status(200).json({ message: 'Resume submitted successfully' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAdminCandidates,
  getCandidate,
  registerCandidate,
  listByStatus,
  changeStatus,
  convertToEmployee,
  sendEmailToShortlisted,
  sendEmailToCandidate,
  getSubmission,
  submitResume,
};
