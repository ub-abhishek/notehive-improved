import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BASE_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { useToast, ToastContainer } from "../components/Toast";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toasts, addToast } = useToast();

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      addToast("All fields required", "error");
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
        addToast(data.error || "Registration failed", "error");
        return;
      }

      login(data.token, data.user);
      navigate("/");
    } catch (err) {
      addToast("Network error — please try again", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleRegister();
  };

  return (
    <>
      <Navbar />
      <div className="container" style={{ maxWidth: "440px" }}>
        <div style={{ textAlign: "center", padding: "48px 0 32px" }}>
          <span className="badge badge-amber" style={{ marginBottom: "12px", display: "inline-block" }}>
            Get Started
          </span>
          <h1 style={{ fontSize: "1.8rem", marginBottom: "8px" }}>Create an account</h1>
          <p style={{ fontSize: "14px" }}>Join NoteHive and start studying smarter.</p>
        </div>

        <div className="card">
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKey}
            autoFocus
          />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKey}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKey}
          />
          <button onClick={handleRegister} disabled={loading} style={{ width: "100%" }}>
            {loading ? "Creating account…" : "Register →"}
          </button>
          <p style={{ textAlign: "center", marginTop: "16px", fontSize: "13px" }}>
            Already have an account?{" "}
            <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
      <ToastContainer toasts={toasts} />
    </>
  );
}

export default Register;