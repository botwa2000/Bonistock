function layout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #e5e5e5; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
    .logo { font-size: 24px; font-weight: 700; color: #ffffff; text-align: center; margin-bottom: 32px; }
    .card { background: #171717; border: 1px solid #262626; border-radius: 12px; padding: 32px; }
    h1 { color: #ffffff; font-size: 20px; margin: 0 0 16px; }
    p { color: #a3a3a3; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
    .btn { display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; }
    .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #525252; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Bonistock</div>
    <div class="card">
      ${content}
    </div>
    <div class="footer">
      <p>Bonistock &mdash; Upside-first Stock & ETF Advisor</p>
    </div>
  </div>
</body>
</html>`;
}

export function verificationEmail(name: string, verifyUrl: string): string {
  return layout(`
    <h1>Verify your email</h1>
    <p>Hi ${name},</p>
    <p>Thanks for creating your Bonistock account. Click the button below to verify your email address.</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${verifyUrl}" class="btn">Verify Email</a>
    </p>
    <p>This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.</p>
  `);
}

export function passwordResetEmail(name: string, resetUrl: string): string {
  return layout(`
    <h1>Reset your password</h1>
    <p>Hi ${name},</p>
    <p>We received a request to reset your password. Click the button below to set a new one.</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${resetUrl}" class="btn">Reset Password</a>
    </p>
    <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
  `);
}

export function welcomeEmail(name: string): string {
  return layout(`
    <h1>Welcome to Bonistock!</h1>
    <p>Hi ${name},</p>
    <p>Your account is set up and ready to go. Start exploring analyst-backed stock picks and build your first portfolio.</p>
    <p>Here's what you can do:</p>
    <ul style="color: #a3a3a3; font-size: 14px; line-height: 2;">
      <li>Browse top upside stocks ranked by analyst consensus</li>
      <li>Use Auto-Mix to build a diversified portfolio in seconds</li>
      <li>Compare brokers and find the best fit for your region</li>
    </ul>
  `);
}

export function passConfirmationEmail(
  name: string,
  passType: string,
  activations: number
): string {
  return layout(`
    <h1>Your pass is ready!</h1>
    <p>Hi ${name},</p>
    <p>Your <strong>${passType}</strong> has been activated with <strong>${activations} activation${activations > 1 ? "s" : ""}</strong>.</p>
    <p>Each activation gives you 24 hours of full Plus access. Activate from your dashboard whenever you're ready.</p>
  `);
}

export function subscriptionConfirmationEmail(
  name: string,
  tier: string,
  amount: string
): string {
  return layout(`
    <h1>Subscription confirmed</h1>
    <p>Hi ${name},</p>
    <p>Your <strong>${tier}</strong> subscription is now active at <strong>${amount}</strong>.</p>
    <p>You now have full access to all Bonistock features. Enjoy!</p>
  `);
}

export function subscriptionCanceledEmail(name: string, endDate: string): string {
  return layout(`
    <h1>Subscription canceled</h1>
    <p>Hi ${name},</p>
    <p>Your subscription has been canceled. You'll continue to have access until <strong>${endDate}</strong>.</p>
    <p>You can resubscribe anytime from your account settings.</p>
  `);
}

export function paymentFailedEmail(name: string): string {
  return layout(`
    <h1>Payment failed</h1>
    <p>Hi ${name},</p>
    <p>We couldn't process your latest payment. Please update your payment method to continue your subscription.</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" class="btn">Update Payment</a>
    </p>
  `);
}
