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
    taskForm.status === "submitted"
  );
  const [platformUserId, setPlatformUserId] = useState(null);
  const isAssigned = taskForm.assigned_user_ids?.length > 0;
  const userIsAssigned = taskForm.assigned_user_ids?.some(
    (id) => Number(id) === Number(platformUserId) // Ensure both are numbers
  );
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
      };
      console.log("assigned users: ", taskForm.assigned_user_ids);

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
        {},
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
      const endpoint = approved ? "approve" : "reject";
      await axios.put(
        `http://localhost:4000/tasks/${taskForm.id}/${endpoint}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert(
        `Task ${endpoint === "approve" ? "approved" : "rejected"} successfully`
      );
      onClose();
      // Add notification logic here
    } catch (error) {
      console.error(`${approved ? "Approval" : "Rejection"} failed:`, error);
    }
  };

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
                variant="outlined"
                value={taskForm.name}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, name: e.target.value })
                }
                disabled={!isEdit}
              />

              <TextField
                className="cyber-input"
                label="DESCRIPTION"
                multiline
                rows={4}
                value={taskForm.description}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, description: e.target.value })
                }
                disabled={!isEdit}
              />

              <div className="cyber-skill-section">
                <div className="cyber-select">
                  <InputLabel>SKILL CATEGORY</InputLabel>
                  <Select
                    value={taskForm.skill_id}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, skill_id: e.target.value })
                    }
                    disabled={!isEdit}
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
                  value={taskForm.skill_level || 0}
                  onChange={(e) =>
                    setTaskForm({
                      ...taskForm,
                      skill_level: parseInt(e.target.value, 10),
                    })
                  }
                  InputProps={{ inputProps: { min: 0 } }}
                  disabled={!isEdit}
                />
              </div>

              <div className="cyber-dependencies">
                <InputLabel>DEPENDENCIES</InputLabel>
                <Box
                  sx={{ display: "flex", gap: 1, alignItems: "center", mt: 1 }}
                >
                  <Select
                    value={selectedDependency}
                    onChange={(e) => setSelectedDependency(e.target.value)}
                    disabled={!isEdit || loadingDependencies}
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
                    onClick={handleAddDependency}
                    disabled={!selectedDependency || !isEdit}
                    variant="outlined"
                  >
                    ADD
                  </Button>
                </Box>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
                  {loadingDependencies ? (
                    <Chip label="Loading dependencies..." />
                  ) : (
                    taskForm.dependenciesWithNames?.map((dep) => (
                      <Chip
                        key={dep.id}
                        label={dep.name}
                        onDelete={
                          isEdit
                            ? () => handleRemoveDependency(dep.id)
                            : undefined
                        }
                        color="primary"
                        variant="outlined"
                      />
                    )) ||
                    taskForm.dependencies?.map((depId) => (
                      <Chip
                        key={depId}
                        label={`Task ${depId}`}
                        onDelete={
                          isEdit
                            ? () => handleRemoveDependency(depId)
                            : undefined
                        }
                        color="primary"
                        variant="outlined"
                      />
                    ))
                  )}
                </Box>
              </div>
              <div className="cyber-assigned-users">
                <InputLabel>ASSIGNED OPERATORS</InputLabel>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
                  {taskForm.assigned_user_ids?.map((userId, index) => (
                    <Chip
                      key={index}
                      label={`Operator ${userId}`}
                      color="secondary"
                      variant="outlined"
                      onDelete={
                        isEdit ? () => handleRemoveAssignee(userId) : undefined
                      }
                    />
                  ))}
                  {taskForm.assigned_user_ids?.length === 0 && (
                    <Chip label="No assigned operators" variant="outlined" />
                  )}
                </Box>
              </div>
              <div className="cyber-checkboxes">
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
                      disabled={!isEdit || isUrgent}
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
                      disabled={!isEdit}
                    />
                  }
                  label="EMERGENCY PROTOCOL"
                />
              </div>

              <TextField
                className="cyber-input"
                label="REWARD TOKENS"
                type="number"
                value={taskForm.reward_tokens}
                onChange={(e) =>
                  setTaskForm({
                    ...taskForm,
                    reward_tokens: parseInt(e.target.value, 10),
                  })
                }
                InputProps={{ inputProps: { min: 0 } }}
                disabled={!isEdit}
              />

              <div className="cyber-button-group">
                {isEdit ? (
                  <>
                    <Button
                      className="cyber-button"
                      onClick={handleSubmit}
                      variant="contained"
                    >
                      SAVE TO DATACORE
                    </Button>
                    <Button className="cyber-button cancel" onClick={onClose}>
                      TERMINATE EDIT
                    </Button>
                  </>
                ) : (
                  <>
                    {!isEdit && (
                      <>
                        <Button
                          className={`cyber-button ${
                            userIsAssigned ? "cancel" : ""
                          }`}
                          onClick={handleTaskAction}
                          variant="contained"
                          disabled={
                            isSubmitted ||
                            taskForm.status?.includes("completed")
                          }
                        >
                          {userIsAssigned ? "DROP TASK" : "ACCEPT TASK"}
                        </Button>

                        {userIsAssigned && !isSubmitted && (
                          <Button
                            className="cyber-button"
                            onClick={handleTaskSubmission}
                            variant="contained"
                          >
                            SUBMIT TASK
                          </Button>
                        )}
                      </>
                    )}

                    {Number(projectCreatorId) === Number(platformUserId) &&
                      isSubmitted && (
                        <>
                          <Button
                            className="cyber-button approve"
                            onClick={() => handleApproval(true)}
                          >
                            APPROVE
                          </Button>
                          <Button
                            className="cyber-button reject"
                            onClick={() => handleApproval(false)}
                          >
                            REJECT
                          </Button>
                        </>
                      )}

                    <Button className="cyber-button neutral" onClick={onClose}>
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
