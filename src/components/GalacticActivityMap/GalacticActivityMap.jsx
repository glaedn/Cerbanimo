import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import "./GalacticActivityMap.css";
import { useAuth0 } from "@auth0/auth0-react";
import axios from "axios";

// Performance Note:
// MAP_WIDTH and MAP_HEIGHT are calculated once on component load.
// For a dynamically resizing map, consider using useState and useEffect with a ResizeObserver
// to update these dimensions and trigger a re-render/re-layout.
const MAP_WIDTH = window.innerWidth * 0.9;
const MAP_HEIGHT = window.innerHeight * 0.8;

const GalacticActivityMap = () => {
  const d3Container = useRef(null);
  const tooltipRef = useRef(null);
  const [starData, setStarData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { getAccessTokenSilently } = useAuth0();
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
            audience: "http://localhost:4000",
            scope: "openid profile email",
          },
          cacheMode: "off",
        });
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const [tasksRes, projectsRes, communitiesRes] = await Promise.all([
          axios.get("http://localhost:4000/tasks", config),
          axios.get("http://localhost:4000/projects", config),
          axios.get("http://localhost:4000/communities", config),
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
        .attr("preserveAspectRatio", "xMidYMid meet")
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
        x: Math.random() * MAP_WIDTH,
        y: Math.random() * MAP_HEIGHT,
      })); // Important: simulation is stopped after ticks.

      const stars = svg
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

        
      const tooltip = d3.select(tooltipRef.current);

      stars
        .on("mouseover", (event, d) => {
          tooltip.transition().duration(200).style("opacity", 0.9);
          tooltip
            .html(`
              <div class="tooltip-name">${d.name} (${d.type})</div>
              <div class="tooltip-status">Status: ${d.status}</div>
              <div class="tooltip-activity">Last Active: ${new Date(
                d.lastActivity
              ).toLocaleDateString()}</div>
              <div class="tooltip-contributors">Contributors: ${d.contributors}</div>
            `)
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 28 + "px");
        })
        .on("mouseout", () => {
          tooltip.transition().duration(500).style("opacity", 0);
        });

      // Performance Note: Pulsing animations.
      // Applying to all 'active'/'urgent' stars. If this becomes too many,
      // consider limiting the number of simultaneously pulsing stars or simplifying the animation.
      // D3 transitions are generally efficient for this.
      stars.each(function (d) {
        const starElement = d3.select(this);
        const status = d.status.toLowerCase();
        if (status.startsWith("active") || status.includes("urgent")) {
          pulse(starElement, getStarRadius(d));
        }
      });

      function pulse(element, originalRadius) {
        function repeat() {
          element
            .transition()
            .duration(1000)
            .attr("r", originalRadius * 1.3)
            .transition()
            .duration(1000)
            .attr("r", originalRadius)
            .on("end", repeat);
        }
        repeat();
      }

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
  
  }, [starData, isLoading, error]); // Removed MAP_WIDTH, MAP_HEIGHT from deps as they are module-level constants

  if (isLoading) {
    return (
      <div className="galactic-activity-map-container">
        <h1>Galactic Activity Map</h1>
        <p>Loading celestial data...</p>
      </div>
    );
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
          width: MAP_WIDTH,
          height: MAP_HEIGHT,
          position: "relative",
          margin: "0 auto",
        }}
      >
        {/* SVG is managed by D3 inside this div */}
      </div>
      <div
        ref={tooltipRef}
        className="galactic-tooltip"
        style={{ opacity: 0 }}
      ></div>
    </div>
  );
};

export default GalacticActivityMap;
