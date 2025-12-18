const BloodRequest = require("../models/BloodRequest");
const User = require("../models/User");
const calculateDistance = require("../utils/calculateDistance");
const isInsideGeoFence = require("../utils/isInsideGeoFence");
const rules = require("../config/rules");
const disaster = require("../config/disaster");

/**
 * GET REQUEST DETAILS (POPUP DATA)
 */
exports.getRequestDetails = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.requestId)
      .populate("hospital", "name location");

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    const donor = await User.findById(req.user.id).select("location");

    if (!donor || !donor.location) {
      return res.status(400).json({ message: "Donor location not found" });
    }

    const distance = calculateDistance(
      donor.location.lat,
      donor.location.lng,
      request.hospital.location.lat,
      request.hospital.location.lng
    );

    res.json({
      requestId: request._id,
      bloodGroup: request.bloodGroup,
      urgency: request.urgency,
      hospital: {
        name: request.hospital.name,
        location: request.hospital.location
      },
      distanceKm: distance.toFixed(2)
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ACCEPT / DECLINE REQUEST
 */
exports.respondToRequest = async (req, res) => {
  try {
    const { requestId, response } = req.body;

    if (!["accepted", "declined"].includes(response)) {
      return res.status(400).json({ message: "Invalid response" });
    }

    const donor = await User.findById(req.user.id);
    const request = await BloodRequest.findById(requestId);

    if (!request || request.status !== "pending") {
      return res.status(400).json({ message: "Request not available" });
    }


    // Cooldown check
    if (response === "accepted" && donor.lastDonationDate) {
      const days =
        (Date.now() - new Date(donor.lastDonationDate)) /
        (1000 * 60 * 60 * 24);

      if (days < rules.DONATION_COOLDOWN_DAYS) {
        return res.status(403).json({
          message: "You are in donation cooldown period"
        });
      }
    }


    // Prevent duplicate response
    const alreadyResponded = request.responses.some(
      r => r.donor.toString() === req.user.id
    );

    if (alreadyResponded) {
      return res.status(400).json({ message: "Already responded" });
    }

    request.responses.push({
      donor: req.user.id,
      status: response
    });

    if (response === "accepted" && !request.timeline.firstAcceptedAt) {
      request.timeline.firstAcceptedAt = new Date();
    }

    await request.save();

    res.json({ message: `Request ${response}` });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * CHECK ARRIVAL (GEOFENCE)
 */
exports.checkArrival = async (req, res) => {
  try {
    const donor = await User.findById(req.user.id);
    const request = await BloodRequest.findById(req.params.requestId)
      .populate("hospital", "location geoFence");

    if (!donor || !donor.location) {
      return res.status(400).json({ message: "Location not available" });
    }

    const inside = isInsideGeoFence(
      donor.location,
      request.hospital.location,
      request.hospital.geoFence?.radius || 300
    );

    if (!inside) {
      return res.status(403).json({
        message: "You are outside the allowed area"
      });
    }

    res.json({ arrived: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * DONOR PROFILE
 */
exports.getDonorProfile = async (req, res) => {
  try {
    const donor = await User.findById(req.user.id)
      .select("name bloodGroup donationHistory lastDonationDate");

    let eligibleToDonate = true;
    let cooldownRemainingDays = 0;

    if (donor.lastDonationDate) {
      const days =
        (Date.now() - new Date(donor.lastDonationDate)) /
        (1000 * 60 * 60 * 24);

      if (days < rules.DONATION_COOLDOWN_DAYS) {
        eligibleToDonate = false;
        cooldownRemainingDays = Math.ceil(
          rules.DONATION_COOLDOWN_DAYS - days
        );
      }
    }

    res.json({
      name: donor.name,
      bloodGroup: donor.bloodGroup,
      totalDonations: donor.donationHistory.length,
      lastDonationDate: donor.lastDonationDate,
      eligibleToDonate,
      cooldownRemainingDays,
      donationHistory: donor.donationHistory
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
