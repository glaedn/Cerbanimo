import React, { useEffect, useState } from "react";
import {
  Modal,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Select,
  MenuItem,
  InputLabel,
  Chip,
  Box,
} from "@mui/material";
import axios from "axios";
import { useAuth0 } from "@auth0/auth0-react";
import "./TaskEditor.css";

const TaskEditor = ({
  open,
  onClose,
  taskForm,
  setTaskForm,
  onSubmit,
  skills,
  isEdit = true,
  projectId,
  currentUser,
  projectCreatorId,
  isReviewer,
}) => {
  const statusParts = taskForm.status?.split("-") || ["inactive", "unassigned"];
  const isUrgent = statusParts[0] === "urgent";
  const isActive =
    statusParts[0] !== "inactive" && statusParts[0] !== "completed";
  const [availableTasks, setAvailableTasks] = useState([]);
  const [dependencyOptions, setDependencyOptions] = useState([]);
  const [selectedDependency, setSelectedDependency] = useState("");
  const [loadingDependencies, setLoadingDependencies] = useState(false);
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [isSubmitted, setIsSubmitted] = useState(
    (taskForm.status || "").toLowerCase().includes("submitted")
  );

  const effectiveIsEdit = taskForm.status === "completed" ? false : isEdit;
 
  const [platformUserId, setPlatformUserId] = useState(null);
  const isAssigned = taskForm.assigned_user_ids?.length > 0;
  const userIsAssigned = taskForm.assigned_user_ids?.some(
    (id) => Number(id) === Number(platformUserId) // Ensure both are numbers
  );
  const [proofLinks, setProofLinks] = useState(taskForm.proof_of_work_links || [""]);

 useEffect(() => {
    setIsSubmitted((taskForm.status || "").toLowerCase().includes("submitted"));
  }, [taskForm.status]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (currentUser?.sub) {
        try {
          const token = await getAccessTokenSilently({
            audience: "http://localhost:4000",
            scope: "openid profile email",
          });
          const response = await axios.get("http://localhost:4000/profile", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setPlatformUserId(response.data.id);
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      }
    };

    fetchUserProfile();
  }, [currentUser?.sub, getAccessTokenSilently]);

  useEffect(() => {
    setProofLinks(taskForm.proof_of_work_links || [""]);
  }, [taskForm.proof_of_work_links]);

  // Fetch all tasks for the project when component mounts or projectId changes
  useEffect(() => {
    const fetchProjectTasks = async () => {
      try {
        const token = await getAccessTokenSilently({
          audience: "http://localhost:4000",
          scope: "openid profile email",
        });
        const response = await axios.get(
          `http://localhost:4000/tasks/p/${projectId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setAvailableTasks(response.data);

        // Create options excluding current task (if editing)
        const options = response.data
          .filter((task) => task.id !== taskForm.id)
          .map((task) => ({ id: task.id, name: task.name }));

        setDependencyOptions(options);
      } catch (error) {
        console.error("Error fetching project tasks:", error);
      }
    };

    if (projectId && open) {
      fetchProjectTasks();
    }
  }, [projectId, open, taskForm.id, getAccessTokenSilently]);

  // Load names for existing dependencies
  useEffect(() => {
    const loadDependencyNames = async () => {
      if (taskForm.dependencies?.length > 0) {
        setLoadingDependencies(true);
        try {
          const dependenciesWithNames = await Promise.all(
            taskForm.dependencies.map(async (depId) => {
              try {
                const token = await getAccessTokenSilently({
                  audience: "http://localhost:4000",
                  scope: "openid profile email",
                });
                const response = await axios.get(
                  `http://localhost:4000/tasks/${depId}`,
                  {
                    headers: { Authorization: `Bearer ${token}` },
                  }
                );

                return { id: parseInt(depId, 10), name: response.data.name };
              } catch (error) {
                console.error(`Error loading task ${depId}:`, error);
                return {
                  id: parseInt(depId, 10),
                  name: `Unknown Task (${depId})`,
                };
              }
            })
          );
          setTaskForm((prev) => ({
            ...prev,
            dependenciesWithNames: dependenciesWithNames,
          }));
        } catch (error) {
          console.error("Error loading dependencies:", error);
        } finally {
          setLoadingDependencies(false);
        }
      }
    };

    if (open && taskForm.dependencies && !taskForm.dependenciesWithNames) {
      loadDependencyNames();
    }
  }, [
    open,
    taskForm.dependencies,
    taskForm.id,
    getAccessTokenSilently,
    setTaskForm,
  ]);

  const handleProofChange = (index, value) => {
    const updatedLinks = [...proofLinks];
    updatedLinks[index] = value;
    setProofLinks(updatedLinks);
  };
  
  const handleAddProofLink = () => {
    setProofLinks([...proofLinks, ""]);
  };
  
  const handleRemoveProofLink = (index) => {
    const updatedLinks = proofLinks.filter((_, i) => i !== index);
    setProofLinks(updatedLinks.length ? updatedLinks : [""]); // Ensure at least one
  };

  const handleRemoveAssignee = (userId) => {
    setTaskForm({
      ...taskForm,
      assigned_user_ids: taskForm.assigned_user_ids.filter(
        (id) => id !== userId
      ),
      status:
        taskForm.status.includes("assigned") &&
        taskForm.assigned_user_ids.length <= 1
          ? taskForm.status.replace("-assigned", "-unassigned")
          : taskForm.status,
    });
  };

  const handleUrgentChange = (e) => {
    const isChecked = e.target.checked;
    const isAssigned = taskForm.assigned_user_ids?.length > 0;

    let newStatus;

    if (isChecked) {
      // When making urgent, force it to be active
      newStatus = `urgent-${isAssigned ? "assigned" : "unassigned"}`;
    } else {
      // When removing urgent, revert to active (not inactive)
      newStatus = `active-${isAssigned ? "assigned" : "unassigned"}`;
    }

    setTaskForm({ ...taskForm, status: newStatus });
  };

  const handleAddDependency = () => {
    if (
      selectedDependency &&
      !taskForm.dependencies?.includes(parseInt(selectedDependency, 10))
    ) {
      // Convert dependency to integer
      const depId = parseInt(selectedDependency, 10);

      const newDependencies = [...(taskForm.dependencies || []), depId];

      // Find the dependency name from options
      const selectedDep = dependencyOptions.find(
        (opt) => opt.id === selectedDependency
      );
      const newDependenciesWithNames = [
        ...(taskForm.dependenciesWithNames || []),
        { id: depId, name: selectedDep?.name || `Task ${depId}` },
      ];

      setTaskForm({
        ...taskForm,
        dependencies: newDependencies,
        dependenciesWithNames: newDependenciesWithNames,
      });

      setSelectedDependency("");
    }
  };

  const handleRemoveDependency = (depId) => {
    // Ensure depId is an integer for comparison
    const depIdInt = parseInt(depId, 10);

    setTaskForm({
      ...taskForm,
      dependencies: (taskForm.dependencies || []).filter(
        (id) => parseInt(id, 10) !== depIdInt
      ),
      dependenciesWithNames: (taskForm.dependenciesWithNames || []).filter(
        (dep) => parseInt(dep.id, 10) !== depIdInt
      ),
    });
  };

  const handleSubmit = async () => {
    try {
      // Ensure everything is properly formatted
      const formData = {
        ...taskForm,
        active: statusParts[0] !== "inactive",
        projectId: taskForm.project_id || projectId,
        skill_level: parseInt(taskForm.skill_level || 0, 10),
        reward_tokens: parseInt(taskForm.reward_tokens || 0, 10),
        dependencies: (taskForm.dependencies || []).map((id) =>
          parseInt(id, 10)
        ),
        status: taskForm.status || "inactive-unassigned",
        proof_of_work_links: proofLinks.filter(link => link.trim() !== ""),
      };
      console.log("Form data before submission:", formData);

      // Clean up before submission
      delete formData.project_id;
      delete formData.dependenciesWithNames;
      if (!formData.id) delete formData.id;

      const result = await onSubmit(formData);
      // Only show success if no error returned
      if (!result.error) {
        alert(`Task "${taskForm.name}" saved successfully`);
        onClose();
      }
    } catch (error) {
      alert("Failed to save task. Please try again.");
      console.error("Save failed:", error);
    }
  };

  // In your TaskEditor component
  const handleTaskAction = async () => {
    if (!platformUserId) {
      alert("User ID not found");
      return;
    }

    try {
      const action = userIsAssigned ? "drop" : "accept";
      const token = await getAccessTokenSilently();
      const response = await axios.put(
        `http://localhost:4000/tasks/${taskForm.id}/${action}`,
        { userId: platformUserId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.data.success) {
        alert(response.data.error || "Failed to update task");
        return;
      }

      alert(
        `Task ${action === "accept" ? "accepted" : "dropped"} successfully`
      );
      onClose();
    } catch (error) {
      console.error("Task action failed:", error);
      alert(error.message || "Failed to update task");
    }
  };

  const handleTaskSubmission = async () => {
    try {
      const token = await getAccessTokenSilently();
      await axios.post(
        `http://localhost:4000/tasks/${taskForm.id}/submit`,
        {
          proof_of_work_links: proofLinks.filter(link => link.trim() !== ""), // Add this line
          reflection: taskForm.reflection,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setIsSubmitted(true);
      onClose();
    } catch (error) {
      console.error("Submission failed:", error);
    }
  };
  

  const handleApproval = async (approved) => {
    try {
      const token = await getAccessTokenSilently();
      console.log("platformUserId:", platformUserId);
      await axios.put(
        `http://localhost:4000/tasks/${taskForm.id}/review`,
        { action: approved ? "approve" : "reject", userId: Number(platformUserId) },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert(
        `Task ${approved ? "approved" : "rejected"} successfully`
      );
      onClose();
      // Add notification logic here
    } catch (error) {
      console.error(`${approved ? "Approval" : "Rejection"} failed:`, error);
    }
  };
  console.log('isReviewer:', isReviewer, 'isSubmitted:', isSubmitted);
  return (
    <Modal open={open} onClose={onClose}>
      <div className="cyber-modal">
        <div className="cyber-border">
          <div className="cyber-content">
            <h3 className="cyber-title">
              TASK PROTOCOL {isEdit ? "EDITOR" : "VIEWER"}
            </h3>

            <div className="cyber-form">
              <TextField
                className="cyber-input"
                label="TASK NAME"
                variant="outlined" // Ensure outlined variant
                value={taskForm.name}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, name: e.target.value })
                }
                disabled={!effectiveIsEdit}
              />

              <TextField
                className="cyber-input"
                label="DESCRIPTION"
                multiline
                rows={4}
                variant="outlined" // Ensure outlined variant
                value={taskForm.description}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, description: e.target.value })
                }
                disabled={!effectiveIsEdit}
              />

              <div className="cyber-skill-section">
                <div className="cyber-select"> {/* Keep cyber-select for MuiInputLabel-root targeting if still needed, or ensure label is styled by cyber-input's label style */}
                  <InputLabel>SKILL CATEGORY</InputLabel>
                  <Select
                    value={taskForm.skill_id}
                    variant="outlined" // Ensure outlined variant
                    MenuProps={{ className: "cyber-select-menu" }} // For dropdown styling
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, skill_id: e.target.value })
                    }
                    disabled={!effectiveIsEdit}
                  >
                    <MenuItem value="">
                      <em>SELECT SKILL MODULE</em>
                    </MenuItem>
                    {skills.map((skill) => (
                      <MenuItem key={skill.id} value={skill.id}>
                        {skill.name.toUpperCase()}
                      </MenuItem>
                    ))}
                  </Select>
                </div>

                <TextField
                  className="cyber-input skill-level"
                  label="SKILL LVL"
                  type="number"
                  variant="outlined" // Ensure outlined variant
                  value={taskForm.skill_level || 0}
                  onChange={(e) =>
                    setTaskForm({
                      ...taskForm,
                      skill_level: parseInt(e.target.value, 10),
                    })
                  }
                  InputProps={{ inputProps: { min: 0 } }}
                  disabled={!effectiveIsEdit}
                />
              </div>

              <div className="cyber-section-container"> {/* Updated class */}
                <InputLabel className="cyber-section-label">DEPENDENCIES</InputLabel> {/* Updated class */}
                <Box
                  sx={{ display: "flex", gap: 1, alignItems: "center", mt: 1 }}
                >
                  <Select
                    className="cyber-select" // Added for select specific styling if needed
                    variant="outlined" // Ensure outlined variant
                    value={selectedDependency}
                    MenuProps={{ className: "cyber-select-menu" }} // For dropdown styling
                    onChange={(e) => setSelectedDependency(e.target.value)}
                    disabled={!effectiveIsEdit || loadingDependencies}
                    sx={{ flexGrow: 1 }}
                  >
                    <MenuItem value="">
                      <em>SELECT DEPENDENCY</em>
                    </MenuItem>
                    {dependencyOptions
                      .filter(
                        (opt) =>
                          !taskForm.dependencies?.includes(parseInt(opt.id, 10))
                      )
                      .map((task) => (
                        <MenuItem key={task.id} value={task.id}>
                          {task.name}
                        </MenuItem>
                      ))}
                  </Select>
                  <Button
                    className="cyber-button add-dependency-button" // Added specific class for styling if general .cyber-button isn't enough
                    onClick={handleAddDependency}
                    disabled={!selectedDependency || !effectiveIsEdit}
                    // variant="outlined" // Variant is less important due to custom styling
                  >
                    ADD
                  </Button>
                </Box>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
                  {loadingDependencies ? (
                    <Chip label="Loading dependencies..." className="cyber-chip" /> // Updated class
                  ) : (
                    taskForm.dependenciesWithNames?.map((dep) => (
                      <Chip
                        key={dep.id}
                        label={dep.name}
                        onDelete={
                          effectiveIsEdit
                            ? () => handleRemoveDependency(dep.id)
                            : undefined
                        }
                        className="cyber-chip" // Updated class
                        // variant="outlined" // Variant is less important
                      />
                    )) ||
                    taskForm.dependencies?.map((depId) => (
                      <Chip
                        key={depId}
                        label={`Task ${depId}`}
                        onDelete={
                          effectiveIsEdit
                            ? () => handleRemoveDependency(depId)
                            : undefined
                        }
                        className="cyber-chip" // Updated class
                        // variant="outlined"
                      />
                    ))
                  )}
                </Box>
              </div>
              <div className="cyber-section-container"> {/* Updated class */}
                <InputLabel className="cyber-section-label">ASSIGNED OPERATORS</InputLabel> {/* Updated class */}
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
                  {taskForm.assigned_user_ids?.map((userId, index) => (
                    <Chip
                      key={index}
                      label={`Operator ${userId}`}
                      className="cyber-chip" // Updated class
                      onDelete={
                        effectiveIsEdit ? () => handleRemoveAssignee(userId) : undefined
                      }
                    />
                  ))}
                  {taskForm.assigned_user_ids?.length === 0 && (
                    <Chip label="No assigned operators" className="cyber-chip" /> // Updated class
                  )}
                </Box>
              </div>
              <div className="cyber-checkboxes"> {/* This class is used for specific Checkbox child styling */}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isActive || isUrgent}
                      onChange={(e) => {
                        const newActiveState = e.target.checked;
                        const newStatus = newActiveState
                          ? `active-${isAssigned ? "assigned" : "unassigned"}`
                          : `inactive-${
                              isAssigned ? "assigned" : "unassigned"
                            }`;

                        // If currently urgent and being deactivated, remove urgent status
                        const finalStatus =
                          isUrgent && !newActiveState
                            ? newStatus.replace("urgent", "inactive")
                            : newStatus;

                        setTaskForm({ ...taskForm, status: finalStatus });
                      }}
                      disabled={!effectiveIsEdit || isUrgent}
                      sx={{
                        color: "#00f3ff", // Color when unchecked
                        "&.Mui-checked": {
                          color: "#00f3ff", // Color when checked
                        },
                        "&.Mui-disabled": {
                          color: "rgba(0, 243, 255, 0.5)", // Color when disabled
                        },
                      }}
                    />
                  }
                  label="ACTIVE STATUS"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isUrgent}
                      onChange={handleUrgentChange}
                      sx={{
                        color: "#00f3ff",
                        "&.Mui-checked": { color: "#ff003c" },
                      }}
                      disabled={!effectiveIsEdit}
                    />
                  }
                  label="EMERGENCY PROTOCOL"
                />
              </div>

              <TextField
                className="cyber-input"
                label="REWARD TOKENS"
                type="number"
                variant="outlined" // Ensure outlined variant
                value={taskForm.reward_tokens}
                onChange={(e) =>
                  setTaskForm({
                    ...taskForm,
                    reward_tokens: parseInt(e.target.value, 10),
                  })
                }
                InputProps={{ inputProps: { min: 0 } }}
                disabled={!effectiveIsEdit}
              />

              <div className="cyber-button-group">
                {isEdit ? (
                  <>
                    <Button
                      className="cyber-button primary" // Updated class
                      onClick={handleSubmit}
                      disabled={!effectiveIsEdit}
                    >
                      SAVE TO DATACORE
                    </Button>
                    <Button className="cyber-button cancel" onClick={onClose}> {/* Updated class */}
                      TERMINATE EDIT
                    </Button>
                  </>
                ) : (
                  <>
                    {!isEdit && (
                      <>
                        <Button
                          className={`cyber-button ${ // Base class
                            userIsAssigned ? "drop-task" : "accept-task" // Specific classes for color
                          }`}
                          onClick={handleTaskAction}
                          disabled={
                            isSubmitted ||
                            taskForm.status?.includes("completed")
                          }
                        >
                          {userIsAssigned ? "DROP TASK" : "ACCEPT TASK"}
                        </Button>
                        
                        {(taskForm.status !== "submitted" && userIsAssigned) && (
  <Box mt={2}>
    {/* These h4 and TextField for reflection/proof might need their own styling if not covered by general modal text/input styles */}
    <h4 style={{ fontFamily: 'Orbitron, sans-serif', color: '#00F3FF', textTransform: 'uppercase', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Reflection (Summarize your work)</h4>
    <TextField
      className="cyber-input" // Use existing input styling
      label="Reflection"
      variant="outlined"
      multiline
      disabled={taskForm.status?.includes("completed")}
      rows={4}
      value={taskForm.reflection}
      onChange={(e) =>
        setTaskForm({ ...taskForm, reflection: e.target.value })
      }
    />
    <h4 style={{ fontFamily: 'Orbitron, sans-serif', color: '#00F3FF', textTransform: 'uppercase', fontSize: '0.9rem', marginTop: '1rem', marginBottom: '0.5rem' }}>Proof of Work</h4>
    {proofLinks.map((link, index) => (
      <Box key={index} display="flex" alignItems="center" mb={1}>
        <TextField
          className ="cyber-input" // Use existing input styling
          variant="outlined"
          fullWidth
          disabled={taskForm.status?.includes("completed")}
          label={`Link ${index + 1}`}
          value={link}
          onChange={(e) => handleProofChange(index, e.target.value)}
        />
        {proofLinks.length > 1 && (
          <Button className="proof-link-button" 
          disabled={taskForm.status?.includes("completed")}
          onClick={() => handleRemoveProofLink(index)}>Remove</Button>
        )}
      </Box>
    ))}
    <Button className="cyber-button primary" style={{marginTop: '0.5rem'}} variant="outlined" disabled={taskForm.status?.includes("completed")} onClick={handleAddProofLink}>
      Add Proof of Work
    </Button>
  </Box>
)}

                        {userIsAssigned && !isSubmitted && (
                          <Button
                            className="cyber-button submit-task" // Updated class
                            onClick={handleTaskSubmission}
                            disabled={
                              proofLinks.length === 0 ||
                              proofLinks.some((link) => link.trim() === "" || taskForm.status?.includes("completed"))
                            }
                          >
                            SUBMIT TASK
                          </Button>
                        )}
                      </>
                    )}

                    { isReviewer &&
                      isSubmitted && (
                        <>
                        <Box mt={2}>
                          <h4 style={{ fontFamily: 'Orbitron, sans-serif', color: '#00F3FF', textTransform: 'uppercase', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Submitted Reflection</h4>
                          <Box
                            sx={{
                              background: "rgba(0, 20, 40, 0.7)", // Consistent dark background
                              color: "#00F3FF",
                              borderRadius: 1,
                              border: "1px solid #00F3FF",
                              p: 2,
                              mb: 2,
                              fontFamily: "'Inter', sans-serif", // Content font
                              whiteSpace: "pre-wrap",
                              maxHeight: '150px',
                              overflowY: 'auto',
                            }}
                          >
                            {taskForm.reflection}
                          </Box>
                          <h4 style={{ fontFamily: 'Orbitron, sans-serif', color: '#00F3FF', textTransform: 'uppercase', fontSize: '0.9rem', marginTop: '1rem', marginBottom: '0.5rem' }}>Proof of Work links (must review)</h4>
                          <Box
                            sx={{
                              background: "rgba(0, 20, 40, 0.7)", // Consistent dark background
                              color: "#00F3FF",
                              borderRadius: 1,
                              border: "1px solid #00F3FF",
                              p: 2,
                              mb: 2,
                              fontFamily: "'Inter', sans-serif", // Content font
                              whiteSpace: "pre-wrap",
                              maxHeight: '150px',
                              overflowY: 'auto',
                            }}
                          >
                            {Array.isArray(taskForm.proof_of_work_links)
                              ? taskForm.proof_of_work_links.map((link, idx) =>
                                  link ? (
                                    <div key={idx}>
                                      <a
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          color: "#FF5CA2", // Accent color for links
                                          textDecoration: "underline",
                                          wordBreak: "break-all",
                                        }}
                                      >
                                        {link}
                                      </a>
                                    </div>
                                  ) : null
                                )
                              : null}
                          </Box>
                        </Box>
                          <Button
                            className="cyber-button approve" // Updated class
                            onClick={() => handleApproval(true)}
                          >
                            APPROVE
                          </Button>
                          <Button
                            className="cyber-button reject" // Updated class
                            onClick={() => handleApproval(false)}
                          >
                            REJECT
                          </Button>
                        </>
                      )}

                    <Button className="cyber-button neutral" onClick={onClose}> {/* Updated class */}
                      CLOSE
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TaskEditor;
