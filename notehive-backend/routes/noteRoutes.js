const express = require("express");
const router = express.Router();
const Note = require("../models/Note");
const PYQ = require("../models/PYQ");
const Groq = require("groq-sdk");
const multer = require("multer");
const pdfParse = require("pdf-parse");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const upload = multer({ storage: multer.memoryStorage() });

const MAX_NOTES = 5;
const MAX_PYQS = 1;

// ============================================
// HELPER FUNCTIONS
// ============================================

async function extractPYQPatterns(pyqContent) {
  try {
    const prompt = `Analyze this KTU previous year question paper and extract patterns.

PYQ:
${pyqContent.slice(0, 3000)}

Extract ONLY a JSON object with:
{
  "partAPatterns": ["Explain", "Define", "What is", "Distinguish"],
  "partBPatterns": ["Explain with diagram", "Discuss", "Calculate", "Distinguish between"],
  "frequentTopics": ["topic1", "topic2"],
  "difficultyLevel": "moderate"
}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      max_tokens: 400,
    });

    const response = completion.choices[0]?.message?.content || "{}";
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("PYQ pattern extraction failed:", error);
    return null;
  }
}

async function extractTopics(notesContent) {
  try {
    const prompt = `Extract 10-15 main topics from these notes. Return ONLY a JSON array.

Notes:
${notesContent.slice(0, 3000)}

Return: ["topic1", "topic2", ...]`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      max_tokens: 250,
    });

    const response = completion.choices[0]?.message?.content || "[]";
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    return [];
  }
}

function checkTopicCoverage(generatedPaper, extractedTopics) {
  if (!extractedTopics || extractedTopics.length === 0) return 100;
  let coveredCount = 0;
  const paperLower = generatedPaper.toLowerCase();
  for (const topic of extractedTopics) {
    if (paperLower.includes(topic.toLowerCase())) coveredCount++;
  }
  return (coveredCount / extractedTopics.length) * 100;
}

function getDifficultyConfig(goal) {
  const configs = {
    pass: {
      partA: "1-2 paragraphs with basic definition and simple explanation",
      partB_each: "3-4 paragraphs per sub-question. Each 7-mark answer should have: definition (1 mark) + explanation (4 marks) + example (2 marks)",
      depth: "Basic understanding, simple examples"
    },
    good: {
      partA: "2-3 paragraphs with clear definition and detailed explanation",
      partB_each: "4-6 paragraphs per sub-question. Each 7-mark answer should have: definition (1 mark) + detailed explanation (4 marks) + diagram/example (2 marks)",
      depth: "Comprehensive understanding with analysis"
    },
    high: {
      partA: "3-4 paragraphs with definition, detailed explanation, and examples",
      partB_each: "6-8 paragraphs per sub-question. Each 7-mark answer should have: definition (1 mark) + exhaustive explanation (4-5 marks) + diagram + multiple examples (2 marks)",
      depth: "Deep analysis, critical thinking, real-world applications"
    }
  };
  return configs[goal] || configs.pass;
}

// ============================================
// ROUTES
// ============================================

router.post("/", async (req, res) => {
  try {
    const { roomId, content } = req.body;
    if (!roomId || !content) {
      return res.status(400).json({ error: "roomId and content required" });
    }
    const noteCount = await Note.countDocuments({ roomId });
    if (noteCount >= MAX_NOTES) {
      return res.status(400).json({ error: `Maximum ${MAX_NOTES} notes allowed.` });
    }
    const topics = await extractTopics(content);
    const note = new Note({ roomId, content, topics: topics });
    await note.save();
    res.json({ note });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ error: "roomId required" });
    if (!req.file) return res.status(400).json({ error: "PDF file required" });
    const noteCount = await Note.countDocuments({ roomId });
    if (noteCount >= MAX_NOTES) {
      return res.status(400).json({ error: `Maximum ${MAX_NOTES} notes allowed.` });
    }
    const pdfData = await pdfParse(req.file.buffer);
    const content = pdfData.text;
    if (!content || content.length < 20) {
      return res.status(400).json({ error: "Could not extract text from PDF" });
    }
    const topics = await extractTopics(content);
    const note = new Note({ roomId, content, topics: topics });
    await note.save();
    res.json({ note });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * ULTIMATE EXAM GENERATION - PERFECT KTU FORMAT
 */
router.get("/generate/:roomId", async (req, res) => {
  try {
    const notes = await Note.find({ roomId: req.params.roomId });
    const pyqs = await PYQ.find({ roomId: req.params.roomId });

    if (notes.length === 0) {
      return res.json({ output: "No notes found." });
    }

    const goal = req.query.goal || "pass";
    console.log("=== ULTIMATE KTU EXAM GENERATION ===");

    // Extract patterns
    let pyqPatterns = null;
    if (pyqs.length > 0) {
      console.log("Extracting PYQ patterns...");
      pyqPatterns = await extractPYQPatterns(pyqs[0].content);
    }

    // Get topics
    let allTopics = [];
    for (const note of notes) {
      if (note.topics && note.topics.length > 0) {
        allTopics.push(...note.topics);
      }
    }
    allTopics = [...new Set(allTopics)];

    const difficultyConfig = getDifficultyConfig(goal);
    const combinedNotes = notes.map(n => n.content).join("\n\n");

    const systemPrompt = `You are a KTU exam paper generator. Generate REALISTIC exam papers matching ACTUAL KTU format.

CRITICAL KTU FORMAT RULES:
1. Part A: 10 questions × 3 marks = 30 marks (ALL compulsory)
2. Part B: 5 modules, each module has ONE question with TWO sub-parts
   - Module 1: Q11 has (a) 7 marks + (b) 7 marks = 14 marks total
   - Module 2: Q12 has (a) 7 marks + (b) 7 marks = 14 marks total
   - Module 3: Q13 has (a) 7 marks + (b) 7 marks = 14 marks total
   - Module 4: Q14 has (a) 7 marks + (b) 7 marks = 14 marks total
   - Module 5: Q15 has (a) 7 marks + (b) 7 marks = 14 marks total
3. Students answer BOTH sub-questions (a) AND (b) for each module
4. Total: 100 marks

DIFFICULTY: ${goal.toUpperCase()}
- Part A answers: ${difficultyConfig.partA}
- Part B answers: ${difficultyConfig.partB_each}

${pyqPatterns ? `PYQ PATTERNS DETECTED:
- Part A verbs: ${pyqPatterns.partAPatterns?.join(", ")}
- Part B verbs: ${pyqPatterns.partBPatterns?.join(", ")}
- Frequent topics: ${pyqPatterns.frequentTopics?.join(", ")}
USE THESE EXACT PATTERNS IN YOUR QUESTIONS.` : ''}

${allTopics.length > 0 ? `TOPICS TO COVER: ${allTopics.slice(0, 15).join(", ")}` : ''}

ANSWER WRITING RULES:
- Part A (3 marks): ${difficultyConfig.partA}
- Part B EACH SUB-QUESTION (7 marks): ${difficultyConfig.partB_each}
- NO fabrication - use ONLY information from notes
- Include [Diagram: name] where diagrams are needed`;

    const userPrompt = `STUDY NOTES:
${combinedNotes.slice(0, 7000)}

Generate complete KTU exam paper with answers. Follow this EXACT format:

PART A
Answer ALL questions (10 × 3 = 30 marks)

1. [Question from Module 1]

Answer:
[${difficultyConfig.partA}]

2. [Question from Module 1]

Answer:
[${difficultyConfig.partA}]

3. [Question from Module 2]

Answer:
[${difficultyConfig.partA}]

4. [Question from Module 2]

Answer:
[${difficultyConfig.partA}]

5. [Question from Module 3]

Answer:
[${difficultyConfig.partA}]

6. [Question from Module 3]

Answer:
[${difficultyConfig.partA}]

7. [Question from Module 4]

Answer:
[${difficultyConfig.partA}]

8. [Question from Module 4]

Answer:
[${difficultyConfig.partA}]

9. [Question from Module 5]

Answer:
[${difficultyConfig.partA}]

10. [Question from Module 5]

Answer:
[${difficultyConfig.partA}]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PART B
Answer ALL sub-questions from EACH module (5 × 14 = 70 marks)

MODULE 1

11. a) [Question using KTU pattern] (7 marks)

Answer:
[${difficultyConfig.partB_each}]

    b) [Different question using KTU pattern] (7 marks)

Answer:
[${difficultyConfig.partB_each}]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODULE 2

12. a) [Question using KTU pattern] (7 marks)

Answer:
[${difficultyConfig.partB_each}]

    b) [Different question using KTU pattern] (7 marks)

Answer:
[${difficultyConfig.partB_each}]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODULE 3

13. a) [Question using KTU pattern] (7 marks)

Answer:
[${difficultyConfig.partB_each}]

    b) [Different question using KTU pattern] (7 marks)

Answer:
[${difficultyConfig.partB_each}]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODULE 4

14. a) [Question using KTU pattern] (7 marks)

Answer:
[${difficultyConfig.partB_each}]

    b) [Different question using KTU pattern] (7 marks)

Answer:
[${difficultyConfig.partB_each}]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODULE 5

15. a) [Question using KTU pattern] (7 marks)

Answer:
[${difficultyConfig.partB_each}]

    b) [Different question using KTU pattern] (7 marks)

Answer:
[${difficultyConfig.partB_each}]

Generate now:`;

    console.log("Generating exam with PERFECT KTU format...");
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 7500,
    });

    const generatedPaper = completion.choices[0]?.message?.content || "";
    const coverage = checkTopicCoverage(generatedPaper, allTopics);

    console.log(`Topic coverage: ${coverage.toFixed(1)}%`);
    console.log("=== GENERATION COMPLETE ===");

    res.json({
      output: generatedPaper,
      pyqsAnalyzed: pyqs.length,
      notesUsed: notes.length,
      goal: goal,
      totalMarks: 100,
      format: "KTU",
      structure: {
        partA: "10 questions × 3 marks = 30 marks",
        partB: "5 modules × 14 marks (7+7) = 70 marks"
      },
      enhancements: {
        pyqPatterns: pyqPatterns,
        topicsCovered: allTopics.length,
        coveragePercentage: coverage.toFixed(1),
        difficultyLevel: goal
      }
    });

  } catch (error) {
    console.error("Exam generation error:", error);
    res.status(500).json({ error: "Failed to generate questions" });
  }
});

router.get("/:roomId", async (req, res) => {
  try {
    const notes = await Note.find({ roomId: req.params.roomId });
    res.json({ notes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:noteId", async (req, res) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.noteId);
    if (!note) return res.status(404).json({ error: "Note not found" });
    res.json({ message: "Note deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;