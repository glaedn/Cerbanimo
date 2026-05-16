import { useState } from 'react';
import PropTypes from 'prop-types';
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
  Box,
  Avatar,
} from '@mui/material';
//import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';

import './StoryNode.css';

const badges = ['Mentor', 'Innovator', 'Team Hero', 'Quantum Thinker'];
const emojiOptions = ['👍', '💡', '🚀', '🌟'];

const StoryNode = ({
  task_name,
  project_name,
  reflection,
  tags,
  media_urls = [],
  endorsements = [],
  feedback = [],
  narrative,
  impact_label,
  impact_weight,
  outcome_statement,
  onAddEndorsement,
  verification_type,
  story_type = 'operational', // 'operational', 'human', 'community', 'crisis', 'governance', 'mentorship'
  collaborators = [],
  downstream_effects = [],
  mentorship_links = [],
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
  console.log('Endorsements:', endorsements);

  return (
    <Card className={`story-node-card story-type-${story_type}`} variant="outlined">
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" className="story-node-header-label glow-text">
              {task_name}
            </Typography>
            <Typography variant="subtitle2" className="story-node-subheader">
              {project_name && `from project: ${project_name}`}
            </Typography>
          </Box>
          <Chip
            label={story_type.toUpperCase()}
            size="small"
            className={`story-type-chip type-${story_type}`}
            sx={{ fontFamily: 'Orbitron', fontSize: '0.6rem' }}
          />
        </Box>

        <Divider className="neon-divider" />

        <Typography variant="subtitle2" className="story-node-subheader">
          Reflection:
        </Typography>
        <Typography variant="body1" className="reflection-text">
          &quot;{reflection}&quot;
        </Typography>

        {narrative && (
          <Box sx={{ mt: 2, p: 1.5, borderRadius: 1, bgcolor: 'rgba(0, 243, 255, 0.05)', borderLeft: '3px solid #00f3ff' }}>
             <Typography variant="subtitle2" sx={{ color: '#00f3ff', mb: 0.5, fontSize: '0.75rem', fontWeight: 'bold' }}>AI INTERPRETATION:</Typography>
             <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#e0e0e0' }}>{narrative}</Typography>
          </Box>
        )}

        {impact_label && (
          <Box sx={{ mt: 2, p: 1.5, borderRadius: 1, bgcolor: 'rgba(255, 92, 162, 0.08)', borderLeft: '3px solid #ff5ca2' }}>
            <Typography variant="subtitle2" sx={{ color: '#ff5ca2', mb: 0.5, fontSize: '0.75rem', fontWeight: 'bold' }}>
              IMPACT SIGNAL{impact_weight !== null && impact_weight !== undefined ? ` - ${impact_weight}%` : ''}
            </Typography>
            <Typography variant="body2" sx={{ color: '#f4f4f4' }}>{impact_label}</Typography>
            {outcome_statement && (
              <Typography variant="caption" sx={{ color: '#bbb', display: 'block', mt: 0.75 }}>
                Outcome: {outcome_statement}
              </Typography>
            )}

            {downstream_effects.length > 0 && (
              <Box sx={{ mt: 1, pl: 2, borderLeft: '1px dashed rgba(255, 92, 162, 0.4)' }}>
                <Typography variant="caption" sx={{ color: '#ff5ca2', fontWeight: 'bold', display: 'block', mb: 0.5 }}>DOWNSTREAM EFFECTS:</Typography>
                {downstream_effects.map((effect, idx) => (
                  <Typography key={idx} variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
                    ↳ {effect}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        )}

        {collaborators.length > 0 && (
          <Box sx={{ mt: 2 }}>
             <Typography variant="subtitle2" className="story-node-subheader">Collaborators:</Typography>
             <Stack direction="row" spacing={1} flexWrap="wrap">
               {collaborators.map((c, i) => (
                 <Tooltip key={i} title={c.role || 'Contributor'}>
                    <Chip
                      avatar={<Avatar src={c.avatar} sx={{ width: 20, height: 20 }} />}
                      label={c.name}
                      size="small"
                      variant="outlined"
                      sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}
                    />
                 </Tooltip>
               ))}
             </Stack>
          </Box>
        )}

        {mentorship_links.length > 0 && (
          <Box sx={{ mt: 2, p: 1, bgcolor: 'rgba(0, 215, 135, 0.05)', borderRadius: 1, border: '1px solid rgba(0, 215, 135, 0.2)' }}>
            <Typography variant="caption" sx={{ color: '#00D787', fontWeight: 'bold', display: 'block' }}>MENTORSHIP LINEAGE:</Typography>
            {mentorship_links.map((link, idx) => (
              <Typography key={idx} variant="caption" sx={{ color: '#e0e0e0', display: 'block' }}>
                {link.type === 'mentor' ? 'Guided by' : 'Mentored'} {link.name} in {link.skill}
              </Typography>
            ))}
          </Box>
        )}

        <Typography variant="subtitle2" className="story-node-subheader">
          Skill type:
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          {(typeof tags === 'string' ? tags.split(',') : Array.isArray(tags) ? tags : []).some(t => t.trim() === 'Mutual Aid Contributions') && (
            <Chip
              label="Mutual Aid"
              sx={{
                bgcolor: 'rgba(255, 0, 255, 0.15)',
                color: '#ff00ff',
                borderColor: '#ff00ff',
                border: '1px solid',
                fontFamily: 'Orbitron',
                fontSize: '0.65rem'
              }}
              size="small"
            />
          )}
          {verification_type && (
            <Chip
              label={verification_type.replace('_', ' ').toUpperCase()}
              sx={{
                bgcolor: 'rgba(0, 255, 255, 0.15)',
                color: '#00ffff',
                borderColor: '#00ffff',
                border: '1px solid',
                fontFamily: 'Orbitron',
                fontSize: '0.65rem'
              }}
              size="small"
            />
          )}
        </Stack>
        <Stack direction="row" spacing={1} className="tag-container">
          {(typeof tags === 'string' ? tags.split(',') : Array.isArray(tags) ? tags : []).map((tag, i) => (
            <Chip
              key={i}
              label={tag.trim()}
              className="neon-chip neon-chip-green" /* Updated class */
              size="small"
            />
          ))}
        </Stack>

        <div className="media-links">
          <Typography variant="subtitle2" className="story-node-subheader">
            Media Links:
          </Typography>
          {media_urls.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="media-link" /* Removed neon-blue */
            >
              {url}
            </a>
          ))}
        </div>

        <div className="endorsement-section">
          <Typography variant="subtitle2" className="story-node-subheader">
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
                className="feedback-text" /* Removed neon-purple */
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

StoryNode.propTypes = {
  task_name: PropTypes.string,
  project_name: PropTypes.string,
  reflection: PropTypes.string,
  tags: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
  ]),
  media_urls: PropTypes.arrayOf(PropTypes.string),
  endorsements: PropTypes.arrayOf(PropTypes.shape({
    emoji: PropTypes.string,
    badge: PropTypes.string,
    comment: PropTypes.string,
  })),
  feedback: PropTypes.arrayOf(PropTypes.string),
  narrative: PropTypes.string,
  impact_label: PropTypes.string,
  impact_weight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  outcome_statement: PropTypes.string,
  onAddEndorsement: PropTypes.func,
  verification_type: PropTypes.string,
  story_type: PropTypes.oneOf(['operational', 'human', 'community', 'crisis', 'governance', 'mentorship']),
  collaborators: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    avatar: PropTypes.string,
    role: PropTypes.string
  })),
  downstream_effects: PropTypes.arrayOf(PropTypes.string),
  mentorship_links: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    type: PropTypes.string,
    skill: PropTypes.string
  })),
};
