const User = require("../models/User");
const calculateDistance = require("../utils/calculateDistance");
const compatibility = require("../utils/bloodCompatibility");


exports.findEligibleDonors = async (requiredBloodGroup, hospitalLocation, radiusKm) => {
  const donors = await User.find({
    role: "donor",
    isApproved: true,
    location: { $ne: null }
  });

  return donors.filter(donor => {
    if (!donor.bloodGroup || !donor.location) return false;

    const canDonate =
      compatibility[donor.bloodGroup]?.includes(requiredBloodGroup);

    if (!canDonate) return false;

    const distance = calculateDistance(
      hospitalLocation.lat,
      hospitalLocation.lng,
      donor.location.lat,
      donor.location.lng
    );

    return distance <= radiusKm;
  });
};


exports.createBloodRequest = async (req, res) => {
  try {
    const { bloodGroup, units, urgency } = req.body;

    if (!bloodGroup || !units) {
      return res.status(400).json({ message: "Blood group and units required" });
    }

    // 1️⃣ Save blood request
    const request = new BloodRequest({
      hospital: req.user.id,
      bloodGroup,
      units,
      urgency
    });
    await request.save();

    // 2️⃣ Fetch hospital details
    const hospital = await User.findById(req.user.id).select("name location");

    if (!hospital || !hospital.location || hospital.location.lat == null) {
      return res.status(400).json({
        message: "Hospital location not found"
      });
    }

    // 3️⃣ Find eligible donors
    const donors = await findEligibleDonors(
      bloodGroup,
      hospital.location
    );

    // 4️⃣ Disaster-aware notification content
    const subject = disaster.isEnabled()
      ? "🚨 EMERGENCY BLOOD ALERT – DISASTER MODE"
      : "🩸 Urgent Blood Request – BloodBridge";

    const bodyPrefix = disaster.isEnabled()
      ? "🚨 DISASTER MODE ACTIVE\nImmediate blood donation required.\n\n"
      : "";

    // 5️⃣ Send notification to each donor
    for (const donor of donors) {
      await sendNotification(
        donor.email,
        subject,
        `${bodyPrefix}
Hello ${donor.name},

🩸 Blood Required: ${bloodGroup}
🧑‍🦰 Your Blood Group: ${donor.bloodGroup}${donor.bloodGroup === "O-"
          ? " (Universal Donor)"
          : ""
        }

🏥 Hospital: ${hospital.name}
⚠️ Urgency Level: ${urgency.toUpperCase()}

👉 Click here to respond:
http://localhost:3000/donor/request/${request._id}

Please respond as soon as possible.

– BloodBridge Team....`
      );

    }

    res.status(201).json({
      message: "Blood request created and donors notified successfully",
      request
    });

  } catch (error) {
    console.error("CREATE BLOOD REQUEST ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * HOSPITAL DASHBOARD STATS
 */
exports.getHospitalDashboardStats = async (req, res) => {
  try {
    const hospitalId = req.user.id;

    const totalRequests = await BloodRequest.countDocuments({
      hospital: hospitalId
    });

    const pendingRequests = await BloodRequest.countDocuments({
      hospital: hospitalId,
      status: "pending"
    });

    const fulfilledRequests = await BloodRequest.countDocuments({
      hospital: hospitalId,
      status: "fulfilled"
    });

    const acceptedRequests = await BloodRequest.aggregate([
      { $match: { hospital: hospitalId } },
      { $unwind: "$responses" },
      { $match: { "responses.status": "accepted" } },
      { $count: "acceptedCount" }
    ]);

    res.json({
      totalRequests,
      pendingRequests,
      fulfilledRequests,
      acceptedRequests:
        acceptedRequests.length > 0 ? acceptedRequests[0].acceptedCount : 0
    });

  } catch (error) {
    console.error("HOSPITAL DASHBOARD ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * VIEW DONOR RESPONSES FOR A REQUEST
 */
exports.getRequestResponses = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.requestId)
      .populate("responses.donor", "name bloodGroup location");

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.hospital.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const hospital = await User.findById(req.user.id).select("location");

    const responses = request.responses.map(r => {
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
        donorName: r.donor.name,
        bloodGroup: r.donor.bloodGroup,
        status: r.status,
        distanceKm: distance
      };
    });

    res.json(responses);

  } catch (error) {
    console.error("REQUEST RESPONSES ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
