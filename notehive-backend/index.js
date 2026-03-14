require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const roomRoutes = require("./routes/roomRoutes");
const noteRoutes = require("./routes/noteRoutes");
const authRoutes = require("./routes/authRoutes");
const pyqRoutes = require("./routes/pyqRoutes");
const authMiddleware = require("./middleware/auth");

const app = express();

// =====================
// Middleware
// =====================
app.use(cors());
app.use(express.json());

// =====================
// Routes
// =====================
app.use("/auth", authRoutes);
app.use("/rooms", authMiddleware, roomRoutes);
app.use("/notes", authMiddleware, noteRoutes);
app.use("/pyqs", authMiddleware, pyqRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("NoteHive Backend is running");
});

// =====================
// Database + Server
// =====================
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Atlas connected");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });