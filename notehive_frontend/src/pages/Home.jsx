import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../config";
import Navbar from "../components/Navbar";
import { useToast, ToastContainer } from "../components/Toast";
import { useAuth } from "../context/AuthContext";

function Home() {
  const [roomName, setRoomName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toasts, addToast } = useToast();
  const { token, user, logout } = useAuth();

  const createRoom = async () => {
    if (!roomName.trim()) {
      addToast("Room name cannot be empty", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ roomName }),
      });

      const data = await res.json();

      if (!res.ok || !data.room) {
        addToast("Failed to create room", "error");
        return;
      }

      navigate(`/room/${data.room._id}`);
    } catch (err) {
      addToast("Network error — please try again", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") createRoom();
  };

  return (
    <>
      <Navbar />
      <div className="container">

        {/* Hero */}
        <div style={{ padding: "48px 0 32px", textAlign: "center" }}>
          <div style={{ marginBottom: "12px" }}>
            <span className="badge badge-amber">AI-Powered Study Tool</span>
          </div>
          <h1 style={{ marginBottom: "12px" }}>
            Your notes,<br />
            <span style={{ color: "var(--accent)" }}>supercharged.</span>
          </h1>
          <p style={{ maxWidth: "420px", margin: "0 auto", color: "var(--text-2)", fontSize: "15px" }}>
            Create a room, drop in your notes, and let AI generate practice questions instantly.
          </p>
          {user && (
            <p style={{ marginTop: "12px", fontSize: "13px", color: "var(--text-3)" }}>
              Welcome back, <span style={{ color: "var(--accent)" }}>{user.name}</span>
            </p>
          )}
        </div>

        {/* Create Room */}
        <div className="card">
          <h2>Create a Room</h2>
          <p style={{ marginBottom: "20px", fontSize: "13px" }}>
            Rooms hold your notes for a topic or subject.
          </p>
          <input
            type="text"
            placeholder="e.g. Biology Chapter 4, React Hooks..."
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            onKeyDown={handleKey}
            autoFocus
          />
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button onClick={createRoom} disabled={loading}>
              {loading ? "Creating…" : "Create Room →"}
            </button>
            <button className="btn-ghost" onClick={() => navigate("/rooms")}>
              Browse Rooms
            </button>
            <button className="btn-ghost" onClick={logout}>
              Sign Out
            </button>
          </div>
        </div>

      </div>
      <ToastContainer toasts={toasts} />
    </>
  );
}

export default Home;