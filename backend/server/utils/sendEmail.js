const nodemailer = require("nodemailer");

console.log("EMAIL:", process.env.SYSTEM_EMAIL);
console.log("PASS EXISTS:", !!process.env.SYSTEM_EMAIL_PASS);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SYSTEM_EMAIL,
    pass: process.env.SYSTEM_EMAIL_PASS
  }
});

module.exports = async (to, subject, text) => {
  await transporter.sendMail({
    from: process.env.SYSTEM_EMAIL,
    to,
    subject,
    text
  });
};
