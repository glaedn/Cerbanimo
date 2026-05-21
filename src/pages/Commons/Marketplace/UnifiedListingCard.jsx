import React from 'react';
import { Box, Typography, Button, Chip } from '@mui/material';
import {
  AlertTriangle,
  Package,
  Wrench,
  Clock,
  MapPin,
  ShieldCheck,
  Rocket
} from 'lucide-react';
import theme from '../../../styles/theme';

const UnifiedListingCard = ({ entry }) => {
  const isNeed = entry.entry_type === 'need';
  const isResource = entry.entry_type === 'resource';

  const getIcon = () => {
    if (isNeed) return <AlertTriangle size={18} />;
    if (isResource) return <Package size={18} />;
    return <Wrench size={18} />;
  };

  const getTypeLabel = () => {
    return entry.entry_type.toUpperCase();
  };

  const getUrgencyColor = () => {
    if (entry.urgency === 'critical') return '#ff3232';
    if (entry.urgency === 'high') return '#ffae6d';
    return '#5ff0ff';
  };

  return (
    <Box className="glass-panel" sx={{
      p: 2.5,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      borderLeft: `4px solid ${getUrgencyColor()}`
    }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <Box sx={{ color: getUrgencyColor() }}>{getIcon()}</Box>
          <Typography variant="caption" sx={{
            fontFamily: 'Orbitron',
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '1px'
          }}>
            {getTypeLabel()}
          </Typography>
        </Box>
        <Chip
          label={`${Math.round(entry.matchScore || 0)}`}
          size="small"
          sx={{
            bgcolor: 'rgba(255,255,255,0.05)',
            color: '#ffae6d',
            fontFamily: 'Orbitron',
            fontSize: '0.65rem'
          }}
        />
      </Box>

      <Typography variant="h6" sx={{
        fontFamily: 'Orbitron',
        fontSize: '1rem',
        mb: 1.5,
        color: '#fff'
      }}>
        {entry.name.toUpperCase()}
      </Typography>

      <Typography variant="body2" sx={{
        color: 'rgba(255,255,255,0.7)',
        mb: 3,
        flexGrow: 1,
        lineHeight: 1.5,
        fontSize: '0.85rem'
      }}>
        {entry.description}
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={0.5} sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
          <MapPin size={14} />
          <span>{entry.location_text || 'GLOBAL_SECTOR'}</span>
        </Box>
        <Box display="flex" alignItems="center" gap={0.5} sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
          <ShieldCheck size={14} />
          <span>TRUSTED_CORE</span>
        </Box>
        <Box display="flex" alignItems="center" gap={0.5} sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
          <Clock size={14} />
          <span>{new Date(entry.created_at).toLocaleDateString()}</span>
        </Box>
      </Box>

      <Box display="flex" gap={1.5}>
        <Button
          fullWidth
          variant="contained"
          startIcon={isNeed ? <Wrench size={16} /> : <Rocket size={16} />}
          sx={{
            bgcolor: '#ffae6d',
            color: '#000',
            fontWeight: 'bold',
            fontFamily: 'Orbitron',
            fontSize: '0.7rem',
            '&:hover': { bgcolor: '#f97316' }
          }}
        >
          {isNeed ? 'OFFER_AID' : 'REQUEST_ACCESS'}
        </Button>
        <Button
          variant="outlined"
          onClick={() => alert(`Starting mission for ${entry.name}`)}
          sx={{
            borderColor: 'rgba(255,174,109,0.3)',
            color: '#ffae6d',
            minWidth: '44px',
            p: 0,
            '&:hover': { borderColor: '#ffae6d' }
          }}
          title="Start Mission"
        >
          <Rocket size={18} />
        </Button>
      </Box>
    </Box>
  );
};

export default UnifiedListingCard;
