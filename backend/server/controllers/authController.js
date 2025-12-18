const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const generateOtp = require("../utils/generateOtp");
const sendEmail = require("../utils/sendEmail");

/**
 * REGISTER
 * Used by: Donor, Hospital, Blood Bank
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, role, location, hospitalDetails, bloodGroup } = req.body;

    // Basic validation
    if (!name || !email || !phone || !role) {
      return res.status(400).json({ message: "name, email, phone and role are required" });
    }

    // location required for all roles per your requirement
    if (!location || location.lat == null || location.lng == null) {
      return res.status(400).json({ message: "Please allow location access and provide your current location." });
    }

    // role-specific validation
    if (role === "hospital" && (!hospitalDetails || !hospitalDetails.registrationNumber)) {
      return res.status(400).json({ message: "Hospital details required for hospital registration." });
    }

    // optional: donors must provide bloodGroup
    if (role === "donor" && !bloodGroup) {
      return res.status(400).json({ message: "Donors must provide bloodGroup." });
    }

    // check existing user
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already registered" });

    const hashed = password ? await bcrypt.hash(password, 10) : null;

    const user = new User({
      name,
      email,
      password: hashed,
      phone,
      role,
      location,
      hospitalDetails: hospitalDetails || undefined,
      bloodGroup: bloodGroup || null
    });

    await user.save();

    res.status(201).json({ message: "Registration successful" });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * LOGIN
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // approval check
    if (!user.isApproved) {
      return res.status(403).json({ message: "Account pending admin approval" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      role: user.role,
      mustChangePassword: user.mustChangePassword
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * CHANGE PASSWORD
 * Used after first admin login
 */
exports.changePassword = async (req, res) => {
  try {
    // SAFETY CHECK
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: "New password required" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.findByIdAndUpdate(req.user.id, {
      password: hashedPassword,
      mustChangePassword: false
    });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * DONOR FORGOT PASSWORD – SEND OTP
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user || user.role !== "donor") {
      return res.status(400).json({ message: "Invalid donor account" });
    }

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    user.otp = hashedOtp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    await sendEmail(
      user.email,
      "Your OTP from BloodBridge – Password Reset",
      `Hello ${user.name},

      We received a request to reset your BloodBridge account password.

      Your One-Time Password (OTP) is: ${otp}

      ⏱ Valid for 10 minutes.

      If you did not request this reset, please ignore this email.

      Regards,
      BloodBridge Team`
    );



    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * DONOR RESET PASSWORD USING OTP
 */
exports.resetPasswordWithOtp = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user || user.role !== "donor") {
      return res.status(400).json({ message: "Invalid donor account" });
    }

    if (!user.otp || !user.otpExpiry || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "OTP expired or invalid" });
    }

    const isOtpValid = await bcrypt.compare(otp, user.otp);
    if (!isOtpValid) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
