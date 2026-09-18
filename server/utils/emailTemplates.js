const config = require('../config/config');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout(title, body) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1f2937">
  <h2 style="color:#4338ca">${escapeHtml(title)}</h2>
  ${body}
  <p style="color:#6b7280;font-size:12px;margin-top:24px">Sales Portal</p>
</div>`;
}

function formatAmount(paise) {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

module.exports = {
  otp(name, otp) {
    return layout(
      'Your verification code',
      `<p>Hi ${escapeHtml(name)},</p>
       <p>Use this code to confirm your email change:</p>
       <p style="font-size:28px;letter-spacing:6px;font-weight:bold">${escapeHtml(otp)}</p>
       <p>This code is valid for only 5 minutes. If you did not request it, change your password.</p>`
    );
  },

  newApplication(candidate) {
    return layout(
      'New candidate application',
      `<p><b>${escapeHtml(candidate.firstName)} ${escapeHtml(candidate.lastName)}</b> (${escapeHtml(candidate.email)}) applied.</p>
       <p>${escapeHtml(candidate.degree)} in ${escapeHtml(candidate.branch)}, ${escapeHtml(candidate.college)} (${escapeHtml(candidate.passingYear)})</p>`
    );
  },

  candidateStatus(candidate, status, adminName) {
    return layout(
      'Candidate status updated',
      `<p><b>${escapeHtml(candidate.firstName)} ${escapeHtml(candidate.lastName)}</b> (${escapeHtml(candidate.email)})
       is now <b>${escapeHtml(status)}</b>.</p><p>Updated by ${escapeHtml(adminName)}.</p>`
    );
  },

  resumeInvite(candidate) {
    const link = `${config.clientUrl}/submission/${candidate.emailHash}`;
    return layout(
      'Next step: submit your resume',
      `<p>Hi ${escapeHtml(candidate.firstName)},</p>
       <p>Congratulations! You have been shortlisted. Please submit your resume using your personal link:</p>
       <p><a href="${escapeHtml(link)}" style="background:#4338ca;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Submit resume</a></p>
       <p style="font-size:12px;color:#6b7280">${escapeHtml(link)}</p>`
    );
  },

  welcomeEmployee(employee, password) {
    return layout(
      'Welcome to the team!',
      `<p>Hi ${escapeHtml(employee.firstName)},</p>
       <p>Your Sales Portal account is ready.</p>
       <ul>
         <li>Login: <b>${escapeHtml(employee.email)}</b> or referral ID <b>${escapeHtml(employee.referralId)}</b></li>
         <li>Temporary password: <b>${escapeHtml(password)}</b></li>
       </ul>
       <p>Sign in at <a href="${escapeHtml(config.clientUrl)}/login">${escapeHtml(config.clientUrl)}/login</a>
       and change your password right away.</p>`
    );
  },

  paymentReceipt(customer) {
    return layout(
      'Payment confirmed',
      `<p>Hi ${escapeHtml(customer.firstName)},</p>
       <p>We received your payment of <b>${formatAmount(customer.amount)}</b> for the
       <b>${escapeHtml(config.plans[customer.plan]?.name || customer.plan)}</b> plan.</p>
       <p>Transaction ID: <b>${escapeHtml(customer.payment?.transactionId)}</b></p>`
    );
  },
};
