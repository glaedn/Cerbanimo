import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import axios from "axios";
import PetalEditor from "./PetalEditor";
import { useIntentionPetals } from "../hooks/useIntentionPetals";
import "./IntentionLotusMap.css";
import { useParams } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useMemo } from "react";
import { Chip } from "@mui/material";
import { Autocomplete, TextField } from "@mui/material";

const IntentionLotusMap = ({ intentionId: propIntentionId }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const { intentionId: paramIntentionId, petalId } = useParams();
  const intentionId = propIntentionId || paramIntentionId;
  const { getAccessTokenSilently } = useAuth0();
  const { user } = useAuth0();
  const [userId, setUserId] = useState(null);
  const { petals, skills, intention, handlePetalAction, fetchPetals, updateIntention } =
    useIntentionPetals(intentionId, user);
  const [activeCategory, setActiveCategory] = useState("All Petals"); // Default to All Petals
  const [isEditMode, setIsEditMode] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [zoomTransform, setZoomTransform] = useState({ k: 1, x: 0, y: 0 });
  const [svgDimensions, setSvgDimensions] = useState({
    width: 800,
    height: 600,
  });
  const [activeSkillId, setActiveSkillId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const tabsContainerRef = useRef(null);
  const hoverTimeout = useRef(null);
  const hoverIntentRef = useRef(null);
  const tooltipRef = useRef(null);
  const [showRealmProposalPopup, setShowRealmProposalPopup] = useState(false);
  const [userRealms, setUserRealms] = useState([]);
  const [selectedRealm, setSelectedRealm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [popupLaunched, setPopupLaunched] = useState(false);
  const [interests, setInterests] = useState([]);
  const linksGroupRef = useRef(null);
  // Check if any petal is active, completed, or urgent
  const [intentionIsActive, setIntentionIsActive] = useState(false);
  const [resonanceCount, setResonanceCount] = useState(0);
  const [userHasResonated, setUserHasResonated] = useState(false);

  useEffect(() => {
    const fetchResonanceData = async () => {
      if (!intentionId || !userId) return;
      try {
        const token = await getAccessTokenSilently();
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/intentions/${intentionId}/resonances`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setResonanceCount(response.data.count);
        setUserHasResonated(response.data.userHasResonated);
      } catch (error) {
        console.error("Failed to fetch resonance data:", error);
      }
    };
    fetchResonanceData();
  }, [intentionId, userId, getAccessTokenSilently]);

  useEffect(() => {
    setIntentionIsActive(
      petals.some(
        (petal) =>
          petal.status === "completed" ||
          petal.status === "active-assigned" ||
          petal.status === "active-unassigned" ||
          petal.status === "urgent-unassigned" ||
          petal.status === "urgent-assigned" ||
          petal.status === "submitted"
      )
    );
  }, [petals]);


  const fetchUserRealms = async () => {
    if (!userId) {
      console.log('No userId available');
      return;
    }
    
    try {
      const token = await getAccessTokenSilently({
        audience: `${import.meta.env.VITE_BACKEND_URL}`,
        scope: "openid profile email",
      });
  
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/realms/user/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch realms: ${errorText}`);
      }
  
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setUserRealms(data);
      } else {
        setUserRealms([]);
      }
    } catch (error) {
      setUserRealms([]);
    }
  };

  // Function to handle granularization of petals
  const handleGranularizePetals = async (intentionId) => {
    const confirm = window.confirm('Are you sure? This will delete and replace ALL petals in the intention.');
    if (!confirm) return;

    setLoading(true);
    try {
      const token = await getAccessTokenSilently({
        audience: `${import.meta.env.VITE_BACKEND_URL}`,
        scope: "openid profile email",
      });

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/petals/${intentionId}/granularize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ intentionId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to granularize petal: ${errorText}`);
      }
      
      const data = await response.json();

      if (data.success) {
        // Refresh petals after successful granularization
        await fetchPetals();
        alert('Petal granularization successful!');
      } else {
        alert('Petal granularization failed: ' + data.error);
      }
    } catch (error) {
      console.error('Error granularizing petal:', error);
      alert('Error granularizing petal: ' + error.message);
    } finally {
      setLoading(false);
    }
  
  };


  // Add useEffect to handle initial realms fetch
  useEffect(() => {
    if (userId) {
      fetchUserRealms();
    }
  }, [userId]);

  const handleSubmitRealmProposal = async () => {
    if (!selectedRealm) return;
  
    try {
      const token = await getAccessTokenSilently({
        audience: `${import.meta.env.VITE_BACKEND_URL}`,
        scope: "openid profile email",
      });
  
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/realms/${selectedRealm.id}/submit/${intentionId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      if (!response.ok) {
        throw new Error('Failed to submit proposal');
      }
  
      // Update the intention to mark it as a realm intention
      updateIntention({ realm_id: selectedRealm.id });
      
      // Close the popup and navigate to the realm hub
      setShowRealmProposalPopup(false);
      window.location.href = `/realmhub/${selectedRealm.id}`;
    } catch (error) {
      console.error('Error submitting proposal:', error);
    }
  };

  const handleUpdateTags = async (newTags) => {
    try {
      const token = await getAccessTokenSilently({
        audience: `${import.meta.env.VITE_BACKEND_URL}`,
        scope: "openid profile email",
      });// Use the token for authorized request

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/intentions/${intentionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tags: newTags }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to update tags');
      }
  
      // Update the UI immediately without waiting for a refresh
      updateIntention({ tags: newTags });
      
      // No need to call fetchIntention() since we've already updated the UI
    } catch (error) {
      console.error('Error updating tags:', error);
    }
  };

  const handleResonate = async () => {
    if (!intentionId || !userId || userHasResonated) return;
    try {
      const token = await getAccessTokenSilently();
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/intentions/${intentionId}/resonate`, { userId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResonanceCount(prev => prev + 1);
      setUserHasResonated(true);
    } catch (error) {
      console.error("Failed to resonate with intention:", error);
    }
  };


  useEffect(() => {
    const fetchInterests = async () => {
      try {
        const token = await getAccessTokenSilently({
          audience: `${import.meta.env.VITE_BACKEND_URL}`,
          scope: "openid profile email",
        });

        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/profile/options`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text(); // Get text if not ok
          console.error('Failed to fetch interests. Status:', response.status, 'Response:', errorText);
          throw new Error(`Failed to fetch interests: ${response.status}`);
        }

        const data = await response.json();
        setInterests(data.interestsPool || []);
      } catch (error) {
        console.error('Error fetching interests:', error.message);
        // If the error object was augmented with responseText, it could be logged here too.
        // For this change, the primary log is before throwing.
      }
    };

    fetchInterests();
    
  }, [getAccessTokenSilently]);

  
  // Modify your fetchPetals call to preserve the category
const refreshPetals = async () => {
  console.log("Refreshing petals...");
  const currentCategory = activeCategory; // Save before refresh
  const currentSkillId = activeSkillId;
  
  const updatedPetals = await fetchPetals();
  console.log("Refreshed petals data:", updatedPetals);
  
  // Restore the active category after refresh
  if (currentCategory) {
    setActiveCategory(currentCategory);
    setActiveSkillId(currentSkillId);
  }
};

useEffect(() => {
  const fetchProfile = async () => {
    try {
      const token = await getAccessTokenSilently({
        audience: `${import.meta.env.VITE_BACKEND_URL}`,
        scope: "openid profile email",
      });

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/profile/userId`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text(); // Get text if not ok
        console.error('Failed to fetch profile. Status:', response.status, 'Response:', errorText);
        throw new Error(`Failed to fetch profile: ${response.status}`);
      }

      const data = await response.json();
      setUserId(data.id);
      
    } catch (error) {
      console.error('Error fetching profile:', error.message);
      // If the error object was augmented with responseText, it could be logged here too.
    }
  };

  if (user) {
    fetchProfile();
  }
}, [user, getAccessTokenSilently]);



  useEffect(() => {
    return () => {
      // Clean up timeout on unmount
      if (hoverTimeout.current) {
        clearTimeout(hoverTimeout.current);
      }
    };
  }, []);

  const categorizedPetals = useMemo(() => {
    // First create the all-petals entry
    const petalMap = {
      "All Petals": [...petals] // Include all petals
    };
  
    // Then add the skill-specific categories
    const filteredSkills = skills.filter((skill) =>
      petals.some((petal) => petal.skill_id === skill.id)
    );
  
    filteredSkills.forEach((skill) => {
      petalMap[skill.name] = petals.filter((petal) => petal.skill_id === skill.id);
    });
  
    return petalMap;
  }, [petals, skills]);

  const initialForm = {
    id: null,
    name: "",
    description: "",
    status: "inactive-unassigned",
    dependencies: [],
    skill_id: 0,
    intention_id: intentionId,
    reward_tokens: 10
  };

  // local modal control here
  const [petalForm, setPetalForm] = useState(initialForm);
  const [showPetalPopup, setShowPetalPopup] = useState(false);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - tabsContainerRef.current.offsetLeft);
    setScrollLeft(tabsContainerRef.current.scrollLeft);
  };

  const handleTabsLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseOver = (event, d) => {
    clearTimeout(hoverIntentRef.current);
    if (hoveredNode?.id === d.id) return;
    setHoveredNode({
      ...d,
      rawX: event.clientX,
      rawY: event.clientY,
      element: event.currentTarget,
    });
  };

  const handleMouseOut = () => {
    hoverIntentRef.current = setTimeout(() => {
      if (!tooltipRef.current?.matches(":hover")) {
        setHoveredNode(null);
      }
    }, 200);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - tabsContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Adjust scroll speed
    tabsContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleEditPetal = (petal) => {
    setPetalForm(petal); // Fill in form with petal values
    setShowPetalPopup(true); // Show the PetalEditor modal
  };

  const handleViewPetal = async (petal) => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/petals/${petal.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPetalForm(response.data);
      setShowPetalPopup(true);
    } catch (error) {
      console.error("Error fetching full petal details:", error);
      setPetalForm(petal);
      setShowPetalPopup(true);
    }
  };

  const handleAddPetal = (dependencyId = null) => {
    const currentSkill = skills.find((s) => s.name === activeCategory);
    const form = {
      ...initialForm,
      intention_id: intentionId,
      skill_id: currentSkill?.id || "",
    };
    
    // If dependencyId exists, create both the numeric dependencies array
    // and the named version needed for display
    if (dependencyId) {
      const depPetal = allPetals[dependencyId];
      form.dependencies = [parseInt(dependencyId, 10)];
      form.dependenciesWithNames = depPetal ? [
        { id: parseInt(dependencyId, 10), name: depPetal.name }
      ] : [];
    }
    
    setPetalForm(form);
    setShowPetalPopup(true);
  };

  const FIXED_LEVEL_HEIGHT = 120;
  const MAX_EXTERNAL_DEPS = 3;

  // All petals across all skills - used to find external dependencies
  const allPetals = petals.reduce((acc, petal) => {
    acc[petal.id] = petal;
    return acc;
  }, {});

  const getPetalColor = (status) => {
    switch (status) {
      case "completed":
        return "#2ECC71"; // 🟢 Completed
      case "active-assigned":
      case "active-unassigned":
        return "#3498DB"; // 🔵 In Progress
      case "urgent-assigned":
      case "urgent-unassigned":
      case "submitted":
        return "#9B59B6"; // 🟣 Active
      case "inactive-unassigned":
      case "inactive-assigned":
      default:
        return "#FDFEFE"; // ⚪ Future
    }
  };

  const updateLinkColors = () => {
    if (linksGroupRef.current) {
      linksGroupRef.current
        .selectAll(".link")
        .attr("stroke", d => d.targetStatus === "completed" ? getPetalColor("completed") : "#999");
    }
  }

  const truncateText = (text, maxLength = 13) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const usedSkills = skills.filter((skill) =>
    petals.some((petal) => petal.skill_id === skill.id)
  );

  // Handle mouse leave for the entire visualization container
  const handleMouseLeave = () => {
    setHoveredNode(null);
  };

  // Store the zoom object in a ref to maintain it across renders
  const zoomRef = useRef(null);

// Modify this useEffect to only set initial values when there are no current values
useEffect(() => {
  // Only set initial values if both activeCategory and activeSkillId are not set
  if (!activeCategory) {
    setActiveCategory("All Petals");
    setActiveSkillId(null);
  }
}, [skills, petals]); // Dependencies remain the same

useEffect(() => {
  if (hoveredNode && tooltipRef.current) {
    const { width: tooltipWidth, height: tooltipHeight } = tooltipRef.current.getBoundingClientRect();
    const screenWidth = window.innerWidth; // Renamed for clarity from prompt
    const screenHeight = window.innerHeight; // Renamed for clarity from prompt
    const offset = 20;

    let finalX = hoveredNode.rawX - tooltipWidth / 2; // Default: bottom-center X
    let finalY = hoveredNode.rawY + offset;          // Default: bottom-center Y

    const nearTop = hoveredNode.rawY < tooltipHeight + offset * 1.5; 
    const nearBottom = hoveredNode.rawY + tooltipHeight + offset * 1.5 > screenHeight;
    const nearLeft = hoveredNode.rawX < tooltipWidth / 2 + offset; 
    const nearRight = hoveredNode.rawX + tooltipWidth / 2 + offset > screenWidth;

    // Corner conditions first
    if (nearTop && nearLeft) { // Top-left corner => position bottom-right of cursor
      finalX = hoveredNode.rawX + offset;
      finalY = hoveredNode.rawY + offset;
    } else if (nearTop && nearRight) { // Top-right corner => position bottom-left of cursor
      finalX = hoveredNode.rawX - tooltipWidth - offset;
      finalY = hoveredNode.rawY + offset;
    } else if (nearBottom && nearLeft) { // Bottom-left corner => position top-right of cursor
      finalX = hoveredNode.rawX + offset;
      finalY = hoveredNode.rawY - tooltipHeight - offset;
    } else if (nearBottom && nearRight) { // Bottom-right corner => position top-left of cursor
      finalX = hoveredNode.rawX - tooltipWidth - offset;
      finalY = hoveredNode.rawY - tooltipHeight - offset;
    }
    // Edge conditions (if not a corner)
    else if (nearTop) { // Near top edge => position top-centered (which means tooltip bottom is above cursor)
      finalY = hoveredNode.rawY - tooltipHeight - offset;
      // X is already default (centered relative to cursor)
    } else if (nearBottom) { // Near bottom edge => position top-centered
      finalY = hoveredNode.rawY - tooltipHeight - offset;
      // X is already default (centered relative to cursor)
    } else if (nearLeft) { // Near left edge => position right-centered from cursor
        finalX = hoveredNode.rawX + offset;
        // Y is already default (bottom of cursor)
    } else if (nearRight) { // Near right edge => position left-centered from cursor
        finalX = hoveredNode.rawX - tooltipWidth - offset;
        // Y is already default (bottom of cursor)
    }

    // Boundary checks
    if (finalX < 0) finalX = 0;
    if (finalX + tooltipWidth > screenWidth) finalX = screenWidth - tooltipWidth;
    if (finalY < 0) finalY = 0;
    if (finalY + tooltipHeight > screenHeight) finalY = screenHeight - tooltipHeight;

    setTooltipPosition({ x: finalX, y: finalY });
  }
}, [hoveredNode]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!containerRef.current.contains(e.target)) {
        setHoveredNode(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Effect for updating SVG dimensions to match container
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      // Update the visualization size based on container
      if (containerWidth > 0 && containerHeight > 0) {
        // Make sure we have some reasonable minimum dimensions
        const width = Math.max(containerWidth - 30, 800);
        const height = 600;

        setSvgDimensions({ width, height });
      }
    };

    // Initial update
    updateDimensions();

    // Set up resize observer
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const leftShadow = document.querySelector(".left-shadow");
    const rightShadow = document.querySelector(".right-shadow");

    const updateShadows = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const showLeft = scrollLeft > 10;
      const showRight = scrollLeft < scrollWidth - clientWidth - 10;

      leftShadow.style.opacity = showLeft ? "1" : "0";
      rightShadow.style.opacity = showRight ? "1" : "0";
    };

    updateShadows();
    container.addEventListener("scroll", updateShadows);

    return () => {
      container.removeEventListener("scroll", updateShadows);
    };
  }, [usedSkills]);

  useEffect(() => {
    if (!svgRef.current) return;
    
    // Get petals for the current category
    const data = categorizedPetals[activeCategory] || [];
    
    // Exit early if no data
    if (data.length === 0) return;

    const { width, height } = svgDimensions;
    const NODE_HORIZONTAL_SPACING = 100; // Fixed horizontal spacing between nodes

    d3.select(svgRef.current).selectAll("*").remove();

    // Create zoom behavior that will be maintained across renders
    if (!zoomRef.current) {
      zoomRef.current = d3
        .zoom()
        .scaleExtent([0.3, 3])
        .on("zoom", (event) => {
          const { x, y, k } = event.transform;
          setZoomTransform({ x, y, k });
          mainGroup.attr("transform", event.transform);
        });
    }

    // Create main SVG with zoom capabilities
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .call(zoomRef.current);

    // Define the glow filter
    const defs = svg.append('defs');
    const filter = defs.append('filter')
      .attr('id', 'lotus-glow');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '4.5')
      .attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Create a main group that will be transformed during zooming
    const mainGroup = svg
      .append("g")
      .attr(
        "transform",
        `translate(${zoomTransform.x}, ${zoomTransform.y}) scale(${zoomTransform.k})`
      );

    // Create separate groups for links and nodes to control layering
    // Links should be drawn first (below nodes)
    const linksGroup = mainGroup.append("g").attr("class", "links-group");
    linksGroupRef.current = linksGroup; // Store the D3 selection
    const nodesGroup = mainGroup.append("g").attr("class", "nodes-group");
    const addButtonsGroup = mainGroup
      .append("g")
      .attr("class", "add-buttons-group");

    // Create a directed graph representation
    const graph = {};
    data.forEach((node) => {
      graph[node.id] = {
        ...node,
        children: [],
        level: -1, // Will be assigned later
      };
    });

    // Populate children arrays
    data.forEach((node) => {
      node.dependencies.forEach((depId) => {
        if (graph[depId]) {
          graph[depId].children.push(node.id);
        }
      });
    });

    // Find root nodes - different logic for All Petals view vs skill-specific views
    const rootNodes = data
    .filter((node) => {
      if (activeCategory === "All Petals") {
        // For All Petals view, a root node has no dependencies at all
        return node.dependencies.length === 0;
      } else {
        // For skill-specific views
        const internalDeps = node.dependencies.filter((depId) => {
          const depPetal = allPetals[depId];
          return depPetal && depPetal.skill_id === activeSkillId;
        });
        return internalDeps.length === 0;
      }
    })
    .map((node) => node.id);

    // --- New Lotus Layout Logic ---
    const assignLevels = () => {
      rootNodes.forEach(id => { graph[id].level = 1; });
      let hasChanged = true;
      while (hasChanged) {
        hasChanged = false;
        Object.values(graph).forEach(node => {
          if (node.level === -1) {
            const internalDeps = node.dependencies.filter(depId => graph[depId]);
            const allDepsAssigned = internalDeps.every(depId => graph[depId].level !== -1);
            if (allDepsAssigned) {
              const maxDepLevel = Math.max(...internalDeps.map(depId => graph[depId].level), 0);
              node.level = maxDepLevel + 1;
              hasChanged = true;
            }
          }
        });
      }
      Object.values(graph).forEach(node => { if (node.level === -1) node.level = 1; });
    };

    assignLevels();

    const maxLevel = Math.max(...Object.values(graph).map(node => node.level), 0);
    const levels = Array.from({ length: maxLevel + 1 }, () => []);
    Object.values(graph).forEach(node => {
      if (node.level >= 0) levels[node.level].push(node);
    });

    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = 100;
    const radiusStep = 120;

    // Position nodes in concentric circles
    levels.forEach((levelNodes, levelIndex) => {
      if (levelIndex === 0) return; // Skip level 0, which is the center
      const radius = baseRadius + (levelIndex - 1) * radiusStep;
      const angleStep = (2 * Math.PI) / levelNodes.length;
      levelNodes.forEach((node, nodeIndex) => {
        const angle = nodeIndex * angleStep;
        node.x = centerX + radius * Math.cos(angle);
        node.y = centerY + radius * Math.sin(angle);
      });
    });

    // Center Intention Node
    const centerNode = mainGroup.append("g")
      .attr("transform", `translate(${centerX}, ${centerY})`)
      .attr("class", "intention-center-node");

    centerNode.append("circle")
      .attr("r", 40)
      .attr("fill", "#4a0e6b") // Deep purple for core
      .attr("stroke", "#c471ed")
      .attr("stroke-width", 3);

    centerNode.append("text")
      .text("⊙")
      .attr("text-anchor", "middle")
      .attr("dy", 5)
      .attr("fill", "white")
      .style("font-size", "24px");

    // 1. First create your links array with IDs for reference
const links = [];
let linkId = 0; // Give each link a unique ID

data.forEach((source) => {
  const sourceNode = graph[source.id];
  if (!sourceNode) return;

  // For All Petals view, include all dependencies
  if (activeCategory === "All Petals") {
    source.dependencies.forEach((depId) => {
      const targetNode = graph[depId];
      if (targetNode) {
        links.push({
          id: `link-${linkId++}`, // Unique ID for reference
          source: sourceNode,
          target: targetNode,
          type: "internal",
          targetStatus: targetNode.status // Store the actual status string
        });
      }
    });
  } else {
    // For skill-specific views
    const internalDeps = source.dependencies.filter((depId) => {
      const depPetal = allPetals[depId];
      return depPetal && depPetal.skill_id === activeSkillId;
    });

    internalDeps.forEach((depId) => {
      const targetNode = graph[depId];
      if (targetNode) {
        links.push({
          id: `link-${linkId++}`, // Unique ID for reference  
          source: sourceNode,
          target: targetNode,
          type: "internal",
          targetStatus: targetNode.status // Store the actual status string
        });
      }
    });
  }
});

// 2. Now create the link elements
const linkElements = linksGroup
  .selectAll(".link")
  .data(links)
  .enter()
  .append("path")
  .attr("id", d => d.id) // Set the unique ID
  .attr("class", "link")
  .attr("fill", "none")
  .attr("stroke", "#999") // Default color - we'll update specific ones in the next step
  .attr("stroke-width", (d) => (d.type === "internal" ? 1 : 1.5))
  .attr("stroke-dasharray", (d) => (d.type === "internal" ? "none" : "5,5"))
  .attr("d", (d) => {
    return `M${d.source.x},${d.source.y} C${d.source.x},${
      (d.source.y + d.target.y) / 2
    } ${d.target.x},${(d.source.y + d.target.y) / 2} ${d.target.x},${
      d.target.y
    }`;
  });

// 3. Now go through and update the colors for completed petals directly
links.forEach(link => {
  if (link.targetStatus === "completed") {
    d3.select(`#${link.id}`).attr("stroke", "#FF69B4");
  }
});


    // Only process external dependencies if we're not in All Petals view
    if (activeCategory !== "All Petals") {
      Object.values(graph).forEach((node) => {
        // Get external dependencies (things this node depends on)
        const externalDeps = node.dependencies
          .filter((depId) => {
            const depPetal = allPetals[depId];
            return depPetal && depPetal.skill_id !== activeSkillId;
          })
          .map((depId) => ({
            id: depId,
            sourceNode: node,
            type: "depends-on",
            petalInfo: allPetals[depId],
          }));
    
        // Get external dependents (things that depend on this node)
        const externalDependents = Object.values(allPetals)
          .filter(
            (petal) =>
              petal.skill_id !== activeSkillId &&
              petal.dependencies.includes(node.id)
          )
          .map((petal) => ({
            id: petal.id,
            sourceNode: node,
            type: "depended-by",
            petalInfo: petal,
          }));
    
        // Limit to MAX_EXTERNAL_DEPS dependencies of each type
        const limitedDeps = externalDeps.slice(0, MAX_EXTERNAL_DEPS);
        const limitedDependents = externalDependents.slice(0, MAX_EXTERNAL_DEPS);
        
        // Draw external dependency links first (under nodes)
        // Position external dependencies in a row above the node
        limitedDeps.forEach((dep, index) => {
          const totalDeps = limitedDeps.length;
          const offset = (index - (totalDeps - 1) / 2) * 30; // Distribute horizontally

          const x2 = node.x + offset;
          const y2 = node.y - 30; // Fixed distance above

          // Draw link
          linksGroup
            .append("line")
            .attr("class", "external-link")
            .attr("stroke", "#666")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "2,2")
            .attr("x1", node.x)
            .attr("y1", node.y)
            .attr("x2", x2)
            .attr("y2", y2);

          // Draw external node
          const externalNodeGroup = nodesGroup
            .append("g")
            .attr("class", "external-node")
            .attr("transform", `translate(${x2}, ${y2})`)
            .style("pointer-events", "visible")
            .on("mouseover", (event) => {
              if (dep.petalInfo) {
                setHoveredNode({
                  id: dep.id,
                  name: dep.petalInfo.name,
                  status: dep.petalInfo.status,
                  category: dep.petalInfo.category,
                  type: dep.type,
                  rawX: event.clientX,
                  rawY: event.clientY,
                  element: event.currentTarget,
                });
              }
            })
            .on("mouseout", handleMouseOut)
            .on("mouseleave", handleMouseOut) 
            .on("click", () => handleEditPetal(dep.petalInfo.id));

          externalNodeGroup
            .append("circle")
            .attr("r", 7)
            .attr("fill", dep.petalInfo ? getPetalColor(dep.petalInfo.status) : "#CCCCCC")
            .attr("stroke", "#999999")
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "2,1");
        });

        // Position external dependents in a row below the node
        limitedDependents.forEach((dep, index) => {
          const totalDeps = limitedDependents.length;
          const offset = (index - (totalDeps - 1) / 2) * 30; // Distribute horizontally

          const x2 = node.x + offset;
          const y2 = node.y + 40; // Fixed distance below

          // Draw link
          linksGroup
            .append("line")
            .attr("class", "external-link")
            .attr("stroke", "#666")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "2,2")
            .attr("x1", node.x)
            .attr("y1", node.y)
            .attr("x2", x2)
            .attr("y2", y2);

          // Draw external node
          const externalNodeGroup = nodesGroup
            .append("g")
            .attr("class", "external-node")
            .attr("transform", `translate(${x2}, ${y2})`)
            .on("mouseover", (event) => {
              const [x, y] = d3.pointer(event); // Get coordinates relative to SVG
              if (dep.petalInfo) {
                setHoveredNode({
                  id: dep.id,
                  name: dep.petalInfo.name,
                  status: dep.petalInfo.status,
                  category: dep.petalInfo.category,
                  type: dep.type,
                  rawX: event.clientX,
                  rawY: event.clientY,
                  element: event.currentTarget,
                });
              }
            })
            .on("mouseout", handleMouseOut)
            .on("mouseleave", handleMouseOut);

          externalNodeGroup
            .append("circle")
            .attr("r", 7)
            .attr("fill", dep.petalInfo ? getPetalColor(dep.petalInfo.status) : "#CCCCCC")
            .attr("stroke", "#999999")
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "2,1");
        });
      });
    }

    // Draw the main nodes last (on top)
    const nodeGroups = nodesGroup
      .selectAll(".node")
      .data(Object.values(graph))
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.x}, ${d.y})`)
      .style("pointer-events", "all")
      .on("mouseover", handleMouseOver)
      .on("mouseout", handleMouseOut)
      .on("click", function (event, d) {
        event.stopPropagation(); // Prevent event bubbling
        if (isEditMode) {
          handleEditPetal(d);
        } else {
          handleViewPetal(d);
        }
      });
    nodeGroups
      .append("circle")
      .attr("r", 15)
      .attr("fill", (d) => getPetalColor(d.status))
      .style("filter", "url(#lotus-glow)")
       // TODO: Replace with actual resonance data when available
      .style("opacity", d => 0.5 + Math.random() * 0.5);

    nodeGroups
      .append("text")
      .attr("dy", 25)
      .attr("text-anchor", "middle")
      .text((d) => truncateText(d.name))
      .attr("font-size", "10px");

    nodeGroups
      .append("text")
      .attr("dy", 4)
      .attr("text-anchor", "middle")
      .text((d) => {
        if (d.status === "completed") return "✓";
        if (d.status.includes("urgent")) return "!";
        if (d.status.includes("unassigned")) return "+";
        return "";
      })
      .attr("font-size", "12px")
      .attr("fill", (d) =>
        d.status.includes("unassigned") ? "#000000" : "#FFFFFF"
      );
    

    // Add the orange "+" nodes in edit mode
    if (isEditMode) {
      Object.values(graph).forEach((node) => {
        const addButtonGroup = addButtonsGroup
          .append("g")
          .attr("class", "add-button")
          .attr("transform", `translate(${node.x + 35}, ${node.y})`)
          .style("pointer-events", "all") // Add this line
          .style("cursor", "pointer")
          .on("click", function (event) {
            // Move click handler here
            event.stopPropagation();
            handleAddPetal(node.id);
          });

        addButtonGroup
          .append("circle")
          .attr("r", 10)
          .attr("fill", "#FFA500")
          .attr("stroke", "#FF8C00")
          .attr("stroke-width", 1.5);

        addButtonGroup
          .append("text")
          .attr("dy", 4)
          .attr("text-anchor", "middle")
          .text("+")
          .attr("font-size", "14px")
          .attr("fill", "#FFFFFF"); // Prevent pointer events on the text
      });
    }
  }, [
    activeCategory,
    allPetals,
    skills,
    isEditMode,
    zoomTransform,
    svgDimensions,
    petals,
  ]);
  const colorClasses = ["pink", "green", "blue", "orange"];


    useEffect(() => {
    const fetchFullPetal = async () => {
      if (petalId && !popupLaunched) {
        try {
          const token = await getAccessTokenSilently();
          const response = await axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/petals/${petalId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const petal = response.data;
          if (petal) {
            setPetalForm(petal);
            setPopupLaunched(true);
            setActiveSkillId(petal.skill_id);
            setShowPetalPopup(true);
            const skill = skills.find(s => s.id === petal.skill_id);
            if (skill) {
              setActiveCategory(skill.name);
            }
          }
        } catch (error) {
          console.error("Error fetching full petal details for deep link:", error);
          // Fallback to petals array
          const petal = petals.find(t => t.id === parseInt(petalId, 10));
          if (petal) {
            setPetalForm(petal);
            setPopupLaunched(true);
            setActiveSkillId(petal.skill_id);
            setShowPetalPopup(true);
            const skill = skills.find(s => s.id === petal.skill_id);
            if (skill) {
              setActiveCategory(skill.name);
            }
          }
        }
      }
    };
    fetchFullPetal();
  }, [petalId, petals, skills, popupLaunched, getAccessTokenSilently]);

  // Add these debug logs right before the PetalEditor component in the return statement

  return (
    <div
      className="skill-hierarchy-container"
      ref={containerRef}
      onMouseLeave={handleMouseLeave}
    >
      <div className="tabs-container-wrapper" style={{ position: "relative" }}>
        {/* Left shadow - fixed position */}
        <div className="scroll-shadow left-shadow" />
        <div
          ref={tabsContainerRef}
          className="category-tabs"
          onMouseDown={handleMouseDown}
          onMouseLeave={handleTabsLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          {/* Add the All Petals tab first */}
          <button
            key="all-petals"
            className={`tab all-petals ${activeCategory === "All Petals" ? "active" : ""}`}
            onClick={() => {
              setActiveCategory("All Petals");
              setActiveSkillId(null); // No specific skill for All Petals view
            }}
            style={{ flex: "0 0 auto" }}
          >
            All Petals
            {activeCategory === "All Petals" && (
              <span className="active-indicator" />
            )}
          </button>

          {usedSkills.map((category, index) => {
            const colorClass = colorClasses[index % colorClasses.length];
            return (
              <button
                key={category.id}
                className={`tab ${colorClass} ${
                  activeCategory === category.name ? "active" : ""
                }`}
                onClick={() => {
                  const skillId = skills.find(s => s.name === category.name)?.id;
                  setActiveCategory(category.name);
                  setActiveSkillId(skillId);
                }}
                style={{ flex: "0 0 auto" }}
              >
                {category.name}
                {activeCategory === category.name && (
                  <span className="active-indicator" />
                )}
              </button>
            );
          })}
          {isEditMode && (
            <button
              className="tab new-skill-tab"
              onClick={() => {
                setPetalForm({
                  ...initialForm,
                    intention_id: intentionId,
                  skill_id: "" // No skill pre-selected
                });
                setShowPetalPopup(true);
              }}
              style={{ flex: "0 0 auto" }}
            >
              + New Skill
            </button>
          )}
        </div>
        <div className="scroll-shadow right-shadow" />
      </div>

      <div
        className="visualization-container"
        style={{ width: "100%", overflow: "hidden" }}
      >
        <svg
          ref={svgRef}
          width={svgDimensions.width}
          height={svgDimensions.height}
        ></svg>

        <div className="intention-lotus-controls">
          {intention?.creator_id === Number(userId) && (
            <>
              <button className="control-button" onClick={() => handleAddPetal()}>[ Add Petal ]</button>
              <button className="control-button" onClick={() => setIsEditMode(!isEditMode)}>
                {isEditMode ? "[ Finish Editing ]" : "[ Edit Links ]"}
              </button>
            </>
          )}
          <button className="control-button">[ Manifest View 🌠 ]</button>
        </div>

        {intention?.creator_id === Number(userId) && (
          <div className="admin-buttons">
            {!intentionIsActive && (
            <button
              className={`admin-button ${loading ? 'disabled' : ''}`}
              onClick={() => {
                handleGranularizePetals(intentionId);
              }}
              disabled={loading}
            >
              {loading ? 'Granularizing...' : 'Granularize'}
            </button>
            )}
            {intention?.realm_id === null && (
              <button
                className="admin-button"
                onClick={() => {
                  fetchUserRealms();
                  setShowRealmProposalPopup(true);
                }}
              >
                Propose to Realm
              </button>
            )}
          </div>
        )}
      </div>

      {hoveredNode && (
        <div
          ref={tooltipRef}
          className="tooltip-container"
          style={{
            position: 'fixed',
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            opacity: hoveredNode ? 1 : 0,
          }}
          onMouseEnter={() => clearTimeout(hoverIntentRef.current)}
          onMouseLeave={() => {
            clearTimeout(hoverIntentRef.current); // Clear any pending show
            setHoveredNode(null); // Hide tooltip
          }}
        >
          <div className="node-tooltip">
            <h4>{hoveredNode.name}</h4>
            {hoveredNode.isAddButton ? (
              <p>
                Creates a new petal connected to node{" "}
                {hoveredNode.connectedToNodeId}
              </p>
            ) : (
              <>
                {hoveredNode.category &&
                  hoveredNode.category !== activeCategory && (
                    <p>Category: {hoveredNode.category}</p>
                  )}
                {hoveredNode.status && <p>Status: {hoveredNode.status}</p>}
                {hoveredNode.type && (
                  <p>
                    Relationship:{" "}
                    {hoveredNode.type === "depends-on"
                      ? "Current petal depends on this"
                      : "This depends on current petal"}
                  </p>
                )}
                {hoveredNode.dependencies &&
                  hoveredNode.dependencies.length > 0 && (
                    <div>
                      <p>Depends on:</p>
                      <ul>
                        {hoveredNode.dependencies
                          .map((depId) => allPetals[depId]) // Resolve ID to petal object
                          .filter(Boolean) // Remove undefined (invalid dependencies)
                          .map((petal) => (
                            <li key={petal.id}>
                              {petal.name}{" "}
                              {petal.skill_id !== activeSkillId
                                ? `(${
                                    skills.find((s) => s.id === petal.skill_id)
                                      ?.name || "external"
                                  })`
                                : ""}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                {hoveredNode.dependents &&
                  hoveredNode.dependents.length > 0 && (
                    <div>
                      <p>Required by:</p>
                      <ul>
                        {Object.values(allPetals)
                          .filter((petal) =>
                            petal.dependencies.includes(hoveredNode.id)
                          )
                          .map((petal) => (
                            <li key={petal.id}>
                              {petal.name}{" "}
                              {petal.skill_id !== activeSkillId
                                ? `(${
                                    skills.find((s) => s.id === petal.skill_id)
                                      ?.name || "external"
                                  })`
                                : ""}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                {/* Reviewer info for this specific petal */}
                {allPetals[hoveredNode.id]?.reviewer_ids && (
                  <div>
                    <p>Reviewers:</p>
                    <ul>
                      {allPetals[hoveredNode.id].reviewer_ids.map((rid, idx) => (
                        <li key={idx}>{rid}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div className="intention-info">
        <h3>{intention?.name}</h3>
        <p className="intention-description">{intention?.description}</p>
        <br />
        <p className="token-pool-label">Token Pool:</p>
        <div className="token-pool">
          <div className="resonance-section">
            <button onClick={handleResonate} disabled={userHasResonated} className="resonate-button">
              {userHasResonated ? 'Resonated' : 'Resonate'}
            </button>
            <span className="resonance-count">{resonanceCount}</span>
          </div>
          <div className="token-metric">
            <span className="token-label">Allocated:</span>
            <span className="token-value">{intention?.reserved_tokens}</span>
          </div>
          <div className="token-metric">
            <span className="token-label">DIstributed:</span>
            <span className="token-value">{intention?.used_tokens}</span>
          </div>
          <div className="token-metric">
            <span className="token-label">Available:</span>
            <span className="token-value">
              {Number(intention?.token_pool || 0) -
                Number(intention?.used_tokens || 0) -
                Number(intention?.reserved_tokens || 0)}
            </span>
          </div>
        </div>
        <div className="vintention-tags">
          {isEditMode ? (
            <Autocomplete
              multiple
              freeSolo
              options={interests || []}
              value={intention?.tags || []}
              onChange={(event, newValue) => {
                handleUpdateTags(newValue);
              }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={index}
                    label={option}
                    className="tag-chip"
                    variant="outlined"
                    style={{
                      backgroundColor: "#000000",
                      color: "#FFF",
                      margin: "2px",
                      fontSize: "12px",
                      borderRadius: "4px",
                      padding: "5px 10px",
                    }}
                    onDelete={() => {
                      const newTags = [...(intention?.tags || [])];
                      newTags.splice(index, 1);
                      handleUpdateTags(newTags);
                    }}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  placeholder="Add tags..."
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    style: {
                      color: 'white',
                      backgroundColor: '#222',
                      borderRadius: '4px',
                      padding: '4px',
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: 'transparent',
                      },
                      '&:hover fieldset': {
                        borderColor: '#555',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#4dabf7',
                      },
                    },
                  }}
                />
              )}
              sx={{
                '& .MuiAutocomplete-popupIndicator': { color: 'white' },
                '& .MuiAutocomplete-clearIndicator': { color: 'white' },
              }}
              componentsProps={{
                paper: {
                  sx: {
                    backgroundColor: '#222',
                    color: 'white',
                    '& .MuiAutocomplete-option': {
                      '&[aria-selected="true"]': {
                        backgroundColor: 'rgba(77, 171, 247, 0.3)',
                      },
                      '&[aria-selected="true"].Mui-focused': {
                        backgroundColor: 'rgba(77, 171, 247, 0.3)',
                      },
                    },
                  },
                },
              }}
            />
          ) : (
            intention?.tags?.map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                className="tag-chip"
                variant="outlined"
                style={{
                  backgroundColor: "#000000",
                  color: "#FFF",
                  margin: "2px",
                  fontSize: "12px",
                  borderRadius: "4px",
                  padding: "5px 10px",
                }}
              />
            ))
          )}
        </div>
      </div>

      <PetalEditor
        open={showPetalPopup}
        onClose={() => {
          setShowPetalPopup(false);
          refreshPetals();
        }}
        intentionId={intentionId}
        petalForm={petalForm}
        setPetalForm={setPetalForm}
        onSubmit={async (formData) => {
          const action = formData.id ? 'update' : 'create'; 
          const result = await handlePetalAction(formData, action);
          if (!result.error) {
            await refreshPetals();
            updateLinkColors();
          }
          return result;
        }}
        skills={skills}
        isEdit={isEditMode}
        currentUser={user}
        intentionCreatorId={intention?.creator_id}
        isReviewer={allPetals[petalForm?.id]?.reviewer_ids?.includes(Number(userId))}
      />

      <div className="legend">
        <div>
          <span style={{ color: "#FF69B4" }}>● </span>Pink indicates a completed
          petal
        </div>
        <div>
          <span style={{ color: "#FF0000" }}>● </span>Red circle indicates
          urgent
        </div>
        <div>
          <span style={{ color: "#87CEFA" }}>○ </span>Blue circle indicates
          inactive vacancy
        </div>
        <div>
          <span style={{ color: "#4682B4" }}>● </span>Filled blue indicates
          inactive assigned
        </div>
        <div>
          <span style={{ color: "#32CD32" }}>● </span>Green filled indicates
          active assigned
        </div>
        <div>
          <span style={{ color: "#00FF00" }}>○ </span>Green circle with gray
          interior indicates active unassigned
        </div>
        <div>
          <span style={{ color: "#FFA500" }}>● </span>Orange filled indicates
          submitted
        </div>
        <div>
          <span
            style={{
              border: "1px dashed #666",
              borderRadius: "50%",
              display: "inline-block",
              width: "10px",
              height: "10px",
            }}
          ></span>{" "}
          Dashed circles indicate external dependencies
        </div>
      </div>
      {showRealmProposalPopup && (
        <div className="cyber-modal-overlay">
          <div className="cyber-modal">
            <div className="cyber-border">
              <h3 className="cyber-title">Submit to Realm</h3>
              <div className="cyber-content">
                <p>Select a realm to submit this intention to:</p>

                <Autocomplete
                  options={userRealms}
                  getOptionLabel={(option) => option.name}
                  onChange={(event, newValue) => setSelectedRealm(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Realm"
                      variant="outlined"
                      fullWidth
                      className="cyber-input"
                    />
                  )}
                  sx={{
                    margin: '20px 0',
                    '& .MuiAutocomplete-popupIndicator': { color: '#00f3ff' },
                    '& .MuiAutocomplete-clearIndicator': { color: '#00f3ff' },
                  }}
                />

                <div className="cyber-button-group">
                  <button
                    onClick={() => setShowRealmProposalPopup(false)}
                    className="cyber-button cancel"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitRealmProposal}
                    className="cyber-button"
                    disabled={!selectedRealm}
                  >
                    Submit Proposal
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntentionLotusMap;
