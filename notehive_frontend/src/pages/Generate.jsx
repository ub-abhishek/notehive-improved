import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { BASE_URL } from "../config";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

function Generate() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [output, setOutput] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [goal, setGoal] = useState("pass");
  const [totalMarks] = useState(100);
  const [showConfig, setShowConfig] = useState(true);

  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    setOutput("");
    setData(null);
    setShowConfig(false);
    
    try {
      const res = await fetch(
        `${BASE_URL}/notes/generate/${roomId}?goal=${goal}&totalMarks=${totalMarks}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (!res.ok) throw new Error("Server error");
      const responseData = await res.json();
      setData(responseData);
      setOutput(responseData.output || "");
      if (!responseData.output) setError("No questions were generated. Please add at least 1 note.");
    } catch (err) {
      setError("Failed to generate questions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    const { jsPDF } = await import('jspdf');
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const maxLineWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    // Header
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    const title = 'Exam Paper';
    const titleWidth = doc.getTextWidth(title);
    doc.text(title, (pageWidth - titleWidth) / 2, yPosition);
    yPosition += 8;

    doc.setFontSize(14);
    const subtitle = `${goal.toUpperCase()} Level`;
    const subtitleWidth = doc.getTextWidth(subtitle);
    doc.text(subtitle, (pageWidth - subtitleWidth) / 2, yPosition);
    yPosition += 10;

    // Exam details
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Marks: 100`, margin, yPosition);
    yPosition += 5;
    doc.text(`Time: 3 Hours`, margin, yPosition);
    yPosition += 5;
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += 8;

    // Separator
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    // Instructions
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('INSTRUCTIONS:', margin, yPosition);
    yPosition += 5;
    doc.setFont(undefined, 'normal');
    const instructions = [
      'PART A: Answer ALL 10 questions (10 × 3 = 30 marks)',
      'PART B: Answer ONE question from EACH module (5 × 14 = 70 marks)'
    ];
    instructions.forEach(inst => {
      doc.text(`• ${inst}`, margin + 5, yPosition);
      yPosition += 5;
    });
    yPosition += 5;

    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    // Content
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    const lines = doc.splitTextToSize(output, maxLineWidth);
    
    for (let i = 0; i < lines.length; i++) {
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      
      // Styling based on content
      if (lines[i].startsWith('PART A') || lines[i].startsWith('PART B') || lines[i].startsWith('MODULE')) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        yPosition += 3;
      } else if (lines[i].match(/^\d+\./) || lines[i].match(/^\d+\.\s[ab]\)/)) {
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        yPosition += 2;
      } else if (lines[i].startsWith('Answer:')) {
        doc.setFontSize(9);
        doc.setFont(undefined, 'italic');
      } else if (lines[i].includes('[Module')) {
        doc.setFontSize(8);
        doc.setFont(undefined, 'italic');
      } else {
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
      }
      
      doc.text(lines[i], margin, yPosition);
      yPosition += lines[i].startsWith('---') ? 2 : 5;
    }

    // Footer
    doc.setFontSize(8);
    doc.setFont(undefined, 'italic');
    const footerText = '*** END OF QUESTION PAPER ***';
    const footerWidth = doc.getTextWidth(footerText);
    doc.text(footerText, (pageWidth - footerWidth) / 2, pageHeight - 10);

    const filename = `Exam-${goal}-${Date.now()}.pdf`;
    doc.save(filename);
  };

  const resetConfig = () => {
    setShowConfig(true);
    setOutput("");
    setData(null);
    setError(null);
  };

  return (
    <>
      <Navbar showBack backLabel="Room" />
      <div className="container">

        <div style={{ marginBottom: "24px" }}>
          <span className="badge badge-amber" style={{ marginBottom: "12px", display: "inline-block" }}>
            AI Exam Generator
            {data?.pyqsAnalyzed > 0 && ` • PYQ Pattern Analyzed`}
          </span>
          <h2 style={{ marginBottom: "6px" }}>Generate Exam Paper</h2>
          <p style={{ fontSize: "13px" }}>
            {data ? `Generated 100 marks exam (${data.goal} level) from ${data.notesUsed} notes` : 'AI analyzes your notes & PYQ to create custom exam papers'}
          </p>
        </div>

        {showConfig && !loading && (
          <div className="card">
            <h3>Exam Configuration</h3>
            <p style={{ fontSize: "13px", marginBottom: "20px", color: "var(--text-2)" }}>
              Part A (10×3=30 marks) + Part B (5×14=70 marks) = 100 marks total
            </p>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "var(--text)" }}>
                Preparation Goal
              </label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  className={goal === "pass" ? "" : "btn-ghost"}
                  onClick={() => setGoal("pass")}
                  style={{ fontSize: "13px", padding: "8px 16px" }}
                >
                  Pass (40-50%)
                </button>
                <button
                  className={goal === "good" ? "" : "btn-ghost"}
                  onClick={() => setGoal("good")}
                  style={{ fontSize: "13px", padding: "8px 16px" }}
                >
                  Good (60-70%)
                </button>
                <button
                  className={goal === "high" ? "" : "btn-ghost"}
                  onClick={() => setGoal("high")}
                  style={{ fontSize: "13px", padding: "8px 16px" }}
                >
                  High Score (80%+)
                </button>
              </div>
              <div style={{ marginTop: "12px", padding: "12px", background: "var(--surface-2)", borderRadius: "var(--radius-sm)", fontSize: "12px", lineHeight: "1.6" }}>
                {goal === "pass" && (
                  <>
                    <strong>Pass Level:</strong><br/>
                    • Part A: Brief 1-2 paragraph answers<br/>
                    • Part B: 4-5 paragraphs with key concepts
                  </>
                )}
                {goal === "good" && (
                  <>
                    <strong>Good Level:</strong><br/>
                    • Part A: Detailed 2-3 paragraph answers<br/>
                    • Part B: 6-8 paragraphs with diagrams & examples
                  </>
                )}
                {goal === "high" && (
                  <>
                    <strong>High Score Level:</strong><br/>
                    • Part A: Comprehensive 3-4 paragraph answers<br/>
                    • Part B: 10-12 paragraphs with exhaustive detail, multiple diagrams, applications
                  </>
                )}
              </div>
            </div>

            <div style={{ 
              padding: "12px", 
              background: "var(--surface-2)", 
              borderRadius: "var(--radius-sm)", 
              marginBottom: "16px",
              border: "1px solid var(--border)"
            }}>
              <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "8px", color: "var(--text)" }}>
                Exam Structure:
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-2)", lineHeight: "1.8" }}>
                <strong>Part A:</strong> 10 questions (all compulsory) × 3 marks = 30 marks<br/>
                <strong>Part B:</strong> 5 modules, choose 1 of 2 per module × 14 marks = 70 marks<br/>
                <strong>Total:</strong> 100 marks | <strong>Time:</strong> 3 hours
              </div>
            </div>

            <button 
              onClick={fetchQuestions}
              style={{ width: "100%", marginTop: "8px" }}
            >
              ✦ Generate Exam Paper
            </button>
          </div>
        )}

        {loading && (
          <div className="card" style={{ textAlign: "center", padding: "48px 20px" }}>
            <div style={{ fontSize: "2rem", marginBottom: "16px", animation: "spin 1.5s linear infinite", display: "inline-block" }}>✦</div>
            <p style={{ fontWeight: 600, marginBottom: "8px" }}>Generating exam paper...</p>
            <p style={{ fontSize: "13px", color: "var(--text-3)" }}>
              Analyzing PYQ patterns • Creating {goal} level questions
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {!loading && error && (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p style={{ color: "var(--danger)", marginBottom: "16px" }}>⚠ {error}</p>
            <button className="btn-ghost" onClick={resetConfig}>← Try Again</button>
          </div>
        )}

        {!loading && !error && output && (
          <>
            {data?.structure && (
              <div className="card" style={{ marginBottom: "16px" }}>
                <h3>Exam Structure</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px" }}>
                  <div style={{ 
                    padding: "12px", 
                    background: "var(--surface-2)", 
                    borderRadius: "var(--radius-sm)",
                    borderLeft: "3px solid var(--accent)"
                  }}>
                    <div style={{ fontSize: "10px", color: "var(--text-3)", textTransform: "uppercase", marginBottom: "4px", letterSpacing: "0.5px" }}>
                      Part A
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent)", marginBottom: "4px" }}>
                      30 marks
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-3)" }}>10 questions × 3 marks</div>
                  </div>
                  <div style={{ 
                    padding: "12px", 
                    background: "var(--surface-2)", 
                    borderRadius: "var(--radius-sm)",
                    borderLeft: "3px solid var(--accent)"
                  }}>
                    <div style={{ fontSize: "10px", color: "var(--text-3)", textTransform: "uppercase", marginBottom: "4px", letterSpacing: "0.5px" }}>
                      Part B
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent)", marginBottom: "4px" }}>
                      70 marks
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-3)" }}>5 modules × 14 marks</div>
                  </div>
                </div>
              </div>
            )}

            <div className="card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <h3 style={{ marginBottom: 0 }}>Exam Paper</h3>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span className="badge badge-amber">100 marks</span>
                  <span style={{ fontSize: "12px", color: "var(--text-3)" }}>•</span>
                  <span style={{ fontSize: "12px", color: "var(--text-2)", textTransform: "capitalize" }}>{data?.goal} Level</span>
                </div>
              </div>
              
              <div style={{
                whiteSpace: "pre-wrap",
                fontFamily: "inherit",
                fontSize: "14px",
                color: "var(--text-2)",
                lineHeight: "1.8",
                padding: "16px",
                background: "var(--surface-2)",
                borderRadius: "var(--radius-sm)"
              }}>
                {output}
              </div>
            </div>
          </>
        )}

        {!loading && (output || error) && (
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "16px", flexWrap: "wrap" }}>
            <button className="btn-ghost" onClick={resetConfig}>
              ← Change Settings
            </button>
            {output && (
              <>
                <button className="btn-ghost" onClick={fetchQuestions}>
                  ↺ Regenerate
                </button>
                <button onClick={downloadPDF} style={{ fontSize: "13px", padding: "9px 16px" }}>
                  📥 Download PDF
                </button>
              </>
            )}
          </div>
        )}

      </div>
    </>
  );
}

export default Generate;