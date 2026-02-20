import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BASE_URL } from "../config";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { useToast, ToastContainer } from "../components/Toast";

function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();
  const { token } = useAuth();
  const { toasts, addToast } = useToast();

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await fetch(`${BASE_URL}/rooms`, {
          headers: authHeaders,
        });
        if (!res.ok) throw new Error("Failed to load rooms");
        const data = await res.json();
        setRooms(data.rooms || []);
      } catch (err) {
        setError("Could not load rooms. Check your connection.");
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  const deleteRoom = async (roomId) => {
    if (!confirm("Delete this room and all its notes/PYQs?")) return;

    setDeletingId(roomId);
    try {
      const res = await fetch(`${BASE_URL}/rooms/${roomId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error();
      setRooms((prev) => prev.filter((r) => r._id !== roomId));
      addToast("Room deleted");
    } catch {
      addToast("Failed to delete room", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Navbar showBack backLabel="Home" />
      <div className="container">

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <h2 style={{ marginBottom: 0 }}>All Rooms</h2>
          <button onClick={() => navigate("/")} style={{ fontSize: "13px", padding: "8px 14px" }}>
            + New Room
          </button>
        </div>

        <div className="card">
          {loading && (
            <>
              <div className="skeleton" style={{ width: "60%", marginBottom: "14px" }} />
              <div className="skeleton" style={{ width: "80%", marginBottom: "14px" }} />
              <div className="skeleton" style={{ width: "45%" }} />
            </>
          )}

          {error && (
            <p style={{ color: "var(--danger)", fontSize: "14px" }}>⚠ {error}</p>
          )}

          {!loading && !error && rooms.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <p style={{ fontSize: "2rem", marginBottom: "12px" }}>🗂</p>
              <p style={{ color: "var(--text-2)" }}>No rooms yet.</p>
              <p style={{ fontSize: "13px", color: "var(--text-3)", marginTop: "6px" }}>
                Create your first room from the home page.
              </p>
            </div>
          )}

          {!loading && !error && rooms.length > 0 && (
            <ul>
              {rooms.map((room) => (
                <li key={room._id} className="room-item">
                  <Link to={`/room/${room._id}`} className="room-link">
                    {room.roomName}
                  </Link>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-3)", fontFamily: "monospace" }}>
                      {room._id.slice(-6)}
                    </span>
                    <button
                      className="btn-danger"
                      onClick={() => deleteRoom(room._id)}
                      disabled={deletingId === room._id}
                      title="Delete room"
                    >
                      {deletingId === room._id ? "…" : "✕"}
                    </button>
                  </div>
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

export default Rooms;