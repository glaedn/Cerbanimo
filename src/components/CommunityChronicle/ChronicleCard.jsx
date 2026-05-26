import { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Chip, Box } from '@mui/material';

const ChronicleCard = ({ node }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <Card className={`chronicle-card ${visible ? 'show' : ''}`}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" sx={{ color: 'var(--hud-primary-color)', fontFamily: 'var(--hud-header-font)', mb: 1 }}>
          {node.name}
        </Typography>
        <Typography variant="body2" className="chronicle-reflection" sx={{ mb: 2, flexGrow: 1 }}>
          {node.reflection}
        </Typography>
        <Box sx={{ mt: 'auto', display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {node.tags?.map(tag => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              sx={{
                bgcolor: 'rgba(95, 240, 255, 0.1)',
                color: 'var(--hud-primary-color)',
                border: '1px solid rgba(95, 240, 255, 0.3)',
                fontSize: '0.7rem'
              }}
            />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default ChronicleCard;
