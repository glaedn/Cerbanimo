import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";

//Had to fix home page capitalization to match the file name
//TODO: Implement the rotating 3D lotus/starfield animation
const RotatingLotus = () => (
  <div className="rotating-lotus">
    ✨ Rotating 3D Lotus / Starfield ✨
  </div>
);

export default function Homepage() {
  // Get the navigate function from React Router
  const navigate = useNavigate();

  const handleEnterOrbit = () => {
    navigate("/orbit");
  };

  const handleDeclareIntention = () => {
    navigate("/intention-creation");
  };

  return (
    <div className="homepage">
      <section className="hero">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          ✧ RESONERA PORTAL ✧
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          Manifest with Intention — Co-create, Converge, Become.
        </motion.p>

        <RotatingLotus />

        <div className="cta-buttons">
          <button className="cta-button" onClick={handleEnterOrbit}>[ ENTER ORBIT ]</button>
          <button className="cta-button" onClick={handleDeclareIntention}>[ DECLARE AN INTENTION ]</button>
        </div>
      </section>

      <section className="live-manifestations">
        <h2 className="live-manifestations-title">✦ Live Manifestations ✦</h2>
        <ul className="live-manifestations-list">
          <li>● Realm “Soluna” is resonating at 89% alignment</li>
          <li>● New Intention: “Grow the Shared Garden”</li>
          <li>● 23 active resonances pulsing</li>
        </ul>
      </section>

      <footer className="footer">
        <p>© 2025 Resonera. Manifest with intention.</p>
      </footer>
    </div>
  );
}