import * as d3 from "d3";
import React, { useEffect, useRef, useState } from "react";

const GalacticMap = () => {
  const svgRef = useRef();
  const [zoomedGalaxy, setZoomedGalaxy] = useState(null);
  const galaxiesRef = useRef([]);

  // Add drag-related refs
  const isDragging = useRef(false);
  const dragStartAngle = useRef(0);
  const currentRotation = useRef(0);
  const rotationMultiplier = useRef(-2); // Increase this number for faster rotation

  useEffect(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const separation = Math.min(width, height) * 0.3;
    const textSize = Math.min(width, height) * 0.05;

    const galaxies = [
      { name: "Technology", x: centerX, y: centerY - separation },
      { name: "Arts", x: centerX, y: centerY + separation },
      { name: "Heavy Mental", x: centerX - separation * Math.cos(Math.PI / 4), y: centerY + separation * Math.sin(Math.PI / 7) },
      { name: "Mental", x: centerX - separation * Math.cos(Math.PI / 4), y: centerY - separation * Math.sin(Math.PI / 7) },
      { name: "Heavy Physical", x: centerX + separation * Math.cos(Math.PI / 4), y: centerY + separation * Math.sin(Math.PI / 7) },
      { name: "Physical", x: centerX + separation * Math.cos(Math.PI / 4), y: centerY - separation * Math.sin(Math.PI / 7) },
    ];
    galaxiesRef.current = galaxies;

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .style("background", "black");

    const defs = svg.append("defs");

    // Define radial gradient for stars
    const starGradient = defs.append("radialGradient")
      .attr("id", "starGradient");
    starGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "white");
    starGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "transparent");  
    
    const gradient = defs.append("radialGradient")
      .attr("id", "blackHoleGradient");
    gradient.append("stop")
      .attr("offset", "20%")
      .attr("stop-color", "black");
    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "darkblue");

    svg.append("text")
      .attr("class", "cerbanimo-text")
      .attr("x", centerX)
      .attr("y", centerY)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", textSize)
      .text("Cerbanimo");

    const galaxyGroup = svg.selectAll(".galaxy")
      .data(galaxies)
      .enter().append("g")
      .attr("class", "galaxy")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .on("click", (event, d) => setZoomedGalaxy(current => current === d.name ? null : d.name));

    galaxyGroup.append("circle")
      .attr("r", 30)
      .attr("fill", "url(#blackHoleGradient)");

    // Function to rotate elements infinitely
    const rotateElement = (element, duration = 70000) => {
      d3.select(element)
        .transition()
        .duration(duration)
        .ease(d3.easeLinear)
        .attrTween("transform", () => d3.interpolateString("rotate(0)", "rotate(360)"))
        .on("end", function () { rotateElement(this, duration); });
    };

    // Create separate group for rotatable elements
    const orbitGroup = galaxyGroup.append("g")
      .attr("class", "orbit-group");

    // Accretion disks
    const accretionDisks = [32, 35, 37, 40];
    accretionDisks.forEach((radius, index) => {
      galaxyGroup.append("circle")
        .attr("r", radius)
        .attr("fill", "none")
        .attr("stroke", "purple")
        .attr("stroke-width", index === 0 ? "3" : index === 3 ? "1" : "1")
        .attr("stroke-dasharray", `${2 + index} ${1 + index}`)
        .each(function () { rotateElement(this); });
    });

    // Orbital paths (hidden until zoomed in)
    orbitGroup.append("circle")
      .attr("class", "orbit-path")
      .attr("r", 75)
      .attr("fill", "none")
      .attr("stroke", "grey")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4 4")
      .style("opacity", 0);

    // Stars (hidden until zoomed in)
    const numStars = 8;
    const starRadius = 10;

    const stars = orbitGroup.selectAll(".star")
      .data(d => {
        const angleStep = (2 * Math.PI) / numStars;
        return Array.from({ length: numStars }, (_, i) => {
          const angle = i * angleStep;
          return {
            x: Math.cos(angle) * 75, 
            y: Math.sin(angle) * 75,
          };
        });
      })
      .enter()
      .append("circle")
      .attr("class", "star")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", starRadius)
      .attr("fill", "url(#starGradient)")
      .style("opacity", 0);
    
      // stars.each(function () { rotateElement(this, 90000); });

    galaxyGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".3em")
      .attr("fill", "white")
      .attr("font-size", textSize)
      .text(d => d.name);

      const drag = d3.drag()
      .on("start", (event, d) => {
        isDragging.current = true;
        const [x, y] = d3.pointer(event, this);
        dragStartAngle.current = Math.atan2(y - d.y, x - d.x) - currentRotation.current;
      })
      .on("drag", (event, d) => {
        if (isDragging.current) {
          const [x, y] = d3.pointer(event, this);
          const angle = (Math.atan2(y - d.y, x - d.x) - dragStartAngle.current) * rotationMultiplier.current;
          currentRotation.current = angle;
          orbitGroup.attr("transform", `rotate(${angle * (180 / Math.PI)})`);
        }
      })
      .on("end", () => {
        isDragging.current = false;
      });

    orbitGroup.call(drag);

  }, []);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (zoomedGalaxy) {
      const galaxy = galaxiesRef.current.find(g => g.name === zoomedGalaxy);
      if (!galaxy) return;

      svg.select(".cerbanimo-text").transition().duration(750).style("opacity", 0);

      const scaleFactor = 10;
      galaxiesRef.current.forEach(g => {
        if (g.name !== zoomedGalaxy) {
          g.targetX = galaxy.x + (g.x - galaxy.x) * scaleFactor;
          g.targetY = galaxy.y + (g.y - galaxy.y) * scaleFactor;
        }
      });

      svg.selectAll(".galaxy")
        .transition().duration(750)
        .attr("transform", d => d.name === zoomedGalaxy
          ? `translate(${galaxy.x},${galaxy.y})`
          : `translate(${d.targetX},${d.targetY})`
        )
        .style("opacity", d => d.name === zoomedGalaxy ? 1 : 0);

      svg.selectAll(".orbit-path, .star")
        .transition().duration(750)
        .style("opacity", 1);

      const viewBoxHeight = 200;
      const viewBoxWidth = viewBoxHeight / 2;
      const paddingX = viewBoxWidth * 0.2;
      const paddingY = viewBoxHeight * 0.1;

      svg.transition()
        .duration(750)
        .attr("viewBox", [
          galaxy.x - paddingX,
          galaxy.y - viewBoxHeight + paddingY,
          viewBoxWidth,
          viewBoxHeight
        ].join(" "));

    } else {
      svg.selectAll(".galaxy")
        .transition().duration(750)
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .style("opacity", 1);

      svg.select(".cerbanimo-text")
        .transition().duration(750)
        .style("opacity", 1);

      svg.selectAll(".orbit-path, .star")
        .transition().duration(750)
        .style("opacity", 0);

      svg.transition()
        .duration(750)
        .attr("viewBox", `0 0 ${width} ${height}`);
    }
  }, [zoomedGalaxy]);

  return <svg ref={svgRef} />;
};

export default GalacticMap;
