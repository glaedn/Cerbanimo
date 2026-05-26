import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";
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
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { y: 24, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
  };

  const modes = [
    {
      tag: "ORBIT",
      tagColor: "#00F3FF",
      title: "IDENTITY & SKILL",
      description:
        "Your personal command center. Build a skill constellation, earn XP, and accumulate a chronicle of verified work that becomes your reputation.",
    },
    {
      tag: "MISSIONS",
      tagColor: "#4DABF7",
      title: "PROJECTS & TASKS",
      description:
        "Create projects, claim tasks by skill, and track complex dependency chains through a live graph visualizer. Work flows through a full review and approval lifecycle.",
    },
    {
      tag: "COMMONS",
      tagColor: "#A78BFA",
      title: "GUILDS & COMMUNITIES",
      description:
        "Join guilds, form constellations, and participate in a marketplace where resources, needs, and offers are matched across your communities.",
    },
    {
      tag: "SIGNALS",
      tagColor: "#FF5CA2",
      title: "GOVERNANCE & IMPACT",
      description:
        "Run proposals, manage a community constitution, resolve disputes, and track the downstream impact of every collective decision.",
    },
  ];

  return (
    <div className={`homepage ${isMobile ? "mobile-view" : ""}`}>

      {/* ── HERO ── */}
      <section className="hero">
        <motion.div
          className="hero-starfield"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
        />
        <motion.span
          className="hero-eyebrow"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          ALPHA ACCESS OPEN
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ fontSize: isMobile ? "2.4rem" : "4rem" }}
        >
          CERBANIMO
        </motion.h1>
        <motion.p
          className="hero-sub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.8 }}
          style={{ fontSize: isMobile ? "1.05rem" : "1.35rem" }}
        >
          Coordination infrastructure for projects, communities, and collective action.
          <br />
          Skill-routed tasks. Narrative reputation. Civic governance. All in one system.
        </motion.p>
        <motion.button
          className="cta-button"
          onClick={handleJoinAlpha}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
        >
          JOIN THE ALPHA
        </motion.button>
      </section>

      {/* ── FOUR MODES ── */}
      <motion.section
        className="features"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
      >
        {modes.map((mode) => (
          <motion.div
            key={mode.tag}
            className="feature-card"
            variants={itemVariants}
            whileInView="visible"
            style={{ "--accent": mode.tagColor }}
          >
            <span className="feature-tag" style={{ color: mode.tagColor, borderColor: mode.tagColor }}>
              {mode.tag}
            </span>
            <h3 style={{ color: mode.tagColor }}>{mode.title}</h3>
            <p>{mode.description}</p>
          </motion.div>
        ))}
      </motion.section>

      {/* ── VISION ── */}
      <motion.section
        className="vision"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <h2>THE MISSION</h2>
        <p>
          Most coordination tools optimize for speed and visibility, not equity or trust.
          Cerbanimo is designed differently — contribution is matched by skill, reputation is
          built from verified work, and communities govern themselves through transparent
          civic tools. It is a platform for people who want to build things that matter,
          with others who show up.
        </p>
      </motion.section>

      {/* ── SIGNAL STRIP ── */}
      <motion.section
        className="signal-strip"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        {[
          "Skill-based task routing",
          "Dependency-aware project graphs",
          "Community token wallets",
          "AI coordination agents",
          "Governance chambers",
          "Impact receipts",
          "Federation between communities",
          "Narrative identity",
          "Discord integration",
        ].map((item) => (
          <span key={item} className="signal-chip">
            {item}
          </span>
        ))}
      </motion.section>

      <footer className="footer">
        <p>© 2026 Cerbanimo. Built for contributors, by contributors.</p>
      </footer>
    </div>
  );
}