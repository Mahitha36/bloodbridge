module.exports = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Donors are auto-approved
  if (req.user.role === "donor") {
    return next();
  }

  // Admins & super admins don't need approval
  if (req.user.role === "admin" || req.user.role === "super_admin") {
    return next();
  }

  // Hospitals & blood banks must be approved
  if (!req.user.isApproved) {
    return res.status(403).json({
      message: "Account not approved by admin yet"
    });
  }

  next();
};
