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
import "./PetalEditor.css";

const PetalEditor = ({
  open,
  onClose,
  petalForm,
  setPetalForm,
  onSubmit,
  skills,
  isEdit = true,
  intentionId,
  currentUser,
  intentionCreatorId,
  isReviewer,
}) => {
  const statusParts = petalForm.status?.split("-") || ["inactive", "unassigned"];
  const isUrgent = statusParts[0] === "urgent";
  const isActive =
    statusParts[0] !== "inactive" && statusParts[0] !== "completed";
  const [availablePetals, setAvailablePetals] = useState([]);
  const [dependencyOptions, setDependencyOptions] = useState([]);
  const [selectedDependency, setSelectedDependency] = useState("");
  const [loadingDependencies, setLoadingDependencies] = useState(false);
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [isSubmitted, setIsSubmitted] = useState(
    (petalForm.status || "").toLowerCase().includes("submitted")
  );

  const effectiveIsEdit = petalForm.status === "completed" ? false : isEdit;
 
  const [platformUserId, setPlatformUserId] = useState(null);
  const isAssigned = petalForm.assigned_user_ids?.length > 0;
  const userIsAssigned = petalForm.assigned_user_ids?.some(
    (id) => Number(id) === Number(platformUserId) // Ensure both are numbers
  );
  const [proofLinks, setProofLinks] = useState(petalForm.proof_of_work_links || [""]);

 useEffect(() => {
    setIsSubmitted((petalForm.status || "").toLowerCase().includes("submitted"));
  }, [petalForm.status]);

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
    setProofLinks(petalForm.proof_of_work_links || [""]);
  }, [petalForm.proof_of_work_links]);

  // Fetch all petals for the intention when component mounts or intentionId changes
  useEffect(() => {
    const fetchIntentionPetals = async () => {
      try {
        const token = await getAccessTokenSilently({
          audience: `${import.meta.env.VITE_BACKEND_URL}`,
          scope: "openid profile email",
        });
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/petals/p/${intentionId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setAvailablePetals(response.data);

        // Create options excluding current petal (if editing)
        const options = response.data
          .filter((petal) => petal.id !== petalForm.id)
          .map((petal) => ({ id: petal.id, name: petal.name }));

        setDependencyOptions(options);
      } catch (error) {
        console.error("Error fetching intention petals:", error);
      }
    };

    if (intentionId && open) {
      fetchIntentionPetals();
    }
  }, [intentionId, open, petalForm.id, getAccessTokenSilently]);

  // Load names for existing dependencies
  useEffect(() => {
    const loadDependencyNames = async () => {
      if (petalForm.dependencies?.length > 0) {
        setLoadingDependencies(true);
        try {
          const dependenciesWithNames = await Promise.all(
            petalForm.dependencies.map(async (depId) => {
              try {
                const token = await getAccessTokenSilently({
                  audience: `${import.meta.env.VITE_BACKEND_URL}`,
                  scope: "openid profile email",
                });
                const response = await axios.get(
                  `${import.meta.env.VITE_BACKEND_URL}/petals/${depId}`,
                  {
                    headers: { Authorization: `Bearer ${token}` },
                  }
                );

                return { id: parseInt(depId, 10), name: response.data.name };
              } catch (error) {
                console.error(`Error loading petal ${depId}:`, error);
                return {
                  id: parseInt(depId, 10),
                  name: `Unknown Petal (${depId})`,
                };
              }
            })
          );
          setPetalForm((prev) => ({
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

    if (open && petalForm.dependencies && !petalForm.dependenciesWithNames) {
      loadDependencyNames();
    }
  }, [
    open,
    petalForm.dependencies,
    petalForm.id,
    getAccessTokenSilently,
    setPetalForm,
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
    setPetalForm({
      ...petalForm,
      assigned_user_ids: petalForm.assigned_user_ids.filter(
        (id) => id !== userId
      ),
      status:
        petalForm.status.includes("assigned") &&
        petalForm.assigned_user_ids.length <= 1
          ? petalForm.status.replace("-assigned", "-unassigned")
          : petalForm.status,
    });
  };

  const handleUrgentChange = (e) => {
    const isChecked = e.target.checked;
    const isAssigned = petalForm.assigned_user_ids?.length > 0;

    let newStatus;

    if (isChecked) {
      // When making urgent, force it to be active
      newStatus = `urgent-${isAssigned ? "assigned" : "unassigned"}`;
    } else {
      // When removing urgent, revert to active (not inactive)
      newStatus = `active-${isAssigned ? "assigned" : "unassigned"}`;
    }

    setPetalForm({ ...petalForm, status: newStatus });
  };

  const handleAddDependency = () => {
    if (
      selectedDependency &&
      !petalForm.dependencies?.includes(parseInt(selectedDependency, 10))
    ) {
      // Convert dependency to integer
      const depId = parseInt(selectedDependency, 10);

      const newDependencies = [...(petalForm.dependencies || []), depId];

      // Find the dependency name from options
      const selectedDep = dependencyOptions.find(
        (opt) => opt.id === selectedDependency
      );
      const newDependenciesWithNames = [
        ...(petalForm.dependenciesWithNames || []),
        { id: depId, name: selectedDep?.name || `Petal ${depId}` },
      ];

      setPetalForm({
        ...petalForm,
        dependencies: newDependencies,
        dependenciesWithNames: newDependenciesWithNames,
      });

      setSelectedDependency("");
    }
  };

  const handleRemoveDependency = (depId) => {
    // Ensure depId is an integer for comparison
    const depIdInt = parseInt(depId, 10);

    setPetalForm({
      ...petalForm,
      dependencies: (petalForm.dependencies || []).filter(
        (id) => parseInt(id, 10) !== depIdInt
      ),
      dependenciesWithNames: (petalForm.dependenciesWithNames || []).filter(
        (dep) => parseInt(dep.id, 10) !== depIdInt
      ),
    });
  };

  const handleSubmit = async () => {
    try {
      // Ensure everything is properly formatted
      const formData = {
        ...petalForm,
        active: statusParts[0] !== "inactive",
        intentionId: petalForm.intention_id || intentionId,
        skill_level: parseInt(petalForm.skill_level || 0, 10),
        reward_tokens: parseInt(petalForm.reward_tokens || 0, 10),
        dependencies: (petalForm.dependencies || []).map((id) =>
          parseInt(id, 10)
        ),
        status: petalForm.status || "inactive-unassigned",
        proof_of_work_links: proofLinks.filter(link => link.trim() !== ""),
      };
      console.log("Form data before submission:", formData);

      // Clean up before submission
      delete formData.intention_id;
      delete formData.dependenciesWithNames;
      if (!formData.id) delete formData.id;

      const result = await onSubmit(formData);
      // Only show success if no error returned
      if (!result.error) {
        alert(`Petal "${petalForm.name}" saved successfully`);
        onClose();
      }
    } catch (error) {
      alert("Failed to save petal. Please try again.");
      console.error("Save failed:", error);
    }
  };

  // In your PetalEditor component
  const handlePetalAction = async () => {
    if (!platformUserId) {
      alert("User ID not found");
      return;
    }

    try {
      const action = userIsAssigned ? "drop" : "accept";
      const token = await getAccessTokenSilently();
      const response = await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/petals/${petalForm.id}/${action}`,
        { userId: platformUserId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.data.success) {
        alert(response.data.error || "Failed to update petal");
        return;
      }

      alert(
        `Petal ${action === "accept" ? "accepted" : "dropped"} successfully`
      );
      onClose();
    } catch (error) {
      console.error("Petal action failed:", error);
      alert(error.message || "Failed to update petal");
    }
  };

  const handlePetalSubmission = async () => {
    if (!platformUserId) {
      alert("User ID not found. Cannot submit petal. Please ensure your profile is loaded correctly.");
      return;
    }
    try {
      const token = await getAccessTokenSilently();
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/petals/${petalForm.id}/submit`,
        {
          proof_of_work_links: proofLinks.filter(link => link.trim() !== ""),
          reflection: petalForm.reflection,
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
        `${import.meta.env.VITE_BACKEND_URL}/petals/${petalForm.id}/review`,
        { action: approved ? "approve" : "reject", userId: Number(platformUserId) },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert(
        `Petal ${approved ? "approved" : "rejected"} successfully`
      );
      onClose();
      // Add notification logic here
    } catch (error) {
      console.error(`${approved ? "Approval" : "Rejection"} failed:`, error);
    }
  };

  const handlePmApprove = async () => {
    try {
      const token = await getAccessTokenSilently();
      await axios.put(`${import.meta.env.VITE_BACKEND_URL}/petals/${petalForm.id}/pm-approve`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Petal approved successfully');
      onClose();
    } catch (error) {
      console.error('Error approving petal:', error);
      alert('Failed to approve petal');
    }
  };

  const handlePmReject = async () => {
    try {
      const token = await getAccessTokenSilently();
      await axios.put(`${import.meta.env.VITE_BACKEND_URL}/petals/${petalForm.id}/pm-reject`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Petal rejected successfully');
      onClose();
    } catch (error) {
      console.error('Error rejecting petal:', error);
      alert('Failed to reject petal');
    }
  };
  const isIntentionManager = Number(platformUserId) === Number(intentionCreatorId);
  console.log('isReviewer:', isReviewer, 'isSubmitted:', isSubmitted, 'isIntentionManager:', isIntentionManager, 'petalForm.status:', petalForm.status);
  return (
    <Modal open={open} onClose={onClose}>
      <div className="cyber-modal">
        <div className="cyber-border">
          <div className="cyber-content">
            <h3 className="cyber-title">
              PETAL PROTOCOL {isEdit ? "EDITOR" : "VIEWER"}
            </h3>

            <div className="cyber-form">
              <TextField
                className="cyber-input"
                label="PETAL NAME"
                variant="outlined" // Ensure outlined variant
                value={petalForm.name}
                onChange={(e) =>
                  setPetalForm({ ...petalForm, name: e.target.value })
                }
                disabled={!effectiveIsEdit}
              />

              <TextField
                className="cyber-input"
                label="DESCRIPTION"
                multiline
                rows={4}
                variant="outlined" // Ensure outlined variant
                value={petalForm.description}
                onChange={(e) =>
                  setPetalForm({ ...petalForm, description: e.target.value })
                }
                disabled={!effectiveIsEdit}
              />

              <div className="cyber-skill-section">
                <div className="cyber-select"> {/* Keep cyber-select for MuiInputLabel-root targeting if still needed, or ensure label is styled by cyber-input's label style */}
                  <InputLabel>SKILL CATEGORY</InputLabel>
                  <Select
                    value={petalForm.skill_id}
                    variant="outlined" // Ensure outlined variant
                    MenuProps={{ className: "cyber-select-menu" }} // For dropdown styling
                    onChange={(e) =>
                      setPetalForm({ ...petalForm, skill_id: e.target.value })
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
                  value={petalForm.skill_level || 0}
                  onChange={(e) =>
                    setPetalForm({
                      ...petalForm,
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
                          !petalForm.dependencies?.includes(parseInt(opt.id, 10))
                      )
                      .map((petal) => (
                        <MenuItem key={petal.id} value={petal.id}>
                          {petal.name}
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
                    petalForm.dependenciesWithNames?.map((dep) => (
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
                    petalForm.dependencies?.map((depId) => (
                      <Chip
                        key={depId}
                        label={`Petal ${depId}`}
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
                <InputLabel className="cyber-section-label">ASSIGNED NURTURERS</InputLabel> {/* Updated class */}
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
                  {petalForm.assigned_user_ids?.map((userId, index) => (
                    <Chip
                      key={index}
                      label={`Nurturer ${userId}`}
                      className="cyber-chip" // Updated class
                      onDelete={
                        effectiveIsEdit ? () => handleRemoveAssignee(userId) : undefined
                      }
                    />
                  ))}
                  {petalForm.assigned_user_ids?.length === 0 && (
                    <Chip label="No assigned nurturers" className="cyber-chip" /> // Updated class
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

                        setPetalForm({ ...petalForm, status: finalStatus });
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
                value={petalForm.reward_tokens}
                onChange={(e) =>
                  setPetalForm({
                    ...petalForm,
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
                            userIsAssigned ? "drop-petal" : "accept-petal" // Specific classes for color
                          }`}
                          onClick={handlePetalAction}
                          disabled={
                            isSubmitted ||
                            petalForm.status?.includes("completed")
                          }
                        >
                          {userIsAssigned ? "DROP PETAL" : "ACCEPT PETAL"}
                        </Button>
                        
                        {(petalForm.status !== "submitted" && userIsAssigned) && (
  <Box mt={2}>
    {/* These h4 and TextField for reflection/proof might need their own styling if not covered by general modal text/input styles */}
    <h4 style={{ fontFamily: 'Orbitron, sans-serif', color: '#00F3FF', textTransform: 'uppercase', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Reflection (Summarize your work)</h4>
    <TextField
      className="cyber-input" // Use existing input styling
      label="Reflection"
      variant="outlined"
      multiline
      disabled={petalForm.status?.includes("completed")}
      rows={4}
      value={petalForm.reflection}
      onChange={(e) =>
        setPetalForm({ ...petalForm, reflection: e.target.value })
      }
    />
    <h4 style={{ fontFamily: 'Orbitron, sans-serif', color: '#00F3FF', textTransform: 'uppercase', fontSize: '0.9rem', marginTop: '1rem', marginBottom: '0.5rem' }}>Proof of Work</h4>
    {proofLinks.map((link, index) => (
      <Box key={index} display="flex" alignItems="center" mb={1}>
        <TextField
          className ="cyber-input" // Use existing input styling
          variant="outlined"
          fullWidth
          disabled={petalForm.status?.includes("completed")}
          label={`Link ${index + 1}`}
          value={link}
          onChange={(e) => handleProofChange(index, e.target.value)}
        />
        {proofLinks.length > 1 && (
          <Button className="proof-link-button" 
          disabled={petalForm.status?.includes("completed")}
          onClick={() => handleRemoveProofLink(index)}>Remove</Button>
        )}
      </Box>
    ))}
    <Button className="cyber-button primary" style={{marginTop: '0.5rem'}} variant="outlined" disabled={petalForm.status?.includes("completed")} onClick={handleAddProofLink}>
      Add Proof of Work
    </Button>
  </Box>
)}

                        {userIsAssigned && !isSubmitted && (
                          <Button
                            className="cyber-button submit-petal" // Updated class
                            onClick={handlePetalSubmission}
                            disabled={
                              proofLinks.length === 0 ||
                              proofLinks.some((link) => link.trim() === "" || petalForm.status?.includes("completed"))
                            }
                          >
                            UNFURL PETAL
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
                            {petalForm.reflection}
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
                            {Array.isArray(petalForm.proof_of_work_links)
                              ? petalForm.proof_of_work_links.map((link, idx) =>
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

                    { isIntentionManager && petalForm.status === 'submitted' && (
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

export default PetalEditor;
