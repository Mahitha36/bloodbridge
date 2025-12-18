const BloodRequest = require("../models/BloodRequest");
const User = require("../models/User");
const BloodInventory = require("../models/BloodInventory");
const calculateDistance = require("../utils/calculateDistance");

/**
 * GET NEARBY BLOOD BANKS (Donor / Hospital)
 */
exports.getNearbyBloodBanks = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: "Location required" });
    }

    const bloodBanks = await User.find({
      role: "bloodbank",
      isApproved: true
    }).select("name location");

    const nearbyBloodBanks = [];

    for (const bank of bloodBanks) {
      if (!bank.location) continue;

      const distance = calculateDistance(
        parseFloat(lat),
        parseFloat(lng),
        bank.location.lat,
        bank.location.lng
      );

      if (distance <= 15) {
        const inventory = await BloodInventory.find({
          bloodBank: bank._id
        });

        nearbyBloodBanks.push({
          _id: bank._id,
          name: bank.name,
          distance: distance.toFixed(2),
          inventory
        });
      }
    }

    res.json(nearbyBloodBanks);
  } catch (error) {
    console.error("NEARBY BLOOD BANK ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ADD / UPDATE INVENTORY
 */
exports.updateInventory = async (req, res) => {
  try {
    const { bloodGroup, unitsAvailable } = req.body;

    if (!bloodGroup || unitsAvailable === undefined) {
      return res.status(400).json({ message: "Invalid data" });
    }

    const inventory = await BloodInventory.findOneAndUpdate(
      { bloodBank: req.user.id, bloodGroup },
      { unitsAvailable },
      { upsert: true, new: true }
    );

    res.json({
      message: "Inventory updated",
      inventory
    });
  } catch (error) {
    console.error("UPDATE INVENTORY ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * VIEW ALL INVENTORY (Blood Bank)
 */
exports.getInventory = async (req, res) => {
  try {
    const inventory = await BloodInventory.find({
      bloodBank: req.user.id
    });

    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * VIEW PENDING BLOOD REQUESTS
 */
exports.getBloodRequests = async (req, res) => {
  try {
    const requests = await BloodRequest.find({ status: "pending" })
      .populate("hospital", "name email phone");

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * FULFILL BLOOD REQUEST
 * ALSO UPDATE DONOR DONATION HISTORY
 */
exports.fulfillRequest = async (req, res) => {
  try {
    const { requestId } = req.body;

    const request = await BloodRequest.findById(requestId);
    if (!request || request.status !== "pending") {
      return res.status(400).json({ message: "Invalid request" });
    }

    const inventory = await BloodInventory.findOne({
      bloodBank: req.user.id,
      bloodGroup: request.bloodGroup
    });

    if (!inventory || inventory.unitsAvailable < request.units) {
      return res.status(400).json({ message: "Insufficient stock" });
    }

    // ✅ Reduce inventory
    inventory.unitsAvailable -= request.units;

    // ✅ Update request status
    request.status = "fulfilled";
    request.fulfilledBy = req.user.id;

    
    // ✅ Mark donor as completed (if donor-based fulfillment)
    if (request.responses && request.responses.length > 0) {
      const response = request.responses.find(
        r => r.status === "accepted"
      );

      if (response) {
        response.status = "completed";
      }
    }

    request.timeline.fulfilledAt = new Date();


    // ✅ FIND ACCEPTED DONOR (FIRST ONE)
    const acceptedResponse = request.responses.find(
      r => r.status === "accepted"
    );

    if (acceptedResponse) {
      const donor = await User.findById(acceptedResponse.donor);

      if (donor) {
        donor.donationHistory.push({
          request: request._id,
          hospital: request.hospital,
          bloodGroup: donor.bloodGroup
        });

        donor.lastDonationDate = new Date();
        await donor.save();
      }
    }

    // ✅ Save changes
    await inventory.save();
    await request.save();

    res.json({
      message: "Request fulfilled successfully and donor history updated"
    });

  } catch (error) {
    console.error("FULFILL REQUEST ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
