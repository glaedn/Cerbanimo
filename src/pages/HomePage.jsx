import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";
import GalacticActivityMap from "../components/GalacticActivityMap/GalacticActivityMap.jsx";
import { useIsMobile } from "../hooks/useIsMobile";

export default function Homepage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleJoinAlpha = () => {
    if (window.navigator.vibrate) window.navigator.vibrate(50);
    navigate("/login");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className={`homepage ${isMobile ? 'mobile-view' : ''}`}>
      <section className="hero">
        <div className="galactic-activity-map-container">
            <GalacticActivityMap />
        </div>
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          style={{ fontSize: isMobile ? '2.5rem' : '4rem' }}
        >
          WELCOME TO CERBANIMO
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          style={{ fontSize: isMobile ? '1.1rem' : '1.5rem' }}
        >
          THE PROTOCOL FOR AUTONOMOUS COLLABORATION
        </motion.p>
        <motion.button
            className="cta-button"
            onClick={handleJoinAlpha}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            JOIN THE ALPHA
        </motion.button>
      </section>

      <motion.section
        className="features"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <motion.div className="feature-card" variants={itemVariants}>
          <h3>REAL-TIME SYNC</h3>
          <p>Contributors work together seamlessly across tasks with live updates and decentralized skill level tracking.</p>
        </motion.div>

        <motion.div className="feature-card" variants={itemVariants}>
          <h3>EQUITY ENGINE</h3>
          <p>Earn tokens for completing tasks for your chosen communities. Verified impact translates directly into platform reputation.</p>
        </motion.div>

        <motion.div className="feature-card" variants={itemVariants}>
          <h3>AUTONOMOUS GUILDS</h3>
          <p>Communities get a pool of tokens to allocate every day. Launch your own projects or join existing alliances to build what matters.</p>
        </motion.div>
      </motion.section>

      <motion.section
        className="vision"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h2>THE MISSION</h2>
        <p>
          Cerbanimo is building the foundation for a new kind of internet-native collaboration—one where equity, transparency, and creativity drive the engine.
          We are constructing a smart ledger for skill-based leveling, governance tools for autonomous guilds, and a crypto-integrated impact economy.
        </p>
      </motion.section>

      <footer className="footer">
        <p>© 2025 Cerbanimo. Built for contributors, by contributors.</p>
      </footer>
    </div>
  );
}