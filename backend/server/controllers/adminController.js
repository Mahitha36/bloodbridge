const User = require("../models/User");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

/**
 * CREATE ADMIN
 * Only SUPER ADMIN can do this
 */
exports.createAdmin = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // generate random password
    const tempPassword = crypto.randomBytes(4).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const admin = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      role: "admin",
      isApproved: true,
      mustChangePassword: true
    });

    await admin.save();

    // For now, log password in console (email later)
    console.log("ADMIN CREATED");
    console.log("Email:", email);
    console.log("Temporary Password:", tempPassword);

    res.status(201).json({
      message: "Admin created successfully",
      tempPassword
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getPendingUsers = async (req, res) => {
  try {
    const pending = await User.find({
      role: { $in: ["hospital", "bloodbank"] },
      isApproved: false
    }).select("-password");

    res.json(pending);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * APPROVE HOSPITAL / BLOOD BANK
 * Admin only
 */
exports.approveUser = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isApproved) {
      return res.status(400).json({ message: "User already approved" });
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    user.password = hashedPassword;
    user.isApproved = true;
    user.mustChangePassword = true;

    await user.save();

    // For now, log credentials (email later)
    console.log("✅ USER APPROVED");
    console.log("Email:", user.email);
    console.log("Temporary Password:", tempPassword);

    res.json({
      message: "User approved successfully. Credentials generated."
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const disaster = require("../config/disaster");

exports.toggleDisasterMode = async (req, res) => {
  const { enable } = req.body;

  if (enable === true) {
    disaster.enable();
    return res.json({ message: "Disaster mode ENABLED" });
  }

  disaster.disable();
  res.json({ message: "Disaster mode DISABLED" });
};

exports.getDisasterStatus = (req, res) => {
  const disaster = require("../config/disaster");
  res.json({ disasterMode: disaster.isEnabled() });
};
