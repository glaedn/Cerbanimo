import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import './ContextTray.css';

const ContextTray = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="context-tray-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="context-tray-sidebar glass-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="tray-header">
              <h3 className="tray-title">{title}</h3>
              <button className="tray-close-btn" onClick={onClose}>
                <X size={20} />
              </button>
            </div>
            <div className="tray-content">
              {children}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default ContextTray;
