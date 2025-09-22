import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import "./GalacticActivityMap.css";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from 'react-router-dom';
import axios from "axios";
import theme from '../../../styles/theme';

const GalacticActivityMap = ({ showLoadingText = true, enableTooltips = true, enableClicks = true }) => {
  const d3Container = useRef(null);
  const [starData, setStarData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });

  const getStarColor = (item) => {
    const status = item.status.toLowerCase();
    if (status.includes("urgent")) return "#ff0000";
    if (status.includes("completed") || status.includes("archived"))
      return "#ff69b4";
    if (status.includes("submitted")) return "#ffa500";
    if (status.startsWith("active")) return "#00ff00";
    if (status.includes("inactive")) return "#00bfff";
    return "#ffffff";
  };

  const getStarRadius = (item) => {
    const now = new Date();
    const ageDays = (now - new Date(item.lastActivity)) / (1000 * 60 * 60 * 24);
    let baseRadius =
      item.type === "task" ? 0.5 : item.type === "project" ? 1 : 1.75;
    if (item.status.toLowerCase().includes("urgent")) baseRadius *= 1.3;
    const ageScale = Math.max(0.4, 1 - ageDays / 60);
    return baseRadius * ageScale + Math.min(item.contributors / 8, 1);
  };

  const getStarBrightness = (item) => {
    const now = new Date();
    const diffDays =
      (now - new Date(item.lastActivity)) / (1000 * 60 * 60 * 24);
    return Math.max(0.15, 1 - diffDays / 30);
  };
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
        console.log(`${theme.terminology.task_plural}:`, tasksRes.data);
        console.log(`${theme.terminology.project_plural}:`, projectsRes.data);
        console.log(`${theme.terminology.community_plural}:`, communitiesRes.data);
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

  useEffect(() => {
    window.twinkleTimeoutIds = window.twinkleTimeoutIds || [];
    d3.select("body").selectAll(".galactic-tooltip-managed-by-d3").remove();

    const tooltipD3 = d3.select("body")
      .append("div")
      .attr("class", "galactic-tooltip galactic-tooltip-managed-by-d3")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("z-index", 1000);

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
      const filter = defs.append("filter").attr("id", "glow");
      filter
        .append("feGaussianBlur")
        .attr("stdDeviation", "3.5")
        .attr("result", "coloredBlur");
      const feMerge = filter.append("feMerge");
      feMerge.append("feMergeNode").attr("in", "coloredBlur");
      feMerge.append("feMergeNode").attr("in", "SourceGraphic");

      const randomizedStarData = starData.map((d) => ({
        ...d,
        x: Math.random() * clientWidth,
        y: Math.random() * clientHeight,
      }));

      const visualStars = svg
        .selectAll(".star")
        .data(randomizedStarData, (d) => d.id)
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

      const tooltip = tooltipD3;

      const eventCircles = svg
        .selectAll(".star-event-radius") 
        .data(randomizedStarData, (d) => d.id)
        .enter()
        .append("circle")
        .attr("class", "star-event-radius")
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y)
        .attr("r", (d) => getStarRadius(d) + 10)
        .style("fill", "transparent") 
        .style("cursor", enableClicks ? "pointer" : "default");

      if (enableTooltips) {
        eventCircles.on("mouseover", (event, d) => {          tooltipD3.transition().duration(200).style("opacity", 0.9);
          tooltipD3.style("transform", "translate(0px, 0px) scale(1)");
          tooltipD3
            .html(`
              <div class="tooltip-name">${d.name} (${d.type})</div>
              <div class="tooltip-status">Status: ${d.status}</div>
              <div class="tooltip-activity">Last Active: ${new Date(
                d.lastActivity
              ).toLocaleDateString()}</div>
              <div class="tooltip-contributors">Contributors: ${d.contributors}</div>
            `);

          const tooltipNode = tooltipD3.node();
          if (!tooltipNode) {
            console.error("Tooltip node not found!");
            return;
          }
          const tooltipWidth = tooltipNode.offsetWidth;
          const tooltipHeight = tooltipNode.offsetHeight;
          const winWidth = window.innerWidth;
          const winHeight = window.innerHeight;


          const offsetX = 15
          const offsetY = 15

          let ttLeft = event.pageX + offsetX;
          let ttTop = event.pageY + offsetY;

          const flipOffsetX = 5;
          const flipOffsetY = 5;

          if (ttLeft + tooltipWidth > winWidth) {
            ttLeft = event.pageX - tooltipWidth - flipOffsetX;
          }

          if (ttTop + tooltipHeight > winHeight) {
            ttTop = event.pageY - tooltipHeight - flipOffsetY;
          }

          if (ttLeft < 0) {
            ttLeft = flipOffsetX;
          }
          if (ttTop < 0) {
            ttTop = flipOffsetY;
          }
          

          tooltipD3
            .style("left", ttLeft + "px")
            .style("top", ttTop + "px");
        });
        eventCircles.on("mouseout", () => {
          tooltipD3.transition().duration(500).style("opacity", 0);
          tooltipD3.style("transform", "translate(-10px, -10px) scale(0.95)");
        });
      }

      if (enableClicks) {
        eventCircles.on("click", (event, d) => {
          const [type, idOnly] = d.id.split('-'); 

          if (type === "task") {
            const projectId = d.raw_data.project_id;
            if (projectId) {
              navigate(`/intention-visualizer/${projectId}/${idOnly}`);
            } else {
              console.error(`${theme.terminology.project} ID not found for ${theme.terminology.task}:`, d);
            }
          } else if (type === "project") {
            navigate(`/intention-visualizer/${idOnly}/`);
          } else if (type === "community") {
            navigate(`/communityhub/${idOnly}`);
          }
        });

      const urgentStarsData = randomizedStarData.filter(d => d.status.toLowerCase().includes("urgent"));

      svg.selectAll(".sonar-ping-effect")
         .data(urgentStarsData, (d) => d.id)
         .enter()
         .append("circle")
         .attr("class", "sonar-ping-effect")
         .attr("cx", (d) => d.x)
         .attr("cy", (d) => d.y)
         .attr("r", 0)
         .attr("fill", "none") 
         .attr("stroke", (d) => getStarColor(d))
         .style("pointer-events", "none");

      const allStarD3Elements = [];
      visualStars.each(function (d) {
        const starElement = d3.select(this);
        allStarD3Elements.push(starElement); 
      });


    } else if (d3Container.current && (isLoading || error)) {
      let svg = d3.select(d3Container.current).select("svg");
      if (!svg.empty()) {
        svg.selectAll("*").remove();
      }
    }
    return () => {
      d3.select("body").selectAll(".galactic-tooltip-managed-by-d3").remove();

      if (window.starTwinkleIntervalId) {
        clearInterval(window.starTwinkleIntervalId);
      }
      if (window.twinkleTimeoutIds) {
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
      return null;
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
          boxSizing: "border-box",
        }}
      >
      </div>
    </div>
  );
};

export default GalacticActivityMap;
