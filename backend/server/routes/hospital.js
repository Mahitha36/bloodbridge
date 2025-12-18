const express = require("express");
const router = express.Router();

const hospitalController = require("../controllers/hospitalController");
const auth = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

const approvalCheck = require("../middleware/approvalCheck");

// Hospital creates blood request
router.post(
  "/create-request",
  auth,
  roleCheck("hospital"),
  hospitalController.createBloodRequest
);

router.get(
  "/dashboard-stats",
  auth,
  roleCheck("hospital"),
  hospitalController.getHospitalDashboardStats
);

router.get(
  "/request/:requestId/responses",
  auth,
  roleCheck("hospital"),
  hospitalController.getRequestResponses
);
router.post(
  "/request/:requestId/cancel",
  auth,
  roleCheck("hospital"),
  hospitalController.cancelBloodRequest
);


router.post(
  "/create-request",
  auth,
  roleCheck("hospital"),
  approvalCheck,
  hospitalController.createBloodRequest
);


module.exports = router;
