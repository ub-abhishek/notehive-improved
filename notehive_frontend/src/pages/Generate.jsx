import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { BASE_URL } from "../config";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

function parseQA(raw) {
  if (!raw) return [];
  const blocks = [];
  const lines = raw.split("\n").filter((l) => l.trim());
  let current = null;

  for (const line of lines) {
    const isQuestion =
      /^(Q\d+[\.\:]|Question\s*\d+[\.\:]|\d+[\.\)])/i.test(line.trim()) ||
      line.trim().toLowerCase().startsWith("q:");

    const isAnswer =
      /^(A\d*[\.\:]|Answer[\.\:])/i.test(line.trim()) ||
      line.trim().toLowerCase().startsWith("a:");

    if (isQuestion) {
      if (current) blocks.push(current);
      current = { question: line.replace(/^(Q\d+[\.\:]|Question\s*\d+[\.\:]|\d+[\.\)]|Q:)\s*/i, "").trim(), answer: "" };
    } else if (isAnswer && current) {
      current.answer = line.replace(/^(A\d*[\.\:]|Answer[\.\:]|A:)\s*/i, "").trim();
    } else if (current && current.answer !== undefined) {
      if (current.answer) {
        current.answer += " " + line.trim();
      } else if (!isQuestion) {
        current.answer = line.trim();
      }
    }
  }

  if (current) blocks.push(current);
  return blocks.length > 0 ? blocks : null;
}

function Generate() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [output, setOutput] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    setOutput("");
    setData(null);
    try {
      const res = await fetch(`${BASE_URL}/notes/generate/${roomId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Server error");
      const responseData = await res.json();
      setData(responseData);
      setOutput(responseData.output || "");
      if (!responseData.output) setError("No questions were generated.");
    } catch (err) {
      setError("Failed to generate questions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [roomId]);

  const parsed = output ? parseQA(output) : null;

  return (
    <>
      <Navbar showBack backLabel="Room" />
      <div className="container">

        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <span className="badge badge-amber" style={{ marginBottom: "12px", display: "inline-block" }}>
            AI Generated {data?.pyqsAnalyzed > 0 && `• ${data.pyqsAnalyzed} PYQs Analyzed`}
          </span>
          <h2 style={{ marginBottom: "6px" }}>Practice Questions</h2>
          <p style={{ fontSize: "13px" }}>
            Generated from {data?.notesUsed || 'your'} notes
            {data?.pyqsAnalyzed > 0 && ` and ${data.pyqsAnalyzed} previous year question papers`}.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="card" style={{ textAlign: "center", padding: "48px 20px" }}>
            <div style={{ fontSize: "2rem", marginBottom: "16px", animation: "spin 1.5s linear infinite", display: "inline-block" }}>✦</div>
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>Generating with AI…</p>
            <p style={{ fontSize: "13px", color: "var(--text-3)", marginTop: "6px" }}>This may take a few seconds.</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p style={{ color: "var(--danger)", marginBottom: "16px" }}>⚠ {error}</p>
            <button className="btn-ghost" onClick={() => navigate(-1)}>← Go Back</button>
          </div>
        )}

        {/* Parsed Q&A */}
        {!loading && !error && parsed && parsed.length > 0 && (
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h3 style={{ marginBottom: 0 }}>Questions & Answers</h3>
              <span className="badge badge-amber">{parsed.length} Q&As</span>
            </div>
            {parsed.map((qa, i) => (
              <div key={i} className="qa-block">
                <div className="qa-question">Q{i + 1}. {qa.question}</div>
                {qa.answer && <div className="qa-answer">{qa.answer}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Raw fallback */}
        {!loading && !error && (!parsed || parsed.length === 0) && output && (
          <div className="card">
            <h3>Output</h3>
            <pre style={{
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
              fontSize: "14px",
              color: "var(--text-2)",
              lineHeight: "1.7"
            }}>
              {output}
            </pre>
          </div>
        )}

        {/* Regenerate */}
        {!loading && (
          <div style={{ textAlign: "center", marginTop: "12px" }}>
            <button className="btn-ghost" onClick={fetchQuestions}>
              ↺ Regenerate
            </button>
          </div>
        )}

      </div>
    </>
  );
}

export default Generate;