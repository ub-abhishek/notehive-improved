import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BASE_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("All fields are required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      login(data.token, data.user);
      navigate("/rooms");
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar showBack backLabel="Home" />
      <div className="container">
        <div style={{ maxWidth: "420px", margin: "60px auto 40px" }}>
          
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ 
              fontSize: "2.5rem", 
              marginBottom: "8px",
              background: "linear-gradient(135deg, var(--accent) 0%, #f59e0b 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontWeight: 800
            }}>
              NoteHive
            </div>
            <p style={{ color: "var(--text-2)", fontSize: "0.95rem" }}>
              AI-Powered Exam Paper Generator
            </p>
          </div>

          <div className="card" style={{ 
            padding: "32px",
            border: "1px solid var(--border)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)"
          }}>
            <h2 style={{ marginBottom: "8px", fontSize: "1.5rem" }}>Welcome Back</h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-2)", marginBottom: "24px" }}>
              Login to access your study rooms
            </p>

            {error && (
              <div style={{
                padding: "12px 16px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "var(--radius-sm)",
                color: "var(--danger)",
                fontSize: "0.9rem",
                marginBottom: "20px"
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{
                  display: "block",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  marginBottom: "6px",
                  color: "var(--text)"
                }}>
                  Email
                </label>
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  style={{ marginBottom: 0 }}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "block",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  marginBottom: "6px",
                  color: "var(--text)"
                }}>
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  style={{ marginBottom: 0 }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: "1rem",
                  background: loading ? "var(--surface-2)" : "linear-gradient(135deg, var(--accent) 0%, #f59e0b 100%)",
                  border: "none"
                }}
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            <div style={{
              marginTop: "24px",
              paddingTop: "24px",
              borderTop: "1px solid var(--border)",
              textAlign: "center"
            }}>
              <p style={{ fontSize: "0.9rem", color: "var(--text-2)" }}>
                Don't have an account?{" "}
                <Link
                  to="/register"
                  style={{
                    color: "var(--accent)",
                    textDecoration: "none",
                    fontWeight: 600
                  }}
                >
                  Register here
                </Link>
              </p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

export default Login;