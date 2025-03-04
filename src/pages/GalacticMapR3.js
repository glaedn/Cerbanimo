import * as d3 from "d3";
import React, { useEffect, useRef, useState } from "react";

// Improved rotation functions with continuous rotation
function rotateArm(element, duration = 100000) {
  d3.select(element).transition()
    .duration(duration)
    .ease(d3.easeLinear)
    .attrTween("transform", function() {
      const currentTransform = d3.select(this).attr("transform") || "rotate(0)";
      const currentRotation = (currentTransform.match(/rotate\(([-+]?\d*\.?\d+)\)/) || [0, 0])[1];
      const startAngle = parseFloat(currentRotation) || 0;
      return (t) => `rotate(${startAngle + t * 360})`;
    })
    .on("end", function() {
      rotateArm(this, duration);
    });
}

function rotateElement(element, duration = 70000) {
  d3.select(element).transition()
    .duration(duration)
    .ease(d3.easeLinear)
    .attrTween("transform", function() {
      const currentTransform = d3.select(this).attr("transform") || "rotate(0)";
      const currentRotation = (currentTransform.match(/rotate\(([-+]?\d*\.?\d+)\)/) || [0, 0])[1];
      const startAngle = parseFloat(currentRotation) || 0;
      return (t) => `rotate(${startAngle + t * 360})`;
    })
    .on("end", function() {
      rotateElement(this, duration);
    });
}

const fetchSkills = async (category) => {
  try {
    // Replace with your actual PostgreSQL connection logic
    const response = await fetch(`/routes/skills?category=${category}`);
    const data = await response.json();
    setSkills(data);
    setTotalSkills(data.length);
    setCurrentPage(0);
  } catch (error) {
    console.error('Error fetching skills:', error);
  }
};

const GalacticMap = () => {
  const svgRef = useRef();
  const [selectedGalaxy, setSelectedGalaxy] = useState(null);
  const [selectedStar, setSelectedStar] = useState(null);
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const galaxiesRef = useRef([]);
  const [skills, setSkills] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalSkills, setTotalSkills] = useState(0);

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
      .style("background", "black");

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
        // Only allow galaxy click if no star is selected.
        if (!selectedStar) {
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
        .attr("class", "accretion-disk") // Add class for easier selection
        .attr("r", radius)
        .attr("fill", "none")
        .attr("stroke", "purple")
        .attr("stroke-width", index === 0 ? "3" : index === 3 ? "1" : "1")
        .attr("stroke-dasharray", `${2 + index} ${1 + index}`)
        .each(function () {
          rotateElement(this);
        });
    });

    // Append spiral arms within each galaxy group.
    galaxyGroup.each(function(d) {
      // Append a subgroup for spiral arms so they follow the galaxy's transform.
      const armsGroup = d3.select(this).append("g").attr("class", "spiral-arms");
      armsGroup.selectAll(".spiral-arm")
        .data([0, 1, 2, 3, 4, 5]) // 6 arms
        .enter()
        .append("path")
        .attr("class", "spiral-arm")
        // Use (0,0) because the galaxy group is already translated.
        .attr("d", armIndex => createSpiralPathReversed(0, 0, armIndex))
        .attr("fill", "none")
        .attr("stroke", "purple")
        .attr("stroke-width", (d, i) => strokeWidth(i, 100))
        .style("opacity", 0)
        .style("pointer-events", "none")
        .each(function() {
          rotateArm(this, 120000);
        });
    });

    // Append star groups (for stars orbiting the galaxy).
    galaxyGroup.each(function(d) {
      const starGroup = d3.select(this).append("g").attr("class", "star-group");
      const numStars = 6;
      const orbitRadius = 120;
      const starRadius = 25;
      // Create star data including index and parent's name.
      const starData = d3.range(numStars).map(i => {
        const angle = (2 * Math.PI * i) / numStars;
        return { x: orbitRadius * Math.cos(angle), y: orbitRadius * Math.sin(angle), index: i, parent: d.name };
      });
      starGroup.selectAll(".star-group")
        .data(starData)
        .enter()
        .append("g")
        .attr("class", "star-group")
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .on("click", function(event, d) {
          event.stopPropagation();
          setSelectedStar(current => 
            current && current.parent === d.parent && current.index === d.index ? null : d
          );
          setSelectedPlanet(null);
        })
        .each(function() {
          const group = d3.select(this);
          group.append("circle")
            .attr("class", "star")
            .attr("r", starRadius)
            .attr("fill", "url(#starGradient)")
            .style("opacity", 0)
            .style("pointer-events", "none");
    
          group.append("text")
            .attr("class", "skill-label")
            .attr("text-anchor", "middle")
            .attr("dy", starRadius + 20)
            .attr("fill", "white")
            .style("opacity", 0)
            .style("pointer-events", "none");
      });
    });

    galaxyGroup.each(function(d) {
      const planetGroup = d3.select(this).append("g").attr("class", "planet-group");
      const numPlanets = 6; // Same number of planets you want for each star
      const orbitRadius = 120; // Orbit radius for planets
      const planetRadius = 15; // Size of planets
    
      // Create planet data including index and parent's name.
      const planetData = d3.range(numPlanets).map(i => {
        const angle = (2 * Math.PI * i) / numPlanets;
        return { x: orbitRadius * Math.cos(angle), y: orbitRadius * Math.sin(angle), index: i, parent: d.name };
      });
    
      planetGroup.selectAll(".planet")
        .data(planetData)
        .enter()
        .append("circle")
        .attr("class", "planet")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", planetRadius)
        .attr("fill", "lightblue") // Or any planet color you prefer
        .style("opacity", 0) // Initially hidden
        .style("pointer-events", "none") // Disable pointer events initially
        .on("click", function(event, d) {
          event.stopPropagation(); // Prevent galaxy click
          setSelectedPlanet(current => 
            current && current.parent === d.parent && current.index === d.index ? null : d
          );
        });
    });

    // Helper functions:
    function createSpiralPathReversed(x, y, armIndex) {
      // Reverse the direction: multiply incremental angle by -1.
      const spiral = d3.line()
        .curve(d3.curveCardinal)
        .x(d => x + d[0])
        .y(d => y + d[1]);
      const points = [];
      const startRadius = 42;
      const endRadius = 125;
      const numPoints = 20;
      for (let i = 0; i < numPoints; i++) {
        const angle = -i * 0.2 + armIndex * Math.PI / 3;
        const radius = startRadius + i * (endRadius - startRadius) / numPoints;
        points.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
      }
      return spiral(points);
    }

    function strokeWidth(index, totalPoints) {
      const startWidth = 3;
      const endWidth = 1;
      return startWidth - ((startWidth - endWidth) * (index / totalPoints));
    }

    

    // Append the galaxy name text again (if needed for ordering).
    galaxyGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".3em")
      .attr("fill", "white")
      .attr("font-size", textSize)
      .text(d => d.name);
  }, []);

  useEffect(() => {
    if (selectedGalaxy) {
      fetchSkills(selectedGalaxy);
    }
  }, [selectedGalaxy]);

  //SKILL LABELS ON GALAXY SELECTION
  useEffect(() => {
    if (selectedGalaxy && skills.length > 0) {
      const galaxyGroup = d3.select(`.galaxy[data-name="${selectedGalaxy}"]`);
      const starGroups = galaxyGroup.selectAll(".star-group");
      const startIdx = currentPage * 6;
      const currentSkills = skills.slice(startIdx, startIdx + 6);
  
      // Animate labels and stars
      starGroups.select(".skill-label")
        .transition().duration(500)
        .style("opacity", 0)
        .on("end", function() {
          d3.select(this).text((d, i) => currentSkills[i]?.name || '');
        })
        .transition().duration(500)
        .style("opacity", 1);
  
      starGroups.select(".star")
        .interrupt()
        .transition().duration(500)
        .attrTween("transform", function() {
          const currentRotation = parseFloat(d3.select(this).attr("transform")?.match(/-?\d+/)?.[0] || 0);
          return t => `rotate(${currentRotation + t * 360})`;
        })
        .on("end", function() {
          rotateElement(this, 70000);
        });
    }
  }, [skills, currentPage, selectedGalaxy]);

  // UPDATE ON GALAXY SELECTION
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (selectedGalaxy) {
      const galaxy = galaxiesRef.current.find(g => g.name === selectedGalaxy);
      if (!galaxy) return;

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

      

      // Move galaxies: selected galaxy goes to center.
      svg.selectAll(".galaxy")
        .transition().duration(750)
        .attr("transform", d =>
          d.name === selectedGalaxy
            ? `translate(${width / 2},${height / 2})`
            : `translate(${d.targetX},${d.targetY})`
        )
        .style("opacity", d => (d.name === selectedGalaxy ? 1 : 0))
        .style("pointer-events", d => (d.name === selectedGalaxy ? "all" : "none")); // Disable clicks on non-selected galaxies

      // In the selected galaxy group, show spiral arms.
      d3.select(`.galaxy[data-name="${selectedGalaxy}"]`)
        .selectAll(".spiral-arm")
        .transition().duration(750)
        .style("opacity", 1)
        .on("end", function() {
          rotateArm(this, 120000);
        });

      // In the selected galaxy group, ensure the stars are visible and clickable.
      d3.select(`.galaxy[data-name="${selectedGalaxy}"]`)
        .selectAll(".star")
        .transition().duration(750)
        .style("opacity", 1)
        .style("pointer-events", "all"); // Enable pointer events when visible
    } else {
      svg.selectAll(".galaxy")
        .transition().duration(750)
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .style("opacity", 1)
        .style("pointer-events", "all"); // Re-enable clicks on all galaxies

      svg.select(".cerbanimo-text")
        .transition().duration(750)
        .attr("x", width / 2)
        .attr("y", height / 2)
        .style("opacity", 1);

      svg.selectAll(".spiral-arm")
        .transition().duration(750)
        .style("opacity", 0);

      svg.selectAll(".star")
        .transition().duration(750)
        .style("opacity", 0)
        .style("pointer-events", "none"); // Disable pointer events when hidden

      setSelectedStar(null);
    }
  }, [selectedGalaxy]);

  // UPDATE ON STAR SELECTION
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const defs = svg.select("defs");
    const orbitRadius = 150;
  
    if (selectedStar) {
      // Cleanup previous planets first
    svg.selectAll(".planet-container").remove();
      // Disable galaxy clicks
      d3.select(`.galaxy[data-name="${selectedStar.parent}"]`)
        .style("pointer-events", "none");
  
      const parentGroup = d3.select(`.galaxy[data-name="${selectedStar.parent}"]`);
      const sanitizedParent = selectedStar.parent.replace(/ /g, '-');

      // Hide non-star elements
      parentGroup.selectAll("circle:not(.star), .spiral-arms, text")
        .transition().duration(750)
        .style("opacity", d => d.index === selectedStar.index ? 1 : 0) // Keep selected star visible
  
      // Animate stars with proper deselection
      parentGroup.selectAll(".star")
        .transition().duration(750)
        .attr("cx", d => d.index === selectedStar.index ? 0 : d.x * 8)
        .attr("cy", d => d.index === selectedStar.index ? 0 : d.y * 8)
        .style("opacity", d => d.index === selectedStar.index ? 1 : 0)
        .attr("r", d => d.index === selectedStar.index ? 25 * 3 : 25)
        .on("end", function(_, d) {
          if (!selectedStar && d.index === selectedStar?.index) {
            d3.select(this)
              .style("pointer-events", "none");
          }
        });
  
      // Generate planets with fixed 6 elements
      const numPlanets = 6; // Symmetrical number
      const planets = d3.range(numPlanets).map(i => ({
        angle: (i * 2 * Math.PI) / numPlanets,
        size: Math.random() * 10 + 10,
        index: i,
        parent: sanitizedParent,
        starIndex: selectedStar.index
      }));
  

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
        .style("pointer-events", "all") // Enable clicks
      .on("click", function(event, d) {
        event.stopPropagation();
        const planetId = `${d.parent}-${d.starIndex}-${d.index}`;
        setSelectedPlanet(current => current === planetId ? null : planetId);
      });
  
      // Build planet contents with 6 elements
      planetContainers.each(function(d) {
        const planet = d3.select(this);
        const numElements = 6; // Hardcoded symmetry
        const planetId = `${selectedStar.parent}-${selectedStar.index}-${d.index}`;
  
        planet.on("click", function(event, d) {
          event.stopPropagation();
          const planetId = `${d.parent}-${d.starIndex}-${d.index}`;
          setSelectedPlanet(current => current === planetId ? null : planetId);
        });
      
        
      // Create unique gradient ID
      const gradientId = `planet-gradient-${planetId}`;
      
      // Gradient definition
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

      // Base layers
      planet.append("circle")
        .attr("r", d.size)
        .attr("fill", "#2e86c1")
        .attr("opacity", 1);

      planet.append("circle")
        .attr("r", d.size)
        .attr("fill", `url(#${gradientId})`)
        .attr("opacity", 0.5);

      // Surface elements
      for (let i = 0; i < numElements; i++) {
        const elementType = Math.random();
        const color = "#27ae60";
        const size = Math.random() * (d.size/4) + 2;
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
            .attr("x", distance * Math.cos(angle) - size/2)
            .attr("y", distance * Math.sin(angle) - size/2)
            .attr("width", size)
            .attr("height", size)
            .attr("transform", `rotate(${Math.random() * 360})`)
            .attr("fill", color)
            .attr("opacity", Math.random() * 0.5 + 0.3);
        }
      }
    });

    // Animate planet containers
    planetContainers.transition().duration(750).style("opacity", 1);

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
  const orbitRadius = 150;
  const svg = d3.select(svgRef.current);
  const width = window.innerWidth;
  const height = window.innerHeight;

  if (selectedPlanet) {
    const [parent, starIndex, planetIndex] = selectedPlanet.split('-');
    const galaxyName = parent;
    const parentGroup = svg.select(`.galaxy[data-name="${galaxyName}"]`);

    // Get galaxy's current position
    const galaxy = galaxiesRef.current.find(g => g.name === galaxyName);
    let scale = 1;
    let tx = width/2 - galaxy.x;
    let ty = height/2 - galaxy.y;

    parentGroup.selectAll(".planet")
      .transition().duration(750)
      .style("opacity", d => {
        const planetId = `${d.parent}-${d.starIndex}-${d.index}`;
        return planetId === selectedPlanet ? 1 : 0;
      })
      .attr("transform", d => {
        const planetId = `${d.parent}-${d.starIndex}-${d.index}`;
        if (planetId === selectedPlanet) {
          // Calculate true screen center coordinates
          const centerX = (width/2 - galaxy.x) / scale;
          const centerY = (height/2 - galaxy.y) / scale;
          return `translate(${centerX},${centerY}) scale(2)`;
        }
        return `translate(${orbitRadius * Math.cos(d.angle) * 5}, 
                        ${orbitRadius * Math.sin(d.angle) * 5})`;
      });

    // Fade out parent star
    parentGroup.selectAll(".star")
      .filter(d => d.index === parseInt(starIndex))
      .transition().duration(750)
      .style("opacity", 0);

  } else {
    // Reset planets
    svg.selectAll(".planet")
      .transition().duration(750)
      .style("opacity", 1)
      .attr("transform", d => 
        `translate(${orbitRadius * Math.cos(d.angle)}, 
                  ${orbitRadius * Math.sin(d.angle)})`
      );

    // Restore star opacity
    if (selectedStar) {
      svg.select(`.galaxy[data-name="${selectedStar.parent}"]`)
        .selectAll(".star")
        .transition().duration(750)
        .style("opacity", d => d.index === selectedStar.index ? 1 : 0);
    }
  }
}, [selectedPlanet]);

  return <svg ref={svgRef} />;
};

export default GalacticMap;