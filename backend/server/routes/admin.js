const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

router.post(
  "/create-admin",
  auth,
  roleCheck("super_admin"),
  adminController.createAdmin
);

router.get(
  "/pending-users",
  auth,
  roleCheck("admin", "super_admin"),
  adminController.getPendingUsers
);


router.post(
  "/approve-user",
  auth,
  roleCheck("admin"),
  adminController.approveUser
);

router.post(
  "/disaster-mode",
  auth,
  roleCheck("super_admin"),
  adminController.toggleDisasterMode
);

module.exports = router;
