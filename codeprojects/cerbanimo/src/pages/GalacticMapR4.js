import * as d3 from "d3";
import React, { useEffect, useRef, useState } from "react";
import { rotateElement } from "../utils/animations";
import { createSpiralPathReversed, strokeWidth } from "../utils/helpers";

const GalacticMap = () => {
  const svgRef = useRef();
  const [selectedGalaxy, setSelectedGalaxy] = useState(null);
  const [selectedStar, setSelectedStar] = useState(null);
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const galaxiesRef = useRef([]);
  const planetsRef = useRef([]);

    // Track the latest selectedStar value
    const selectedStarRef = useRef();
    selectedStarRef.current = selectedStar;

  // INITIAL SETUP
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
      .style("background", "black")
      .style("pointer-events", "all");
  
    const defs = svg.append("defs");
  
    const starCount = 1000;
    const stars = d3.range(starCount).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.1 + 0.3
    }));
  
    svg.selectAll(".background-star")
      .data(stars)
      .enter().append("circle")
      .attr("class", "background-star")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => d.r)
      .attr("fill", "white")
      .attr("opacity", d => d.opacity);
  
    // Define radial gradient for stars.
    const starGradient = defs.append("radialGradient")
      .attr("id", "starGradient");
    starGradient.append("stop")
      .attr("offset", "20%")
      .attr("stop-color", "white");
    starGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "transparent");
  
    // Define gradient for galaxy center (black hole).
    const gradient = defs.append("radialGradient")
      .attr("id", "blackHoleGradient");
    gradient.append("stop")
      .attr("offset", "20%")
      .attr("stop-color", "black");
    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "darkblue");
  
    // Append Cerbanimo text (only once)
    svg.append("text")
      .attr("class", "cerbanimo-text")
      .attr("x", centerX)
      .attr("y", centerY)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", textSize)
      .text("Cerbanimo");
  
    // Create galaxy groups with a data-name attribute.
    const galaxyGroup = svg.selectAll(".galaxy")
      .data(galaxies)
      .enter().append("g")
      .attr("class", "galaxy")
      .attr("data-name", d => d.name)
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .on("click", (event, d) => {
        if (!selectedStarRef.current) {
          setSelectedGalaxy(current => current === d.name ? null : d.name);
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
        .attr("stroke-width", index === 0 ? "3" : index === 3 ? "1" : "1")
        .attr("stroke-dasharray", `${2 + index} ${1 + index}`)
        .each(function () {
          rotateElement(this, 70000);
        });
    });
  
    // Append spiral arms within each galaxy group.
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
        .each(function() {
          rotateElement(this, 120000);
        });
    });
  
    // Append star groups (for stars orbiting the galaxy).
    galaxyGroup.each(function(d) {
      const starGroup = d3.select(this).append("g").attr("class", "star-group");
      const numStars = 6;
      const orbitRadius = 120;
      const starRadius = 25;
      const starData = d3.range(numStars).map(i => {
        const angle = (2 * Math.PI * i) / numStars;
        return { x: orbitRadius * Math.cos(angle), y: orbitRadius * Math.sin(angle), index: i, parent: d.name };
      });
      starGroup.selectAll(".star")
        .data(starData)
        .enter()
        .append("circle")
        .attr("class", "star")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", starRadius)
        .attr("fill", "url(#starGradient)")
        .style("opacity", 0)
        .style("pointer-events", "none")
        .on("click", function(event, d) {
          event.stopPropagation();
          setSelectedStar(current =>
            current && current.parent === d.parent && current.index === d.index ? null : d
          );
          setSelectedPlanet(null);
        });
    });
  
    galaxyGroup.each(function(d) {
      const planetGroup = d3.select(this).append("g").attr("class", "planet-group");
      const numPlanets = 6;
      const orbitRadius = 120;
      const planetRadius = 15;

      //Create planet data
      const planetData = d3.range(numPlanets).map(i => {
        const angle = (2 * Math.PI * i) / numPlanets;
        return { x: orbitRadius * Math.cos(angle), y: orbitRadius * Math.sin(angle), index: i, parent: d.name, starIndex: -1 };
      });

      // Store planet data in the ref
  planetsRef.current = [...planetsRef.current, ...planetData];

      planetGroup.selectAll(".planet")
        .data(planetData, d => `${d.parent}-${d.starIndex}-${d.index}`)
        .enter()
        .append("circle")
        .attr("class", d => `planet planet-${d.parent}-${d.starIndex}-${d.index}`)
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", planetRadius)
        .attr("fill", "lightblue")
        .style("opacity", 0)
        .style("pointer-events", "none")
        .on("click", function(event, d) {
          event.stopPropagation();
          const planetId = `${d.parent}-${d.starIndex}-${d.index}`;
          console.log("Planet clicked:", planetId); // Log the planet ID
          setSelectedPlanet(current => current === planetId ? null : planetId);
        });
        console.log("Planets created:", planetData); // Log planet data
    });

    
  
    galaxyGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".3em")
      .attr("fill", "white")
      .attr("font-size", textSize)
      .text(d => d.name);
  }, []);

  // UPDATE ON GALAXY SELECTION
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = window.innerWidth;
    const height = window.innerHeight;
  
    if (selectedGalaxy) {
      const galaxy = galaxiesRef.current.find(g => g.name === selectedGalaxy);
      if (!galaxy) return;
  
      // Fade out Cerbanimo text
      svg.select(".cerbanimo-text")
        .transition().duration(750)
        .style("opacity", 0);
  
      const scaleFactor = 1;
      galaxiesRef.current.forEach(g => {
        if (g.name !== selectedGalaxy) {
          g.targetX = galaxy.x + (g.x - galaxy.x) * scaleFactor;
          g.targetY = galaxy.y + (g.y - galaxy.y) * scaleFactor;
        }
      });
  
      // Move galaxies
      svg.selectAll(".galaxy")
        .transition().duration(750)
        .attr("transform", d =>
          d.name === selectedGalaxy
            ? `translate(${width / 2},${height / 2})`
            : `translate(${d.targetX},${d.targetY})`
        )
        .style("opacity", d => (d.name === selectedGalaxy ? 1 : 0))
        .style("pointer-events", d => (d.name === selectedGalaxy ? "all" : "none"));
  
      // Show spiral arms for the selected galaxy
      d3.select(`.galaxy[data-name="${selectedGalaxy}"]`)
        .selectAll(".spiral-arm")
        .transition().duration(750)
        .style("opacity", 1)
        .on("end", function() {
          rotateElement(this, 120000);
        });
  
      // Show stars for the selected galaxy
      d3.select(`.galaxy[data-name="${selectedGalaxy}"]`)
        .selectAll(".star")
        .transition().duration(750)
        .style("opacity", 1)
        .style("pointer-events", "all");
  
    } else {
      // Reset galaxies
      svg.selectAll(".galaxy")
        .transition().duration(750)
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .style("opacity", 1)
        .style("pointer-events", "all");
  
      // Fade in Cerbanimo text
      svg.select(".cerbanimo-text")
        .transition().duration(750)
        .attr("x", width / 2)
        .attr("y", height / 2)
        .style("opacity", 1);
  
      // Hide spiral arms
      svg.selectAll(".spiral-arm")
        .transition().duration(750)
        .style("opacity", 0);
  
      // Hide stars
      svg.selectAll(".star")
        .transition().duration(750)
        .style("opacity", 0)
        .style("pointer-events", "none");
  
      setSelectedStar(null);
    }
  }, [selectedGalaxy]); 

  // UPDATE ON STAR SELECTION
useEffect(() => {
  const svg = d3.select(svgRef.current);
  const defs = svg.select("defs");
  const orbitRadius = 150;

  if (selectedStar) {
    // Cleanup previous planets
    svg.selectAll(".planet-container").remove();

    // Disable galaxy clicks
    d3.select(`.galaxy[data-name="${selectedStar.parent}"]`)
      .style("pointer-events", "none");

    const parentGroup = d3.select(`.galaxy[data-name="${selectedStar.parent}"]`);
    const sanitizedParent = selectedStar.parent.replace(/ /g, '-');

    // Hide non-star elements
    parentGroup.selectAll("circle:not(.star), .spiral-arms, text")
      .transition().duration(750)
      .style("opacity", 0);

    // Animate stars
    parentGroup.selectAll(".star")
      .transition().duration(750)
      .attr("cx", d => d.index === selectedStar.index ? 0 : d.x * 8)
      .attr("cy", d => d.index === selectedStar.index ? 0 : d.y * 8)
      .style("opacity", d => d.index === selectedStar.index ? 1 : 0)
      .attr("r", d => d.index === selectedStar.index ? 25 * 3 : 25)
      .on("end", function(_, d) {
        if (!selectedStarRef.current && d.index === selectedStarRef.current?.index) {
          d3.select(this).style("pointer-events", "none");
        }
      });

    // Generate planets with fixed 6 elements
    const numPlanets = 6;
    const planets = d3.range(numPlanets).map(i => ({
      angle: (i * 2 * Math.PI) / numPlanets,
      size: Math.random() * 10 + 10,
      index: i,
      parent: sanitizedParent,
      starIndex: selectedStar.index, // Add star index here
    }));

    // Update planetsRef with the new planets
    planetsRef.current = planetsRef.current.map(p => {
      if (p.parent === selectedStar.parent) {
        return { ...p, starIndex: selectedStar.index };
      }
      return p;
    });

    // Create planet containers
    const planetContainers = parentGroup.append("g")
      .attr("class", "planet-container")
      .selectAll(".planet")
      .data(planets)
      .enter().append("g")
      .attr("class", d => `planet planet-${selectedStar.parent}-${selectedStar.index}-${d.index}`)
      .attr("transform", d => `
        translate(${orbitRadius * Math.cos(d.angle)}, 
        ${orbitRadius * Math.sin(d.angle)})
      `)
      .style("opacity", 0)
      .style("pointer-events", "all") // Make planets clickable
      .on("click", function(event, d) {
        event.stopPropagation();
        const planetId = `${d.parent}-${d.starIndex}-${d.index}`;
        setSelectedPlanet(current => current === planetId ? null : planetId);
      });

    // Build planet contents
    planetContainers.each(function(d) {
      const planet = d3.select(this);
      const numElements = 6;
      const planetId = `${selectedStar.parent}-${selectedStar.index}-${d.index}`;

      const gradientId = `planet-gradient-${planetId}`;

      defs.append("radialGradient")
        .attr("id", gradientId)
        .selectAll("stop")
        .data([
          {offset: "0%", color: "#27ae60"},
          {offset: "50%", color: "#2e86c1"},
          {offset: "100%", color: "#1a1a1a"}
        ])
        .enter().append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

      planet.append("circle")
        .attr("r", d.size)
        .attr("fill", "#2e86c1")
        .attr("opacity", 1);

      planet.append("circle")
        .attr("r", d.size)
        .attr("fill", `url(#${gradientId})`)
        .attr("opacity", 0.5);

      for (let i = 0; i < numElements; i++) {
        const elementType = Math.random();
        const color = "#27ae60";
        const size = Math.random() * (d.size / 4) + 2;
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * (d.size - size);

        if (elementType < 0.8) {
          planet.append("circle")
            .attr("cx", distance * Math.cos(angle))
            .attr("cy", distance * Math.sin(angle))
            .attr("r", size)
            .attr("fill", color)
            .attr("opacity", Math.random() * 0.5 + 0.3);
        } else {
          planet.append("rect")
            .attr("x", distance * Math.cos(angle) - size / 2)
            .attr("y", distance * Math.sin(angle) - size / 2)
            .attr("width", size)
            .attr("height", size)
            .attr("transform", `rotate(${Math.random() * 360})`)
            .attr("fill", color)
            .attr("opacity", Math.random() * 0.5 + 0.3);
        }
      }
    });

    // Animate planet containers
    planetContainers.transition().duration(750)
      .style("opacity", 1);

  } else {
    // Cleanup when star deselected
    svg.selectAll(".planet-container").remove();
    svg.selectAll(".planet").remove();
    svg.selectAll(".galaxy").style("pointer-events", "all");

    // Reset stars properly
    if (selectedGalaxy) {
      d3.select(`.galaxy[data-name="${selectedGalaxy}"]`)
        .selectAll(".star")
        .transition().duration(750)
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .style("opacity", 1)
        .attr("r", 25)
        .style("pointer-events", "all");
    }

    // Restore galaxy elements
    svg.selectAll(".galaxy").selectAll("circle:not(.star), .spiral-arms, text")
      .transition().duration(750)
      .style("opacity", 1);
  }
}, [selectedStar, selectedGalaxy]);

  // PLANET SELECTION EFFECT
useEffect(() => {
  const svg = d3.select(svgRef.current);
  const width = window.innerWidth;
  const height = window.innerHeight;

  if (selectedPlanet) {
    // Parse the selected planet ID
    const [parent, starIndex] = selectedPlanet.split('-');
    const galaxyName = parent;
    const parentGroup = d3.select(`.galaxy[data-name="${galaxyName}"]`);

    // Find the selected planet data from the ref
    const selectedPlanetData = planetsRef.current.find(
      d => `${d.parent}-${d.starIndex}-${d.index}` === selectedPlanet
    );

    if (!selectedPlanetData) {
      console.error("Selected planet data not found:", selectedPlanet);
      return;
    }

    // Get the selected planet element
    const planetElement = parentGroup.select(`.planet-${selectedPlanet}`);

    // Highlight the selected planet
    planetElement
      .transition().duration(750)
      .attr("r", 30) // Increase size
      .attr("fill", "yellow"); // Change color

    // Move the selected planet to the center of the screen
    const galaxy = galaxiesRef.current.find(g => g.name === galaxyName);
    if (galaxy) {
      const centerX = width / 2 - galaxy.x;
      const centerY = height / 2 - galaxy.y;

      planetElement
        .transition().duration(750)
        .attr("cx", centerX)
        .attr("cy", centerY);
    }

    // Hide non-selected planets in the same galaxy
    parentGroup.selectAll(".planet")
      .each(function(d) {
        const planetId = `${d.parent}-${d.starIndex}-${d.index}`;
        console.log("Planet ID:", planetId); // Log the planet ID
        if (planetId !== selectedPlanet) {
          d3.select(this)
            .transition().duration(750)
            .style("opacity", 0);
        }
      });

    // Hide the parent star
    parentGroup.selectAll(".star")
      .filter(d => d.index === parseInt(starIndex))
      .transition().duration(750)
      .style("opacity", 0);

  } else {
    // Reset planets when no planet is selected
    svg.selectAll(".planet")
      .transition().duration(750)
      .attr("r", 15) // Reset size
      .attr("fill", "lightblue") // Reset color
      .style("opacity", 1) // Make all planets visible
      .attr("cx", d => d.x) // Reset x position
      .attr("cy", d => d.y); // Reset y position

    // Reset stars in the selected galaxy (if any)
    if (selectedGalaxy) {
      d3.select(`.galaxy[data-name="${selectedGalaxy}"]`)
        .selectAll(".star")
        .transition().duration(750)
        .style("opacity", 1);
    }
  }
}, [selectedPlanet, selectedGalaxy]);


  return <svg ref={svgRef} />;
};

export default GalacticMap;