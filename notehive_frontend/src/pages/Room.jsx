import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { BASE_URL } from "../config";
import Navbar from "../components/Navbar";
import { useToast, ToastContainer } from "../components/Toast";
import { useAuth } from "../context/AuthContext";

const MAX_NOTES = 5;
const MAX_PYQS = 1;

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { toasts, addToast } = useToast();
  const { token } = useAuth();

  const [roomName, setRoomName] = useState("");
  const [note, setNote] = useState("");
  const [noteFile, setNoteFile] = useState(null);
  const [noteMode, setNoteMode] = useState("text");
  const [notes, setNotes] = useState([]);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [addingNote, setAddingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState(null);

  const [pyqs, setPyqs] = useState([]);
  const [loadingPyqs, setLoadingPyqs] = useState(true);
  const [pyqTitle, setPyqTitle] = useState("");
  const [pyqContent, setPyqContent] = useState("");
  const [pyqFile, setPyqFile] = useState(null);
  const [pyqMode, setPyqMode] = useState("text");
  const [addingPyq, setAddingPyq] = useState(false);
  const [deletingPyqId, setDeletingPyqId] = useState(null);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchRoom = async () => {
    try {
      const res = await fetch(`${BASE_URL}/rooms/${roomId}`, { headers: authHeaders });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRoomName(data.room.roomName);
    } catch {
      addToast("Could not load room details", "error");
    } finally {
      setLoadingRoom(false);
    }
  };

  const fetchNotes = async () => {
    setLoadingNotes(true);
    try {
      const res = await fetch(`${BASE_URL}/notes/${roomId}`, { headers: authHeaders });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNotes(data.notes || []);
    } catch {
      addToast("Could not load notes", "error");
    } finally {
      setLoadingNotes(false);
    }
  };

  const fetchPyqs = async () => {
    setLoadingPyqs(true);
    try {
      const res = await fetch(`${BASE_URL}/pyqs/room/${roomId}`, { headers: authHeaders });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPyqs(data.pyqs || []);
    } catch {
      addToast("Could not load PYQs", "error");
    } finally {
      setLoadingPyqs(false);
    }
  };

  useEffect(() => {
    fetchRoom();
    fetchNotes();
    fetchPyqs();
  }, [roomId]);

  const addNote = async () => {
    if (notes.length >= MAX_NOTES) {
      addToast(`Maximum ${MAX_NOTES} notes allowed. Delete old notes to add new ones.`, "error");
      return;
    }

    setAddingNote(true);
    try {
      if (noteMode === "text") {
        if (!note.trim()) {
          addToast("Note cannot be empty", "error");
          return;
        }
        const res = await fetch(`${BASE_URL}/notes`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ roomId, content: note }),
        });
        const data = await res.json();
        if (!res.ok) {
          addToast(data.error || "Failed to add note", "error");
          return;
        }
      } else {
        if (!noteFile) {
          addToast("Please select a PDF file", "error");
          return;
        }
        const formData = new FormData();
        formData.append("roomId", roomId);
        formData.append("pdf", noteFile);

        const res = await fetch(`${BASE_URL}/notes/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          addToast(data.error || "Failed to add note", "error");
          return;
        }
      }

      setNote("");
      setNoteFile(null);
      await fetchNotes();
      addToast("Note added");
    } catch {
      addToast("Failed to add note", "error");
    } finally {
      setAddingNote(false);
    }
  };

  const deleteNote = async (noteId) => {
    setDeletingNoteId(noteId);
    try {
      const res = await fetch(`${BASE_URL}/notes/${noteId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error();
      setNotes((prev) => prev.filter((n) => n._id !== noteId));
      addToast("Note deleted");
    } catch {
      addToast("Failed to delete note", "error");
    } finally {
      setDeletingNoteId(null);
    }
  };

  const addPyq = async () => {
    if (pyqs.length >= MAX_PYQS) {
      addToast(`Only ${MAX_PYQS} PYQ allowed per room. Delete existing PYQ first.`, "error");
      return;
    }

    if (!pyqTitle.trim()) {
      addToast("Title is required", "error");
      return;
    }

    setAddingPyq(true);
    try {
      if (pyqMode === "text") {
        if (!pyqContent.trim()) {
          addToast("Content cannot be empty", "error");
          return;
        }
        const res = await fetch(`${BASE_URL}/pyqs`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ roomId, title: pyqTitle, content: pyqContent }),
        });
        const data = await res.json();
        if (!res.ok) {
          addToast(data.error || "Failed to add PYQ", "error");
          return;
        }
      } else {
        if (!pyqFile) {
          addToast("Please select a PDF file", "error");
          return;
        }
        const formData = new FormData();
        formData.append("roomId", roomId);
        formData.append("title", pyqTitle);
        formData.append("pdf", pyqFile);

        const res = await fetch(`${BASE_URL}/pyqs/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          addToast(data.error || "Failed to add PYQ", "error");
          return;
        }
      }

      setPyqTitle("");
      setPyqContent("");
      setPyqFile(null);
      await fetchPyqs();
      addToast("PYQ added");
    } catch {
      addToast("Failed to add PYQ", "error");
    } finally {
      setAddingPyq(false);
    }
  };

  const deletePyq = async (pyqId) => {
    setDeletingPyqId(pyqId);
    try {
      const res = await fetch(`${BASE_URL}/pyqs/${pyqId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error();
      setPyqs((prev) => prev.filter((p) => p._id !== pyqId));
      addToast("PYQ deleted");
    } catch {
      addToast("Failed to delete PYQ", "error");
    } finally {
      setDeletingPyqId(null);
    }
  };

  const deleteRoom = async () => {
    const confirmed = window.confirm(
      `Delete "${roomName}" and all its content? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${BASE_URL}/rooms/${roomId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error();
      addToast("Room deleted");
      navigate("/rooms");
    } catch {
      addToast("Failed to delete room", "error");
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && e.ctrlKey) addNote();
  };

  const canGenerate = notes.length > 0;

  return (
    <>
      <Navbar showBack backLabel="Rooms" />
      <div className="container">

        {/* Room Header */}
        <div className="card" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            {loadingRoom ? (
              <div className="skeleton" style={{ width: "180px", height: "22px" }} />
            ) : (
              <h2 style={{ marginBottom: "6px" }}>{roomName}</h2>
            )}
            <span style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--text-3)" }}>
              ID: {roomId}
            </span>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate(`/generate/${roomId}`)}
              style={{ fontSize: "13px", padding: "9px 16px" }}
              disabled={!canGenerate}
              title={!canGenerate ? "Add at least 1 note to generate" : ""}
            >
              ✦ Generate KTU Exam
            </button>
            <button
              className="btn-danger"
              onClick={deleteRoom}
              style={{ fontSize: "13px", padding: "9px 16px" }}
            >
              Delete Room
            </button>
          </div>
        </div>

        {/* Add Note */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ marginBottom: 0 }}>Add Study Notes</h3>
            <span style={{ fontSize: "12px", color: notes.length >= MAX_NOTES ? "var(--danger)" : "var(--text-3)" }}>
              {notes.length}/{MAX_NOTES} notes
            </span>
          </div>
          <p style={{ fontSize: "13px", marginBottom: "14px", color: "var(--text-2)" }}>
            Upload your study materials (max {MAX_NOTES} notes). These will be used to generate exam papers.
          </p>

          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <button
              className={noteMode === "text" ? "" : "btn-ghost"}
              onClick={() => setNoteMode("text")}
              style={{ fontSize: "13px", padding: "7px 16px" }}
              disabled={notes.length >= MAX_NOTES}
            >
              Text
            </button>
            <button
              className={noteMode === "pdf" ? "" : "btn-ghost"}
              onClick={() => setNoteMode("pdf")}
              style={{ fontSize: "13px", padding: "7px 16px" }}
              disabled={notes.length >= MAX_NOTES}
            >
              PDF Upload
            </button>
          </div>

          {noteMode === "text" ? (
            <>
              <p style={{ fontSize: "12px", marginBottom: "8px", color: "var(--text-3)" }}>
                Tip: press <kbd style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "4px", padding: "1px 5px", fontSize: "11px" }}>Ctrl + Enter</kbd> to submit
              </p>
              <textarea
                placeholder="Write your notes here or paste content from textbooks…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={handleKey}
                disabled={notes.length >= MAX_NOTES}
              />
            </>
          ) : (
            <div style={{ marginBottom: "14px" }}>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setNoteFile(e.target.files[0])}
                style={{ cursor: "pointer" }}
                disabled={notes.length >= MAX_NOTES}
              />
              {noteFile && (
                <p style={{ fontSize: "12px", color: "var(--success)", marginTop: "6px" }}>
                  ✓ {noteFile.name} selected
                </p>
              )}
            </div>
          )}

          <button onClick={addNote} disabled={addingNote || notes.length >= MAX_NOTES}>
            {addingNote ? "Adding…" : notes.length >= MAX_NOTES ? "Limit Reached" : "Add Note"}
          </button>
        </div>

        {/* Notes List */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h3 style={{ marginBottom: 0 }}>Study Notes</h3>
            <span className="badge badge-amber">{notes.length}</span>
          </div>
          {loadingNotes && (
            <>
              <div className="skeleton" style={{ width: "90%", marginBottom: "10px" }} />
              <div className="skeleton" style={{ width: "70%", marginBottom: "10px" }} />
            </>
          )}
          {!loadingNotes && notes.length === 0 && (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <p style={{ fontSize: "1.8rem", marginBottom: "8px" }}>📝</p>
              <p style={{ color: "var(--text-2)", fontSize: "14px" }}>No notes yet — add up to {MAX_NOTES} notes above</p>
            </div>
          )}
          {!loadingNotes && notes.length > 0 && (
            <ul>
              {notes.map((n) => (
                <li key={n._id} className="note-item">
                  <span className="note-content">{n.content.slice(0, 150)}{n.content.length > 150 ? "..." : ""}</span>
                  <button
                    className="btn-danger"
                    onClick={() => deleteNote(n._id)}
                    disabled={deletingNoteId === n._id}
                    title="Delete note"
                  >
                    {deletingNoteId === n._id ? "…" : "✕"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add PYQ */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ marginBottom: 0 }}>Add Previous Year Question Paper</h3>
            <span style={{ fontSize: "12px", color: pyqs.length >= MAX_PYQS ? "var(--danger)" : "var(--text-3)" }}>
              {pyqs.length}/{MAX_PYQS} PYQ
            </span>
          </div>
          <p style={{ fontSize: "13px", marginBottom: "14px", color: "var(--text-2)" }}>
            Upload {MAX_PYQS} PYQ to help AI understand KTU exam patterns and question styles.
          </p>

          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <button
              className={pyqMode === "text" ? "" : "btn-ghost"}
              onClick={() => setPyqMode("text")}
              style={{ fontSize: "13px", padding: "7px 16px" }}
              disabled={pyqs.length >= MAX_PYQS}
            >
              Text
            </button>
            <button
              className={pyqMode === "pdf" ? "" : "btn-ghost"}
              onClick={() => setPyqMode("pdf")}
              style={{ fontSize: "13px", padding: "7px 16px" }}
              disabled={pyqs.length >= MAX_PYQS}
            >
              PDF Upload
            </button>
          </div>

          <input
            type="text"
            placeholder="Title (e.g., 2023 Mid Sem, S5 Dec 2022)"
            value={pyqTitle}
            onChange={(e) => setPyqTitle(e.target.value)}
            disabled={pyqs.length >= MAX_PYQS}
          />

          {pyqMode === "text" ? (
            <textarea
              placeholder="Paste the previous year questions here…"
              value={pyqContent}
              onChange={(e) => setPyqContent(e.target.value)}
              disabled={pyqs.length >= MAX_PYQS}
            />
          ) : (
            <div style={{ marginBottom: "14px" }}>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setPyqFile(e.target.files[0])}
                style={{ cursor: "pointer" }}
                disabled={pyqs.length >= MAX_PYQS}
              />
              {pyqFile && (
                <p style={{ fontSize: "12px", color: "var(--success)", marginTop: "6px" }}>
                  ✓ {pyqFile.name} selected
                </p>
              )}
            </div>
          )}

          <button onClick={addPyq} disabled={addingPyq || pyqs.length >= MAX_PYQS}>
            {addingPyq ? "Adding…" : pyqs.length >= MAX_PYQS ? "Limit Reached" : "Add PYQ"}
          </button>
        </div>

        {/* PYQ List */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h3 style={{ marginBottom: 0 }}>Previous Year Questions</h3>
            <span className="badge badge-amber">{pyqs.length}</span>
          </div>
          {loadingPyqs && (
            <>
              <div className="skeleton" style={{ width: "90%", marginBottom: "10px" }} />
            </>
          )}
          {!loadingPyqs && pyqs.length === 0 && (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <p style={{ fontSize: "1.8rem", marginBottom: "8px" }}>📄</p>
              <p style={{ color: "var(--text-2)", fontSize: "14px" }}>No PYQ yet — add {MAX_PYQS} PYQ to help AI understand exam patterns</p>
            </div>
          )}
          {!loadingPyqs && pyqs.length > 0 && (
            <ul>
              {pyqs.map((p) => (
                <li key={p._id} className="note-item">
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>
                      {p.title}
                      <span style={{ marginLeft: "8px", fontSize: "11px", color: "var(--text-3)", fontWeight: 400 }}>
                        ({p.source})
                      </span>
                    </p>
                    <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: "1.5" }}>
                      {p.content.slice(0, 120)}{p.content.length > 120 ? "…" : ""}
                    </p>
                  </div>
                  <button
                    className="btn-danger"
                    onClick={() => deletePyq(p._id)}
                    disabled={deletingPyqId === p._id}
                    title="Delete PYQ"
                  >
                    {deletingPyqId === p._id ? "…" : "✕"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
      <ToastContainer toasts={toasts} />
    </>
  );
}

export default Room;