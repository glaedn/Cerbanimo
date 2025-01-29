import * as d3 from "d3";
import React, { useEffect, useRef, useState } from "react";

const GalacticMap = () => {
  const svgRef = useRef();
  const [zoomedGalaxy, setZoomedGalaxy] = useState(null);

  useEffect(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const centerX = width / 2;
    const centerY = height / 2;

    // Adjust separation distance relative to screen size
    const separation = Math.min(width, height) * 0.3;

    // Adjust text size relative to screen size
    const textSize = Math.min(width, height) * 0.05;

    // Hexagonal layout positions (120-degree angles)
    const galaxies = [
      { name: "Alpha", x: centerX, y: centerY - separation }, // Top
      { name: "Beta", x: centerX, y: centerY + separation }, // Bottom
      { name: "Delta", x: centerX - separation * Math.cos(Math.PI / 4), y: centerY + separation * Math.sin(Math.PI / 7) }, // Left-Down
      { name: "Epsilon", x: centerX - separation * Math.cos(Math.PI / 4), y: centerY - separation * Math.sin(Math.PI / 7) }, // Left-Up
      { name: "Gamma", x: centerX + separation * Math.cos(Math.PI / 4), y: centerY + separation * Math.sin(Math.PI / 7) }, // Right-Down
      { name: "Zeta", x: centerX + separation * Math.cos(Math.PI / 4), y: centerY - separation * Math.sin(Math.PI / 7) }, // Right-Up
    ];

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .style("background", "black");

    // Add Cerbanimo text in center
    const cerbanimoText = svg.append("text")
      .attr("x", centerX)
      .attr("y", centerY)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", textSize)
      .text("Cerbanimo");

    const galaxyGroup = svg.selectAll(".galaxy")
      .data(galaxies)
      .enter()
      .append("g")
      .attr("class", "galaxy")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .on("click", (event, d) => {
        if (zoomedGalaxy === d.name) {
          resetZoom();
        } else {
          zoomToGalaxy(d);
        }
      });

    galaxyGroup.append("circle")
      .attr("r", 50)
      .attr("fill", "blue");

    galaxyGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".3em")
      .attr("fill", "white")
      .attr("font-size", textSize)
      .text(d => d.name);

      function zoomToGalaxy(galaxy) {
        setZoomedGalaxy(galaxy.name);
      
        // Fade out all galaxies except the selected one
        galaxyGroup.transition()
          .duration(750)
          .style("opacity", d => d.name === galaxy.name ? 1 : 0.1); // Fade unselected galaxies
      
        // Fade out Cerbanimo text
        cerbanimoText.transition()
          .duration(750) // Smooth transition duration
          .style("opacity", 0); // Fade out Cerbanimo text
      
        // Only show the zoomed-in galaxy
        d3.selectAll(`.galaxy.${galaxy.name}`).style("opacity", 1);
      
        // Lock zoom to bottom-left corner, smooth transition
        const zoomWidth = 200; // Width of the zoomed-in area
        const zoomHeight = 200; // Height of the zoomed-in area
      
        // Calculate the offset for bottom-left anchor point
        const offsetX = Math.max(galaxy.x - zoomWidth * 0.1, 0); // Prevent galaxy from being off-screen
        const offsetY = Math.max(galaxy.y - zoomHeight - 30, 0); // Prevent galaxy from being off-screen
      
        // Smooth viewBox transition for zoom
        svg.transition()
          .duration(750)  // Transition duration
          .ease(d3.easeCubicInOut) // Smooth easing for zoom
          .attr("viewBox", `${offsetX} ${offsetY} ${zoomWidth} ${zoomHeight}`);
      }
      
      
      
      
      
      

    function resetZoom() {
      setZoomedGalaxy(null);

      // Show all galaxies and Cerbanimo text again
      galaxyGroup.transition().duration(750).style("opacity", 1);
      cerbanimoText.transition().duration(750).style("opacity", 1);

      // Reset zoom
      svg.transition()
        .duration(750)
        .ease(d3.easeCubicInOut)
        .attr("viewBox", `0 0 ${width} ${height}`);
    }
  }, [zoomedGalaxy]);

  return <svg ref={svgRef}></svg>;
};

export default GalacticMap;
