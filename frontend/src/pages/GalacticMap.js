import * as d3 from "d3";
import React, { useEffect, useRef, useState } from "react";

const GalacticMap = () => {
  const svgRef = useRef();
  const [zoomedGalaxy, setZoomedGalaxy] = useState(null);
  const galaxiesRef = useRef([]);

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

    // Function to rotate accretion disks
    const rotateAccretionDisk = (element) => {
      d3.select(element)
        .transition()
        .duration(70000)
        .ease(d3.easeLinear)
        .attrTween("transform", () => d3.interpolateString("rotate(0)", "rotate(360)"))
        .on("end", function () { rotateAccretionDisk(this); });
    };

    // Restore accretion disks with rotation
    const accretionDisks = [32, 35, 37, 40];
    accretionDisks.forEach((radius, index) => {
      galaxyGroup.append("circle")
        .attr("r", radius)
        .attr("fill", "none")
        .attr("stroke", "purple")
        .attr("stroke-width", index === 0 ? "3" : index === 3 ? "1" : "1")
        .attr("stroke-dasharray", `${2 + index} ${1 + index}`)
        .each(function () { rotateAccretionDisk(this); });
    });

    // Orbital paths (hidden until zoomed in)
    galaxyGroup.append("circle")
      .attr("class", "orbit-path")
      .attr("r", 75)
      .attr("fill", "none")
      .attr("stroke", "purple")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4 4")
      .style("opacity", 0); // Initially hidden

    galaxyGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".3em")
      .attr("fill", "white")
      .attr("font-size", textSize)
      .text(d => d.name);
    

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

      svg.selectAll(".orbit-path")
        .transition().duration(750)
        .style("opacity", d => d.name === zoomedGalaxy ? 1 : 0); // Show orbital path

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

      svg.selectAll(".orbit-path")
        .transition().duration(750)
        .style("opacity", 0); // Hide orbital paths when zooming out

      svg.transition()
        .duration(750)
        .attr("viewBox", `0 0 ${width} ${height}`);
    }
  }, [zoomedGalaxy]);

  return <svg ref={svgRef} />;
};

export default GalacticMap;
