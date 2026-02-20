const mongoose = require("mongoose");

const pyqSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String, // extracted text from PDF or manual text
    required: true,
  },
  source: {
    type: String,
    enum: ["text", "pdf"],
    default: "text",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("PYQ", pyqSchema);