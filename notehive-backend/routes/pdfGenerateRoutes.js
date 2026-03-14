const express = require("express");
const router = express.Router();
const multer = require("multer");
const pdfParse = require("pdf-parse");
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /pdf/generate
 * Upload PDF → Extract text → Groq AI → Q&A
 */
router.post("/generate", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "PDF file required" });
    }

    // Extract text from PDF
    const pdfData = await pdfParse(req.file.buffer);
    const extractedText = pdfData.text;

    if (!extractedText || extractedText.length < 50) {
      return res.json({ output: "PDF content too short to generate questions." });
    }

    const prompt = `Generate 5 exam-oriented questions with detailed answers from the following study material.

FORMAT:
Q1: [question text]
A1: [detailed answer]

Q2: [question text]
A2: [detailed answer]

Study material:
${extractedText}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 3000,
    });

    const output = completion.choices[0]?.message?.content || "";

    res.json({ output });

  } catch (error) {
    console.error("PDF AI error:", error);
    res.status(500).json({ error: "Failed to process PDF" });
  }
});

module.exports = router;