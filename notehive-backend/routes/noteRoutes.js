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

/**
 * ADD NOTE (TEXT)
 */
router.post("/", async (req, res) => {
  try {
    const { roomId, content } = req.body;
    if (!roomId || !content) {
      return res.status(400).json({ error: "roomId and content required" });
    }
    const noteCount = await Note.countDocuments({ roomId });
    if (noteCount >= MAX_NOTES) {
      return res.status(400).json({ 
        error: `Maximum ${MAX_NOTES} notes allowed per room. Delete old notes to add new ones.` 
      });
    }
    const note = new Note({ roomId, content });
    await note.save();
    res.json({ note });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * ADD NOTE FROM PDF
 */
router.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    const { roomId } = req.body;
    if (!roomId) {
      return res.status(400).json({ error: "roomId required" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "PDF file required" });
    }
    const noteCount = await Note.countDocuments({ roomId });
    if (noteCount >= MAX_NOTES) {
      return res.status(400).json({ 
        error: `Maximum ${MAX_NOTES} notes allowed per room. Delete old notes to add new ones.` 
      });
    }
    const pdfData = await pdfParse(req.file.buffer);
    const content = pdfData.text;
    if (!content || content.length < 20) {
      return res.status(400).json({ error: "Could not extract text from PDF" });
    }
    const note = new Note({ roomId, content });
    await note.save();
    res.json({ note });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GENERATE KTU FORMAT EXAM PAPER
 */
router.get("/generate/:roomId", async (req, res) => {
  try {
    const notes = await Note.find({ roomId: req.params.roomId });
    const pyqs = await PYQ.find({ roomId: req.params.roomId });

    if (notes.length === 0) {
      return res.json({ output: "No notes found. Please add at least 1 note to generate exam paper." });
    }

    const goal = req.query.goal || "pass";
    const totalMarks = 100; // Fixed for KTU

    const combinedNotes = notes.map(n => n.content).join("\n\n===MODULE SEPARATOR===\n\n");
    
    // PYQ Analysis
    let pyqSection = "";
    if (pyqs.length > 0) {
      pyqSection = `
PREVIOUS YEAR QUESTION PAPER (FOR PATTERN ANALYSIS):
Title: ${pyqs[0].title}
Content:
${pyqs[0].content}

ANALYZE THIS PYQ TO:
1. Identify common question patterns (verbs like: Explain, Distinguish, State and explain, Write notes on, Discuss, Illustrate with diagram, Diagrammatically explain, Compare)
2. Extract frequently tested topics
3. Understand diagram requirements
4. Note question phrasing style
`;
    }

    const systemPrompt = `You are an AI system responsible for generating Kerala Technological University (KTU) exam papers and answers.

The system receives:
• Uploaded study notes (Modules 1–5)
• Previous year question papers (PYQ)
• Selected difficulty level (${goal.toUpperCase()})

Your job is to generate a realistic KTU-style exam paper with answers, strictly following the rules below.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. EXAM STRUCTURE (MANDATORY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The generated exam paper must strictly follow the KTU format.

PART A
10 questions × 3 marks = 30 marks
All questions compulsory.

PART B
Answer ONE question from EACH module.
• Module 1 → Question 11 (a or b) → 14 marks
• Module 2 → Question 12 (a or b) → 14 marks
• Module 3 → Question 13 (a or b) → 14 marks
• Module 4 → Question 14 (a or b) → 14 marks
• Module 5 → Question 15 (a or b) → 14 marks

Total marks = 100.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. USE THE UPLOADED NOTES AS PRIMARY SOURCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All answers must be derived from the uploaded notes.

Process:
1. Identify the module related to the question.
2. Retrieve the relevant content from the notes.
3. Generate the answer using that content.
4. Paraphrase only slightly for clarity.

Rules:
• Do NOT fabricate theories not present in the notes.
• Do NOT invent formulas or numerical problems.
• Do NOT introduce unrelated economic concepts.

Answers must stay consistent with the syllabus.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. PYQ PATTERN AWARENESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Analyze the previous year question papers and mimic their style.

Common KTU verbs include:
• Explain
• Distinguish
• State and explain
• Write notes on
• Discuss
• Illustrate with diagram
• Diagrammatically explain
• Compare

Avoid quiz-style or MCQ questions.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. MODULE COVERAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ensure the exam paper covers all five modules.

Module 1 → Basic economic concepts (PPC, utility, scarcity)
Module 2 → Demand, elasticity, taxation
Module 3 → Production, costs, market structures
Module 4 → Macroeconomic concepts, fiscal/monetary policy
Module 5 → International trade, BOP, trade theories

No module should be skipped.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. AVOID DUPLICATE TOPICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before finalizing the paper:
• Check for repeated topics.
• Avoid asking the same concept multiple times.

For example:
Opportunity cost should not appear repeatedly across multiple sections.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. ANSWER STRUCTURE (FOR 14 MARK QUESTIONS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Each long answer must follow this structure:
1. Definition
2. Concept explanation
3. Diagram description (if applicable)
4. Example or application
5. Short concluding statement

If diagrams are required, include placeholders such as:
[Diagram: PPC]
[Diagram: Demand and Supply]
[Diagram: Deadweight Loss]

Do not attempt ASCII drawings.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. DIFFICULTY LEVEL ADJUSTMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${goal.toUpperCase()} LEVEL:

${goal === 'pass' ? `
• Simple definitions
• Basic explanations (2-3 paragraphs for Part A, 4-5 paragraphs for Part B)
• Shorter answers focusing on core concepts only
• Minimal diagram descriptions
` : goal === 'good' ? `
• Moderate explanation (3-4 paragraphs for Part A, 6-8 paragraphs for Part B)
• Diagrams where appropriate with proper descriptions
• Some analytical discussion
• Include examples from notes
` : `
• Deeper theoretical explanation (4-5 paragraphs for Part A, 10-12 paragraphs for Part B)
• Comparisons and critical analysis
• Detailed diagram descriptions with all components labeled
• Multiple examples and real-world applications
• Comprehensive coverage of all aspects
`}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. CONCEPT VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ensure economic concepts are correct.

Examples:
• Absolute Advantage → Adam Smith
• Comparative Advantage → David Ricardo

Elasticity definitions must follow standard economic definitions.
Law of Variable Proportions must not be confused with other economic laws.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. FINAL VALIDATION CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before outputting the paper, verify:
✓ Total marks = 100
✓ Correct module distribution (2 Part A + 2 Part B per module)
✓ No duplicate questions
✓ Correct economic terminology
✓ Questions follow KTU exam style
✓ Answers align with the uploaded notes

Only after validation should the final exam paper be generated.`;

    const userPrompt = `${pyqSection}

UPLOADED STUDY NOTES (MODULES 1-5):
${combinedNotes.slice(0, 8000)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GENERATE THE EXAM PAPER NOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate a complete KTU exam paper with answers following the exact format below:

PART A
Answer ALL questions (10 × 3 = 30 marks)

1. [Question based on Module 1 using KTU style verbs]

Answer:
[${goal === 'pass' ? '2-3 paragraph answer' : goal === 'good' ? '3-4 paragraph answer' : '4-5 paragraph comprehensive answer'} derived from uploaded notes]

2. [Question based on Module 1 using different topic]

Answer:
[Answer from notes]

3. [Question based on Module 2]

Answer:
[Answer from notes]

4. [Question based on Module 2, different topic]

Answer:
[Answer from notes]

5. [Question based on Module 3]

Answer:
[Answer from notes]

6. [Question based on Module 3, different topic]

Answer:
[Answer from notes]

7. [Question based on Module 4]

Answer:
[Answer from notes]

8. [Question based on Module 4, different topic]

Answer:
[Answer from notes]

9. [Question based on Module 5]

Answer:
[Answer from notes]

10. [Question based on Module 5, different topic]

Answer:
[Answer from notes]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PART B
Answer ONE question from EACH module (5 × 14 = 70 marks)

MODULE 1

11. a) [Question using KTU style verb - e.g., "Explain with diagram..." or "Discuss..."] (14 marks)

Answer:
[Follow 14-mark answer structure:
1. Definition
2. Concept explanation (${goal === 'pass' ? '4-5 paragraphs' : goal === 'good' ? '6-8 paragraphs' : '10-12 paragraphs'})
3. [Diagram: Name] if applicable
4. Example/application
5. Conclusion]

OR

11. b) [Different topic from Module 1] (14 marks)

Answer:
[Same structure as above]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODULE 2

12. a) [Question from Module 2] (14 marks)

Answer:
[14-mark answer structure]

OR

12. b) [Different topic from Module 2] (14 marks)

Answer:
[14-mark answer structure]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODULE 3

13. a) [Question from Module 3] (14 marks)

Answer:
[14-mark answer structure]

OR

13. b) [Different topic from Module 3] (14 marks)

Answer:
[14-mark answer structure]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODULE 4

14. a) [Question from Module 4] (14 marks)

Answer:
[14-mark answer structure]

OR

14. b) [Different topic from Module 4] (14 marks)

Answer:
[14-mark answer structure]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODULE 5

15. a) [Question from Module 5] (14 marks)

Answer:
[14-mark answer structure]

OR

15. b) [Different topic from Module 5] (14 marks)

Answer:
[14-mark answer structure]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
END OF QUESTION PAPER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 7000,
    });

    const output = completion.choices[0]?.message?.content || "";

    res.json({
      output,
      pyqsAnalyzed: pyqs.length,
      notesUsed: notes.length,
      goal: goal,
      totalMarks: totalMarks,
      format: "KTU",
      structure: {
        partA: "10 questions × 3 marks = 30 marks",
        partB: "5 modules × 14 marks = 70 marks"
      }
    });

  } catch (error) {
    console.error("Groq AI error:", error);
    res.status(500).json({ error: "Failed to generate questions" });
  }
});

/**
 * GET NOTES BY ROOM
 */
router.get("/:roomId", async (req, res) => {
  try {
    const notes = await Note.find({ roomId: req.params.roomId });
    res.json({ notes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE NOTE
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