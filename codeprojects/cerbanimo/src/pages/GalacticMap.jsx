import * as d3 from "d3";
import * as React from 'react';
import { useRef, useState, useEffect } from 'react';
import { rotateElement } from "../utils/animations";
import { createSpiralPathReversed, strokeWidth } from "../utils/helpers";
import axios from 'axios';

const GalacticMap = () => {
  const svgRef = useRef();
  const [selectedGalaxy, setSelectedGalaxy] = useState(null);
  const [selectedStar, setSelectedStar] = useState(null);
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [skills, setSkills] = useState([]);
  const [skillPage, setSkillPage] = useState(0);
  const [selectedTask, setSelectedTask] = useState(null);
  const [projects, setProjects] = useState([]);
  const [isCyclingStars, setIsCyclingStars] = useState(false);
  const galaxiesRef = useRef([]);
  const starsRef = useRef([]);
  const planetsRef = useRef([]);
  const totalStarsPerPage = 6;

  // INITIAL SETUP
  useEffect(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const separation = Math.min(width, height) * 0.3;
    const textSize = Math.min(width, height) * 0.05;

    // Galaxies
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

    // Background Stars
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

    // Define radial gradient for stars
    const starGradient = defs.append("radialGradient")
      .attr("id", "starGradient");
    starGradient.append("stop")
      .attr("offset", "20%")
      .attr("stop-color", "white");
    starGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "transparent");

    // Define gradient for galaxy center (black hole)
    const gradient = defs.append("radialGradient")
      .attr("id", "blackHoleGradient");
    gradient.append("stop")
      .attr("offset", "20%")
      .attr("stop-color", "black");
    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "darkblue");

    // Append Cerbanimo text
    svg.append("text")
      .attr("class", "cerbanimo-text")
      .attr("x", centerX)
      .attr("y", centerY)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", textSize)
      .style("opacity", 1)
      .text("Cerbanimo");

    // Create galaxy groups
    const galaxyGroup = svg.selectAll(".galaxy")
      .data(galaxies)
      .enter().append("g")
      .attr("class", "galaxy")
      .attr("data-name", d => d.name)
      .attr("transform", `translate(${centerX},${centerY})`)
      .on("click", (event, d) => {
        if (!selectedStar) {
          setSelectedGalaxy(current => current === d.name ? null : d.name);
        }
      });

    galaxyGroup.append("circle")
      .attr("r", 30)
      .attr("fill", "url(#blackHoleGradient)");

    // Accretion disks
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

    // Append spiral arms
    galaxyGroup.each(function (d) {
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
        .each(function () {
          rotateElement(this, 120000);
        });
    });

    // Append galaxy names
    galaxyGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "2em")
      .attr("fill", "white")
      .attr("font-size", textSize * 0.8)
      .text(d => d.name);

    // Stars (6 stars orbiting the center)
    const numStars = 6;
    const starOrbitRadius = 120;
    const starData = d3.range(numStars).map(i => {
      const angle = (2 * Math.PI * i) / numStars;
      return {
        x: centerX + starOrbitRadius * Math.cos(angle),
        y: centerY + starOrbitRadius * Math.sin(angle),
        index: i
      };
    });
    starsRef.current = starData;

    const starGroup = svg.append("g").attr("class", "star-group");
    starGroup.selectAll(".star")
      .data(starData)
      .enter()
      .append("circle")
      .attr("class", "star")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", 25)
      .attr("fill", "url(#starGradient)")
      .style("opacity", 0)
      .style("pointer-events", "none")
      .on("click", function (event, d) {
        event.stopPropagation();
        setSelectedStar(current =>
          current && current.index === d.index ? null : d
        );
        setSelectedPlanet(null);
      });

    // Star labels
    starGroup.selectAll(".star-label")
      .data(starData)
      .enter()
      .append("text")
      .attr("class", "star-label")
      .attr("text-anchor", "middle")
      .attr("dy", ".5em") // Adjusted to be closer to stars
      .attr("fill", "white")
      .attr("font-size", textSize * 0.6)
      .text((d, i) => ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta"][i])
      .style("opacity", 0);

    // Planets (6 planets orbiting the center)
    const numPlanets = 6;
    const planetOrbitRadius = 125;
    const planetData = d3.range(numPlanets).map(i => {
      const angle = (2 * Math.PI * i) / numPlanets;
      return {
        x: centerX + planetOrbitRadius * Math.cos(angle),
        y: centerY + planetOrbitRadius * Math.sin(angle),
        index: i,
      };
    });
    planetsRef.current = planetData;

    const planetGroup = svg.append("g").attr("class", "planet-group");
    planetGroup.selectAll(".planet")
      .data(planetData)
      .enter()
      .append("circle")
      .attr("class", "planet")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", 15)
      .attr("fill", "lightblue")
      .style("opacity", 0)
      .style("pointer-events", "none")
      .on("click", function (event, d) {
        event.stopPropagation();
        setSelectedPlanet(current =>
          current && current.index === d.index ? null : d
        );
      });

    // Planet labels
    planetGroup.selectAll(".planet-label")
      .data(planetData)
      .enter()
      .append("text")
      .attr("class", "planet-label")
      .attr("text-anchor", "middle")
      .attr("dy", "1em") // Adjusted to be closer to planets
      .attr("fill", "white")
      .attr("font-size", textSize * 0.5)
      .text((d, i) => ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta"][i])
      .style("opacity", 0);

    // Arrows
    const arrowSize = 25;
    const maxArrowOffset = 150;
    const arrowOffsetX = Math.min(maxArrowOffset, width / 4);
    const isLeftArrowDisabled = skillPage === 0;
    const isRightArrowDisabled = (skillPage + 1) * totalStarsPerPage >= skills.length;

    const handleNextPage = () => {
      if (isCyclingStars) {
        if ((skillPage + 1) * totalStarsPerPage < skills.length) {
          setSkillPage(skillPage + 1);
          rotateElements(1);
        }
      } else {
        console.log("planet cycling up");
      }
    };
    
    const handlePreviousPage = () => {
      if (isCyclingStars) {
        if (skillPage > 0) {
          setSkillPage(skillPage - 1);
          rotateElements(-1);
        }
      } else {
        console.log("planet cycling down");
      }
    };
    svg.append("polygon")
      .attr("class", "arrow left-arrow")
      .attr("points", `${arrowOffsetX},${centerY} ${arrowOffsetX + arrowSize},${centerY - arrowSize} ${arrowOffsetX + arrowSize},${centerY + arrowSize}`)
      .attr("fill", isLeftArrowDisabled ? "grey" : "white")
      .style("cursor", "pointer")
      .on("click", () => {
        handlePreviousPage();
      });

    svg.append("polygon")
      .attr("class", "arrow right-arrow")
      .attr("points", `${width - arrowOffsetX},${centerY} ${width - arrowOffsetX - arrowSize},${centerY - arrowSize} ${width - arrowOffsetX - arrowSize},${centerY + arrowSize}`)
      .attr("fill", isRightArrowDisabled ? "grey" : "white")
      .style("cursor", "pointer")
      .on("click", () => {
        handleNextPage();
      });
  }, []);

  // GALAXY SELECTION
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (selectedGalaxy) {
      setSelectedStar(null);
      setIsCyclingStars(true);
      axios.get(`http://localhost:4000/skills`, { params: { category: selectedGalaxy } })
        .then(res => {
          setSkills(res.data);
          setSkillPage(0);
        })
        .catch(err => console.error("Error fetching skills:", err));
      const galaxy = galaxiesRef.current.find(g => g.name === selectedGalaxy);
      // Fade out Cerbanimo text
      svg.select(".cerbanimo-text")
        .transition().duration(750)
        .style("opacity", 0);

      // Move galaxies
      svg.selectAll(".galaxy")
        .transition().duration(750)
        .attr("transform", d =>
          d.name === selectedGalaxy
            ? `translate(${width / 2},${height / 2})`
            : `translate(${d.x},${d.y})`
        )
        .style("opacity", d => (d.name === selectedGalaxy ? 1 : 0))
        .style("pointer-events", d => (d.name === selectedGalaxy ? "auto" : "none")); // Prevent clicks on invisible galaxies

      // Show spiral arms
      svg.select(`.galaxy[data-name="${selectedGalaxy}"]`)
        .selectAll(".spiral-arm")
        .transition().duration(750)
        .style("opacity", 1);

      // Show stars
      svg.selectAll(".star, .star-label")
        .transition().duration(750)
        .style("opacity", 1)
        .style("pointer-events", "auto");

      svg.selectAll(".planet")
        .style("pointer-events", "none");

    } else {
      // Reset galaxies
      setSkills([]);
      svg.selectAll(".galaxy")
        .transition().duration(750)
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .style("opacity", 1)
        .style("pointer-events", "auto");

      // Hide spiral arms, stars, and planets
      svg.selectAll(".spiral-arm, .star, .star-label, .planet, .planet-label")
        .transition().duration(750)
        .style("opacity", 0);

      // Fade in Cerbanimo text
      svg.select(".cerbanimo-text")
        .transition().duration(750)
        .style("opacity", 1);

      setSelectedStar(null);
      setSelectedPlanet(null);
    }
  }, [selectedGalaxy]);

  // STAR SELECTION
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (selectedStar) {
      setIsCyclingStars(false);
      axios.get(`http://localhost:4000/tasks/planetTasks`, { params: { skills: selectedStar.label } })
        .then(res => {
          const groupedProjects = {};
          res.data.forEach(task => {
            if (!groupedProjects[task.project_id]) {
              groupedProjects[task.project_id] = {
                id: task.project_id,
                name: task.project_name,
                tasks: [],
              };
            }
            groupedProjects[task.project_id].tasks.push(task);
          });
          setProjects(Object.values(groupedProjects));
        })
        .catch(err => console.error("Error fetching projects:", err));
      // Hide galaxies when star is selected
      svg.selectAll(".galaxy")
        .transition().duration(750)
        .style("opacity", 0);

      // Move selected star to center
      svg.selectAll(".star")
        .transition().duration(750)
        .attr("cx", d => d.index === selectedStar.index ? width / 2 : d.x)
        .attr("cy", d => d.index === selectedStar.index ? height / 2 : d.y)
        .style("opacity", d => d.index === selectedStar.index ? 1 : 0)
        .attr("r", d => d.index === selectedStar.index ? 25 * 3 : 25);

      // Move star labels
      svg.selectAll(".star-label")
        .transition().duration(750)
        .attr("x", d => d.index === selectedStar.index ? width / 2 : d.x)
        .attr("y", d => d.index === selectedStar.index ? height / 2 + 30 : d.y + 30)
        .style("opacity", d => d.index === selectedStar.index ? 1 : 0);

      // Show planets around selected star
      svg.selectAll(".planet, .planet-label")
        .transition().duration(750)
        .style("opacity", 1)
        .style("pointer-events", "auto");

    } else {
      // Reset stars and hide planets
      setProjects([]);
      svg.selectAll(".star")
        .transition().duration(750)
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .style("opacity", selectedGalaxy ? 1 : 0)
        .style("pointer-events", "auto")
        .attr("r", 25);


      svg.selectAll(".star-label")
        .transition().duration(750)
        .attr("x", d => d.x)
        .attr("y", d => d.y + 30)
        .style("opacity", selectedGalaxy ? 1 : 0);

      svg.selectAll(".planet, .planet-label")
        .transition().duration(750)
        .style("opacity", 0)
        .style("pointer-events", "none");

      // Show galaxies again if needed
      if (selectedGalaxy) {
        svg.selectAll(".galaxy")
          .transition().duration(750)
          .style("opacity", d => d.name === selectedGalaxy ? 1 : 0);
      }
      setSelectedPlanet(null);
    }
  }, [selectedStar]);

  // PLANET SELECTION
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (selectedPlanet) {
       // Move selected planet to the center
       svg.selectAll(".planet")
        .transition().duration(750)
        .filter(d => d.index === selectedPlanet.index)
        .attr("cx", d => d.index === selectedPlanet.index ? width / 2 : d.x)
        .attr("cy", d => d.index === selectedPlanet.index ? height / 2 : d.y)
        .style("opacity", d => d.index === selectedPlanet.index ? 1 : 0)
        .attr("r", d => d.index === selectedPlanet.index ? 80 : 15);

    // Move and show planet labels
    svg.selectAll(".planet-label")
      .transition().duration(750)
      .attr("x", d => d.index === selectedPlanet.index ? width / 2 : d.x)
      .attr("y", d => d.index === selectedPlanet.index ? height / 2 + 20 : d.y + 20)
      .style("opacity", d => d.index === selectedPlanet.index ? 1 : 0)
      .attr("dy", d => d.index === selectedPlanet.index ? "6em": "1em");

    // Scale and move tasks with the planet
    svg.selectAll(".task")
      .filter(d => d.index === selectedPlanet.index)
      .transition().duration(750)
      .attr("transform", (d) => {
        const scaleFactor = 80 / 15; // Scale factor based on planet radius change
        const dx = width / 2 - selectedPlanet.x;
        const dy = height / 2 - selectedPlanet.y;
        return `translate(${dx}, ${dy}) scale(${scaleFactor})`;
      });

    // Hide all other planets and the star
    svg.selectAll(".planet")
      .filter(d => d.index !== selectedPlanet.index)
      .transition().duration(750)
      .style("opacity", 0)
      .style("pointer-events", "none");
    
      svg.selectAll(".star")
      .transition().duration(750)
      .style("opacity", 0)
      .style("pointer-events", "none");

      svg.selectAll(".star-label")
      .transition().duration(750)
      .style("opacity", 0);

      svg.selectAll(".planet-label")
        .filter(d => d.index !== selectedPlanet.index)
        .transition().duration(750)
        .style("opacity", 0);
    } else {
      // Reset planets
      svg.selectAll(".planet")
        .transition().duration(750)
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", 15)
        .style("pointer-events", "auto")
        .style("opacity", selectedStar ? 1 : 0);
  
        svg.selectAll(".planet-label")
        .transition().duration(750)
        .attr("x", d => d.x)
        .attr("y", d => d.y + 20)
        .style("opacity", selectedStar ? 1 : 0)
        .attr("dy", "1em");
        

          // Show selected star again
      if (selectedStar) {
        svg.selectAll(".star")
          .transition().duration(750)
          .style("opacity", d => d.index === selectedStar.index ? 1 : 0)
          .style("pointer-events", d => d.index === selectedStar.index ? "auto" : "none");
      }
    }
  }, [selectedPlanet]);

  // ROTATE ELEMENTS
  const rotateElements = (direction) => {
    const svg = d3.select(svgRef.current);
    const duration = 1000;
    const rotationSpeed = direction * 360;
    const width = window.innerWidth;
    const height = window.innerHeight;

    svg.selectAll(".star, .planet")
      .transition()
      .duration(duration)
      .ease(d3.easeLinear)
      .attrTween("transform", function () {
        const currentTransform = d3.select(this).attr("transform") || "rotate(0)";
        const currentRotation = (currentTransform.match(/rotate\(([-+]?\d*\.?\d+)\)/) || [0, 0])[1];
        const startAngle = parseFloat(currentRotation) || 0;
        return (t) => `rotate(${startAngle + t * rotationSpeed}, ${width / 2}, ${height / 2})`;
      });
  };

  // Render stars dynamically from skills
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = window.innerWidth;
    const height = window.innerHeight;
    const starGroup = svg.select(".star-group");
    starGroup.selectAll("*").remove();

    if (selectedGalaxy && skills.length > 0) {
      const start = skillPage * totalStarsPerPage;
      const starsToShow = skills.slice(start, start + totalStarsPerPage);
      const starData = starsToShow.map((skill, i) => {
        const angle = (2 * Math.PI * i) / 6;
        return {
          label: skill.name,
          x: width / 2 + 120 * Math.cos(angle),
          y: height / 2 + 120 * Math.sin(angle),
          index: i,
        };
      });

      const stars = starGroup.selectAll(".star")
        .data(starData)
        .enter()
        .append("g")
        .attr("class", "star-container")
        .on("click", (event, d) => {
          event.stopPropagation();
          setSelectedStar(d);
          setSelectedPlanet(null);
        });

      stars.append("circle")
        .attr("class", "star")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", 25)
        .attr("fill", "url(#starGradient)")
        .on("click", function (event, d) {
          event.stopPropagation();
          setSelectedStar(current =>
            current && current.index === d.index ? null : d
          );
          setSelectedPlanet(null);
        });

      stars.append("text")
        .attr("class", "star-label")
        .attr("x", d => d.x)
        .attr("y", d => d.y + 30)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .text(d => d.label);
    }
  }, [selectedGalaxy, skills, skillPage]);

  // Render planets dynamically when a star is selected
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = window.innerWidth;
    const height = window.innerHeight;
    const planetGroup = svg.select(".planet-group");
    planetGroup.selectAll("*").remove();

    if (selectedStar && projects.length > 0) {
      const planetData = projects.map((project, i) => {
        const angle = (2 * Math.PI * i) / projects.length;
        return {
          name: project.name,
          x: width / 2 + 150 * Math.cos(angle),
          y: height / 2 + 150 * Math.sin(angle),
          tasks: project.tasks,
        };
      });

      const planets = planetGroup.selectAll(".planet")
        .data(planetData)
        .enter()
        .append("g")
        .attr("class", "planet-container")
        .on("click", (event, d) => {
          event.stopPropagation();
          setSelectedPlanet(d);
        });

      planets.append("circle")
        .attr("class", "planet")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", 15)
        .attr("fill", "lightblue");

      planets.append("text")
        .attr("class", "planet-label")
        .attr("x", d => d.x)
        .attr("y", d => d.y + 40)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .text(d => d.name);

      // Render tasks as circles on the planet
      planets.each(function (d) {
        const planet = d3.select(this);
        const planetRadius = 15; // Radius of the planet
        const taskRadius = 5;
        d.tasks.forEach((task, i) => {
          const angle = (2 * Math.PI * i) / d.tasks.length;
          const radius = Math.random() * (planetRadius - taskRadius);
          const taskX = d.x + radius * Math.cos(angle);
          const taskY = d.y + radius * Math.sin(angle);

          planet.append("circle")
            .attr("class", "task")
            .attr("cx", taskX)
            .attr("cy", taskY)
            .attr("r", taskRadius)
            .attr("fill", task.assigned_user_ids ? "grey" : (task.skill_id === selectedStar.label ? "green" : "brown"))
            .on("click", (event) => {
              event.stopPropagation();
              setSelectedTask(task);
            });
        });
      });
    }

  }, [selectedStar, projects]);


  const TaskDetailsPopup = ({ task, onClose }) => {
    if (!task) return null;
  
    return (
      <div className="task-details-popup">
        <h2>{task.name}</h2>
        <p>{task.description}</p>
        <p>Assigned Users: {task.assigned_user_ids ? task.assigned_user_ids.join(", ") : "Open"}</p>
        <p>Skill: {task.skill_id}</p>
        <button 
          onClick={() => onClose()} 
          disabled={!!task.assigned_user_ids}
        >
          Accept Task
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  };

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const isLeftArrowDisabled =  skillPage === 0;
    const isRightArrowDisabled = (skillPage + 1) * totalStarsPerPage >= skills.length;
    const handleNextPage = () => {
      if (isCyclingStars) {
        if ((skillPage + 1) * totalStarsPerPage < skills.length) {
          setSkillPage(skillPage + 1);
          rotateElements(1);
        }
      }
    };
    
    const handlePreviousPage = () => {
      if (isCyclingStars) {
        if (skillPage > 0) {
        setSkillPage(skillPage - 1);
        rotateElements(-1);
        }
      }
    };
  
    svg.select(".left-arrow")
      .attr("fill", isLeftArrowDisabled ? "grey" : "white")
      .style("cursor", isLeftArrowDisabled ? "not-allowed" : "pointer")
      .on("click", isLeftArrowDisabled ? null : handlePreviousPage);
  
    svg.select(".right-arrow")
      .attr("fill", isRightArrowDisabled ? "grey" : "white")
      .style("cursor", isRightArrowDisabled ? "not-allowed" : "pointer")
      .on("click", isRightArrowDisabled ? null : handleNextPage);
  }, [skillPage, skills]);

  return (
    <>
      <svg 
        ref={svgRef} 
        viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`} 
        preserveAspectRatio="xMidYMid meet" 
        width="100%" 
        height="100%"
        onClick={() => {
          if (selectedPlanet) {
            setSelectedPlanet(null); // Deselect planet on background click
          }
        }}
      ></svg>
      {selectedTask && (
        <TaskDetailsPopup 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)} 
        />
      )}
    </>
  );
};

export default GalacticMap;