import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Collapse,
  Stack,
  Divider,
} from '@mui/material';
import './StoryNode.css';

const StoryNode = ({
  taskName,
  projectName,
  reflection,
  tags,
  mediaUrls = [],
  endorsements = [],
  feedback = [],
  onAddEndorsement,
}) => {
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <Card className="story-node-card" variant="outlined">
      <CardContent>
        <Typography variant="h6" className="glow-text neon-purple">
          {taskName}
        </Typography>
        <Typography variant="subtitle2" className="neon-blue">
          from project: {projectName}
        </Typography>

        <Divider className="neon-divider" />

        <Typography variant="body1" className="reflection-text">
          {reflection}
        </Typography>

        <Stack direction="row" spacing={1} className="tag-container">
          {tags?.split(',').map((tag, i) => (
            <Chip
              key={i}
              label={tag.trim()}
              className="neon-chip neon-green"
              size="small"
            />
          ))}
        </Stack>

        <div className="media-links">
          <Typography variant="subtitle2" className="neon-orange">Media Links:</Typography>
          {mediaUrls.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="media-link neon-blue"
            >
              {url}
            </a>
          ))}
        </div>

        <div className="endorsement-section">
          <Typography variant="subtitle2" className="neon-pink">Endorsements:</Typography>
          {endorsements.map((endorsement, i) => (
            <div key={i} className="endorsement">
              <span className="emoji">{endorsement.emoji}</span>
              <span className="badge">{endorsement.badge}</span> —{' '}
              <span className="comment">{endorsement.comment}</span>
            </div>
          ))}
          <Button
            variant="outlined"
            color="secondary"
            onClick={onAddEndorsement}
            className="endorse-btn"
          >
            + Endorse
          </Button>
        </div>

        <Button
          className="feedback-toggle"
          onClick={() => setShowFeedback((prev) => !prev)}
          size="small"
        >
          {showFeedback ? 'Hide Feedback' : 'Show Feedback'}
        </Button>
        <Collapse in={showFeedback}>
          <div className="feedback-section">
            {feedback.map((fb, i) => (
              <Typography
                key={i}
                variant="body2"
                className="feedback-text neon-purple"
              >
                {fb}
              </Typography>
            ))}
          </div>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default StoryNode;
