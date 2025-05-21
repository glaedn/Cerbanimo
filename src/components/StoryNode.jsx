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
  TextField,
  Tooltip,
  Menu,
  MenuItem,
} from '@mui/material';
//import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';

import './StoryNode.css';

const badges = ['Mentor', 'Innovator', 'Team Hero', 'Quantum Thinker'];
const emojiOptions = ['👍', '💡', '🚀', '🌟'];

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
  const [comment, setComment] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);

  const handleEmojiClick = (emoji) => {
    onAddEndorsement({ type: 'emoji', emoji });
  };

  const handleCommentSubmit = () => {
    if (comment.trim()) {
      onAddEndorsement({ type: 'comment', comment });
      setComment('');
    }
  };

  const handleBadgeClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleBadgeSelect = (badge) => {
    onAddEndorsement({ type: 'badge', badge });
    setAnchorEl(null);
  };

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
          <Typography variant="subtitle2" className="neon-orange">
            Media Links:
          </Typography>
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
          <Typography variant="subtitle2" className="neon-pink">
            Endorsements:
          </Typography>
          {endorsements.map((endorsement, i) => (
            <div key={i} className="endorsement">
              <span className="emoji">{endorsement.emoji}</span>
              <span className="badge">{endorsement.badge}</span>{' '}
              <span className="comment">{endorsement.comment}</span>
            </div>
          ))}

          <div className="endorsement-panel">
            {/* Emoji Endorsements */}
            {emojiOptions.map((emoji) => (
              <Tooltip key={emoji} title={`React with ${emoji}`}>
                <Button
                  onClick={() => handleEmojiClick(emoji)}
                  className="endorse-btn neon-button"
                >
                  {emoji}
                </Button>
              </Tooltip>
            ))}

            {/* Short Praise Comment */}
            <div className="endorse-input">
              <TextField
                size="small"
                placeholder="Great work!"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="neon-input"
              />
              <Button onClick={handleCommentSubmit} className="neon-button">
                <ChatBubbleOutlineIcon />
              </Button>
            </div>

            {/* Badge Dropdown */}
            <Tooltip title="Award a Badge">
              <Button onClick={handleBadgeClick} className="neon-button">
                <EmojiEventsIcon />
              </Button>
            </Tooltip>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              {badges.map((badge) => (
                <MenuItem key={badge} onClick={() => handleBadgeSelect(badge)}>
                  {badge}
                </MenuItem>
              ))}
            </Menu>
          </div>
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
