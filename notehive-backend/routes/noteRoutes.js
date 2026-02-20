const express = require("express");
const router = express.Router();
const Note = require("../models/Note");

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * ADD NOTE
 * POST /notes
 */
router.post("/", async (req, res) => {
  try {
    const { roomId, content } = req.body;

    if (!roomId || !content) {
      return res.status(400).json({ error: "roomId and content required" });
    }

    const note = new Note({ roomId, content });
    await note.save();

    res.json({ note });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 🔥 GENERATE QUESTIONS USING GEMINI
 * GET /notes/generate/:roomId
 * (MUST COME BEFORE /notes/:roomId)
 */
router.get("/generate/:roomId", async (req, res) => {
  try {
    const notes = await Note.find({ roomId: req.params.roomId });

    if (notes.length === 0) {
      return res.json({ output: "No notes found for this room." });
    }

    const combinedText = notes.map(n => n.content).join("\n");

    const prompt = `
Generate 5 clear exam-oriented questions with answers
from the following study notes.

Format strictly as:
Q1: question
A1: answer

Notes:
${combinedText}
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const result = await model.generateContent(prompt);
    const output = result.response.text();

    res.json({ output });

  } catch (error) {
    console.error("Gemini error:", error);
    res.status(500).json({ error: "Failed to generate questions" });
  }
});

/**
 * GET NOTES BY ROOM
 * GET /notes/:roomId
 */
/**
 * 🔥 GENERATE QUESTIONS USING GEMINI (Enhanced with PYQ Analysis)
 * GET /notes/generate/:roomId
 * (MUST COME BEFORE /notes/:roomId)
 */
router.get("/generate/:roomId", async (req, res) => {
  try {
    const PYQ = require("../models/PYQ");
    
    // Fetch both notes and PYQs
    const notes = await Note.find({ roomId: req.params.roomId });
    const pyqs = await PYQ.find({ roomId: req.params.roomId });

    if (notes.length === 0) {
      return res.json({ output: "No notes found for this room." });
    }

    const combinedNotes = notes.map(n => n.content).join("\n\n");
    const combinedPYQs = pyqs.map(p => `${p.title}:\n${p.content}`).join("\n\n---\n\n");

    // Enhanced prompt with PYQ pattern analysis
    const prompt = `
You are an expert exam question generator. Analyze the previous year questions (PYQs) to identify patterns, then generate exam-style questions from the study notes.

${pyqs.length > 0 ? `
PREVIOUS YEAR QUESTIONS (PYQs):
${combinedPYQs}

INSTRUCTIONS:
1. First, analyze the PYQs to identify:
   - Common question types (short answer, long answer, MCQ, numerical, etc.)
   - Frequently tested topics
   - Difficulty level and depth of answers expected
   - Marks distribution patterns

2. Based on this analysis, generate 8-10 questions from the study notes below that:
   - Follow similar patterns to the PYQs
   - Cover high-weightage topics identified in PYQs
   - Match the style and difficulty of actual exam questions
   - Include a mix of question types found in PYQs
` : `
No PYQs available. Generate 8-10 exam-oriented questions from the study notes.
`}

STUDY NOTES:
${combinedNotes}

FORMAT:
Q1: [question text]
A1: [detailed answer]

Q2: [question text]
A2: [detailed answer]

Generate questions now:
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const result = await model.generateContent(prompt);
    const output = result.response.text();

    res.json({ 
      output,
      pyqsAnalyzed: pyqs.length,
      notesUsed: notes.length
    });

  } catch (error) {
    console.error("Gemini error:", error);
    res.status(500).json({ error: "Failed to generate questions" });
  }
});

/**
 * DELETE NOTE
 * DELETE /notes/:noteId
 */
router.delete("/:noteId", async (req, res) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.noteId);

    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    res.json({ message: "Note deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
