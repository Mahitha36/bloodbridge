const mongoose = require("mongoose");

const bloodRequestSchema = new mongoose.Schema(
  {
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    bloodGroup: {
      type: String,
      enum: ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"],
      required: true
    },

    units: {
      type: Number,
      required: true,
      min: 1
    },

    urgency: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium"
    },

    status: {
      type: String,
      enum: ["pending", "fulfilled", "cancelled"],
      default: "pending"
    },

    fulfilledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    // Donor responses
    responses: [
      {
        donor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        status: {
          type: String,
          enum: ["accepted", "declined", "completed"],
          required: true
        },

        respondedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    // Radius escalation
    searchStage: {
      type: Number,
      enum: [1, 2, 3],
      default: 1
    },

    searchRadiusKm: {
      type: Number,
      default: 10
    },

    // Prevent donor spam
    notifiedDonors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    timeline: {
      firstAcceptedAt: Date,
      fulfilledAt: Date
    }

  },
  { timestamps: true }
);

module.exports = mongoose.model("BloodRequest", bloodRequestSchema);
