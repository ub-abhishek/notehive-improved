const express = require("express");
const router = express.Router();
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * POST /pdf/generate
 * Upload PDF → Extract text → Gemini → Q&A
 */
router.post("/generate", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "PDF file required" });
    }

    // 1️⃣ Extract text from PDF
    const pdfData = await pdfParse(req.file.buffer);
    const extractedText = pdfData.text;

    if (!extractedText || extractedText.length < 50) {
      return res.json({ output: "PDF content too short to generate questions." });
    }

    // 2️⃣ Gemini prompt
    const prompt = `
Generate 5 exam-oriented questions with detailed answers
from the following study material.

Format strictly as:
Q1: question
A1: answer

Study material:
${extractedText}
`;

    // 3️⃣ Call Gemini
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const result = await model.generateContent(prompt);
    const output = result.response.text();

    res.json({ output });

  } catch (error) {
    console.error("PDF AI error:", error);
    res.status(500).json({ error: "Failed to process PDF" });
  }
});

module.exports = router;
