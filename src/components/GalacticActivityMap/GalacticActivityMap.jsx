import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import "./GalacticActivityMap.css";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate, useLocation } from 'react-router-dom';
import axios from "axios";
import { useCrisis } from "../../context/CrisisContext";
import { useUserProfile } from "../../hooks/useUserProfile";
import { useIsMobile } from "../../hooks/useIsMobile";

// Performance Note:
// MAP_WIDTH and MAP_HEIGHT are calculated once on component load.
// For a dynamically resizing map, consider using useState and useEffect with a ResizeObserver
// to update these dimensions and trigger a re-render/re-layout.

const GalacticActivityMap = ({ showLoadingText = true, enableTooltips = true, enableClicks = true }) => {
  const d3Container = useRef(null);
  const { isCrisisMode } = useCrisis();
  const { profile } = useUserProfile();
  const isMobile = useIsMobile();
  const location = useLocation();
  const isFullscreenMobile = location.pathname === '/activity-map';

  // const tooltipRef = useRef(null); // Removed: Tooltip will be managed by D3 and appended to body
  const [starData, setStarData] = useState([]);
  const [links, setLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  // Helper functions (getStarColor, getStarRadius, getStarBrightness)
  // Performance Note: These functions are called per star during rendering or updates.
  // They are currently simple and efficient. Avoid complex computations here if possible,
  // or memoize if they become bottlenecks with very large datasets.
  const getStarColor = (item) => {
    if (item.type === "need") return "#ff00ff"; // Magenta for needs
    if (item.type === "resource") return "#00ffff"; // Cyan for resources
    const status = item.status.toLowerCase();
    if (status.includes("urgent") || status.includes("critical")) return "#ff0000"; // Red
    if (status.includes("completed") || status.includes("archived"))
      return "#ff69b4"; // Pink
    if (status.includes("submitted")) return "#ffa500"; // Orange
    if (status.startsWith("active")) return "#00ff00"; // Green
    if (status.includes("inactive")) return "#00bfff"; // Blue
    return "#ffffff"; // Default white
  };

  const getStarRadius = (item) => {
    const now = new Date();
    const ageDays = (now - new Date(item.lastActivity)) / (1000 * 60 * 60 * 24);
    let baseRadius =
      item.type === "task" ? 0.5 : item.type === "project" ? 1 : 1.75; // downscaled
    if (item.status.toLowerCase().includes("urgent")) baseRadius *= 1.3;
    const ageScale = Math.max(0.4, 1 - ageDays / 60);
    let radius = baseRadius * ageScale + Math.min(item.contributors / 8, 1);
    if (isFullscreenMobile) radius *= 3;
    return radius;
  };

  const getStarBrightness = (item) => {
    const now = new Date();
    const diffDays =
      (now - new Date(item.lastActivity)) / (1000 * 60 * 60 * 24);
    return Math.max(0.15, 1 - diffDays / 30); // Fade to 0.15 over 30 days
  };
  // useEffect for fetching data (remains the same)
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let token = null;
        try {
          token = await getAccessTokenSilently({
            authorizationParams: {
              audience: `${import.meta.env.VITE_BACKEND_URL}`,
              scope: "openid profile email",
            },
            cacheMode: "off",
          });
        } catch (authErr) {
          console.warn("Auth token fetch failed, proceeding with public access:", authErr.message);
        }

        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        const fetchWithFallback = async (url) => {
          try {
            const res = await axios.get(url, config);
            return res.data;
          } catch (e) {
            console.warn(`Failed to fetch ${url}, using empty array fallback`, e);
            return [];
          }
        };

        const [tasksData, projectsData, communitiesRaw, needsData, resourcesData] = await Promise.all([
          fetchWithFallback(`${import.meta.env.VITE_BACKEND_URL}/tasks`),
          fetchWithFallback(`${import.meta.env.VITE_BACKEND_URL}/projects`),
          fetchWithFallback(`${import.meta.env.VITE_BACKEND_URL}/communities`),
          fetchWithFallback(`${import.meta.env.VITE_BACKEND_URL}/needs`),
          fetchWithFallback(`${import.meta.env.VITE_BACKEND_URL}/resources/catalog`),
        ]);
        const processedData = [];
        const tasks = Array.isArray(tasksData) ? tasksData : [];
        const projects = Array.isArray(projectsData) ? projectsData : [];
        const needs = Array.isArray(needsData) ? needsData : [];
        const resources = Array.isArray(resourcesData) ? resourcesData : [];

        const needsBoardProject = projects.find(p => p.name === 'Needs Board');

        // 1. Communities
        const communities = communitiesRaw?.communities || communitiesRaw || [];
        communities.forEach((community) => {
          processedData.push({
            id: `community-${community.id}`,
            type: "community",
            name: community.name,
            status: "active",
            lastActivity: new Date(community.updated_at || community.created_at || Date.now()),
            contributors: community.members ? community.members.length : 0,
            raw_data: community,
          });
        });

        // 2. Needs
        needs.forEach((need) => {
          let parentId = null;
          if (need.requestor_community_id) {
            parentId = `community-${need.requestor_community_id}`;
          } else if (needsBoardProject) {
            parentId = `project-${needsBoardProject.id}`;
          }

          processedData.push({
            id: `need-${need.id}`,
            type: "need",
            name: need.name,
            status: need.urgency_level || need.urgency || "medium",
            lastActivity: new Date(need.updated_at || need.created_at || Date.now()),
            contributors: 0,
            parentId: parentId,
            raw_data: need,
          });
        });

        // 3. Projects
        projects.forEach((project) => {
          let projectStatus = "active";
          const projectTasks = tasks.filter(t => t.project_id === project.id);
          const urgentTasksInProject = projectTasks.filter(
            (t) => (t.status || "").toLowerCase().includes("urgent")
          );
          const activeTasksInProject = projectTasks.filter(
            (t) => (t.status || "").toLowerCase().startsWith("active")
          );

          if (urgentTasksInProject.length > 0) projectStatus = "urgent";
          else if (activeTasksInProject.length < 1) projectStatus = "inactive";

          // Hierarchy: Community -> Need -> Project
          const relatedNeed = needs.find(n => n.linked_project_id === project.id || n.project_id === project.id);
          let parentId = null;
          if (relatedNeed) {
            parentId = `need-${relatedNeed.id}`;
          } else if (project.community_id) {
            parentId = `community-${project.community_id}`;
          }

          processedData.push({
            id: `project-${project.id}`,
            type: "project",
            name: project.name,
            status: projectStatus,
            lastActivity: new Date(project.updated_at || project.created_at || Date.now()),
            contributors: project.creator_id ? 1 : 0,
            parentId: parentId,
            raw_data: project,
          });
        });

        // 4. Tasks
        tasks.forEach((task) => {
          let parentId = null;
          // Hierarchy: Project -> Task -> subtask
          // Also Needs Board -> Simple Need -> Task
          if (task.dependencies && task.dependencies.length > 0) {
            parentId = `task-${task.dependencies[0]}`;
          } else if (task.project_id) {
            if (needsBoardProject && task.project_id === needsBoardProject.id && task.related_need_id) {
              parentId = `need-${task.related_need_id}`;
            } else {
              parentId = `project-${task.project_id}`;
            }
          } else if (task.related_need_id) {
            parentId = `need-${task.related_need_id}`;
          }

          processedData.push({
            id: `task-${task.id}`,
            type: "task",
            name: task.name,
            status: task.status || "inactive",
            lastActivity: new Date(task.updated_at || task.created_at),
            contributors: task.assigned_user_ids ? task.assigned_user_ids.length : 0,
            parentId: parentId,
            raw_data: task,
          });
        });

        // 5. Resources
        resources.forEach((resource) => {
          // Hierarchy: Community -> Need -> Resource
          // User Resource (no constellation)
          let parentId = null;
          if (resource.owner_community_id) {
             const relatedNeed = needs.find(n => n.requestor_community_id === resource.owner_community_id && n.category === resource.category);
             parentId = relatedNeed ? `need-${relatedNeed.id}` : `community-${resource.owner_community_id}`;
          }

          processedData.push({
            id: `resource-${resource.id}`,
            type: "resource",
            name: resource.name,
            status: resource.status || "available",
            lastActivity: new Date(resource.updated_at || resource.created_at || Date.now()),
            contributors: 0,
            parentId: parentId,
            raw_data: resource,
          });
        });

        let filteredData = isCrisisMode
          ? processedData.filter(d =>
              (d.type === 'need' && (d.status.toLowerCase().includes('urgent') || d.status.toLowerCase().includes('critical') || d.status.toLowerCase().includes('high'))) ||
              (d.type === 'resource' && d.status.toLowerCase() === 'available') ||
              (d.type === 'task' && d.status.toLowerCase().includes('urgent'))
            )
          : processedData;

        // Task relevance filtering
        const isRelevantMode = isMobile && !isFullscreenMobile;
        if (isRelevantMode && profile) {
          const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
          const isAvailable = profile.capacity_status === 'available';
          const userSkillIds = new Set((profile.skills || []).map(s => s.id));
          const userCommunityIds = new Set(communities.filter(c => c.members?.includes(profile.id)).map(c => c.id));

          const relevantIds = new Set();

          filteredData.forEach(item => {
            let isRelevant = false;
            const createdAt = new Date(item.raw_data.created_at || item.raw_data.updated_at);
            const isRecent = createdAt > fifteenDaysAgo;

            if (item.type === 'community') {
              if (userCommunityIds.has(item.raw_data.id)) isRelevant = true;
            } else if (item.type === 'project') {
              if (userCommunityIds.has(item.raw_data.community_id)) isRelevant = true;
              if (isRecent) {
                const linkedNeed = needs.find(n => n.linked_project_id === item.raw_data.id || n.project_id === item.raw_data.id);
                if (linkedNeed) isRelevant = true;
              }
            } else if (item.type === 'task') {
              if (userSkillIds.has(item.raw_data.skill_id)) isRelevant = true;
              const project = projects.find(p => p.id === item.raw_data.project_id);
              if (project && userCommunityIds.has(project.community_id)) isRelevant = true;
              if (isRecent) {
                if (item.raw_data.related_need_id) {
                   isRelevant = true;
                } else if (project) {
                   const linkedNeed = needs.find(n => n.linked_project_id === project.id || n.project_id === project.id);
                   if (linkedNeed) isRelevant = true;
                }
              }
            } else if (item.type === 'need') {
              if (isAvailable && isRecent) isRelevant = true;
              if (userCommunityIds.has(item.raw_data.requestor_community_id)) isRelevant = true;
            } else if (item.type === 'resource') {
              if (isAvailable && isRecent) isRelevant = true;
              if (userCommunityIds.has(item.raw_data.owner_community_id)) isRelevant = true;
            }

            if (isRelevant) {
              relevantIds.add(item.id);
              // Trace up to include parents for visual consistency
              let current = item;
              while (current && current.parentId) {
                relevantIds.add(current.parentId);
                current = filteredData.find(d => d.id === current.parentId);
              }
            }
          });
          filteredData = filteredData.filter(d => relevantIds.has(d.id));
        } else if (isFullscreenMobile && profile) {
          // Keep existing fullscreen mobile filtering logic
          const relevantIds = new Set();
          filteredData.forEach(item => {
            let isRelevant = false;
            if (item.type === 'task') {
              if (item.raw_data.assigned_user_ids?.includes(profile.id)) isRelevant = true;
              if (item.raw_data.creator_id === profile.id) isRelevant = true;
            } else if (item.type === 'resource') {
              if (item.raw_data.owner_user_id === profile.id) isRelevant = true;
            } else if (item.type === 'need') {
              if (item.raw_data.requestor_user_id === profile.id) isRelevant = true;
            } else if (item.type === 'project') {
              if (item.raw_data.creator_id === profile.id) isRelevant = true;
            } else if (item.type === 'community') {
              if (item.raw_data.members?.includes(profile.id)) isRelevant = true;
            }

            if (isRelevant) {
              relevantIds.add(item.id);
              let current = item;
              while (current && current.parentId) {
                relevantIds.add(current.parentId);
                current = filteredData.find(d => d.id === current.parentId);
              }
            }
          });
          filteredData = filteredData.filter(d => relevantIds.has(d.id));
        }

        const newLinks = [];
        filteredData.forEach(item => {
          if (item.parentId && filteredData.some(d => d.id === item.parentId)) {
            newLinks.push({
              source: item.parentId,
              target: item.id
            });
          }
        });

        setLinks(newLinks);
        setStarData(filteredData);
      } catch (err) {
        setError(err.message || "Failed to fetch data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [getAccessTokenSilently, isCrisisMode, profile]);

  // useEffect for D3 rendering
  useEffect(() => {
    window.twinkleTimeoutIds = window.twinkleTimeoutIds || [];
    // --- Tooltip Management with D3 START ---
    // Remove any old tooltip managed by this instance
    d3.select("body").selectAll(".galactic-tooltip-managed-by-d3").remove();

    // Create the new tooltip attached to the body
    const tooltipD3 = d3.select("body")
      .append("div")
      .attr("class", "galactic-tooltip galactic-tooltip-managed-by-d3") // Add a specific class for removal
      .style("opacity", 0)
      .style("position", "absolute") // Crucial: ensure it's absolutely positioned
      .style("pointer-events", "none") // Crucial: ensure it doesn't intercept mouse events
      .style("z-index", 1000); // Ensure it's on top
    // --- Tooltip Management with D3 END ---

    if (d3Container.current && !isLoading && !error && starData.length > 0) {
      const { clientWidth, clientHeight } = d3Container.current;
      if (clientWidth === 0 || clientHeight === 0) return;
      setMapDimensions({ width: clientWidth, height: clientHeight });
      let svg = d3.select(d3Container.current).select("svg");

      // Clear previous content but keep the SVG if it exists
      svg.selectAll("*").remove();

      if (svg.empty()) {
        svg = d3.select(d3Container.current).append("svg");
      }

      svg
        .attr("viewBox", `0 0 ${clientWidth} ${clientHeight}`)
        .attr("preserveAspectRatio", "xMidYMin meet")
        .attr("width", "100%")
        .attr("height", "100%");

      const g = svg.append("g").attr("class", "map-content");

      // D3 Zoom implementation
      const zoom = d3.zoom()
        .scaleExtent([0.1, 5])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
        });

      svg.call(zoom);

      // Warp drive effect: start far away and zoom in
      const initialTransform = d3.zoomIdentity
        .translate(clientWidth / 2, clientHeight / 2)
        .scale(0.1)
        .translate(-clientWidth / 2, -clientHeight / 2);

      svg.call(zoom.transform, initialTransform);
      svg.transition().duration(2500).ease(d3.easeExpOut)
        .call(zoom.transform, d3.zoomIdentity);

      // Back button for mobile fullscreen (outside of zoom group)
      if (isFullscreenMobile) {
        const backBtn = svg.append("g")
          .attr("class", "back-button")
          .attr("cursor", "pointer")
          .on("click", () => navigate('/dashboard'));

        backBtn.append("rect")
          .attr("x", 20)
          .attr("y", 20)
          .attr("width", 100)
          .attr("height", 40)
          .attr("rx", 20)
          .attr("fill", "rgba(0, 243, 255, 0.2)")
          .attr("stroke", "#00f3ff");

        backBtn.append("text")
          .attr("x", 70)
          .attr("y", 45)
          .attr("text-anchor", "middle")
          .attr("fill", "#00f3ff")
          .attr("font-family", "Orbitron")
          .text("BACK");
      }

      const defs = svg.append("defs");
      const gradient = defs
        .append("radialGradient")
        .attr("id", "starGradient")
        .attr("cx", "50%")
        .attr("cy", "50%")
        .attr("r", "50%");

      gradient
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#ffffff")
        .attr("stop-opacity", 1);

      gradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#ffffff")
        .attr("stop-opacity", 0);
      // Performance Note: SVG filters can be costly.
      // The current 'glow' filter is moderate. For very large numbers of stars,
      // consider simplifying or removing the filter, or using canvas rendering.
      const filter = defs.append("filter").attr("id", "glow");
      filter
        .append("feGaussianBlur")
        .attr("stdDeviation", "3.5")
        .attr("result", "coloredBlur");
      const feMerge = filter.append("feMerge");
      feMerge.append("feMergeNode").attr("in", "coloredBlur");
      feMerge.append("feMergeNode").attr("in", "SourceGraphic");

      // Constellation Force Simulation
      // Deterministic seeded positioning
      const getSeededPos = (id, width, height) => {
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
          hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }
        const x = (Math.abs(hash) % width);
        const y = (Math.abs(hash * 13) % height);
        return { x, y };
      };

      const nodes = starData.map(d => {
        const seeded = getSeededPos(d.id, clientWidth, clientHeight);
        return {
          ...d,
          x: seeded.x,
          y: seeded.y
        };
      });

      const constellationLinks = links.map(l => ({
        source: nodes.find(n => n.id === l.source),
        target: nodes.find(n => n.id === l.target)
      })).filter(l => l.source && l.target);

      const padding = 20;
      const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(constellationLinks).id(d => d.id).distance(isFullscreenMobile ? 100 : 40).strength(1))
        .force("charge", d3.forceManyBody().strength(isFullscreenMobile ? -150 : -60))
        .force("x", d3.forceX(clientWidth / 2).strength(d => {
           let s = 0.05;
           if (d.status.toLowerCase().includes('urgent')) s += 0.15;
           const daysOld = (new Date() - new Date(d.lastActivity)) / (1000 * 60 * 60 * 24);
           if (daysOld < 15) s += 0.1;
           return s;
        }))
        .force("y", d3.forceY(clientHeight / 2).strength(d => {
           let s = 0.05;
           if (d.status.toLowerCase().includes('urgent')) s += 0.15;
           const daysOld = (new Date() - new Date(d.lastActivity)) / (1000 * 60 * 60 * 24);
           if (daysOld < 15) s += 0.1;
           return s;
        }))
        .force("collide", d3.forceCollide().radius(d => getStarRadius(d) + (isFullscreenMobile ? 40 : 20)))
        .force("box", () => {
          for (const node of nodes) {
            node.x = Math.max(-clientWidth, Math.min(clientWidth * 2, node.x));
            node.y = Math.max(-clientHeight, Math.min(clientHeight * 2, node.y));
          }
        })
        .stop();

      // Manually run simulation for a few ticks to reach stable state
      const ticks = isMobile ? 40 : 100;
      for (let i = 0; i < ticks; ++i) simulation.tick();

      // Draw constellation links
      g.selectAll(".constellation-link")
        .data(constellationLinks)
        .enter()
        .insert("line", ":first-child")
        .attr("class", "constellation-link")
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y)
        .attr("stroke", "rgba(255, 255, 255, 0.15)")
        .attr("stroke-width", 1);

      // Active help routes: draw lines between tasks and their related needs
      const routes = [];
      const tasks = nodes.filter(d => d.type === "task");
      const needsDataNodes = nodes.filter(d => d.type === "need");

      tasks.forEach(task => {
        if (task.raw_data.related_need_id) {
          const targetNeed = needsDataNodes.find(n => n.raw_data.id === task.raw_data.related_need_id);
          if (targetNeed) {
            routes.push({
              id: `route-${task.id}-${targetNeed.id}`,
              source: task,
              target: targetNeed
            });
          }
        }
      });

      g.selectAll(".help-route")
         .data(routes, d => d.id)
         .enter()
         .insert("line", ":first-child")
         .attr("class", "help-route")
         .attr("x1", d => d.source.x)
         .attr("y1", d => d.source.y)
         .attr("x2", d => d.target.x)
         .attr("y2", d => d.target.y)
         .attr("stroke", "#00ff00")
         .attr("stroke-width", 1)
         .attr("stroke-dasharray", "5,5")
         .attr("opacity", 0.5);

      const visualStars = g
        .selectAll(".star")
        .data(nodes, (d) => d.id)
        .enter()
        .append("circle")
        .attr(
          "class",
          (d) =>
            `star star-${d.type} star-status-${
              d.status.toLowerCase().split("-")[0]
            } ${(!enableTooltips && !enableClicks) ? 'view-only' : ''}`
        )
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y)
        .attr("r", (d) => getStarRadius(d))
        .attr("fill", (d) => getStarColor(d))
        .attr("opacity", (d) => getStarBrightness(d))
        .style("filter", "url(#glow)")
        .style("animation-delay", () => `${Math.random() * 3}s`);

      const tooltip = tooltipD3;

      const eventCircles = g
        .selectAll(".star-event-radius") 
        .data(nodes, (d) => d.id)
        .enter()
        .append("circle")
        .attr("class", "star-event-radius")
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y)
        .attr("r", (d) => getStarRadius(d) + (isFullscreenMobile ? 30 : 10))
        .style("fill", "transparent") 
        .style("cursor", (enableClicks && !isFullscreenMobile) ? "pointer" : "default");

      if (enableTooltips) {
        eventCircles.on("mouseover", (event, d) => {          tooltipD3.transition().duration(200).style("opacity", 0.9); // Use tooltipD3
          tooltipD3.style("transform", "translate(0px, 0px) scale(1)"); // Use tooltipD3
          tooltipD3 // Use tooltipD3
            .html(`
              <div class="tooltip-name">${d.name} (${d.type})</div>
              <div class="tooltip-status">Status: ${d.status}</div>
              <div class="tooltip-activity">Last Active: ${new Date(
                d.lastActivity
              ).toLocaleDateString()}</div>
              <div class="tooltip-contributors">Contributors: ${d.contributors}</div>
            `);

          // Adaptive positioning logic START
          const tooltipNode = tooltipD3.node(); // Use tooltipD3
          if (!tooltipNode) {
            console.error("Tooltip node not found!"); // Should not happen
            return;
          }
          const tooltipWidth = tooltipNode.offsetWidth;
          const tooltipHeight = tooltipNode.offsetHeight;
          const winWidth = window.innerWidth;
          const winHeight = window.innerHeight;


          const offsetX = 15 // Default offset X
          const offsetY = 15 // Default offset Y

          let ttLeft = event.pageX + offsetX;
          let ttTop = event.pageY + offsetY;

          const flipOffsetX = 5; // Offset when flipped to the left
          const flipOffsetY = 5; // Offset when flipped to the top (places bottom of tooltip 5px above cursor)

          // Adjust if tooltip goes off the right edge
          if (ttLeft + tooltipWidth > winWidth) {
            ttLeft = event.pageX - tooltipWidth - flipOffsetX; // Use flipOffsetX
          }

          // Adjust if tooltip goes off the bottom edge
          if (ttTop + tooltipHeight > winHeight) {
            ttTop = event.pageY - tooltipHeight - flipOffsetY; // Use flipOffsetY
          }

          // (Optional) Prevent going off left/top edges if adjustments were aggressive
          // This logic might need to use flipOffsetX/Y as well if it results in better positioning
          if (ttLeft < 0) {
            ttLeft = flipOffsetX; // Position with some padding from the left edge
          }
          if (ttTop < 0) {
            ttTop = flipOffsetY; // Position with some padding from the top edge
          }
          
          // Adaptive positioning logic END

          tooltipD3 // Use tooltipD3
            .style("left", ttLeft + "px")
            .style("top", ttTop + "px");
        });
        eventCircles.on("mouseout", () => {
          tooltipD3.transition().duration(500).style("opacity", 0); // Use tooltipD3
          tooltipD3.style("transform", "translate(-10px, -10px) scale(0.95)"); // Use tooltipD3
        });
      }

      if (enableClicks && !isFullscreenMobile) {
        eventCircles.on("click", (event, d) => {
          const [type, idOnly] = d.id.split('-'); 

          if (type === "task") {
            const projectId = d.raw_data.project_id;
            if (projectId) {
              navigate(`/visualizer/${projectId}/${idOnly}`);
            } else {
              console.error("Project ID not found for task:", d);
            }
          } else if (type === "project") {
            navigate(`/visualizer/${idOnly}/`);
          } else if (type === "community") {
            navigate(`/communityhub/${idOnly}`);
          }
        });
      }

      // Mobile Interactions
      if (isFullscreenMobile) {
        let lastTap = 0;
        let hoveredNode = null;

        const showTooltipForNode = (event, d) => {
          hoveredNode = d;
          tooltipD3.transition().duration(200).style("opacity", 0.9);
          tooltipD3.html(`
            <div class="tooltip-name">${d.name} (${d.type})</div>
            <div class="tooltip-status">Status: ${d.status}</div>
            <div class="tooltip-activity">Last Active: ${new Date(d.lastActivity).toLocaleDateString()}</div>
            <div class="tooltip-contributors">Contributors: ${d.contributors}</div>
          `);

          const tooltipNode = tooltipD3.node();
          const ttWidth = tooltipNode.offsetWidth;
          const ttHeight = tooltipNode.offsetHeight;
          const touchX = event.touches[0].pageX;
          const touchY = event.touches[0].pageY;

          let left = touchX + 20;
          let top = touchY + 20;

          if (left + ttWidth > window.innerWidth) left = touchX - ttWidth - 20;
          if (top + ttHeight > window.innerHeight) top = touchY - ttHeight - 20;

          tooltipD3.style("left", `${left}px`).style("top", `${top}px`);
        };

        const hideTooltip = () => {
          hoveredNode = null;
          tooltipD3.transition().duration(500).style("opacity", 0);
        };

        const navigateToNode = (d) => {
          const [type, idOnly] = d.id.split('-');
          if (type === "task") {
            const projectId = d.raw_data.project_id;
            if (projectId) navigate(`/visualizer/${projectId}/${idOnly}`);
          } else if (type === "project") {
            navigate(`/visualizer/${idOnly}/`);
          } else if (type === "community") {
            navigate(`/communityhub/${idOnly}`);
          }
        };

        svg.on("touchstart", (event) => {
          const currentTime = new Date().getTime();
          const tapLength = currentTime - lastTap;

          // Find if we touched a node
          const touchX = event.touches[0].clientX;
          const touchY = event.touches[0].clientY;
          const pt = svg.node().createSVGPoint();
          pt.x = touchX;
          pt.y = touchY;
          const cursorPt = pt.matrixTransform(svg.node().getScreenCTM().inverse());

          const touchedNode = nodes.find(n => {
            const dx = n.x - cursorPt.x;
            const dy = n.y - cursorPt.y;
            return Math.sqrt(dx*dx + dy*dy) < (getStarRadius(n) + 30);
          });

          if (touchedNode) {
            if (tapLength < 300 && tapLength > 0) {
              // Double tap
              navigateToNode(touchedNode);
            } else {
              // Single tap - show tooltip
              showTooltipForNode(event, touchedNode);
            }
          } else {
            hideTooltip();
          }
          lastTap = currentTime;
        });

        svg.on("touchmove", (event) => {
          const touchX = event.touches[0].clientX;
          const touchY = event.touches[0].clientY;
          const pt = svg.node().createSVGPoint();
          pt.x = touchX;
          pt.y = touchY;
          const cursorPt = pt.matrixTransform(svg.node().getScreenCTM().inverse());

          const overNode = nodes.find(n => {
            const dx = n.x - cursorPt.x;
            const dy = n.y - cursorPt.y;
            return Math.sqrt(dx*dx + dy*dy) < (getStarRadius(n) + 30);
          });

          if (overNode) {
            showTooltipForNode(event, overNode);
          } else {
            hideTooltip();
          }
        });

        svg.on("touchend", () => {
          // Keep tooltip visible or hide after delay?
          // Requirements say tap and drag allows browsing, double tap navigates.
          // Hiding on end might be too aggressive if they want to read.
        });
      }

      // Create sonar ping effect for urgent tasks and all needs
      const urgentStarsData = nodes.filter(d =>
        d.status.toLowerCase().includes("urgent") ||
        d.status.toLowerCase().includes("critical") ||
        d.type === "need"
      );

      g.selectAll(".sonar-ping-effect")
         .data(urgentStarsData, (d) => d.id) // Use urgent stars data
         .enter()
         .append("circle")
         .attr("class", "sonar-ping-effect")
         .attr("cx", (d) => d.x)
         .attr("cy", (d) => d.y)
         .attr("r", 0) // Set initial radius to 0, as per new animation's 0% state
         .attr("fill", "none") 
         .attr("stroke", (d) => getStarColor(d)) // Use star's urgent color
         .style("pointer-events", "none");

      // Performance Note: Pulsing animations.
      // Applying to all 'active'/'urgent' stars. If this becomes too many,
      // consider limiting the number of simultaneously pulsing stars or simplifying the animation.
      // D3 transitions are generally efficient for this.
      const allStarD3Elements = [];
      visualStars.each(function (d) { // Ensure this uses visualStars
        const starElement = d3.select(this);
        allStarD3Elements.push(starElement); 
      });


    } else if (d3Container.current && (isLoading || error)) {
      let svg = d3.select(d3Container.current).select("svg");
      if (!svg.empty()) {
        svg.selectAll("*").remove();
      }
    }
    // Performance Note for future:
    // If the number of stars grows into thousands, SVG might become slow.
    // Consider these options:
    // 1. Canvas Rendering: Use D3 to draw onto an HTML5 canvas. This is faster for large numbers of simple shapes.
    // 2. WebGL: For even better performance and 3D capabilities, libraries like Three.js or PixiJS.
    // 3. Aggregation/Clustering: Group distant or less important stars into larger nodes.
    // 4. Virtualization: Only render stars currently in the viewport (if panning/zooming is added).

    // Return a cleanup function for when the component unmounts
    return () => {
      // Clear D3 managed tooltip
      d3.select("body").selectAll(".galactic-tooltip-managed-by-d3").remove();

      // Clear general star twinkle interval and timeouts
      if (window.starTwinkleIntervalId) {
        clearInterval(window.starTwinkleIntervalId);
      }
      if (window.twinkleTimeoutIds) { // Check if array exists
        window.twinkleTimeoutIds.forEach(clearTimeout);
        window.twinkleTimeoutIds = []; 
      }
    };
  }, [starData, isLoading, error, navigate, enableTooltips, enableClicks]);

  if (isLoading) {
    if (showLoadingText) {
      return (
        <div className="galactic-activity-map-container">
          <h1>Galactic Activity Map</h1>
          <p>Loading celestial data...</p>
        </div>
      );
    } else {
      return null; // Or a minimal loader like <div className="galactic-activity-map-container" style={{ minHeight: '100px' }}></div>
    }
  }
  if (error) {
    return (
      <div className="galactic-activity-map-container">
        <h1>Galactic Activity Map</h1>
        <p style={{ color: "red" }}>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="galactic-activity-map-container">
      <div
        ref={d3Container}
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          // margin: "0 auto", // Removed
          boxSizing: "border-box",
        }}
      >
        {/* SVG is managed by D3 inside this div */}
      </div>
      {/* <div
        ref={tooltipRef}
        className="galactic-tooltip"
        style={{ opacity: 0 }}
      ></div> */} {/* Tooltip is now managed by D3 and appended to body */}
    </div>
  );
};

export default GalacticActivityMap;
