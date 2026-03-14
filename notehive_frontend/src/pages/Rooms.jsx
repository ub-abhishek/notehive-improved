import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../config";
import Navbar from "../components/Navbar";
import { useToast, ToastContainer } from "../components/Toast";
import { useAuth } from "../context/AuthContext";

function Rooms() {
  const navigate = useNavigate();
  const { toasts, addToast } = useToast();
  const { token } = useAuth();

  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/rooms`, { headers: authHeaders });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRooms(data.rooms || []);
    } catch {
      addToast("Could not load rooms", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const createRoom = async () => {
    if (!roomName.trim()) {
      addToast("Room name cannot be empty", "error");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(`${BASE_URL}/rooms`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ roomName }),
      });

      if (!res.ok) throw new Error();

      setRoomName("");
      await fetchRooms();
      addToast("Room created successfully");
    } catch {
      addToast("Failed to create room", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") createRoom();
  };

  return (
    <>
      <Navbar />
      <div className="container">
        
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <h2 style={{ marginBottom: "8px" }}>My Rooms</h2>
          <p style={{ fontSize: "0.95rem", color: "var(--text-2)" }}>
            Create rooms for different subjects or semesters. Each room can have up to 5 notes and 1 PYQ.
          </p>
        </div>

        {/* Create Room Card */}
        <div className="card" style={{ 
          marginBottom: "32px",
          background: "linear-gradient(135deg, rgba(251, 191, 36, 0.05) 0%, rgba(251, 146, 60, 0.05) 100%)",
          border: "1px solid var(--accent-light)"
        }}>
          <h3 style={{ marginBottom: "16px" }}>Create New Room</h3>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Enter room name (e.g., Industrial Economics S5)"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              onKeyPress={handleKeyPress}
              style={{ flex: 1, minWidth: "250px", marginBottom: 0 }}
            />
            <button 
              onClick={createRoom} 
              disabled={creating}
              style={{ whiteSpace: "nowrap" }}
            >
              {creating ? "Creating..." : "+ Create Room"}
            </button>
          </div>
        </div>

        {/* Rooms List */}
        <div>
          <h3 style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
            All Rooms
            {!loading && <span className="badge badge-amber">{rooms.length}</span>}
          </h3>

          {loading && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
              <div className="skeleton" style={{ height: "120px", borderRadius: "var(--radius)" }} />
              <div className="skeleton" style={{ height: "120px", borderRadius: "var(--radius)" }} />
              <div className="skeleton" style={{ height: "120px", borderRadius: "var(--radius)" }} />
            </div>
          )}

          {!loading && rooms.length === 0 && (
            <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
              <p style={{ fontSize: "3rem", marginBottom: "16px" }}>📚</p>
              <p style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "8px" }}>
                No rooms yet
              </p>
              <p style={{ color: "var(--text-2)", fontSize: "0.95rem" }}>
                Create your first room to start organizing study materials
              </p>
            </div>
          )}

          {!loading && rooms.length > 0 && (
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", 
              gap: "16px" 
            }}>
              {rooms.map((room) => (
                <div
                  key={room._id}
                  className="card"
                  onClick={() => navigate(`/room/${room._id}`)}
                  style={{
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    border: "1px solid var(--border)",
                    position: "relative",
                    overflow: "hidden"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
                    e.currentTarget.style.borderColor = "var(--accent)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                >
                  <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "4px",
                    height: "100%",
                    background: "linear-gradient(180deg, var(--accent) 0%, #f59e0b 100%)"
                  }} />
                  
                  <div style={{ paddingLeft: "8px" }}>
                    <h3 style={{ 
                      marginBottom: "12px", 
                      fontSize: "1.15rem",
                      color: "var(--text)"
                    }}>
                      {room.roomName}
                    </h3>
                    
                    <div style={{ 
                      fontSize: "0.85rem", 
                      color: "var(--text-3)",
                      fontFamily: "monospace",
                      marginBottom: "12px"
                    }}>
                      ID: {room._id.slice(-8)}
                    </div>

                    <div style={{ 
                      display: "flex", 
                      gap: "8px", 
                      fontSize: "0.85rem",
                      color: "var(--text-2)"
                    }}>
                      <span>📝 Notes</span>
                      <span>•</span>
                      <span>📄 PYQs</span>
                      <span>•</span>
                      <span>✦ Generate</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
      <ToastContainer toasts={toasts} />
    </>
  );
}

export default Rooms;