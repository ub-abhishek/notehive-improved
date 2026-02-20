const express = require("express");
const router = express.Router();
const Resource = require("../models/Resource");

/**
 * ADD RESOURCE
 * POST /resources
 */
router.post("/", async (req, res) => {
  try {
    const { roomId, title, content } = req.body;

    if (!roomId || !title || !content) {
      return res.status(400).json({ error: "All fields required" });
    }

    const resource = new Resource({ roomId, title, content });
    await resource.save();

    res.json({ resource });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET RESOURCES BY ROOM
 * GET /resources/:roomId
 */
router.get("/:roomId", async (req, res) => {
  try {
    const resources = await Resource.find({ roomId: req.params.roomId })
      .sort({ createdAt: -1 });

    res.json({ resources });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
