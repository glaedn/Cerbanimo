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
    console.log("LevelNotification received props:", { previousXP, newXP, previousLevel, newLevel, skillName });
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
            <Paper
                elevation={0} // HUD panels typically don't have material shadow, glow is from CSS
                className="level-up-message" // CSS class for animation and base styling
                sx={{
                    backgroundColor: 'transparent', // Or a very subtle rgba(10,20,50,0.3)
                    p: 1.5, // Padding
                    mb: 1.5, // Margin bottom
                    textAlign: 'center',
                }}
            >
                {showLevelUp ? (
                    <>
                        <Typography
                            variant="h5"
                            component="div"
                            sx={{
                                fontFamily: '"Orbitron", sans-serif',
                                fontWeight: 'bold',
                                color: '#FF5CA2', // Secondary pink for emphasis
                                textShadow: '0 0 6px #FF5CA2, 0 0 3px #FF5CA2', // Pink glow
                                mb: 0.5,
                            }}
                        >
                            {skillName || 'SKILL'} LEVELED UP!
                        </Typography>
                        <Typography
                            variant="h4"
                            component="div"
                            sx={{
                                fontFamily: '"Orbitron", sans-serif',
                                fontWeight: 'bold',
                                color: '#00F3FF', // Primary Cyan
                                textShadow: '0 0 7px #00F3FF',
                            }}
                        >
                            LEVEL {newLevel}
                        </Typography>
                    </>
                ) : (
                    <Typography
                        variant="h6"
                        component="div"
                        sx={{
                            fontFamily: '"Inter", sans-serif',
                            color: '#E0E0E0', // Slightly off-white
                            fontWeight: '500',
                        }}
                    >
                        XP GAINED IN {skillName || 'SKILL'}
                    </Typography>
                )}
            </Paper>

            <Box className="xp-bar-section">
                <Box className="xp-bar-display-container" sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Typography variant="body2" sx={{
                        minWidth: 50, // Adjusted width
                        textAlign: 'center',
                        mr: 1.5, // Adjusted margin
                        fontFamily: '"Orbitron", sans-serif',
                        color: '#00F3FF', // Cyan for level numbers
                        fontSize: '0.9rem',
                    }}>
                        LVL {previousLevel}
                    </Typography>
                    <Box sx={{ flexGrow: 1, position: 'relative', height: '22px' /* Slightly thicker bar */ }}>
                        <LinearProgress 
                            variant="determinate" 
                            value={currentXPProgress} 
                            sx={{
                                height: '100%',
                                borderRadius: '4px', // Sharper HUD-like radius
                                backgroundColor: 'rgba(0, 243, 255, 0.2)', // Faint cyan track
                                '& .MuiLinearProgress-bar': {
                                    backgroundColor: '#00F3FF', // Solid cyan bar
                                    borderRadius: '4px',
                                }
                            }}
                        />
                        <Typography variant="body2" className="textual-progress-display">
                            {textualProgress}
                        </Typography>
                    </Box>
                    <Typography variant="body2" sx={{
                        minWidth: 50, // Adjusted width
                        textAlign: 'center',
                        ml: 1.5, // Adjusted margin
                        fontFamily: '"Orbitron", sans-serif',
                        color: '#00F3FF', // Cyan for level numbers
                        fontSize: '0.9rem',
                    }}>
                        LVL {newLevel}
                    </Typography>
                </Box>
                <Typography variant="body2" sx={{
                    textAlign: 'center',
                    mt: 0.75, // Adjusted margin
                    fontFamily: '"Inter", sans-serif',
                    color: '#A0A0A0', // Dimmer white/grey for XP text
                    fontSize: '0.8rem',
                }}>
                    XP: {previousXP || 0} → {newXP || 0}
                </Typography>
            </Box>
        </Box>
    );
};

export default LevelNotification;
