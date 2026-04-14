import nodemailer from 'nodemailer';

/**
 * Nodemailer Transporter Configuration
 * Creates an SMTP transporter configured via environment variables.
 * This is used to send email notifications.
 */
const transporter = nodemailer.createTransport({
  host: process.env.NODEMAILER_HOST,
  port: parseInt(process.env.NODEMAILER_PORT, 10),
  secure: process.env.NODEMAILER_PORT === '465', // true for port 465, false for other ports
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PASS,
  },
});

/**
 * Sends an email using the configured Nodemailer transporter.
 * 
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} text - Email body (plain text)
 * @returns {Promise<object>} - Nodemailer response object containing messageId and other details
 * @throws {Error} - Throws error if email sending fails
 */
export const sendEmail = async (to, subject, text) => {
  try {
    const mailOptions = {
      from: process.env.NODEMAILER_USER,
      to,
      subject,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✓ Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`✗ Failed to send email to ${to}:`, error.message);
    throw error;
  }
};

export default transporter;
