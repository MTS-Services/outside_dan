/**
 * Test email script
 * Usage: node test-email.js
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendTestEmail() {
  console.log('Verifying SMTP connection...');

  try {
    await transporter.verify();
    console.log('✔ SMTP connection verified successfully.');
  } catch (err) {
    console.error('✘ SMTP connection failed:', err.message);
    process.exit(1);
  }

  console.log('Sending test email...');

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: 'shariarhosain1315@gmail.com',
      subject: 'Test Email',
      text: 'This is a test email.',
      html: '<p>This is a <strong>test email</strong>.</p>',
    });

    console.log('✔ Email sent successfully!');
    console.log('  Message ID:', info.messageId);
    console.log('  Response:', info.response);
  } catch (err) {
    console.error('✘ Failed to send email:', err.message);
    process.exit(1);
  }
}

sendTestEmail();
