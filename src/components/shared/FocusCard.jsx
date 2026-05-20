import React from 'react';
import { motion } from 'framer-motion';
import './FocusCard.css';

const FocusCard = ({ title, kicker, children, actions, status, type = 'default' }) => {
  return (
    <motion.div
      className={`focus-card glass-panel ${type}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="focus-card-header">
        <div className="focus-card-kicker">{kicker}</div>
        <div className="focus-card-title-row">
          <h2 className="focus-card-title">{title}</h2>
          {status && <span className="focus-card-status">{status}</span>}
        </div>
      </div>

      <div className="focus-card-content">
        {children}
      </div>

      {actions && (
        <div className="focus-card-actions">
          {actions}
        </div>
      )}
    </motion.div>
  );
};

export default FocusCard;
