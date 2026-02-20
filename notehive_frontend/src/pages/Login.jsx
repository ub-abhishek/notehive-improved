import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BASE_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { useToast, ToastContainer } from "../components/Toast";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toasts, addToast } = useToast();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      addToast("All fields required", "error");
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
        addToast(data.error || "Login failed", "error");
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
    if (e.key === "Enter") handleLogin();
  };

  return (
    <>
      <Navbar />
      <div className="container" style={{ maxWidth: "440px" }}>
        <div style={{ textAlign: "center", padding: "48px 0 32px" }}>
          <span className="badge badge-amber" style={{ marginBottom: "12px", display: "inline-block" }}>
            Welcome Back
          </span>
          <h1 style={{ fontSize: "1.8rem", marginBottom: "8px" }}>Sign in</h1>
          <p style={{ fontSize: "14px" }}>Continue your study session.</p>
        </div>

        <div className="card">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKey}
            autoFocus
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKey}
          />
          <button onClick={handleLogin} disabled={loading} style={{ width: "100%" }}>
            {loading ? "Signing in…" : "Sign in →"}
          </button>
          <p style={{ textAlign: "center", marginTop: "16px", fontSize: "13px" }}>
            Don't have an account?{" "}
            <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
      <ToastContainer toasts={toasts} />
    </>
  );
}

export default Login;