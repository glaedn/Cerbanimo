import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import TaskEditor from "./TaskEditor";
import { useProjectTasks } from "../hooks/useProjectTasks";
import "./ProjectVisualizer.css";
import { useParams } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useMemo } from "react";
import { Chip } from "@mui/material";
import { Autocomplete, TextField } from "@mui/material";

const ProjectVisualizer = () => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const { projectId, taskId } = useParams();
  const { getAccessTokenSilently } = useAuth0();
  const { user } = useAuth0();
  const [userId, setUserId] = useState(null);
  const { tasks, skills, project, handleTaskAction, fetchTasks, updateProject } =
    useProjectTasks(projectId, user);
  const [activeCategory, setActiveCategory] = useState("All Tasks"); // Default to All Tasks
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
  const [showCommunityProposalPopup, setShowCommunityProposalPopup] = useState(false);
  const [userCommunities, setUserCommunities] = useState([]);
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [popupLaunched, setPopupLaunched] = useState(false);
  const [interests, setInterests] = useState([]);
  const linksGroupRef = useRef(null);
  // Check if any task is active, completed, or urgent
  const [projectIsActive, setProjectIsActive] = useState(false);

  useEffect(() => {
    setProjectIsActive(
      tasks.some(
        (task) =>
          task.status === "completed" ||
          task.status === "active-assigned" ||
          task.status === "active-unassigned" ||
          task.status === "urgent-unassigned" ||
          task.status === "urgent-assigned" ||
          task.status === "submitted"
      )
    );
  }, [tasks]);


  const fetchUserCommunities = async () => {
    if (!userId) {
      console.log('No userId available');
      return;
    }
    
    try {
      const token = await getAccessTokenSilently({
        audience: `${import.meta.env.VITE_BACKEND_URL}`,
        scope: "openid profile email",
      });
  
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/communities/user/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch communities: ${errorText}`);
      }
  
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setUserCommunities(data);
      } else {
        setUserCommunities([]);
      }
    } catch (error) {
      setUserCommunities([]);
    }
  };

  // Function to handle granularization of tasks
  const handleGranularizeTasks = async (projectId) => {
    const confirm = window.confirm('Are you sure? This will delete and replace ALL tasks in the project.');
    if (!confirm) return;

    setLoading(true);
    try {
      const token = await getAccessTokenSilently({
        audience: `${import.meta.env.VITE_BACKEND_URL}`,
        scope: "openid profile email",
      });

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/tasks/${projectId}/granularize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to granularize task: ${errorText}`);
      }
      
      const data = await response.json();

      if (data.success) {
        // Refresh tasks after successful granularization
        await fetchTasks();
        alert('Task granularization successful!');
      } else {
        alert('Task granularization failed: ' + data.error);
      }
    } catch (error) {
      console.error('Error granularizing task:', error);
      alert('Error granularizing task: ' + error.message);
    } finally {
      setLoading(false);
    }
  
  };


  // Add useEffect to handle initial communities fetch
  useEffect(() => {
    if (userId) {
      fetchUserCommunities();
    }
  }, [userId]);

  const handleSubmitCommunityProposal = async () => {
    if (!selectedCommunity) return;
  
    try {
      const token = await getAccessTokenSilently({
        audience: `${import.meta.env.VITE_BACKEND_URL}`,
        scope: "openid profile email",
      });
  
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/communities/${selectedCommunity.id}/submit/${projectId}`,
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
  
      // Update the project to mark it as a community project
      updateProject({ community_id: selectedCommunity.id });
      
      // Close the popup and navigate to the community hub
      setShowCommunityProposalPopup(false);
      window.location.href = `/communityhub/${selectedCommunity.id}`;
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

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/projects/${projectId}`, {
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
      updateProject({ tags: newTags });
      
      // No need to call fetchProject() since we've already updated the UI
    } catch (error) {
      console.error('Error updating tags:', error);
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

  
  // Modify your fetchTasks call to preserve the category
const refreshTasks = async () => {
  const currentCategory = activeCategory; // Save before refresh
  const currentSkillId = activeSkillId;
  
  await fetchTasks();
  
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

  const categorizedTasks = useMemo(() => {
    // First create the all-tasks entry
    const taskMap = {
      "All Tasks": [...tasks] // Include all tasks
    };
  
    // Then add the skill-specific categories
    const filteredSkills = skills.filter((skill) =>
      tasks.some((task) => task.skill_id === skill.id)
    );
  
    filteredSkills.forEach((skill) => {
      taskMap[skill.name] = tasks.filter((task) => task.skill_id === skill.id);
    });
  
    return taskMap;
  }, [tasks, skills]);

  const initialForm = {
    id: null,
    name: "",
    description: "",
    status: "inactive-unassigned",
    dependencies: [],
    skill_id: 0,
    project_id: projectId,
    reward_tokens: 10
  };

  // local modal control here
  const [taskForm, setTaskForm] = useState(initialForm);
  const [showTaskPopup, setShowTaskPopup] = useState(false);

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

  const handleEditTask = (task) => {
    setTaskForm(task); // Fill in form with task values
    setShowTaskPopup(true); // Show the TaskEditor modal
  };

  const handleViewTask = (task) => {
    setTaskForm(task); // Fill in form with task values
    setShowTaskPopup(true); // Show the TaskEditor modal
  };

  const handleAddTask = (dependencyId = null) => {
    const currentSkill = skills.find((s) => s.name === activeCategory);
    const form = {
      ...initialForm,
      project_id: projectId,
      skill_id: currentSkill?.id || "",
    };
    
    // If dependencyId exists, create both the numeric dependencies array
    // and the named version needed for display
    if (dependencyId) {
      const depTask = allTasks[dependencyId];
      form.dependencies = [parseInt(dependencyId, 10)];
      form.dependenciesWithNames = depTask ? [
        { id: parseInt(dependencyId, 10), name: depTask.name }
      ] : [];
    }
    
    setTaskForm(form);
    setShowTaskPopup(true);
  };

  const FIXED_LEVEL_HEIGHT = 120;
  const MAX_EXTERNAL_DEPS = 3;

  // All tasks across all skills - used to find external dependencies
  const allTasks = tasks.reduce((acc, task) => {
    acc[task.id] = task;
    return acc;
  }, {});

  const getNodeColor = (status) => {
    switch (status) {
      case "completed":
        return "#FF69B4";
      case "submitted":
        return "#FFA500";
      case "urgent-unassigned":
        return "#888888";
      case "urgent-assigned":
        return "#32CD32";
      case "inactive-unassigned":
        return "#87CEFA";
      case "inactive-assigned":
        return "#4682B4";
      case "active-assigned":
        return "#32CD32";
      case "active-unassigned":
        return "#00FF00";
      default:
        return "#CCCCCC";
    }
  };

  const updateLinkColors = () => {
    if (linksGroupRef.current) {
      linksGroupRef.current
        .selectAll(".link")
        .attr("stroke", d => d.targetStatus === "completed" ? "#FF69B4" : "#999");
    }
  }

  const getNodeStroke = (status) => {
    if (status === "active-unassigned" || status === "active-assigned")
      return "#32CD32";
    if (status === "inactive-unassigned" || status === "inactive-assigned")
      return "#4682B4";
    if (status === "urgent-unassigned" || status === "urgent-assigned")
      return "#FF0000";
    if (status === "completed") return "#FF69B4";
    return "#CCCCCC";
  };

  const getNodeFill = (status) => {
    if (status.includes("unassigned")) return "#888888";
    return getNodeColor(status);
  };

  const truncateText = (text, maxLength = 13) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const usedSkills = skills.filter((skill) =>
    tasks.some((task) => task.skill_id === skill.id)
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
    setActiveCategory("All Tasks");
    setActiveSkillId(null);
  }
}, [skills, tasks]); // Dependencies remain the same

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
    
    // Get tasks for the current category
    const data = categorizedTasks[activeCategory] || [];
    
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

    // Find root nodes - different logic for All Tasks view vs skill-specific views
    const rootNodes = data
    .filter((node) => {
      if (activeCategory === "All Tasks") {
        // For All Tasks view, a root node has no dependencies at all
        return node.dependencies.length === 0;
      } else {
        // For skill-specific views
        const internalDeps = node.dependencies.filter((depId) => {
          const depTask = allTasks[depId];
          return depTask && depTask.skill_id === activeSkillId;
        });
        return internalDeps.length === 0;
      }
    })
    .map((node) => node.id);

    // Perform topological sorting to assign levels
    const assignLevels = () => {
      // Mark all root nodes as level 0
      rootNodes.forEach((id) => {
        graph[id].level = 0;
      });

      let hasChanged = true;

      // Continue until no more changes
      while (hasChanged) {
        hasChanged = false;

        // Check all nodes
        Object.values(graph).forEach((node) => {
          if (node.level === -1) {
            // Check if all dependencies have levels assigned
            const internalDeps = node.dependencies.filter(
              (depId) => graph[depId]
            );
            const allDepsAssigned = internalDeps.every(
              (depId) => graph[depId].level !== -1
            );

            if (allDepsAssigned) {
              // Find maximum level of dependencies and add 1
              const maxDepLevel = Math.max(
                ...internalDeps.map((depId) => graph[depId].level),
                -1
              );
              node.level = maxDepLevel + 1;
              hasChanged = true;
            }
          }
        });
      }

      // Handle any remaining nodes (possible circular dependencies)
      Object.values(graph).forEach((node) => {
        if (node.level === -1) {
          node.level = 0; // Assign to root level as fallback
        }
      });
    };

    assignLevels();

    // Group nodes by level
    const levels = [];
    const maxLevel = Math.max(
      ...Object.values(graph).map((node) => node.level)
    );

    for (let i = 0; i <= maxLevel; i++) {
      levels[i] = Object.values(graph).filter((node) => node.level === i);
    }

    // Calculate positions with fixed level height
    // For each level, calculate horizontal positions
    levels.forEach((levelNodes, levelIndex) => {
      // Calculate the total width of nodes in this level
      const levelWidth = NODE_HORIZONTAL_SPACING * (levelNodes.length - 1);

      // Start X is based on centering just this level — starting from 0
      const startX = 200 - levelWidth / 2;

      levelNodes.forEach((node, nodeIndex) => {
        node.x = startX + NODE_HORIZONTAL_SPACING * nodeIndex;
        node.y = FIXED_LEVEL_HEIGHT * (levelIndex + 0.5);
      });
    });

    // 1. First create your links array with IDs for reference
const links = [];
let linkId = 0; // Give each link a unique ID

data.forEach((source) => {
  const sourceNode = graph[source.id];
  if (!sourceNode) return;

  // For All Tasks view, include all dependencies
  if (activeCategory === "All Tasks") {
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
      const depTask = allTasks[depId];
      return depTask && depTask.skill_id === activeSkillId;
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

// 3. Now go through and update the colors for completed tasks directly
links.forEach(link => {
  if (link.targetStatus === "completed") {
    d3.select(`#${link.id}`).attr("stroke", "#FF69B4");
  }
});


    // Only process external dependencies if we're not in All Tasks view
    if (activeCategory !== "All Tasks") {
      Object.values(graph).forEach((node) => {
        // Get external dependencies (things this node depends on)
        const externalDeps = node.dependencies
          .filter((depId) => {
            const depTask = allTasks[depId];
            return depTask && depTask.skill_id !== activeSkillId;
          })
          .map((depId) => ({
            id: depId,
            sourceNode: node,
            type: "depends-on",
            taskInfo: allTasks[depId],
          }));
    
        // Get external dependents (things that depend on this node)
        const externalDependents = Object.values(allTasks)
          .filter(
            (task) =>
              task.skill_id !== activeSkillId &&
              task.dependencies.includes(node.id)
          )
          .map((task) => ({
            id: task.id,
            sourceNode: node,
            type: "depended-by",
            taskInfo: task,
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
              if (dep.taskInfo) {
                setHoveredNode({
                  id: dep.id,
                  name: dep.taskInfo.name,
                  status: dep.taskInfo.status,
                  category: dep.taskInfo.category,
                  type: dep.type,
                  rawX: event.clientX,
                  rawY: event.clientY,
                  element: event.currentTarget,
                });
              }
            })
            .on("mouseout", handleMouseOut)
            .on("mouseleave", handleMouseOut) 
            .on("click", () => handleEditTask(dep.taskInfo.id));

          externalNodeGroup
            .append("circle")
            .attr("r", 7)
            .attr(
              "fill",
              dep.taskInfo ? getNodeFill(dep.taskInfo.status) : "#CCCCCC"
            )
            .attr(
              "stroke",
              dep.taskInfo ? getNodeStroke(dep.taskInfo.status) : "#999999"
            )
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
              if (dep.taskInfo) {
                setHoveredNode({
                  id: dep.id,
                  name: dep.taskInfo.name,
                  status: dep.taskInfo.status,
                  category: dep.taskInfo.category,
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
            .attr(
              "fill",
              dep.taskInfo ? getNodeFill(dep.taskInfo.status) : "#CCCCCC"
            )
            .attr(
              "stroke",
              dep.taskInfo ? getNodeStroke(dep.taskInfo.status) : "#999999"
            )
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
          handleEditTask(d);
        } else {
          handleViewTask(d);
        }
      });
    nodeGroups
      .append("circle")
      .attr("r", 15)
      .attr("fill", (d) => getNodeFill(d.status))
      .attr("stroke", (d) => getNodeStroke(d.status))
      .attr("stroke-width", 2);

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
            handleAddTask(node.id);
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
    allTasks,
    skills,
    isEditMode,
    zoomTransform,
    svgDimensions,
    tasks,
  ]);
  const colorClasses = ["pink", "green", "blue", "orange"];


    useEffect(() => {
    if (taskId && !popupLaunched) {
      // Find the task in the tasks array
      const task = tasks.find(t => t.id === parseInt(taskId, 10));
      if (task) {
        // Set the current task and skill
        setTaskForm(task);
        setPopupLaunched(true);
        setActiveSkillId(task.skill_id);
        setShowTaskPopup(true);
        // Find and set the active category (skill name)
        const skill = skills.find(s => s.id === task.skill_id);
        if (skill) {
          setActiveCategory(skill.name);
        }
      }
    }
  }, [taskId, tasks, skills]);

  // Add these debug logs right before the TaskEditor component in the return statement

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
          {/* Add the All Tasks tab first */}
          <button
            key="all-tasks"
            className={`tab all-tasks ${activeCategory === "All Tasks" ? "active" : ""}`}
            onClick={() => {
              setActiveCategory("All Tasks");
              setActiveSkillId(null); // No specific skill for All Tasks view
            }}
            style={{ flex: "0 0 auto" }}
          >
            All Tasks
            {activeCategory === "All Tasks" && (
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
                setTaskForm({
                  ...initialForm,
                  project_id: projectId,
                  skill_id: "" // No skill pre-selected
                });
                setShowTaskPopup(true);
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
        {project?.creator_id === Number(userId) && (
          <div className="edit-buttons">
            {isEditMode && (
              <button
                className="new-task-button"
                onClick={() => {
                  handleAddTask();
                }}
              >
                + New Task
              </button>
            )}
            {!projectIsActive && (
            <button
              className={`new-task-button ${loading ? 'disabled' : ''}`}
              onClick={() => {
                handleGranularizeTasks(projectId);
              }}
              disabled={loading}
            >
              {loading ? 'Granularizing...' : 'Granularize all project tasks'}
            </button>
            )}
            {project?.community_id === null && (
              <button
                className="community-proposal-button"
                onClick={() => {
                  fetchUserCommunities();
                  setShowCommunityProposalPopup(true);
                }}
              >
                Propose to Community
              </button>
            )}

            <button
              className="edit-mode-button"
              onClick={() => setIsEditMode(!isEditMode)}
            >
              {isEditMode ? "Exit Edit Mode" : "Edit Mode"}
            </button>
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
                Creates a new task connected to node{" "}
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
                      ? "Current task depends on this"
                      : "This depends on current task"}
                  </p>
                )}
                {hoveredNode.dependencies &&
                  hoveredNode.dependencies.length > 0 && (
                    <div>
                      <p>Depends on:</p>
                      <ul>
                        {hoveredNode.dependencies
                          .map((depId) => allTasks[depId]) // Resolve ID to task object
                          .filter(Boolean) // Remove undefined (invalid dependencies)
                          .map((task) => (
                            <li key={task.id}>
                              {task.name}{" "}
                              {task.skill_id !== activeSkillId
                                ? `(${
                                    skills.find((s) => s.id === task.skill_id)
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
                        {Object.values(allTasks)
                          .filter((task) =>
                            task.dependencies.includes(hoveredNode.id)
                          )
                          .map((task) => (
                            <li key={task.id}>
                              {task.name}{" "}
                              {task.skill_id !== activeSkillId
                                ? `(${
                                    skills.find((s) => s.id === task.skill_id)
                                      ?.name || "external"
                                  })`
                                : ""}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                {/* Reviewer info for this specific task */}
                {allTasks[hoveredNode.id]?.reviewer_ids && (
                  <div>
                    <p>Reviewers:</p>
                    <ul>
                      {allTasks[hoveredNode.id].reviewer_ids.map((rid, idx) => (
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

      <div className="project-info">
        <h3>{project?.name}</h3>
        <p className="project-description">{project?.description}</p>
        <br />
        <p className="token-pool-label">Token Pool:</p>
        <div className="token-pool">
          <div className="token-metric">
            <span className="token-label">Allocated:</span>
            <span className="token-value">{project?.reserved_tokens}</span>
          </div>
          <div className="token-metric">
            <span className="token-label">DIstributed:</span>
            <span className="token-value">{project?.used_tokens}</span>
          </div>
          <div className="token-metric">
            <span className="token-label">Available:</span>
            <span className="token-value">
              {Number(project?.token_pool || 0) -
                Number(project?.used_tokens || 0) -
                Number(project?.reserved_tokens || 0)}
            </span>
          </div>
        </div>
        <div className="vproject-tags">
          {isEditMode ? (
            <Autocomplete
              multiple
              freeSolo
              options={interests || []}
              value={project?.tags || []}
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
                      const newTags = [...(project?.tags || [])];
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
            project?.tags?.map((tag, index) => (
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

      <TaskEditor
        open={showTaskPopup}
        onClose={() => {
          setShowTaskPopup(false);
          refreshTasks();
        }}
        projectId={projectId}
        taskForm={taskForm}
        setTaskForm={setTaskForm}
        onSubmit={async (formData) => {
          const action = formData.id ? 'update' : 'create'; 
          const result = await handleTaskAction(formData, action);
          if (!result.error) {
            await refreshTasks();
            updateLinkColors();
          }
          return result;
        }}
        skills={skills}
        isEdit={isEditMode}
        currentUser={user}
        projectCreatorId={project?.creator_id}
        isReviewer={allTasks[taskForm?.id]?.reviewer_ids?.includes(Number(userId))}
      />

      <div className="legend">
        <div>
          <span style={{ color: "#FF69B4" }}>● </span>Pink indicates a completed
          task
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
      {showCommunityProposalPopup && (
        <div className="cyber-modal-overlay">
          <div className="cyber-modal">
            <div className="cyber-border">
              <h3 className="cyber-title">Submit to Community</h3>
              <div className="cyber-content">
                <p>Select a community to submit this project to:</p>

                <Autocomplete
                  options={userCommunities}
                  getOptionLabel={(option) => option.name}
                  onChange={(event, newValue) => setSelectedCommunity(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Community"
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
                    onClick={() => setShowCommunityProposalPopup(false)}
                    className="cyber-button cancel"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitCommunityProposal}
                    className="cyber-button"
                    disabled={!selectedCommunity}
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

export default ProjectVisualizer;
