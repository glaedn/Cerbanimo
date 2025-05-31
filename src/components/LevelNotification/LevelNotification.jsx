import React, { useEffect, useState, useRef } from 'react';
import { Box, LinearProgress, Typography, Paper } from '@mui/material';
import './LevelNotification.css';

const generateProgressText = (progress, totalChars = 10) => {
    if (progress === undefined || progress === null) progress = 0;
    const numEquals = Math.round((progress / 100) * totalChars);
    const numDashes = totalChars - numEquals;
    return '='.repeat(numEquals) + '-'.repeat(numDashes);
};

const LevelNotification = ({ previousXP, newXP, previousLevel, newLevel, skillName }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [currentXPProgress, setCurrentXPProgress] = useState(previousXP || 0);
    const [textualProgress, setTextualProgress] = useState(generateProgressText(previousXP || 0));
    const [showLevelUp, setShowLevelUp] = useState(false);
    
    const hideTimerRef = useRef(null);

    // Main effect for visibility, animation triggering, and auto-hide
    useEffect(() => {
        // Only trigger if there's a meaningful change.
        // Check if newXP or newLevel is defined and different from previous state or if it's an initial valid trigger.
        // This condition might need refinement based on how props are expected to update.
        // For now, let's assume any change in newXP or newLevel should re-trigger.
        if (newXP !== undefined && newLevel !== undefined) {
            
            setIsVisible(true);
            setShowLevelUp(newLevel > previousLevel);

            // Reset progress to previousXP then schedule update to newXP to re-trigger animation
            setCurrentXPProgress(previousXP || 0);
            setTextualProgress(generateProgressText(previousXP || 0));

            // Short delay to allow React to process state update and re-render if necessary
            // before starting the animation to newXP.
            const animationTriggerTimeout = setTimeout(() => {
                setCurrentXPProgress(newXP);
                setTextualProgress(generateProgressText(newXP));
            }, 50); // 50ms delay

            // Clear previous hide timer if it exists
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
            }

            // Set new timer to hide the notification
            hideTimerRef.current = setTimeout(() => {
                setIsVisible(false);
            }, 4000); // Hide after 4 seconds

            return () => {
                clearTimeout(animationTriggerTimeout); // Clear animation trigger timeout as well
            };
        }
    }, [newXP, newLevel, previousXP, previousLevel]); // Dependencies that trigger the notification

    // Cleanup timer on component unmount
    useEffect(() => {
        return () => {
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
            }
        };
    }, []);


    if (!isVisible) {
        return null;
    }

    return (
        // Adding a fade-in animation class for when it becomes visible
        <Box className="level-notification-container notification-fade-in">
            <Paper elevation={4} className="level-up-message" sx={{ mb: 2, p: 1, textAlign: 'center' }}>
                {showLevelUp ? (
                    <>
                        <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
                            {skillName || 'Skill'} Leveled Up!
                        </Typography>
                        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                            Level {newLevel}
                        </Typography>
                    </>
                ) : (
                    <Typography variant="h6" component="div">
                        XP Gained in {skillName || 'Skill'}
                    </Typography>
                )}
            </Paper>

            <Box className="xp-bar-section">
                <Box className="xp-bar-display-container" sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Typography variant="body2" sx={{ minWidth: 35, textAlign: 'center', mr: 1 }}>
                        Lvl {previousLevel}
                    </Typography>
                    <Box sx={{ flexGrow: 1, position: 'relative', height: '20px' }}>
                        <LinearProgress 
                            variant="determinate" 
                            value={currentXPProgress} 
                            sx={{ height: '100%', borderRadius: '10px', backgroundColor: '#e0e0e0' }} 
                        />
                        <Typography variant="body2" className="textual-progress-display">
                            {textualProgress}
                        </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ minWidth: 35, textAlign: 'center', ml: 1 }}>
                        Lvl {newLevel}
                    </Typography>
                </Box>
                <Typography variant="body2" sx={{ textAlign: 'center', mt: 1 }}>
                    XP: {previousXP || 0} → {newXP || 0}
                </Typography>
            </Box>
        </Box>
    );
};

export default LevelNotification;
