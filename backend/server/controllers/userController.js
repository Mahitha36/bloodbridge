const User = require("../models/User");

/**
 * GET OWN PROFILE (ALL ROLES)
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password -otp -otpExpiry");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const profile = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      location: user.location,
      isApproved: user.isApproved,
      createdAt: user.createdAt
    };

    // Donor profile
    if (user.role === "donor") {
      profile.bloodGroup = user.bloodGroup;
      profile.totalDonations = user.donationHistory.length;
      profile.lastDonationDate = user.lastDonationDate;
      profile.donationHistory = user.donationHistory;
    }

    // Hospital profile
    if (user.role === "hospital") {
      profile.hospitalDetails = user.hospitalDetails;
    }

    // Blood bank profile
    if (user.role === "bloodbank") {
      profile.inventoryManaged = true;
    }

    // Admin & Super Admin profile
    if (user.role === "admin" || user.role === "super_admin") {
      profile.mustChangePassword = user.mustChangePassword;
    }

    res.json(profile);

  } catch (error) {
    console.error("GET PROFILE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * UPDATE OWN PROFILE (SAFE FIELDS ONLY)
 */
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { name, phone, location, hospitalDetails } = req.body;

    // Common editable fields
    if (name) user.name = name;
    if (phone) user.phone = phone;

    if (location && location.lat != null && location.lng != null) {
      user.location = location;
    }

    // Hospital-specific editable fields
    if (user.role === "hospital" && hospitalDetails) {
      user.hospitalDetails = {
        ...user.hospitalDetails,
        ...hospitalDetails
      };
    }

    // 🚫 Restricted (INTENTIONALLY BLOCKED)
    // email
    // role
    // bloodGroup
    // isApproved
    // donationHistory

    await user.save();

    res.json({ message: "Profile updated successfully" });

  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

