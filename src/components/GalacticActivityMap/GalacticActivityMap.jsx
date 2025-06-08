import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import "./GalacticActivityMap.css";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from 'react-router-dom';
import axios from "axios";

// Performance Note:
// MAP_WIDTH and MAP_HEIGHT are calculated once on component load.
// For a dynamically resizing map, consider using useState and useEffect with a ResizeObserver
// to update these dimensions and trigger a re-render/re-layout.

const GalacticActivityMap = ({ showLoadingText = true, enableTooltips = true, enableClicks = true }) => {
  const d3Container = useRef(null);
  // const tooltipRef = useRef(null); // Removed: Tooltip will be managed by D3 and appended to body
  const [starData, setStarData] = useState([]);
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
    const status = item.status.toLowerCase();
    if (status.includes("urgent")) return "#ff0000"; // Red
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
    return baseRadius * ageScale + Math.min(item.contributors / 8, 1); // also scaled
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
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: `${import.meta.env.VITE_BACKEND_URL}`,
            scope: "openid profile email",
          },
          cacheMode: "off",
        });
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const [tasksRes, projectsRes, communitiesRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks`, config),
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/projects`, config),
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities`, config),
        ]);
        const processedData = [];
        console.log("Tasks:", tasksRes.data);
        console.log("Projects:", projectsRes.data);
        console.log("Communities:", communitiesRes.data);
        tasksRes.data.forEach((task) => {
          processedData.push({
            id: `task-${task.id}`,
            type: "task",
            name: task.name,
            status: task.status || "inactive",
            lastActivity: new Date(task.updated_at || task.created_at),
            contributors: task.assigned_user_ids
              ? task.assigned_user_ids.length
              : 0,
            raw_data: task,
          });
        });

        projectsRes.data.forEach((project) => {
          let projectStatus = "active";
          const urgentTasksInProject = tasksRes.data.filter(
            (t) =>
              `project-${t.project_id}` === `project-${project.id}` &&
              (t.status || "").toLowerCase().includes("urgent")
          );
          const activeTasksInProject = tasksRes.data.filter(
            (t) =>
              `project-${t.project_id}` === `project-${project.id}` &&
              (t.status || "").toLowerCase().startsWith("active")
          );

          if (urgentTasksInProject.length > 0) projectStatus = "urgent";
          else if (activeTasksInProject.length < 1) projectStatus = "inactive";

          processedData.push({
            id: `project-${project.id}`,
            type: "project",
            name: project.name,
            status: projectStatus,
            lastActivity: new Date(
              project.updated_at || project.created_at || Date.now()
            ),
            contributors: project.creator_id ? 1 : 0,
            raw_data: project,
          });
        });
        const communities =
          communitiesRes.data.communities || communitiesRes.data;
        communities.forEach((community) => {
          processedData.push({
            id: `community-${community.id}`,
            type: "community",
            name: community.name,
            status: "active",
            lastActivity: new Date(
              community.updated_at || community.created_at || Date.now()
            ),
            contributors: community.members ? community.members.length : 0,
            raw_data: community,
          });
        });
        setStarData(processedData);
      } catch (err) {
        setError(err.message || "Failed to fetch data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

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
      setMapDimensions({ width: clientWidth, height: clientHeight });
      let svg = d3.select(d3Container.current).select("svg");
      svg.selectAll("*").remove();

      if (svg.empty()) {
        svg = d3.select(d3Container.current).append("svg");
      }

      svg
        .attr("viewBox", `0 0 ${clientWidth} ${clientHeight}`)
        .attr("preserveAspectRatio", "xMidYMin meet")
        .attr("width", "100%")
        .attr("height", "100%");

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

      // Performance Note: Force simulation is run once per data update.
      // Running it for a fixed number of ticks (e.g., 150) is efficient for static layouts.
      // Avoid running the simulation continuously if not needed.
      const randomizedStarData = starData.map((d) => ({
        ...d,
        x: Math.random() * clientWidth,
        y: Math.random() * clientHeight,
      })); // Important: simulation is stopped after ticks.

      const visualStars = svg
        .selectAll(".star")
        .data(randomizedStarData, (d) => d.id) // Keying data by d.id is good for object constancy.
        .enter()
        .append("circle")
        .attr(
          "class",
          (d) =>
            `star star-${d.type} star-status-${
              d.status.toLowerCase().split("-")[0]
            }`
        )
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y)
        .attr("r", (d) => getStarRadius(d))
        .attr("fill", "url(#starGradient)")
        .attr("fill", (d) => getStarColor(d))
        .attr("opacity", (d) => getStarBrightness(d))
        .style("filter", "url(#glow)")
        .style("animation-delay", () => `${Math.random() * 3}s`);

      // const tooltip = d3.select(tooltipRef.current); // Replaced by tooltipD3
      const tooltip = tooltipD3; // Use the D3 managed tooltip

      const eventCircles = svg
        .selectAll(".star-event-radius") 
        .data(randomizedStarData, (d) => d.id)
        .enter()
        .append("circle")
        .attr("class", "star-event-radius")
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y)
        .attr("r", (d) => getStarRadius(d) + 10) // Increased radius
        .style("fill", "transparent") 
        .style("cursor", enableClicks ? "pointer" : "default"); // Conditional cursor

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

      if (enableClicks) {
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

      // Create sonar ping effect for urgent tasks
      const urgentStarsData = randomizedStarData.filter(d => d.status.toLowerCase().includes("urgent"));

      svg.selectAll(".sonar-ping-effect")
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
  }}, [starData, isLoading, error, navigate, enableTooltips, enableClicks]);

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
