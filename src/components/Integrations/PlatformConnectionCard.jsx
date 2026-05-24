import React from 'react';
import { Box, Typography, Button, Avatar, Chip } from '@mui/material';
import theme from '../../styles/theme';

const PlatformConnectionCard = ({
  platform,
  displayName,
  icon,
  isConnected,
  externalUsername,
  onConnect,
  onDisconnect
}) => {
  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
      backgroundColor: 'rgba(10, 10, 46, 0.4)',
      border: `1px solid ${isConnected ? theme.colors.accentGreen : theme.colors.border}`,
      borderRadius: theme.borders.borderRadiusMd,
      transition: '0.3s',
      '&:hover': {
        backgroundColor: 'rgba(10, 10, 46, 0.6)',
        borderColor: isConnected ? theme.colors.accentGreen : theme.colors.primary,
        boxShadow: theme.effects.glowSubtle(isConnected ? theme.colors.accentGreen : theme.colors.primary),
      }
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar
          src={icon}
          sx={{
            width: 40,
            height: 40,
            backgroundColor: 'transparent',
            filter: isConnected ? 'none' : 'grayscale(100%) opacity(0.5)'
          }}
        >
          {platform.charAt(0).toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="subtitle1" sx={{ color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamilyAccent }}>
            {displayName}
          </Typography>
          {isConnected && externalUsername && (
            <Typography variant="caption" sx={{ color: theme.colors.accentGreen, fontFamily: theme.typography.fontFamilyBase }}>
              Linked as: {externalUsername}
            </Typography>
          )}
          {!isConnected && (
            <Typography variant="caption" sx={{ color: theme.colors.textSecondary, fontFamily: theme.typography.fontFamilyBase }}>
              Not connected
            </Typography>
          )}
        </Box>
      </Box>

      <Box>
        {isConnected ? (
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={onDisconnect}
            sx={{
              fontFamily: theme.typography.fontFamilyAccent,
              fontSize: '0.7rem'
            }}
          >
            Disconnect
          </Button>
        ) : (
          <Button
            size="small"
            variant="contained"
            onClick={onConnect}
            sx={{
              backgroundColor: theme.colors.primary,
              color: theme.colors.backgroundDefault,
              fontFamily: theme.typography.fontFamilyAccent,
              fontSize: '0.7rem',
              '&:hover': { backgroundColor: theme.colors.accentBlue }
            }}
          >
            Connect
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default PlatformConnectionCard;
