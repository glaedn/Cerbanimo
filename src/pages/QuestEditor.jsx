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
import "./QuestEditor.css";
import theme from "../styles/theme";

const QuestEditor = ({
  open,
  onClose,
  questForm,
  setQuestForm,
  onSubmit,
  skills,
  isEdit = true,
  projectId,
  currentUser,
  projectCreatorId,
  isReviewer,
}) => {
  const statusParts = questForm.status?.split("-") || ["inactive", "unassigned"];
  const isUrgent = statusParts[0] === "urgent";
  const isActive =
    statusParts[0] !== "inactive" && statusParts[0] !== "completed";
  const [availableQuests, setAvailableQuests] = useState([]);
  const [dependencyOptions, setDependencyOptions] = useState([]);
  const [selectedDependency, setSelectedDependency] = useState("");
  const [loadingDependencies, setLoadingDependencies] = useState(false);
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [isSubmitted, setIsSubmitted] = useState(
    (questForm.status || "").toLowerCase().includes("submitted")
  );

  const effectiveIsEdit = questForm.status === "completed" ? false : isEdit;
 
  const [platformUserId, setPlatformUserId] = useState(null);
  const isAssigned = questForm.assigned_user_ids?.length > 0;
  const userIsAssigned = questForm.assigned_user_ids?.some(
    (id) => Number(id) === Number(platformUserId)
  );
  const [proofLinks, setProofLinks] = useState(questForm.spell_echo_links || [""]);

 useEffect(() => {
    setIsSubmitted((questForm.status || "").toLowerCase().includes("submitted"));
  }, [questForm.status]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (currentUser?.sub) {
        try {
          const token = await getAccessTokenSilently({
            audience: `${import.meta.env.VITE_BACKEND_URL}`,
            scope: "openid profile email",
          });
          const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile`, {
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
    setProofLinks(questForm.spell_echo_links || [""]);
  }, [questForm.spell_echo_links]);

  useEffect(() => {
    const fetchProjectQuests = async () => {
      try {
        const token = await getAccessTokenSilently({
          audience: `${import.meta.env.VITE_BACKEND_URL}`,
          scope: "openid profile email",
        });
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/tasks/p/${projectId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setAvailableQuests(response.data);

        const options = response.data
          .filter((quest) => quest.id !== questForm.id)
          .map((quest) => ({ id: quest.id, name: quest.name }));

        setDependencyOptions(options);
      } catch (error) {
        console.error(`Error fetching project ${theme.terminology.task_plural}:`, error);
      }
    };

    if (projectId && open) {
      fetchProjectQuests();
    }
  }, [projectId, open, questForm.id, getAccessTokenSilently]);

  useEffect(() => {
    const loadDependencyNames = async () => {
      if (questForm.dependencies?.length > 0) {
        setLoadingDependencies(true);
        try {
          const dependenciesWithNames = await Promise.all(
            questForm.dependencies.map(async (depId) => {
              try {
                const token = await getAccessTokenSilently({
                  audience: `${import.meta.env.VITE_BACKEND_URL}`,
                  scope: "openid profile email",
                });
                const response = await axios.get(
                  `${import.meta.env.VITE_BACKEND_URL}/tasks/${depId}`,
                  {
                    headers: { Authorization: `Bearer ${token}` },
                  }
                );

                return { id: parseInt(depId, 10), name: response.data.name };
              } catch (error) {
                console.error(`Error loading ${theme.terminology.task} ${depId}:`, error);
                return {
                  id: parseInt(depId, 10),
                  name: `Unknown ${theme.terminology.task} (${depId})`,
                };
              }
            })
          );
          setQuestForm((prev) => ({
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

    if (open && questForm.dependencies && !questForm.dependenciesWithNames) {
      loadDependencyNames();
    }
  }, [
    open,
    questForm.dependencies,
    questForm.id,
    getAccessTokenSilently,
    setQuestForm,
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
    setProofLinks(updatedLinks.length ? updatedLinks : [""]);
  };

  const handleRemoveAssignee = (userId) => {
    setQuestForm({
      ...questForm,
      assigned_user_ids: questForm.assigned_user_ids.filter(
        (id) => id !== userId
      ),
      status:
        questForm.status.includes("assigned") &&
        questForm.assigned_user_ids.length <= 1
          ? questForm.status.replace("-assigned", "-unassigned")
          : questForm.status,
    });
  };

  const handleUrgentChange = (e) => {
    const isChecked = e.target.checked;
    const isAssigned = questForm.assigned_user_ids?.length > 0;

    let newStatus;

    if (isChecked) {
      newStatus = `urgent-${isAssigned ? "assigned" : "unassigned"}`;
    } else {
      newStatus = `active-${isAssigned ? "assigned" : "unassigned"}`;
    }

    setQuestForm({ ...questForm, status: newStatus });
  };

  const handleAddDependency = () => {
    if (
      selectedDependency &&
      !questForm.dependencies?.includes(parseInt(selectedDependency, 10))
    ) {
      const depId = parseInt(selectedDependency, 10);

      const newDependencies = [...(questForm.dependencies || []), depId];

      const selectedDep = dependencyOptions.find(
        (opt) => opt.id === selectedDependency
      );
      const newDependenciesWithNames = [
        ...(questForm.dependenciesWithNames || []),
        { id: depId, name: selectedDep?.name || `${theme.terminology.task} ${depId}` },
      ];

      setQuestForm({
        ...questForm,
        dependencies: newDependencies,
        dependenciesWithNames: newDependenciesWithNames,
      });

      setSelectedDependency("");
    }
  };

  const handleRemoveDependency = (depId) => {
    const depIdInt = parseInt(depId, 10);

    setQuestForm({
      ...questForm,
      dependencies: (questForm.dependencies || []).filter(
        (id) => parseInt(id, 10) !== depIdInt
      ),
      dependenciesWithNames: (questForm.dependenciesWithNames || []).filter(
        (dep) => parseInt(dep.id, 10) !== depIdInt
      ),
    });
  };

  const handleSubmit = async () => {
    try {
      const formData = {
        ...questForm,
        active: statusParts[0] !== "inactive",
        projectId: questForm.project_id || projectId,
        skill_level: parseInt(questForm.skill_level || 0, 10),
        reward_tokens: parseInt(questForm.reward_tokens || 0, 10),
        dependencies: (questForm.dependencies || []).map((id) =>
          parseInt(id, 10)
        ),
        status: questForm.status || "inactive-unassigned",
        spell_echo_links: proofLinks.filter(link => link.trim() !== ""),
      };
      console.log("Form data before submission:", formData);

      delete formData.project_id;
      delete formData.dependenciesWithNames;
      if (!formData.id) delete formData.id;

      const result = await onSubmit(formData);
      if (!result.error) {
        alert(`${theme.terminology.task} "${questForm.name}" saved successfully`);
        onClose();
      }
    } catch (error) {
      alert(`Failed to save ${theme.terminology.task}. Please try again.`);
      console.error("Save failed:", error);
    }
  };

  const handleQuestAction = async () => {
    if (!platformUserId) {
      alert("User ID not found");
      return;
    }

    try {
      const action = userIsAssigned ? "drop" : "accept";
      const token = await getAccessTokenSilently();
      const response = await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/tasks/${questForm.id}/${action}`,
        { userId: platformUserId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.data.success) {
        alert(response.data.error || `Failed to update ${theme.terminology.task}`);
        return;
      }

      alert(
        `${theme.terminology.task} ${action === "accept" ? "accepted" : "dropped"} successfully`
      );
      onClose();
    } catch (error) {
      console.error(`${theme.terminology.task} action failed:`, error);
      alert(error.message || `Failed to update ${theme.terminology.task}`);
    }
  };

  const handleQuestSubmission = async () => {
    if (!platformUserId) {
      alert(`User ID not found. Cannot submit ${theme.terminology.task}. Please ensure your profile is loaded correctly.`);
      return;
    }
    try {
      const token = await getAccessTokenSilently();
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/tasks/${questForm.id}/submit`,
        {
          spell_echo_links: proofLinks.filter(link => link.trim() !== ""),
          reflection: questForm.reflection,
          platformUserId: platformUserId 
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setIsSubmitted(true);
      onClose();
    } catch (error) {
      console.error("Submission failed:", error);
      alert("Submission failed: " + (error.response?.data?.error || error.message));
    }
  };
  

  const handleApproval = async (approved) => {
    try {
      const token = await getAccessTokenSilently();
      console.log("platformUserId:", platformUserId);
      await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/tasks/${questForm.id}/review`,
        { action: approved ? "approve" : "reject", userId: Number(platformUserId) },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert(
        `${theme.terminology.task} ${approved ? "approved" : "rejected"} successfully`
      );
      onClose();
    } catch (error) {
      console.error(`${approved ? "Approval" : "Rejection"} failed:`, error);
    }
  };

  const handlePmApprove = async () => {
    try {
      const token = await getAccessTokenSilently();
      await axios.put(`${import.meta.env.VITE_BACKEND_URL}/tasks/${questForm.id}/ritual-seal`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(`${theme.terminology.task} approved successfully`);
      onClose();
    } catch (error) {
      console.error(`Error approving ${theme.terminology.task}:`, error);
      alert(`Failed to approve ${theme.terminology.task}`);
    }
  };

  const handlePmReject = async () => {
    try {
      const token = await getAccessTokenSilently();
      await axios.put(`${import.meta.env.VITE_BACKEND_URL}/tasks/${questForm.id}/pm-reject`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(`${theme.terminology.task} rejected successfully`);
      onClose();
    } catch (error) {
      console.error(`Error rejecting ${theme.terminology.task}:`, error);
      alert(`Failed to reject ${theme.terminology.task}`);
    }
  };
  const isProjectManager = Number(platformUserId) === Number(projectCreatorId);
  console.log('isReviewer:', isReviewer, 'isSubmitted:', isSubmitted, 'isProjectManager:', isProjectManager, 'questForm.status:', questForm.status);
  return (
    <Modal open={open} onClose={onClose}>
      <div className="cyber-modal">
        <div className="cyber-border">
          <div className="cyber-content">
            <h3 className="cyber-title">
              {theme.terminology.task.toUpperCase()} PROTOCOL {isEdit ? "EDITOR" : "VIEWER"}
            </h3>

            <div className="cyber-form">
              <TextField
                className="cyber-input"
                label={`${theme.terminology.task.toUpperCase()} NAME`}
                variant="outlined"
                value={questForm.name}
                onChange={(e) =>
                  setQuestForm({ ...questForm, name: e.target.value })
                }
                disabled={!effectiveIsEdit}
              />

              <TextField
                className="cyber-input"
                label="DESCRIPTION"
                multiline
                rows={4}
                variant="outlined"
                value={questForm.description}
                onChange={(e) =>
                  setQuestForm({ ...questForm, description: e.target.value })
                }
                disabled={!effectiveIsEdit}
              />

              <div className="cyber-skill-section">
                <div className="cyber-select">
                  <InputLabel>{theme.terminology.skill.toUpperCase()} CATEGORY</InputLabel>
                  <Select
                    value={questForm.skill_id}
                    variant="outlined"
                    MenuProps={{ className: "cyber-select-menu" }}
                    onChange={(e) =>
                      setQuestForm({ ...questForm, skill_id: e.target.value })
                    }
                    disabled={!effectiveIsEdit}
                  >
                    <MenuItem value="">
                      <em>SELECT {theme.terminology.skill.toUpperCase()} MODULE</em>
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
                  label={`${theme.terminology.skill.toUpperCase()} LVL`}
                  type="number"
                  variant="outlined"
                  value={questForm.skill_level || 0}
                  onChange={(e) =>
                    setQuestForm({
                      ...questForm,
                      skill_level: parseInt(e.target.value, 10),
                    })
                  }
                  InputProps={{ inputProps: { min: 0 } }}
                  disabled={!effectiveIsEdit}
                />
              </div>

              <div className="cyber-section-container">
                <InputLabel className="cyber-section-label">DEPENDENCIES</InputLabel>
                <Box
                  sx={{ display: "flex", gap: 1, alignItems: "center", mt: 1 }}
                >
                  <Select
                    className="cyber-select"
                    variant="outlined"
                    value={selectedDependency}
                    MenuProps={{ className: "cyber-select-menu" }}
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
                          !questForm.dependencies?.includes(parseInt(opt.id, 10))
                      )
                      .map((quest) => (
                        <MenuItem key={quest.id} value={quest.id}>
                          {quest.name}
                        </MenuItem>
                      ))}
                  </Select>
                  <Button
                    className="cyber-button add-dependency-button"
                    onClick={handleAddDependency}
                    disabled={!selectedDependency || !effectiveIsEdit}
                  >
                    ADD
                  </Button>
                </Box>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
                  {loadingDependencies ? (
                    <Chip label="Loading dependencies..." className="cyber-chip" />
                  ) : (
                    questForm.dependenciesWithNames?.map((dep) => (
                      <Chip
                        key={dep.id}
                        label={dep.name}
                        onDelete={
                          effectiveIsEdit
                            ? () => handleRemoveDependency(dep.id)
                            : undefined
                        }
                        className="cyber-chip"
                      />
                    )) ||
                    questForm.dependencies?.map((depId) => (
                      <Chip
                        key={depId}
                        label={`${theme.terminology.task} ${depId}`}
                        onDelete={
                          effectiveIsEdit
                            ? () => handleRemoveDependency(depId)
                            : undefined
                        }
                        className="cyber-chip"
                      />
                    ))
                  )}
                </Box>
              </div>
              <div className="cyber-section-container">
                <InputLabel className="cyber-section-label">ASSIGNED OPERATORS</InputLabel>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
                  {questForm.assigned_user_ids?.map((userId, index) => (
                    <Chip
                      key={index}
                      label={`Operator ${userId}`}
                      className="cyber-chip"
                      onDelete={
                        effectiveIsEdit ? () => handleRemoveAssignee(userId) : undefined
                      }
                    />
                  ))}
                  {questForm.assigned_user_ids?.length === 0 && (
                    <Chip label="No assigned operators" className="cyber-chip" />
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

                        const finalStatus =
                          isUrgent && !newActiveState
                            ? newStatus.replace("urgent", "inactive")
                            : newStatus;

                        setQuestForm({ ...questForm, status: finalStatus });
                      }}
                      disabled={!effectiveIsEdit || isUrgent}
                      sx={{
                        color: "#00f3ff",
                        "&.Mui-checked": {
                          color: "#00f3ff",
                        },
                        "&.Mui-disabled": {
                          color: "rgba(0, 243, 255, 0.5)",
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
                variant="outlined"
                value={questForm.reward_tokens}
                onChange={(e) =>
                  setQuestForm({
                    ...questForm,
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
                      className="cyber-button primary"
                      onClick={handleSubmit}
                      disabled={!effectiveIsEdit}
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
                            userIsAssigned ? "drop-task" : "accept-task"
                          }`}
                          onClick={handleQuestAction}
                          disabled={
                            isSubmitted ||
                            questForm.status?.includes("completed")
                          }
                        >
                          {userIsAssigned ? `DROP ${theme.terminology.task.toUpperCase()}` : `ACCEPT ${theme.terminology.task.toUpperCase()}`}
                        </Button>
                        
                        {(questForm.status !== "submitted" && userIsAssigned) && (
  <Box mt={2}>
    <h4 style={{ fontFamily: 'Orbitron, sans-serif', color: '#00F3FF', textTransform: 'uppercase', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Reflection (Summarize your work)</h4>
    <TextField
      className="cyber-input"
      label="Reflection"
      variant="outlined"
      multiline
      disabled={questForm.status?.includes("completed")}
      rows={4}
      value={questForm.reflection}
      onChange={(e) =>
        setQuestForm({ ...questForm, reflection: e.target.value })
      }
    />
    <h4 style={{ fontFamily: 'Orbitron, sans-serif', color: '#00F3FF', textTransform: 'uppercase', fontSize: '0.9rem', marginTop: '1rem', marginBottom: '0.5rem' }}>{theme.terminology.proof_of_work}</h4>
    {proofLinks.map((link, index) => (
      <Box key={index} display="flex" alignItems="center" mb={1}>
        <TextField
          className ="cyber-input"
          variant="outlined"
          fullWidth
          disabled={questForm.status?.includes("completed")}
          label={`Link ${index + 1}`}
          value={link}
          onChange={(e) => handleProofChange(index, e.target.value)}
        />
        {proofLinks.length > 1 && (
          <Button className="proof-link-button" 
          disabled={questForm.status?.includes("completed")}
          onClick={() => handleRemoveProofLink(index)}>Remove</Button>
        )}
      </Box>
    ))}
    <Button className="cyber-button primary" style={{marginTop: '0.5rem'}} variant="outlined" disabled={questForm.status?.includes("completed")} onClick={handleAddProofLink}>
      Add {theme.terminology.proof_of_work}
    </Button>
  </Box>
)}

                        {userIsAssigned && !isSubmitted && (
                          <Button
                            className="cyber-button submit-task"
                            onClick={handleQuestSubmission}
                            disabled={
                              proofLinks.length === 0 ||
                              proofLinks.some((link) => link.trim() === "" || questForm.status?.includes("completed"))
                            }
                          >
                            SUBMIT {theme.terminology.task.toUpperCase()}
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
                              background: "rgba(0, 20, 40, 0.7)",
                              color: "#00F3FF",
                              borderRadius: 1,
                              border: "1px solid #00F3FF",
                              p: 2,
                              mb: 2,
                              fontFamily: "'Inter', sans-serif",
                              whiteSpace: "pre-wrap",
                              maxHeight: '150px',
                              overflowY: 'auto',
                            }}
                          >
                            {questForm.reflection}
                          </Box>
                          <h4 style={{ fontFamily: 'Orbitron, sans-serif', color: '#00F3FF', textTransform: 'uppercase', fontSize: '0.9rem', marginTop: '1rem', marginBottom: '0.5rem' }}>{theme.terminology.proof_of_work} links (must review)</h4>
                          <Box
                            sx={{
                              background: "rgba(0, 20, 40, 0.7)",
                              color: "#00F3FF",
                              borderRadius: 1,
                              border: "1px solid #00F3FF",
                              p: 2,
                              mb: 2,
                              fontFamily: "'Inter', sans-serif",
                              whiteSpace: "pre-wrap",
                              maxHeight: '150px',
                              overflowY: 'auto',
                            }}
                          >
                            {Array.isArray(questForm.spell_echo_links)
                              ? questForm.spell_echo_links.map((link, idx) =>
                                  link ? (
                                    <div key={idx}>
                                      <a
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          color: "#FF5CA2",
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

                    { isProjectManager && questForm.status === 'submitted' && (
                        <>
                          <Button
                            className="cyber-button approve"
                            onClick={handlePmApprove}
                          >
                            PM APPROVE
                          </Button>
                          <Button
                            className="cyber-button reject"
                            onClick={handlePmReject}
                          >
                            PM REJECT
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

export default QuestEditor;
