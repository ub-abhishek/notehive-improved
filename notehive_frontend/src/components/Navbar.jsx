import { useNavigate } from "react-router-dom";

function Navbar({ showBack = false, backLabel = "Back" }) {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <span className="navbar-brand">
        Note<span>Hive</span>
      </span>
      {showBack && (
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← {backLabel}
        </button>
      )}
    </nav>
  );
}

export default Navbar;
