import React, { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import "./GalacticActivityMap.css";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from 'react-router-dom';
import axios from "axios"; // Keep for existing, or switch to apiFetch
import apiFetch from "../../utils/api"; // For new fetches
import ResourceFilterPanel from "../ResourceFilterPanel"; // Import the filter panel
import { Box, CircularProgress, Alert, Paper, Typography, Drawer, TextField } from '@mui/material'; // For UI elements
import FilterListIcon from '@mui/icons-material/FilterList';
import IconButton from '@mui/material/IconButton';


// Performance Note:
// MAP_WIDTH and MAP_HEIGHT are calculated once on component load.
// For a dynamically resizing map, consider using useState and useEffect with a ResizeObserver
// to update these dimensions and trigger a re-render/re-layout.

const GalacticActivityMap = () => {
  const d3Container = useRef(null);
  const [starData, setStarData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { getAccessTokenSilently, isAuthenticated } = useAuth0(); // Added isAuthenticated
  const navigate = useNavigate();
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  
  const [filters, setFilters] = useState({
    category: '',
    tags: '', // Store as string, convert to array for API
    available_now: false,
    verified_owner: false,
    duration_type: '',
    // Bounding box for map, managed internally by map interactions
    min_lat: null, max_lat: null, min_lon: null, max_lon: null, 
  });
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);


  const getStarColor = (item) => {
    const status = item.status ? item.status.toLowerCase() : 'default';
    const type = item.type.toLowerCase();

    if (type === "need") {
        if (item.urgency === "critical") return "#FF4500"; // OrangeRed for critical needs
        if (item.urgency === "high") return "#FFD700"; // Gold for high urgency needs
        return "#ADD8E6"; // LightBlue for other needs
    }
    if (type === "resource") {
        if (status === "available") return "#90EE90"; // LightGreen for available resources
        return "#D3D3D3"; // LightGrey for other resources
    }
    // Existing logic for tasks, projects, communities
    if (status.includes("urgent")) return "#ff0000"; 
    if (status.includes("completed") || status.includes("archived")) return "#ff69b4";
    if (status.includes("submitted")) return "#ffa500";
    if (status.startsWith("active")) return "#00ff00";
    if (status.includes("inactive")) return "#00bfff";
    return "#ffffff";
  };

  const getStarRadius = (item) => {
    const now = new Date();
    const lastActivity = item.lastActivity || item.updated_at || item.created_at || Date.now();
    const ageDays = (now - new Date(lastActivity)) / (1000 * 60 * 60 * 24);
    
    let baseRadius;
    switch(item.type) {
        case "task": baseRadius = 0.5; break;
        case "project": baseRadius = 1; break;
        case "community": baseRadius = 1.75; break;
        case "need": baseRadius = 0.8; break; // Example size for needs
        case "resource": baseRadius = 0.8; break; // Example size for resources
        default: baseRadius = 0.7;
    }

    const status = item.status ? item.status.toLowerCase() : '';
    if (status.includes("urgent") || item.urgency === "critical" || item.urgency === "high") baseRadius *= 1.3;
    
    const ageScale = Math.max(0.4, 1 - ageDays / 60);
    let contributors = item.contributors || 0;
    if (item.type === 'need' && item.quantity_needed) contributors = parseFloat(item.quantity_needed) || 1; // Use quantity for needs
    if (item.type === 'resource' && item.quantity) contributors = parseFloat(item.quantity) || 1; // Use quantity for resources

    return baseRadius * ageScale + Math.min(contributors / 8, 1);
  };

  const getStarBrightness = (item) => {
    const now = new Date();
    const lastActivity = item.lastActivity || item.updated_at || item.created_at || Date.now();
    const diffDays = (now - new Date(lastActivity)) / (1000 * 60 * 60 * 24);
    return Math.max(0.15, 1 - diffDays / 30);
  };

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return; // Don't fetch if not authenticated

    setIsLoading(true);
    setError(null);
    try {
      const token = await getAccessTokenSilently();
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      // Construct query parameters from filters state
      const queryParams = new URLSearchParams();
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.tags) queryParams.append('tags', filters.tags); // Assuming backend handles comma-separated string
      if (filters.available_now) queryParams.append('available_now', 'true');
      if (filters.verified_owner) queryParams.append('verified_owner', 'true');
      if (filters.duration_type) queryParams.append('duration_type', filters.duration_type);
      if (filters.min_lat) queryParams.append('min_lat', filters.min_lat);
      if (filters.max_lat) queryParams.append('max_lat', filters.max_lat);
      if (filters.min_lon) queryParams.append('min_lon', filters.min_lon);
      if (filters.max_lon) queryParams.append('max_lon', filters.max_lon);
      
      const queryString = queryParams.toString();

      // Use axios for existing, apiFetch for new ones or migrate all
      const [tasksRes, projectsRes, communitiesRes, needsRes, resourcesRes] = await Promise.all([
        axios.get("http://localhost:4000/tasks", config), // Keep existing or migrate
        axios.get("http://localhost:4000/projects", config), // Keep existing or migrate
        axios.get("http://localhost:4000/communities", config), // Keep existing or migrate
        apiFetch(`/api/needs?${queryString}`), // New: fetch needs with filters
        apiFetch(`/api/resources?${queryString}`), // New: fetch resources with filters
      ]);

      const processedData = [];
      // Process tasks, projects, communities (existing logic)
        tasksRes.data.forEach((task) => {
          processedData.push({
            id: `task-${task.id}`, type: "task", name: task.name, status: task.status || "inactive",
            lastActivity: new Date(task.updated_at || task.created_at),
            contributors: task.assigned_user_ids ? task.assigned_user_ids.length : 0,
            raw_data: task, x: task.longitude, y: task.latitude // Assuming tasks might have lat/lon
          });
        });
        projectsRes.data.forEach((project) => {
          let projectStatus = "active"; // Simplified status logic
          processedData.push({
            id: `project-${project.id}`, type: "project", name: project.name, status: projectStatus,
            lastActivity: new Date(project.updated_at || project.created_at || Date.now()),
            contributors: project.creator_id ? 1 : 0, // Simplified contributors
            raw_data: project, x: project.longitude, y: project.latitude // Assuming projects might have lat/lon
          });
        });
        const communities = communitiesRes.data.communities || communitiesRes.data;
        communities.forEach((community) => {
          processedData.push({
            id: `community-${community.id}`, type: "community", name: community.name, status: "active",
            lastActivity: new Date(community.updated_at || community.created_at || Date.now()),
            contributors: community.members ? community.members.length : 0,
            raw_data: community, x: community.longitude, y: community.latitude // Assuming communities might have lat/lon
          });
        });

      // Process needs
      (needsRes || []).forEach(need => {
        processedData.push({
          id: `need-${need.id}`, type: 'need', name: need.name, status: need.status || 'open',
          lastActivity: new Date(need.updated_at || need.created_at),
          urgency: need.urgency, quantity_needed: need.quantity_needed, // For radius/color
          x: need.longitude, y: need.latitude, // Use actual lat/lon
          raw_data: need,
        });
      });

      // Process resources
      (resourcesRes || []).forEach(resource => {
        processedData.push({
          id: `resource-${resource.id}`, type: 'resource', name: resource.name, status: resource.status || 'available',
          lastActivity: new Date(resource.updated_at || resource.created_at),
          quantity: resource.quantity, // For radius/color
          x: resource.longitude, y: resource.latitude, // Use actual lat/lon
          raw_data: resource,
        });
      });
      
      setStarData(processedData);
    } catch (err) {
      setError(err.message || "Failed to fetch data");
      console.error("Fetch Data Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [getAccessTokenSilently, isAuthenticated, filters]); // Added filters to dependency array

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prevFilters => ({ ...prevFilters, ...newFilters }));
    // fetchData will be called by the useEffect watching 'filters' state.
  }, []);
  
  // Placeholder for map bounds change handling
  // This would be called by the D3 map component when zoom/pan occurs
  const handleMapBoundsChange = useCallback((bounds) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      min_lat: bounds.min_lat,
      max_lat: bounds.max_lat,
      min_lon: bounds.min_lon,
      max_lon: bounds.max_lon,
    }));
     // fetchData will be called by the useEffect watching 'filters' state.
  }, []);


  // useEffect for D3 rendering
  useEffect(() => {
    window.twinkleTimeoutIds = window.twinkleTimeoutIds || [];
    d3.select("body").selectAll(".galactic-tooltip-managed-by-d3").remove();
    const tooltipD3 = d3.select("body").append("div")
      .attr("class", "galactic-tooltip galactic-tooltip-managed-by-d3")
      .style("opacity", 0).style("position", "absolute")
      .style("pointer-events", "none").style("z-index", 1000);

    if (d3Container.current && !isLoading && !error && starData.length > 0) {
      const { clientWidth, clientHeight } = d3Container.current;
      // Update mapDimensions state if needed, or use clientWidth/Height directly
       if (mapDimensions.width !== clientWidth || mapDimensions.height !== clientHeight) {
        setMapDimensions({ width: clientWidth, height: clientHeight });
      }


      // D3 Scale for mapping lat/lon to x/y screen coordinates
      // This is a placeholder. A real implementation would need to consider
      // the actual range of lat/lon in your data and the desired map projection.
      // For now, we'll normalize based on the data's extent if available, else random.
      let latExtent = d3.extent(starData, d => d.y); // d.y is latitude
      let lonExtent = d3.extent(starData, d => d.x); // d.x is longitude

      // If no valid lat/lon data, use random placement within clientWidth/clientHeight
      const useRandomPlacement = !latExtent[0] || !lonExtent[0];

      const xScale = useRandomPlacement ? 
                       () => Math.random() * clientWidth :
                       d3.scaleLinear().domain(lonExtent).range([50, clientWidth - 50]); // Add padding
      const yScale = useRandomPlacement ?
                       () => Math.random() * clientHeight :
                       d3.scaleLinear().domain(latExtent).range([clientHeight - 50, 50]); // Inverted for typical map display, add padding


      let svg = d3.select(d3Container.current).select("svg");
      if (svg.empty()) {
        svg = d3.select(d3Container.current).append("svg");
      }
      svg.selectAll("*").remove(); // Clear previous render

      svg.attr("viewBox", `0 0 ${clientWidth} ${clientHeight}`)
         .attr("preserveAspectRatio", "xMidYMid meet")
         .attr("width", "100%").attr("height", "100%");

      // Definitions (gradient, glow filter) - existing logic largely unchanged
      const defs = svg.append("defs");
      // ... (gradient and glow filter definitions from existing code) ...
      const gradient = defs.append("radialGradient").attr("id", "starGradient").attr("cx", "50%").attr("cy", "50%").attr("r", "50%");
      gradient.append("stop").attr("offset", "0%").attr("stop-color", "#ffffff").attr("stop-opacity", 1);
      gradient.append("stop").attr("offset", "100%").attr("stop-color", "#ffffff").attr("stop-opacity", 0);
      const filter = defs.append("filter").attr("id", "glow");
      filter.append("feGaussianBlur").attr("stdDeviation", "3.5").attr("result", "coloredBlur");
      const feMerge = filter.append("feMerge");
      feMerge.append("feMergeNode").attr("in", "coloredBlur");
      feMerge.append("feMergeNode").attr("in", "SourceGraphic");


      const itemsToRender = starData.map(d => ({
        ...d,
        // Use scaled x/y if lat/lon exist, otherwise use existing random or pre-calculated x/y
        finalX: d.x && d.y && !useRandomPlacement ? xScale(d.x) : (d.x || Math.random() * clientWidth),
        finalY: d.x && d.y && !useRandomPlacement ? yScale(d.y) : (d.y || Math.random() * clientHeight),
      }));


      const visualStars = svg.selectAll(".star")
        .data(itemsToRender, d => d.id)
        .enter().append("circle")
        .attr("class", d => `star star-${d.type} star-status-${(d.status || 'default').toLowerCase().split("-")[0]}`)
        .attr("cx", d => d.finalX)
        .attr("cy", d => d.finalY)
        .attr("r", d => getStarRadius(d))
        .attr("fill", d => getStarColor(d)) // Removed "url(#starGradient)" for clarity with type-based colors
        .attr("opacity", d => getStarBrightness(d))
        .style("filter", "url(#glow)")
        .style("animation-delay", () => `${Math.random() * 3}s`);

      const eventCircles = svg.selectAll(".star-event-radius")
        .data(itemsToRender, d => d.id)
        .enter().append("circle")
        .attr("class", "star-event-radius")
        .attr("cx", d => d.finalX)
        .attr("cy", d => d.finalY)
        .attr("r", d => getStarRadius(d) + 10)
        .style("fill", "transparent").style("cursor", "pointer");
      
      eventCircles.on("mouseover", (event, d) => {
        tooltipD3.transition().duration(200).style("opacity", .9);
        let tooltipContent = `<div class="tooltip-name">${d.name} (${d.type})</div>`;
        if (d.status) tooltipContent += `<div class="tooltip-status">Status: ${d.status}</div>`;
        if (d.urgency) tooltipContent += `<div class="tooltip-urgency">Urgency: ${d.urgency}</div>`;
        if (d.lastActivity) tooltipContent += `<div class="tooltip-activity">Last Active: ${new Date(d.lastActivity).toLocaleDateString()}</div>`;
        if (d.contributors) tooltipContent += `<div class="tooltip-contributors">Contributors: ${d.contributors}</div>`;
        if (d.quantity_needed) tooltipContent += `<div>Quantity Needed: ${d.quantity_needed}</div>`;
        if (d.quantity) tooltipContent += `<div>Quantity: ${d.quantity}</div>`;
        
        tooltipD3.html(tooltipContent)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => tooltipD3.transition().duration(500).style("opacity", 0))
      .on("click", (event, d) => {
        const [type, idOnly] = d.id.split('-');
        if (type === "task" && d.raw_data.project_id) navigate(`/visualizer/${d.raw_data.project_id}/${idOnly}`);
        else if (type === "project") navigate(`/visualizer/${idOnly}/`);
        else if (type === "community") navigate(`/communityhub/${idOnly}`);
        else if (type === "need") navigate(`/needs/${idOnly}`); // Placeholder route
        else if (type === "resource") navigate(`/resources/${idOnly}`); // Placeholder route
      });

      // Sonar ping for urgent/critical items (simplified)
      const urgentItems = itemsToRender.filter(d => (d.status && d.status.toLowerCase().includes("urgent")) || d.urgency === "critical");
      svg.selectAll(".sonar-ping-effect").data(urgentItems, d => d.id)
        .enter().append("circle").attr("class", "sonar-ping-effect")
        .attr("cx", d => d.finalX).attr("cy", d => d.finalY)
        .attr("r", 0).attr("fill", "none")
        .attr("stroke", d => getStarColor(d)).style("pointer-events", "none");

      // Twinkling animation (existing logic)
        if (window.starTwinkleIntervalId) clearInterval(window.starTwinkleIntervalId);
        window.twinkleTimeoutIds.forEach(clearTimeout);
        window.twinkleTimeoutIds = [];

        const allStarD3Elements = [];
        visualStars.each(function() { allStarD3Elements.push(d3.select(this)); });

        if (allStarD3Elements.length > 0) {
            window.starTwinkleIntervalId = setInterval(() => {
                const validStars = allStarD3Elements.filter(el => el.node() && el.node().parentNode);
                const shuffledStars = [...validStars].sort(() => 0.5 - Math.random());
                const count = Math.max(1, Math.floor(validStars.length * 0.20));
                shuffledStars.slice(0, count).forEach(starEl => {
                    const randomDelay = Math.random() * 20000;
                    const outerId = setTimeout(() => {
                        if (starEl.node() && starEl.node().parentNode && !starEl.classed('star-is-twinkling')) {
                            starEl.classed('star-is-twinkling', true);
                            const innerId = setTimeout(() => {
                                starEl.classed('star-is-twinkling', false);
                                window.twinkleTimeoutIds = window.twinkleTimeoutIds.filter(id => id !== innerId);
                            }, 800);
                            window.twinkleTimeoutIds.push(innerId);
                        }
                        window.twinkleTimeoutIds = window.twinkleTimeoutIds.filter(id => id !== outerId);
                    }, randomDelay);
                    window.twinkleTimeoutIds.push(outerId);
                });
            }, 20000);
        }


    } else if (d3Container.current && (isLoading || error)) {
      d3.select(d3Container.current).select("svg").selectAll("*").remove();
    }
    return () => {
      d3.select("body").selectAll(".galactic-tooltip-managed-by-d3").remove();
      if (window.starTwinkleIntervalId) clearInterval(window.starTwinkleIntervalId);
      if (window.twinkleTimeoutIds) window.twinkleTimeoutIds.forEach(clearTimeout);
      window.twinkleTimeoutIds = [];
    };
  }, [starData, isLoading, error, navigate, mapDimensions]); // mapDimensions added

  const toggleFilterDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setIsFilterDrawerOpen(open);
  };


  if (!isAuthenticated) { // Check if user is authenticated
    return (
      <Paper sx={{p:3, textAlign: 'center'}}>
        <Typography variant="h6">Please log in to view the Galactic Activity Map.</Typography>
      </Paper>
    );
  }


  return (
    <div className="galactic-activity-map-container">
      <IconButton 
        onClick={toggleFilterDrawer(true)}
        sx={{position: 'absolute', top: 10, left: 10, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.7)'}}
      >
        <FilterListIcon />
      </IconButton>
      <Drawer anchor="left" open={isFilterDrawerOpen} onClose={toggleFilterDrawer(false)}>
        <Box sx={{ width: 300, p: 2 }} role="presentation">
          <Typography variant="h6" gutterBottom>Map Filters</Typography>
          <ResourceFilterPanel onFilterChange={handleFilterChange} initialFilters={filters} />
           {/* Add map bounds inputs for testing if needed, or rely on map interaction */}
           <TextField label="Min Lat" type="number" value={filters.min_lat || ''} onChange={e => setFilters(f => ({...f, min_lat: e.target.value ? parseFloat(e.target.value) : null}))} fullWidth margin="dense" size="small"/>
           <TextField label="Max Lat" type="number" value={filters.max_lat || ''} onChange={e => setFilters(f => ({...f, max_lat: e.target.value ? parseFloat(e.target.value) : null}))} fullWidth margin="dense" size="small"/>
           <TextField label="Min Lon" type="number" value={filters.min_lon || ''} onChange={e => setFilters(f => ({...f, min_lon: e.target.value ? parseFloat(e.target.value) : null}))} fullWidth margin="dense" size="small"/>
           <TextField label="Max Lon" type="number" value={filters.max_lon || ''} onChange={e => setFilters(f => ({...f, max_lon: e.target.value ? parseFloat(e.target.value) : null}))} fullWidth margin="dense" size="small"/>
        </Box>
      </Drawer>

      {isLoading && (
        <Box sx={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', zIndex: 20}}>
            <CircularProgress />
            <Typography>Loading celestial data...</Typography>
        </Box>
      )}
      {error && !isLoading && (
         <Box sx={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 20}}>
            <Alert severity="error">Error: {error}</Alert>
        </Box>
      )}

      <div ref={d3Container} style={{ width: "100%", height: "100%", position: "relative", margin: "0 auto", boxSizing: "border-box" }}>
        {/* SVG is managed by D3 */}
      </div>
    </div>
  );
};

export default GalacticActivityMap;
