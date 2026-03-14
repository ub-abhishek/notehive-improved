import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BASE_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
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
            <h2 style={{ marginBottom: "8px", fontSize: "1.5rem" }}>Create Account</h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-2)", marginBottom: "24px" }}>
              Start generating AI-powered exam papers
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
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  style={{ marginBottom: 0 }}
                />
              </div>

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

              <div style={{ marginBottom: "16px" }}>
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

              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "block",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  marginBottom: "6px",
                  color: "var(--text)"
                }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  style={{ marginBottom: 0 }}
                />
                <p style={{ fontSize: "0.8rem", color: "var(--text-3)", marginTop: "6px" }}>
                  Minimum 6 characters
                </p>
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
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <div style={{
              marginTop: "24px",
              paddingTop: "24px",
              borderTop: "1px solid var(--border)",
              textAlign: "center"
            }}>
              <p style={{ fontSize: "0.9rem", color: "var(--text-2)" }}>
                Already have an account?{" "}
                <Link
                  to="/login"
                  style={{
                    color: "var(--accent)",
                    textDecoration: "none",
                    fontWeight: 600
                  }}
                >
                  Login here
                </Link>
              </p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

export default Register;