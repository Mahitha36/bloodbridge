const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/database");
const User = require("./models/User");
const bcrypt = require("bcrypt");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const hospitalRoutes = require("./routes/hospital");
const bloodBankRoutes = require("./routes/bloodbank");
const donorRoutes = require("./routes/donor");



connectDB().then(async () => {
  require("./cron/escalationJob");

  const existing = await User.findOne({ role: "super_admin" });
  if (!existing) {
    const password = "SuperAdmin@123";
    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name: "Super Admin",
      email: "superadmin@bloodbridge.com",
      phone: "0000000000",
      password: hashedPassword,
      role: "super_admin",
      isApproved: true,
      mustChangePassword: true
    });

    console.log("✅ SUPER ADMIN CREATED");
  }
});


const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("BloodBridge API running");
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/hospital", hospitalRoutes);
app.use("/api/bloodbank", bloodBankRoutes);
app.use("/api/donor", donorRoutes);
app.use("/api/user", require("./routes/user"));


console.log("User model loaded:", User.modelName);

const PORT = process.env.PORT || 5000;


app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
