import { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Chip } from '@mui/material';

const ChronicleCard = ({ node }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <Card className={`chronicle-card ${visible ? 'show' : ''}`}>
      <CardContent>
        <Typography variant="h6">{node.name}</Typography>
        <Typography variant="body2">{node.reflection}</Typography>
        <div style={{ marginTop: 8 }}>
          {node.tags?.map(tag => (
            <Chip key={tag} label={tag} size="small" style={{ margin: 2 }} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ChronicleCard;
