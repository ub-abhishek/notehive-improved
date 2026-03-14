const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  // IMPROVEMENT 6: Cache extracted topics
  topics: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Note", noteSchema);