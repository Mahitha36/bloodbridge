const mongoose = require("mongoose");

/**
 * Single User model for ALL roles:
 * donor | hospital | bloodbank | admin | super_admin
 */

const userSchema = new mongoose.Schema(
  {
    // Common fields for all users
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },

    password: {
      type: String,
      default: null
    },

    phone: {
      type: String,
      required: true
    },
    otp: {
      type: String,
      default: null
    },

    otpExpiry: {
      type: Date,
      default: null
    },

    role: {
      type: String,
      enum: ["donor", "hospital", "bloodbank", "admin", "super_admin"],
      required: true
    },

    // 👇 HOSPITAL-SPECIFIC DETAILS (HERE)
    hospitalDetails: {
      registrationNumber: {
        type: String
      },
      hospitalType: {
        type: String
      },
      licenseAuthority: {
        type: String
      },
      documentUrl: {
        type: String
      },
      address: {
        type: String
      },
      doctorInCharge: {
        type: String
      },

    },
    bloodBankDetails: {
      registrationId: {
        type: String
      },
      licenseAuthority: String,
      certificateUrl: String,
      address: String
    },

    // Donor-specific
    bloodGroup: {
      type: String,
      enum: ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"],
      default: null
    },

    // Location (used for distance calculation)
    location: {
      lat: {
        type: Number,
        default: null
      },
      lng: {
        type: Number,
        default: null
      }
    },

    // Approval logic (important)
    isApproved: {
      type: Boolean,
      default: function () {
        // donors are auto-approved
        return this.role === "donor";
      }
    },

    // Force password change on first login (admins)
    mustChangePassword: {
      type: Boolean,
      default: false
    },

    donationHistory: [
      {
        request: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "BloodRequest"
        },
        hospital: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        bloodGroup: String,
        donatedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    lastDonationDate: {
      type: Date,
      default: null
    },
    geoFence: {
      center: {
        lat: Number,
        lng: Number
      },
      radius: {
        type: Number, // meters
        default: 300
      }
    },
    cancelledAt: {
      type: Date,
      default: null
    }


  },
  {
    timestamps: true
  }
);

userSchema.virtual("geo").get(function () {
  if (this.location && this.location.lng != null && this.location.lat != null) {
    return { type: "Point", coordinates: [this.location.lng, this.location.lat] };
  }
  return null;
});


module.exports = mongoose.model("User", userSchema);

// optional: derived geo field for geospatial queries

// create 2dsphere index on a stored geo field — if you later store `geo` persistently do:
// userSchema.index({ geo: "2dsphere" });

