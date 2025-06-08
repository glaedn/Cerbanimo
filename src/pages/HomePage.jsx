import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";
import GalacticActivityMap from "../components/GalacticActivityMap/GalacticActivityMap.jsx";
//Had to fix home page capitalization to match the file name

export default function Homepage() {
  // Get the navigate function from React Router
  const navigate = useNavigate();

  // Function to handle button click
  const handleJoinAlpha = () => {
    navigate("/login");
  };

  return (
    <div className="homepage">
      <section className="hero">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Welcome to Cerbanimo
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          Collaboration made fun and fair.
        </motion.p>
        <button className="cta-button" onClick={handleJoinAlpha}>Join the Alpha</button>
      </section>

      <section className="features">
        <motion.div
          className="feature"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2>Real-Time Collaboration</h2>
          <p>Contributors work together seamlessly across tasks with live updates and decentralized skill level tracking.</p>
        </motion.div>

        <motion.div
          className="feature"
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2>Fair Reward System</h2>
          <p>Earn tokens for completing tasks for your chosen communities. These are placeholder tokens that will be converted into the platform's cryptocurrency in a later update.</p>
        </motion.div>

        <motion.div
          className="feature"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2>Run You Own Community, and Join Others</h2>
          <p>Communities get a pool of tokens to allocate every day. Make your own project and generate tokens for others, and take on tasks for projects doing things that matter to you.</p>
        </motion.div>
      </section>

      <section className="vision">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          Our Mission & The Road Ahead
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          Cerbanimo is building the foundation for a new kind of internet-native collaboration—one where equity, transparency, and creativity drive the engine. We're just getting started. Expect features like a smart ledger for the skill-based leveling system, governance tools for the platform and projects and skill guilds within, and crypto-integrated reward systems in the near future.
        </motion.p>
      </section>

      <footer className="footer">
        <p>© 2025 Cerbanimo. Built for contributors, by contributors.</p>
      </footer>
    </div>
  );
}