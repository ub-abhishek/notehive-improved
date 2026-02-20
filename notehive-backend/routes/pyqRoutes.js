const express = require("express");
const router = express.Router();
const multer = require("multer");
const pdfParse = require("pdf-parse");
const PYQ = require("../models/PYQ");

const upload = multer({ storage: multer.memoryStorage() });

/**
 * ADD PYQ (TEXT)
 * POST /pyqs
 */
router.post("/", async (req, res) => {
  try {
    const { roomId, title, content } = req.body;

    if (!roomId || !title || !content) {
      return res.status(400).json({ error: "All fields required" });
    }

    const pyq = new PYQ({ roomId, title, content, source: "text" });
    await pyq.save();

    res.json({ pyq });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * ADD PYQ (PDF)
 * POST /pyqs/upload
 */
router.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    const { roomId, title } = req.body;

    if (!roomId || !title) {
      return res.status(400).json({ error: "roomId and title required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "PDF file required" });
    }

    const pdfData = await pdfParse(req.file.buffer);
    const content = pdfData.text;

    if (!content || content.length < 20) {
      return res.status(400).json({ error: "Could not extract text from PDF" });
    }

    const pyq = new PYQ({ roomId, title, content, source: "pdf" });
    await pyq.save();

    res.json({ pyq });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET PYQS BY ROOM
 * GET /pyqs/:roomId
 */
router.get("/room/:roomId", async (req, res) => {
  try {
    const pyqs = await PYQ.find({ roomId: req.params.roomId }).sort({ createdAt: -1 });
    res.json({ pyqs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE PYQ
 * DELETE /pyqs/:pyqId
 */
router.delete("/:pyqId", async (req, res) => {
  try {
    const pyq = await PYQ.findByIdAndDelete(req.params.pyqId);

    if (!pyq) {
      return res.status(404).json({ error: "PYQ not found" });
    }

    res.json({ message: "PYQ deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;