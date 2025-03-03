import * as d3 from "d3";
import React, { useEffect, useRef, useState } from "react";
import { rotateElement } from "../utils/animations";
import { createSpiralPathReversed, strokeWidth } from "../utils/helpers";

const GalacticMap = () => {
  const svgRef = useRef();
  // A single state for the selected object: type ("galaxy", "star", or "planet"), id, and its data.
  const [selectedObject, setSelectedObject] = useState(null);
  const galaxiesRef = useRef([]);

  // INITIAL SETUP
  useEffect(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const separation = Math.min(width, height) * 0.3;
    const textSize = Math.min(width, height) * 0.05;

    // Define six galaxies with unique IDs and positions.
    const galaxies = [
      { id: "galaxy-0", name: "Technology", x: centerX, y: centerY - separation },
      { id: "galaxy-1", name: "Arts", x: centerX, y: centerY + separation },
      { id: "galaxy-2", name: "Heavy Mental", x: centerX - separation * Math.cos(Math.PI / 4), y: centerY + separation * Math.sin(Math.PI / 7) },
      { id: "galaxy-3", name: "Mental", x: centerX - separation * Math.cos(Math.PI / 4), y: centerY - separation * Math.sin(Math.PI / 7) },
      { id: "galaxy-4", name: "Heavy Physical", x: centerX + separation * Math.cos(Math.PI / 4), y: centerY + separation * Math.sin(Math.PI / 7) },
      { id: "galaxy-5", name: "Physical", x: centerX + separation * Math.cos(Math.PI / 4), y: centerY - separation * Math.sin(Math.PI / 7) },
    ];
    galaxiesRef.current = galaxies;

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .style("background", "black")
      .style("pointer-events", "all");

    const defs = svg.append("defs");

    // Define radial gradient for stars.
    const starGradient = defs.append("radialGradient")
      .attr("id", "starGradient");
    starGradient.append("stop")
      .attr("offset", "20%")
      .attr("stop-color", "white");
    starGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "transparent");

    // Define gradient for galaxy centers (black holes).
    const blackHoleGradient = defs.append("radialGradient")
      .attr("id", "blackHoleGradient");
    blackHoleGradient.append("stop")
      .attr("offset", "20%")
      .attr("stop-color", "black");
    blackHoleGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "darkblue");

    // Append Cerbanimo text in the center.
    svg.append("text")
      .attr("class", "cerbanimo-text")
      .attr("x", centerX)
      .attr("y", centerY)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", textSize)
      .text("Cerbanimo");

    // Render galaxy groups.
    const galaxyGroup = svg.selectAll(".galaxy")
      .data(galaxies)
      .enter()
      .append("g")
      .attr("class", "galaxy")
      .attr("data-id", d => d.id)
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .on("click", (event, d) => {
        // When nothing lower is selected, choose this galaxy.
        if (!selectedObject || selectedObject.type === "galaxy") {
          setSelectedObject({ type: "galaxy", id: d.id, data: d });
        }
      });

    galaxyGroup.append("circle")
      .attr("r", 30)
      .attr("fill", "url(#blackHoleGradient)");

    // Accretion disks.
    const accretionDisks = [32, 35, 37, 40];
    accretionDisks.forEach((radius, index) => {
      galaxyGroup.append("circle")
        .attr("class", "accretion-disk")
        .attr("r", radius)
        .attr("fill", "none")
        .attr("stroke", "purple")
        .attr("stroke-width", index === 0 ? "3" : "1")
        .attr("stroke-dasharray", `${2 + index} ${1 + index}`)
        .each(function () { rotateElement(this, 70000); });
    });

    // Spiral arms.
    galaxyGroup.each(function(d) {
      const armsGroup = d3.select(this).append("g").attr("class", "spiral-arms");
      armsGroup.selectAll(".spiral-arm")
        .data([0, 1, 2, 3, 4, 5])
        .enter()
        .append("path")
        .attr("class", "spiral-arm")
        .attr("d", armIndex => createSpiralPathReversed(0, 0, armIndex))
        .attr("fill", "none")
        .attr("stroke", "purple")
        .attr("stroke-width", (d, i) => strokeWidth(i, 100))
        .style("opacity", 0)
        .style("pointer-events", "none")
        .each(function() { rotateElement(this, 120000); });
    });

    // Global star group (6 total stars). These are initially hidden.
    const starGroup = svg.append("g").attr("class", "global-star-group");
    const numStars = 6;
    const starOrbitRadius = 100;
    const starRadius = 25;
    const stars = d3.range(numStars).map(i => {
      const angle = (2 * Math.PI * i) / numStars;
      return {
        id: `star-${i}`,
        x: centerX + starOrbitRadius * Math.cos(angle),
        y: centerY + starOrbitRadius * Math.sin(angle)
      };
    });
    starGroup.selectAll("circle")
      .data(stars)
      .enter()
      .append("circle")
      .attr("class", "global-star")
      .attr("data-id", d => d.id)
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", starRadius)
      .attr("fill", "url(#starGradient)")
      .style("opacity", 0)
      .on("click", (event, d) => {
        setSelectedObject({ type: "star", id: d.id, data: d });
      });

    // Global planet group (6 total planets). Initially hidden.
    const planetGroup = svg.append("g").attr("class", "global-planet-group");
    const numPlanets = 6;
    const planetOrbitRadius = 50;
    const planetRadius = 15;
    const planets = d3.range(numPlanets).map(i => {
      const angle = (2 * Math.PI * i) / numPlanets;
      return {
        id: `planet-${i}`,
        x: planetOrbitRadius * Math.cos(angle),
        y: planetOrbitRadius * Math.sin(angle)
      };
    });
    planetGroup.selectAll("circle")
      .data(planets)
      .enter()
      .append("circle")
      .attr("class", "global-planet")
      .attr("data-id", d => d.id)
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", planetRadius)
      .attr("fill", () => (Math.random() > 0.5 ? "blue" : "green"))
      .style("opacity", 0)
      .on("click", (event, d) => {
        setSelectedObject({ type: "planet", id: d.id, data: d });
      });
  }, []);
  
  // UPDATE: Center selected object and hide others via viewBox transition.
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (selectedObject) {
      // Center on the selected object's coordinates.
      const targetX = selectedObject.data.x;
      const targetY = selectedObject.data.y;
      svg.transition()
        .duration(750)
        .attr("viewBox", `${targetX - width/4} ${targetY - height/4} ${width/2} ${height/2}`);
    } else {
      svg.transition()
        .duration(750)
        .attr("viewBox", `0 0 ${width} ${height}`);
    }
  }, [selectedObject]);
  
  // UPDATE: Show/hide layers based on selected object type.
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (selectedObject) {
      if (selectedObject.type === "galaxy") {
        svg.selectAll(".global-star").transition().duration(750).style("opacity", 1);
        svg.selectAll(".global-planet").transition().duration(750).style("opacity", 0);
      } else if (selectedObject.type === "star") {
        svg.selectAll(".global-star").transition().duration(750).style("opacity", d => d.id === selectedObject.id ? 1 : 0);
        svg.selectAll(".global-planet").transition().duration(750).style("opacity", 1);
      } else if (selectedObject.type === "planet") {
        svg.selectAll(".global-planet").transition().duration(750).style("opacity", d => d.id === selectedObject.id ? 1 : 0);
      }
    } else {
      svg.selectAll(".global-star").transition().duration(750).style("opacity", 0);
      svg.selectAll(".global-planet").transition().duration(750).style("opacity", 0);
    }
  }, [selectedObject]);
  
  return <svg ref={svgRef} />;
};

export default GalacticMap;
