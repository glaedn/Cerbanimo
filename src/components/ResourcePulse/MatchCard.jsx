import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';

// Assuming ResourcePulse.css is imported in a parent component or globally
// import './ResourcePulse.css'; // Or directly if preferred

const MatchCard = ({ match, type }) => {
  if (!match) {
    return null;
  }

  const {
    name,
    description,
    category,
    location_text,
    tags, // This could be resource_tags or need_tags depending on match source
    score,
    // For resources matching a need, 'match' is the resource
    // For needs matching a resource, 'match' is the need
    // The parent component (ResourcePulseView) should ensure the 'tags' field is consistently named (e.g. match_tags)
    // or we can check for specific field names like 'resource_tags' or 'need_tags'
    resource_tags, // from matchingService for resources
    need_tags,     // from matchingService for needs
  } = match;

  const displayTags = tags || resource_tags || need_tags;

  const handleRequestResource = () => {
    console.log('Request This Resource clicked for:', match);
    // Placeholder for future API call to initiate a request or transaction
  };

  const handleOfferResource = () => {
    console.log('Offer Your Resource clicked for:', match);
    // Placeholder for future API call to make an offer
  };

  return (
    <Card className="match-card" sx={{ mb: 2, backgroundColor: '#e9f5ff' }}>
      <CardContent>
        <Typography variant="h6" component="h4" gutterBottom sx={{color: '#004085'}}>
          {name}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {description}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Category:</strong> {category}
        </Typography>
        {location_text && (
          <Typography variant="body2" color="text.secondary">
            <strong>Location:</strong> {location_text}
          </Typography>
        )}
        {score !== undefined && (
          <Typography variant="body2" className="score" sx={{ fontWeight: 'bold', color: '#28a745', mt:1 }}>
            <strong>Match Score:</strong> {score.toFixed(2)}
          </Typography>
        )}
        {displayTags && displayTags.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mt: 1, mb:1 }} className="tags">
            <Typography variant="body2" component="strong" sx={{fontSize: '0.8em', color: '#555'}}>Tags:</Typography>
            {displayTags.map((tag, index) => (
              <Chip key={index} label={tag} size="small" sx={{ backgroundColor: '#007bff', color: 'white', fontSize: '0.9em' }} />
            ))}
          </Stack>
        )}
      </CardContent>
      <CardActions>
        {type === 'need_match' && ( // A resource matches your need
          <Button size="small" variant="contained" onClick={handleRequestResource} sx={{backgroundColor: '#007bff'}}>
            Request This Resource
          </Button>
        )}
        {type === 'resource_match' && ( // A need matches your resource
          <Button size="small" variant="contained" onClick={handleOfferResource} sx={{backgroundColor: '#007bff'}}>
            Offer Your Resource
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

export default MatchCard;
