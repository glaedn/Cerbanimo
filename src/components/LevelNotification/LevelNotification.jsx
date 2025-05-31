import React, { useEffect, useState, useRef } from 'react';
import { Box, LinearProgress, Typography, Paper } from '@mui/material';
import './LevelNotification.css';

const generateProgressText = (progress, totalChars = 10) => {
    if (progress === undefined || progress === null) progress = 0;
    const numEquals = Math.round((progress / 100) * totalChars);
    const numDashes = totalChars - numEquals;
    return '='.repeat(numEquals) + '-'.repeat(numDashes);
};

const getXPForLevel = (level) => {
    if (level <= 1) return 0;
    return 40 * Math.pow(level - 1, 2);
};

const LevelNotification = ({ previousXP, newXP, previousLevel, newLevel, skillName }) => {
    console.log("LevelNotification received props:", { previousXP, newXP, previousLevel, newLevel, skillName });
    const [isVisible, setIsVisible] = useState(false);
    const [currentXPProgress, setCurrentXPProgress] = useState(0); // Initialize with 0, effect will set actual start
    const [textualProgress, setTextualProgress] = useState(generateProgressText(0));
    const [showLevelUp, setShowLevelUp] = useState(false);
    
    const hideTimerRef = useRef(null);

    useEffect(() => {
        // Ensure all props are defined before proceeding
        if (typeof newXP === 'number' && typeof newLevel === 'number' && typeof previousXP === 'number' && typeof previousLevel === 'number') {
            setIsVisible(true);
            const didLevelUp = newLevel > previousLevel;
            setShowLevelUp(didLevelUp);

            const currentLevelForBar = newLevel; // Bar always shows progress for the current level (newLevel)
            const nextLevelForBar = newLevel + 1;

            const xpAtCurrentLevelStart = getXPForLevel(currentLevelForBar);
            const xpAtNextLevelStart = getXPForLevel(nextLevelForBar);
            const totalXPInLevelBand = xpAtNextLevelStart - xpAtCurrentLevelStart;

            let animStartPercent = 0;
            if (!didLevelUp) { // No level up, calculate progress within the same level band
                const xpAtPrevLevelActualStart = getXPForLevel(previousLevel); // previousLevel is same as currentLevelForBar here
                const xpAtNextFromPrevActualStart = getXPForLevel(previousLevel + 1); // nextLevelForBar
                const totalXPInPrevActualBand = xpAtNextFromPrevActualStart - xpAtPrevLevelActualStart;

                if (totalXPInPrevActualBand > 0) {
                    animStartPercent = ((previousXP - xpAtPrevLevelActualStart) / totalXPInPrevActualBand) * 100;
                } else if (previousXP >= xpAtPrevLevelActualStart) { // handles case where totalXPInPrevActualBand is 0 (e.g. max level)
                    animStartPercent = 100;
                }
            } else { // Leveled up, start animation from 0 for the new level's progress display
                animStartPercent = 0;
            }
            animStartPercent = Math.max(0, Math.min(animStartPercent, 100));

            let targetDisplayPercent = 0;
            if (totalXPInLevelBand > 0) {
                targetDisplayPercent = ((newXP - xpAtCurrentLevelStart) / totalXPInLevelBand) * 100;
            } else if (newXP >= xpAtCurrentLevelStart) { // At max level or XP formula makes band 0
                targetDisplayPercent = 100;
            }
            targetDisplayPercent = Math.max(0, Math.min(targetDisplayPercent, 100));

            setCurrentXPProgress(animStartPercent);
            setTextualProgress(generateProgressText(animStartPercent));

            const animationTimeout = setTimeout(() => {
                setCurrentXPProgress(targetDisplayPercent);
                setTextualProgress(generateProgressText(targetDisplayPercent));
            }, 50);

            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
            hideTimerRef.current = setTimeout(() => setIsVisible(false), 6000);

            return () => clearTimeout(animationTimeout);
        }
    }, [newXP, newLevel, previousXP, previousLevel]);

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
                        Lvl {newLevel}
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
                        Lvl {newLevel + 1}
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
