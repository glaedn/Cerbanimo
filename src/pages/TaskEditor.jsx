// components/TaskEditorModal.jsx
import React from 'react';
import { Modal, TextField, Button, Checkbox } from '@mui/material';

const TaskEditor = ({ open, onClose, taskForm, setTaskForm, onSubmit, skills }) => {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-content">
        <TextField label="Task Name" value={taskForm.name} onChange={e => setTaskForm({ ...taskForm, name: e.target.value })} />
        <TextField label="Description" value={taskForm.description} multiline onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} />
        <select value={taskForm.skill_id} onChange={e => setTaskForm({ ...taskForm, skill_id: e.target.value })}>
          <option value="">Select Skill</option>
          {skills.map(skill => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
        </select>
        <Checkbox checked={taskForm.active_ind} onChange={e => setTaskForm({ ...taskForm, active_ind: e.target.checked })} />
        <TextField label="Reward Tokens" type="number" value={taskForm.reward_tokens} onChange={e => setTaskForm({ ...taskForm, reward_tokens: e.target.value })} />
        <Button onClick={onSubmit}>Save Task</Button>
      </div>
    </Modal>
  );
};

export default TaskEditor;
