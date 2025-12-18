const express = require("express");
const router = express.Router();

const bloodBankController = require("../controllers/bloodBankController");
const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");
const approvalCheck = require("../middleware/approvalCheck");

// Inventory
router.post(
  "/inventory",
  auth,
  roleCheck("bloodbank"),
  bloodBankController.updateInventory
);

router.get(
  "/inventory",
  auth,
  roleCheck("bloodbank"),
  bloodBankController.getInventory
);

// Requests
router.get(
  "/requests",
  auth,
  roleCheck("bloodbank"),
  bloodBankController.getBloodRequests
);

router.post(
  "/fulfill",
  auth,
  roleCheck("bloodbank"),
  bloodBankController.fulfillRequest
);

router.get(
  "/nearby",
  auth,
  bloodBankController.getNearbyBloodBanks
);

router.post(
  "/inventory",
  auth,
  roleCheck("bloodbank"),
  approvalCheck,
  bloodBankController.updateInventory
);


module.exports = router;
