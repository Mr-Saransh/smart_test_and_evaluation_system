/**
 * Email Service — Send student credentials via Gmail SMTP.
 *
 * Uses nodemailer with Google's SMTP + an App Password.
 * Environment variables: SMTP_EMAIL, SMTP_APP_PASSWORD
 */
const nodemailer = require('nodemailer');

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  const email = process.env.SMTP_EMAIL;
  const pass = process.env.SMTP_APP_PASSWORD;

  if (!email || !pass) {
    console.warn('[email] SMTP_EMAIL or SMTP_APP_PASSWORD not set — emails will be logged to console only.');
    return null;
  }

  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: email, pass },
  });

  return _transporter;
}

/**
 * Send student credentials email.
 * @param {{ to: string, password: string, instituteName: string, loginUrl: string }} opts
 */
async function sendCredentialsEmail({ to, password, instituteName, loginUrl }) {
  const transporter = getTransporter();

  const subject = `Your ${instituteName || 'Apni Vidya'} Student Account Credentials`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 28px;text-align:center;">
      <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">🎓 Apni Vidya</div>
      <div style="color:rgba(255,255,255,0.85);font-size:14px;margin-top:4px;">${instituteName || 'Smart Learning Platform'}</div>
    </div>

    <!-- Body -->
    <div style="padding:32px 28px;">
      <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;">Welcome, Student!</h2>
      <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Your institute has created a student account for you. Use the credentials below to log in and complete your profile setup.
      </p>

      <!-- Credential Box -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="margin-bottom:14px;">
          <div style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Email / Login ID</div>
          <div style="font-size:16px;font-weight:700;color:#1e293b;">${to}</div>
        </div>
        <div>
          <div style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Temporary Password</div>
          <div style="font-size:16px;font-weight:700;color:#4f46e5;letter-spacing:1px;">${password}</div>
        </div>
      </div>

      <!-- Steps -->
      <div style="background:#eff6ff;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
        <div style="font-size:13px;font-weight:700;color:#3b82f6;margin-bottom:8px;">📋 Next Steps</div>
        <ol style="margin:0;padding-left:18px;color:#475569;font-size:13px;line-height:1.8;">
          <li>Log in with the credentials above</li>
          <li>You'll be asked to set a new password</li>
          <li>Complete your profile (name, phone, address, etc.)</li>
          <li>Start learning!</li>
        </ol>
      </div>

      <!-- CTA -->
      <a href="${loginUrl || '#'}" style="display:block;text-align:center;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.3px;">
        Log In Now →
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:20px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="margin:0;color:#94a3b8;font-size:12px;">
        This is an automated message from Apni Vidya. Do not share your password with anyone.
      </p>
    </div>
  </div>
</body>
</html>`;

  if (!transporter) {
    console.log(`[email-mock] Would send credentials to ${to} | Password: ${password}`);
    return { accepted: [to], mock: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Apni Vidya" <${process.env.SMTP_EMAIL}>`,
      to,
      subject,
      html,
    });
    return info;
  } catch (err) {
    console.error(`[email] Failed to send to ${to}:`, err.message);
    throw err;
  }
}

/**
 * Send batch subscription payment receipt.
 * @param {{ to: string, instituteName: string, batchName: string, type: string, amount: number, transactionId: string, date: string, capacity: number }} opts
 */
async function sendBatchSubscriptionReceipt({ to, instituteName, batchName, type, amount, transactionId, date, capacity }) {
  const transporter = getTransporter();

  const typeLabel = type === 'creation' ? 'Batch Creation' : type === 'upgrade' ? 'Batch Upgrade' : 'Batch Renewal';
  const subject = `Payment Receipt: ${typeLabel} - ${instituteName}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#10b981,#059669);padding:32px 28px;text-align:center;">
      <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">🧾 Payment Receipt</div>
      <div style="color:rgba(255,255,255,0.9);font-size:14px;margin-top:4px;">${instituteName}</div>
    </div>

    <!-- Body -->
    <div style="padding:32px 28px;">
      <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;">Thank you for your payment!</h2>
      <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 24px;">
        We have successfully received your payment for the batch subscription. Below are the details of your transaction.
      </p>

      <!-- Receipt Box -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:12px; border-bottom:1px dashed #e2e8f0; padding-bottom:12px;">
          <span style="color:#64748b; font-size:14px;">Transaction ID</span>
          <strong style="color:#1e293b; font-size:14px;">${transactionId}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:12px; border-bottom:1px dashed #e2e8f0; padding-bottom:12px;">
          <span style="color:#64748b; font-size:14px;">Date</span>
          <strong style="color:#1e293b; font-size:14px;">${date}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:12px; border-bottom:1px dashed #e2e8f0; padding-bottom:12px;">
          <span style="color:#64748b; font-size:14px;">Batch Name</span>
          <strong style="color:#1e293b; font-size:14px;">${batchName}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:12px; border-bottom:1px dashed #e2e8f0; padding-bottom:12px;">
          <span style="color:#64748b; font-size:14px;">Payment Type</span>
          <strong style="color:#1e293b; font-size:14px;">${typeLabel}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:12px; border-bottom:1px dashed #e2e8f0; padding-bottom:12px;">
          <span style="color:#64748b; font-size:14px;">Billed Capacity</span>
          <strong style="color:#1e293b; font-size:14px;">${capacity} Students</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:16px;">
          <span style="color:#1e293b; font-size:16px; font-weight:700;">Amount Paid</span>
          <strong style="color:#10b981; font-size:20px;">₹${(amount / 100).toFixed(2)}</strong>
        </div>
      </div>

    </div>

    <!-- Footer -->
    <div style="padding:20px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="margin:0;color:#94a3b8;font-size:12px;">
        This is an automated receipt from Apni Vidya. For any queries, please contact support.
      </p>
    </div>
  </div>
</body>
</html>`;

  if (!transporter) {
    console.log(`[email-mock] Would send receipt to ${to} for transaction ${transactionId}`);
    return { accepted: [to], mock: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Apni Vidya Billing" <${process.env.SMTP_EMAIL}>`,
      to,
      subject,
      html,
    });
    return info;
  } catch (err) {
    console.error(`[email] Failed to send receipt to ${to}:`, err.message);
  }
}

module.exports = { sendCredentialsEmail, sendBatchSubscriptionReceipt };
