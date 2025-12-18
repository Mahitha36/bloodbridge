const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SYSTEM_EMAIL,
    pass: process.env.SYSTEM_EMAIL_PASS
  }
});

exports.sendNotification = async (toEmail, subject, message) => {
  try {
    await transporter.sendMail({
      from: `"BloodBridge Alerts" <${process.env.SYSTEM_EMAIL}>`,
      to: toEmail,
      subject: subject,
      text: message
    });

    console.log(`📧 Email sent to ${toEmail}`);
  } catch (error) {
    console.error("EMAIL NOTIFICATION ERROR:", error.message);
  }
};
