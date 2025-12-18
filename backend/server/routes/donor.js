const express = require("express");
const router = express.Router();

const donorController = require("../controllers/donorController");
const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

router.post(
  "/respond",
  auth,
  roleCheck("donor"),
  donorController.respondToRequest
);
router.get(
  "/request/:requestId",
  auth,
  roleCheck("donor"),
  donorController.getRequestDetails
);
router.get(
  "/check-arrival/:requestId",
  auth,
  roleCheck("donor"),
  donorController.checkArrival
);

router.get(
  "/profile",
  auth,
  roleCheck("donor"),
  donorController.getDonorProfile
);



module.exports = router;
