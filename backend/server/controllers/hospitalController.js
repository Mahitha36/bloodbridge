const { findEligibleDonors } = require("../services/matchingService");
const User = require("../models/User");
const { sendNotification } = require("../services/notificationService");
const BloodRequest = require("../models/BloodRequest");
const calculateDistance = require("../utils/calculateDistance");
const disaster = require("../config/disaster");

const SEARCH_RADII = [10, 15, 20];

/**
 * CREATE BLOOD REQUEST
 */
exports.createBloodRequest = async (req, res) => {
  try {
    const { bloodGroup, units, urgency } = req.body;

    if (!bloodGroup || !units) {
      return res.status(400).json({ message: "Blood group and units required" });
    }

    const request = await BloodRequest.create({
      hospital: req.user.id,
      bloodGroup,
      units,
      urgency
    });

    const hospital = await User.findById(req.user.id).select("name location");

    const donors = await findEligibleDonors(
      bloodGroup,
      hospital.location,
      request.searchRadiusKm
    );

    const subject = disaster.isEnabled()
      ? "🚨 EMERGENCY BLOOD ALERT – DISASTER MODE"
      : "🩸 Urgent Blood Request – BloodBridge";

    for (const donor of donors) {
      if (request.notifiedDonors.includes(donor._id)) continue;

      await sendNotification(
        donor.email,
        subject,
        `Hello ${donor.name},

🩸 Blood Group: ${bloodGroup}
🏥 Hospital: ${hospital.name}
⚠️ Urgency: ${urgency.toUpperCase()}

http://localhost:3000/donor/request/${request._id}
`
      );

      request.notifiedDonors.push(donor._id);
    }

    await request.save();

    res.status(201).json({ message: "Request created", request });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ESCALATE SEARCH RADIUS
 */
exports.escalateBloodRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.requestId);

    if (request.searchStage >= 3) {
      return res.status(400).json({ message: "Max radius reached" });
    }

    request.searchStage += 1;
    request.searchRadiusKm = SEARCH_RADII[request.searchStage - 1];

    const hospital = await User.findById(request.hospital).select("name location");

    const donors = await findEligibleDonors(
      request.bloodGroup,
      hospital.location,
      request.searchRadiusKm
    );

    for (const donor of donors) {
      if (request.notifiedDonors.includes(donor._id)) continue;

      await sendNotification(
        donor.email,
        "🩸 Blood Request Radius Expanded – BloodBridge",
        `Search radius expanded to ${request.searchRadiusKm} km`
      );

      request.notifiedDonors.push(donor._id);
    }

    await request.save();

    res.json({ message: "Radius escalated", radius: request.searchRadiusKm });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * DASHBOARD STATS
 */
exports.getHospitalDashboardStats = async (req, res) => {
  try {
    const hospitalId = req.user.id;

    const totalRequests = await BloodRequest.countDocuments({ hospital: hospitalId });
    const pendingRequests = await BloodRequest.countDocuments({ hospital: hospitalId, status: "pending" });
    const fulfilledRequests = await BloodRequest.countDocuments({ hospital: hospitalId, status: "fulfilled" });

    const acceptedRequests = await BloodRequest.aggregate([
      { $match: { hospital: hospitalId } },
      { $unwind: "$responses" },
      { $match: { "responses.status": "accepted" } },
      { $count: "acceptedCount" }
    ]);

    const completedDonations = await BloodRequest.aggregate([
      { $match: { hospital: hospitalId } },
      { $unwind: "$responses" },
      { $match: { "responses.status": "completed" } },
      { $count: "completedCount" }
    ]);

    completedDonations:
    completedDonations.length > 0
      ? completedDonations[0].completedCount
      : 0


    res.json({
      totalRequests,
      pendingRequests,
      fulfilledRequests,
      acceptedRequests: acceptedRequests[0]?.acceptedCount || 0
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * VIEW DONOR RESPONSES
 */
exports.getRequestResponses = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.requestId)
      .populate("responses.donor", "name bloodGroup location");

    if (!request) return res.status(404).json({ message: "Not found" });
    if (request.hospital.toString() !== req.user.id)
      return res.status(403).json({ message: "Access denied" });

    const hospital = await User.findById(req.user.id).select("location");

    const responses = request.responses.map(r => {
      // Donor info only if accepted or completed
      if (r.status === "accepted" || r.status === "completed") {
        let distance = null;

        if (r.donor.location) {
          distance = calculateDistance(
            hospital.location.lat,
            hospital.location.lng,
            r.donor.location.lat,
            r.donor.location.lng
          ).toFixed(2);
        }

        return {
          status: r.status,
          donorName: r.donor.name,
          bloodGroup: r.donor.bloodGroup,
          distanceKm: distance
        };
      }

      // For declined / pending: hide donor identity
      return {
        status: r.status,
        donorName: "Hidden",
        bloodGroup: null,
        distanceKm: null
      };
    });


    res.json(responses);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.cancelBloodRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Only owning hospital can cancel
    if (request.hospital.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Cannot cancel fulfilled request
    if (request.status === "fulfilled") {
      return res.status(400).json({
        message: "Cannot cancel a fulfilled request"
      });
    }

    if (request.status === "cancelled") {
      return res.status(400).json({
        message: "Request already cancelled"
      });
    }

    request.status = "cancelled";
    request.cancelledAt = new Date();

    await request.save();

    res.json({
      message: "Blood request cancelled successfully"
    });

  } catch (error) {
    console.error("CANCEL REQUEST ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
