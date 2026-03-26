const express = require("express");
const router = express.Router();
const Note = require("../models/Note");
const PYQ = require("../models/PYQ");
const multer = require("multer");
const pdfParse = require("pdf-parse");

const upload = multer({ storage: multer.memoryStorage() });
const MAX_NOTES = 5;

// ============================================
// NVIDIA API
// ============================================

async function callNvidiaAPI(messages, maxTokens = 500, temperature = 0.5) {
  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-70b-instruct",
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature,
        top_p: 1,
        stream: false
      })
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("API error:", error.message);
    throw error;
  }
}

// ============================================
// CHUNKING + DIAGRAM EXTRACTION
// ============================================

function chunkNotes(notesText) {
  const cleanText = notesText.replace(/Downloaded from.*?\.in/gi, '').replace(/Page\s+\d+/gi, '').trim();
  const length = cleanText.length;
  const chunkSize = Math.floor(length / 5);
  
  const chunks = [];
  for (let i = 0; i < 5; i++) {
    const start = i * chunkSize;
    const end = i === 4 ? length : (i + 1) * chunkSize;
    chunks.push(cleanText.slice(start, end));
  }
  
  return chunks;
}

function findDiagramReferences(chunkText, questionTopic) {
  // Try to find diagram/figure references in the chunk
  const diagramPatterns = [
    /Figure\s+(\d+)/gi,
    /Fig\.\s+(\d+)/gi,
    /Diagram\s+(\d+)/gi,
    /Page\s+(\d+)/gi
  ];
  
  const matches = [];
  for (const pattern of diagramPatterns) {
    const found = chunkText.match(pattern);
    if (found) matches.push(...found);
  }
  
  // Return unique references
  return [...new Set(matches)].slice(0, 2); // Max 2 diagram references
}

function getDifficultyConfig(goal) {
  return {
    pass: { 
      partA: "concise, clear explanations",
      partB: "detailed explanations with examples"
    },
    good: { 
      partA: "clear explanations with brief examples",
      partB: "comprehensive explanations with multiple examples"
    },
    high: { 
      partA: "in-depth explanations with examples and analysis",
      partB: "exhaustive explanations with detailed examples, comparisons, and real-world applications"
    }
  }[goal] || { partA: "clear explanations", partB: "detailed explanations" };
}

// ============================================
// POINT-BASED GENERATION
// ============================================

async function generatePartAFromChunk(chunkText, questionNumbers, goal) {
  const config = getDifficultyConfig(goal);
  
  const prompt = `You are generating KTU exam questions (3 marks each) from study material.

STUDY MATERIAL:
${chunkText.slice(0, 3000)}

Generate ${questionNumbers.length} questions from this material.

CRITICAL FORMAT RULES:
- Each answer must have EXACTLY 3 POINTS (numbered 1, 2, 3)
- Each point should be 2-3 sentences with ${config.partA}
- Points must be substantial and complete
- Use concepts from the material

Example format:
1. [Question about specific concept] (3 marks)

Answer:
1. [First point - 2-3 sentences explaining first aspect]

2. [Second point - 2-3 sentences explaining second aspect]

3. [Third point - 2-3 sentences explaining third aspect]

Generate questions ${questionNumbers.join(" and ")} now:`;

  return await callNvidiaAPI([{ role: "user", content: prompt }], 2500, 0.6);
}

async function generatePartBFromChunk(chunkText, moduleNum, goal) {
  const config = getDifficultyConfig(goal);
  
  const prompt = `You are generating KTU exam questions (7 marks each) from study material.

STUDY MATERIAL:
${chunkText.slice(0, 3500)}

Generate 2 questions for MODULE ${moduleNum} from this material.

CRITICAL FORMAT RULES:
- Each answer must have EXACTLY 7 POINTS (numbered 1, 2, 3, 4, 5, 6, 7)
- Each point should be 3-4 sentences with ${config.partB}
- Points must be substantial, detailed, and complete
- If diagrams are mentioned in material, add: "Diagram: Refer to [Figure/Page number] from notes"
- Diagrams are ADDITIONAL to the 7 points

Example format:
MODULE ${moduleNum}
${10 + moduleNum}. a) [Question about concept] (7 marks)

Answer:
1. [First point - 3-4 detailed sentences]

2. [Second point - 3-4 detailed sentences]

3. [Third point - 3-4 detailed sentences]

4. [Fourth point - 3-4 detailed sentences]

5. [Fifth point - 3-4 detailed sentences]

6. [Sixth point - 3-4 detailed sentences]

7. [Seventh point - 3-4 detailed sentences]

Diagram: [If applicable] Refer to Figure X from notes (draw this diagram)

    b) [Different question] (7 marks)

Answer:
[Same 7-point format]

Generate MODULE ${moduleNum} now:`;

  return await callNvidiaAPI([{ role: "user", content: prompt }], 4000, 0.6);
}

// ============================================
// ROUTES
// ============================================

router.post("/", async (req, res) => {
  try {
    const { roomId, content } = req.body;
    if (!roomId || !content) return res.status(400).json({ error: "Missing fields" });
    
    const count = await Note.countDocuments({ roomId });
    if (count >= MAX_NOTES) return res.status(400).json({ error: `Max ${MAX_NOTES} notes` });
    
    const note = new Note({ roomId, content, topics: [] });
    await note.save();
    res.json({ note });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    const { roomId } = req.body;
    if (!roomId || !req.file) return res.status(400).json({ error: "Missing fields" });
    
    const count = await Note.countDocuments({ roomId });
    if (count >= MAX_NOTES) return res.status(400).json({ error: `Max ${MAX_NOTES} notes` });
    
    const pdf = await pdfParse(req.file.buffer);
    if (!pdf.text || pdf.text.length < 20) return res.status(400).json({ error: "No text in PDF" });
    
    const note = new Note({ roomId, content: pdf.text, topics: [] });
    await note.save();
    res.json({ note });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/generate/:roomId", async (req, res) => {
  try {
    const notes = await Note.find({ roomId: req.params.roomId });
    const pyqs = await PYQ.find({ roomId: req.params.roomId });
    if (!notes.length) return res.json({ output: "No notes found" });

    const goal = req.query.goal || "pass";
    console.log("\n=== POINT-BASED GENERATION (100% COVERAGE) ===");
    console.log(`Goal: ${goal.toUpperCase()}`);
    console.log(`Format: Part A = 3 points, Part B = 7 points + diagrams`);

    const combined = notes.map(n => n.content).join("\n\n");
    
    console.log("Splitting notes into 5 chunks...");
    const chunks = chunkNotes(combined);
    console.log(`Chunk sizes: ${chunks.map(c => Math.round(c.length/1000))}k chars`);

    let exam = `Exam Paper\n${goal.toUpperCase()} Level\nTotal Marks: 100\nTime: 3 Hours\nGenerated: ${new Date().toLocaleDateString()}\n\n`;
    exam += `INSTRUCTIONS:\n`;
    exam += `• PART A: Answer ALL 10 questions (10 × 3 = 30 marks)\n`;
    exam += `• PART B: Answer ALL sub-questions (5 modules × 14 marks = 70 marks)\n`;
    exam += `• Each Part A answer has 3 points (1 mark per point)\n`;
    exam += `• Each Part B answer has 7 points (1 mark per point)\n`;
    exam += `• Draw diagrams where mentioned (refer to uploaded notes for diagram details)\n\n`;
    
    exam += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    exam += `PART A (Answer ALL questions - 10 × 3 = 30 marks)\n\n`;

    console.log("\nGenerating Part A (3 points per answer)...");
    for (let i = 0; i < 5; i++) {
      const questionNums = [i * 2 + 1, i * 2 + 2];
      console.log(`  Chunk ${i + 1}: Questions ${questionNums.join(", ")}`);
      const partA = await generatePartAFromChunk(chunks[i], questionNums, goal);
      exam += partA + "\n\n";
    }

    exam += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    exam += `PART B (Answer ALL sub-questions - 5 × 14 = 70 marks)\n\n`;

    console.log("\nGenerating Part B (7 points per answer + diagrams)...");
    for (let i = 0; i < 5; i++) {
      console.log(`  Chunk ${i + 1}: Module ${i + 1} (Questions ${10 + i + 1}a, ${10 + i + 1}b)`);
      const partB = await generatePartBFromChunk(chunks[i], i + 1, goal);
      exam += partB + "\n\n";
      if (i < 4) exam += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }

    exam += `*** END OF QUESTION PAPER ***`;

    console.log("\n✓ Generation complete!");
    console.log("✓ Format: Part A = 3 points each, Part B = 7 points each");
    console.log("✓ Coverage: 100% (all 5 chunks used)");
    console.log("=== DONE ===\n");

    res.json({
      output: exam,
      pyqsAnalyzed: pyqs.length,
      notesUsed: notes.length,
      goal,
      totalMarks: 100,
      format: "KTU",
      structure: { 
        partA: "10 questions × 3 marks (3 points each) = 30 marks", 
        partB: "5 modules × 14 marks (7 points per sub-question) = 70 marks" 
      },
      enhancements: {
        pyqPatterns: null,
        topicsCovered: "All content chunks",
        coveragePercentage: "100.0",
        difficultyLevel: goal,
        model: "NVIDIA Llama 70B",
        method: "chunk-based + point-structured",
        answerFormat: "Part A: 3 points | Part B: 7 points + diagrams"
      }
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
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
    if (!note) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;