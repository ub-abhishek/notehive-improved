const express = require("express");
const router = express.Router();
const Room = require("../models/Room");

/**
 * CREATE ROOM
 * POST /rooms
 */
router.post("/", async (req, res) => {
  try {
    const { roomName } = req.body;

    if (!roomName) {
      return res.status(400).json({ error: "roomName is required" });
    }

    const room = new Room({ roomName });
    await room.save();

    res.json({
      message: "Room created",
      room,
    });
  } catch (error) {
    console.error("Create room error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET ALL ROOMS
 * GET /rooms
 */
router.get("/", async (req, res) => {
  try {
    const rooms = await Room.find().sort({ _id: -1 });
    res.json({ rooms });
  } catch (error) {
    console.error("Fetch rooms error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET SINGLE ROOM BY ID
 * GET /rooms/:roomId
 */
router.get("/:roomId", async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    res.json({ room });
  } catch (error) {
    console.error("Fetch room error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE ROOM
 * DELETE /rooms/:roomId
 */
router.delete("/:roomId", async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.roomId);

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Optional: Also delete all notes and PYQs in this room
    const Note = require("../models/Note");
    const PYQ = require("../models/PYQ");
    await Note.deleteMany({ roomId: req.params.roomId });
    await PYQ.deleteMany({ roomId: req.params.roomId });

    res.json({ message: "Room and all its content deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
module.exports = router;
