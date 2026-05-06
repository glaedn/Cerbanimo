import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as d3 from "d3";
import "./GalacticActivityMap.css";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate, useLocation } from 'react-router-dom';
import axios from "axios";
import { useCrisis } from "../../context/CrisisContext";
import { useUserProfile } from "../../hooks/useUserProfile";
import { useIsMobile } from "../../hooks/useIsMobile";

const GalacticActivityMap = ({ showLoadingText = true, enableTooltips = true, enableClicks = true }) => {
  const d3Container = useRef(null);
  const { isCrisisMode } = useCrisis();
  const { profile } = useUserProfile();
  const isMobile = useIsMobile();
  const location = useLocation();
  const isFullscreenMobile = location.pathname === '/activity-map';
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const navigate = useNavigate();

  const [mapState, setMapState] = useState({
    starData: [],
    links: [],
    isLoading: true,
    error: null,
  });
  const { starData, links, isLoading, error } = mapState;

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const hasWarped = useRef(false);
  const isFetching = useRef(false);

  // Track dimensions with immediate check and observer
  useEffect(() => {
    const updateDimensions = () => {
      if (d3Container.current) {
        const { clientWidth, clientHeight } = d3Container.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setDimensions(prev => {
            if (Math.abs(prev.width - clientWidth) < 2 && Math.abs(prev.height - clientHeight) < 2) return prev;
            return { width: clientWidth, height: clientHeight };
          });
        }
      }
    };

    updateDimensions();
    const ro = new ResizeObserver(updateDimensions);
    if (d3Container.current) ro.observe(d3Container.current);

    return () => ro.disconnect();
  }, []);

  const getStarColor = (item) => {
    if (item.type === "need") return "#ff00ff";
    if (item.type === "resource") return "#00ffff";
    const status = (item.status || "").toLowerCase();
    if (status.includes("urgent") || status.includes("critical")) return "#ff0000";
    if (status.includes("completed") || status.includes("archived")) return "#ff69b4";
    if (status.includes("submitted")) return "#ffa500";
    if (status.startsWith("active")) return "#00ff00";
    if (status.includes("inactive")) return "#00bfff";
    return "#ffffff";
  };

  const getStarRadius = useCallback((item) => {
    const lastAct = new Date(item.lastActivity);
    const ageDays = isNaN(lastAct) ? 0 : (Date.now() - lastAct) / 86400000;
    let baseRadius = item.type === "task" ? 0.6 : item.type === "project" ? 1.2 : 2;
    if ((item.status || "").toLowerCase().includes("urgent")) baseRadius *= 1.3;
    const radius = baseRadius * Math.max(0.4, 1 - ageDays / 60) + Math.min((item.contributors || 0) / 8, 1);
    return isFullscreenMobile ? radius * 2.5 : radius;
  }, [isFullscreenMobile]);

  const getRelevanceScore = useCallback((item) => {
    let score = 0;
    const lastAct = new Date(item.lastActivity);
    const ageDays = isNaN(lastAct) ? 30 : (Date.now() - lastAct) / 86400000;
    score += Math.max(0, 0.5 * (1 - ageDays / 30));
    const status = (item.status || "").toLowerCase();
    if (status.includes('urgent') || status.includes('critical')) score += 0.3;
    else if (status.includes('active')) score += 0.15;
    if (item.type === 'community') score += 0.2;
    else if (item.type === 'need') score += 0.15;
    else if (item.type === 'project') score += 0.1;
    else score += 0.05;
    return Math.min(1, score);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (isFetching.current) return;
      isFetching.current = true;
      if (starData.length === 0) setMapState(prev => ({ ...prev, isLoading: true }));

      try {
        let token = null;
        if (isAuthenticated) {
          try {
            token = await getAccessTokenSilently({
              authorizationParams: { audience: `${import.meta.env.VITE_BACKEND_URL}`, scope: "openid profile email" },
            });
          } catch (authErr) { console.warn("Auth token fail", authErr); }
        }

        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        const fetchWithFallback = async (url) => {
          try { return (await axios.get(url, config)).data; }
          catch (e) { console.warn("Fetch fail", url, e); return []; }
        };

        const [tasksData, projectsData, communitiesRaw, needsData, resourcesData] = await Promise.all([
          fetchWithFallback(`${import.meta.env.VITE_BACKEND_URL}/tasks`),
          fetchWithFallback(`${import.meta.env.VITE_BACKEND_URL}/projects`),
          fetchWithFallback(`${import.meta.env.VITE_BACKEND_URL}/communities`),
          fetchWithFallback(`${import.meta.env.VITE_BACKEND_URL}/needs`),
          fetchWithFallback(`${import.meta.env.VITE_BACKEND_URL}/resources/catalog`),
        ]);

        const tasks = Array.isArray(tasksData) ? tasksData : [];
        const projects = Array.isArray(projectsData) ? projectsData : [];
        const needs = Array.isArray(needsData) ? needsData : [];
        const resources = Array.isArray(resourcesData) ? resourcesData : [];
        const communities = communitiesRaw?.communities || communitiesRaw || [];
        const needsBoardProject = projects.find(p => p.name === 'Needs Board');

        const processedData = [];
        communities.forEach(c => processedData.push({ id: `community-${c.id}`, type: "community", name: c.name, status: "active", lastActivity: new Date(c.updated_at || c.created_at || Date.now()), contributors: c.members?.length || 0, raw_data: c }));
        needs.forEach(n => processedData.push({ id: `need-${n.id}`, type: "need", name: n.name, status: n.urgency_level || n.urgency || "medium", lastActivity: new Date(n.updated_at || n.created_at || Date.now()), contributors: 0, parentId: n.requestor_community_id ? `community-${n.requestor_community_id}` : (needsBoardProject ? `project-${needsBoardProject.id}` : null), raw_data: n }));
        projects.forEach(p => {
          const pTasks = tasks.filter(t => t.project_id === p.id);
          const status = pTasks.some(t => (t.status || "").toLowerCase().includes("urgent")) ? "urgent" : (pTasks.some(t => (t.status || "").toLowerCase().startsWith("active")) ? "active" : "inactive");
          const relatedNeed = needs.find(n => n.linked_project_id === p.id || n.project_id === p.id);
          processedData.push({ id: `project-${p.id}`, type: "project", name: p.name, status, lastActivity: new Date(p.updated_at || p.created_at || Date.now()), contributors: p.creator_id ? 1 : 0, parentId: relatedNeed ? `need-${relatedNeed.id}` : (p.community_id ? `community-${p.community_id}` : null), raw_data: p });
        });
        tasks.forEach(t => {
          let parentId = t.dependencies?.[0] ? `task-${t.dependencies[0]}` : (t.project_id ? (needsBoardProject && t.project_id === needsBoardProject.id && t.related_need_id ? `need-${t.related_need_id}` : `project-${t.project_id}`) : (t.related_need_id ? `need-${t.related_need_id}` : null));
          processedData.push({ id: `task-${t.id}`, type: "task", name: t.name, status: t.status || "inactive", lastActivity: new Date(t.updated_at || t.created_at || Date.now()), contributors: t.assigned_user_ids?.length || 0, parentId, raw_data: t });
        });
        resources.forEach(r => {
          const relatedNeed = r.owner_community_id ? needs.find(n => n.requestor_community_id === r.owner_community_id && n.category === r.category) : null;
          processedData.push({ id: `resource-${r.id}`, type: "resource", name: r.name, status: r.status || "available", lastActivity: new Date(r.updated_at || r.created_at || Date.now()), contributors: 0, parentId: relatedNeed ? `need-${relatedNeed.id}` : (r.owner_community_id ? `community-${r.owner_community_id}` : null), raw_data: r });
        });

        let filtered = isCrisisMode ? processedData.filter(d => (d.type === 'need' && /(urgent|critical|high)/.test(d.status.toLowerCase())) || (d.type === 'resource' && d.status.toLowerCase() === 'available') || (d.type === 'task' && d.status.toLowerCase().includes('urgent'))) : processedData;

        if (isMobile && !isFullscreenMobile && profile) {
          const fifteenDaysAgo = Date.now() - 1296000000;
          const userSkillIds = new Set((profile.skills || []).map(s => s.id));
          const userCommunityIds = new Set(communities.filter(c => c.members?.includes(profile.id)).map(c => c.id));
          const relevantIds = new Set();
          filtered.forEach(item => {
            const itemDate = new Date(item.raw_data.created_at || item.raw_data.updated_at).getTime();
            const isRecent = !isNaN(itemDate) && itemDate > fifteenDaysAgo;
            if ((item.type === 'community' && userCommunityIds.has(item.raw_data.id)) || (item.type === 'project' && (userCommunityIds.has(item.raw_data.community_id) || isRecent)) || (item.type === 'task' && (userSkillIds.has(item.raw_data.skill_id) || isRecent)) || ((item.type === 'need' || item.type === 'resource') && (isRecent || userCommunityIds.has(item.raw_data.requestor_community_id || item.raw_data.owner_community_id)))) {
              relevantIds.add(item.id);
              let curr = item, depth = 0;
              while (curr && curr.parentId && depth < 10) { relevantIds.add(curr.parentId); curr = filtered.find(d => d.id === curr.parentId); depth++; }
            }
          });
          if (relevantIds.size < 5) filtered.sort((a, b) => b.lastActivity - a.lastActivity).slice(0, 10).forEach(d => relevantIds.add(d.id));
          filtered = filtered.filter(d => relevantIds.has(d.id));
        }

        const newLinks = [];
        filtered.forEach(item => { if (item.parentId && filtered.some(d => d.id === item.parentId)) newLinks.push({ source: item.parentId, target: item.id }); });

        setMapState({ starData: filtered, links: newLinks, isLoading: false, error: null });
      } catch (err) { setMapState(prev => ({ ...prev, error: err.message, isLoading: false })); }
      finally { isFetching.current = false; }
    };
    fetchData();
  }, [isAuthenticated, isCrisisMode, profile?.id, isMobile, isFullscreenMobile]);

  useEffect(() => {
    d3.select("body").selectAll(".galactic-tooltip-managed-by-d3").remove();
    const tooltipD3 = d3.select("body").append("div").attr("class", "galactic-tooltip galactic-tooltip-managed-by-d3").style("opacity", 0).style("position", "absolute").style("pointer-events", isFullscreenMobile ? "auto" : "none").style("z-index", 1000);

    const navigateToNode = (d) => {
      const [type, idOnly] = d.id.split('-');
      if (type === "task" && d.raw_data.project_id) navigate(`/visualizer/${d.raw_data.project_id}/${idOnly}`);
      else if (type === "project") navigate(`/visualizer/${idOnly}/`);
      else if (type === "community") navigate(`/communityhub/${idOnly}`);
    };

    const handleGlobalNavClick = (e) => {
       if (e.target.classList.contains('tooltip-nav-btn')) {
         const d = starData.find(n => n.id === e.target.getAttribute('data-id'));
         if (d) { navigateToNode(d); tooltipD3.style("opacity", 0).style("pointer-events", "none"); }
       }
    };
    document.addEventListener('click', handleGlobalNavClick);

    if (d3Container.current && !isLoading && !error && starData.length > 0 && dimensions.width > 0) {
      const { width: clientWidth, height: clientHeight } = dimensions;
      let svg = d3.select(d3Container.current).select("svg");
      if (svg.empty()) svg = d3.select(d3Container.current).append("svg");
      svg.selectAll("*").remove();
      svg.attr("viewBox", `0 0 ${clientWidth} ${clientHeight}`).attr("width", "100%").attr("height", "100%");

      const defs = svg.append("defs");
      const filter = defs.append("filter").attr("id", "glow");
      filter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "blur");
      const feMerge = filter.append("feMerge");
      feMerge.append("feMergeNode").attr("in", "blur");
      feMerge.append("feMergeNode").attr("in", "SourceGraphic");

      const g = svg.append("g").attr("class", "map-content");

      if (enableClicks) {
        const zoom = d3.zoom().scaleExtent([0.1, 8]).on("zoom", (e) => g.attr("transform", e.transform));
        svg.call(zoom);
        if (!hasWarped.current) {
          svg.call(zoom.transform, d3.zoomIdentity.translate(clientWidth / 2, clientHeight / 2).scale(0.1).translate(-clientWidth / 2, -clientHeight / 2));
          svg.transition().duration(2000).ease(d3.easeExpOut).call(zoom.transform, d3.zoomIdentity);
          hasWarped.current = true;
        }
      }

      const getSeededPos = (id, w, h) => {
        let hash = 0;
        for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
        const radius = Math.min(w, h) * 0.4;
        const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
        const dist = (Math.abs(hash * 13) % radius);
        return { x: w / 2 + dist * Math.cos(angle), y: h / 2 + dist * Math.sin(angle) };
      };

      const nodes = starData.map(d => ({ ...d, ...getSeededPos(d.id, clientWidth, clientHeight) }));
      const constellationLinks = links.map(l => ({ source: nodes.find(n => n.id === l.source), target: nodes.find(n => n.id === l.target) })).filter(l => l.source && l.target);

      const minDim = Math.min(clientWidth, clientHeight);
      const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(constellationLinks).id(d => d.id).distance(isFullscreenMobile ? 100 : 40).strength(1))
        .force("charge", d3.forceManyBody().strength(isFullscreenMobile ? -150 : -40))
        .force("radial", d3.forceRadial(d => (1 - getRelevanceScore(d)) * minDim * 0.45, clientWidth / 2, clientHeight / 2).strength(1))
        .force("collide", d3.forceCollide().radius(d => getStarRadius(d) + (isFullscreenMobile ? 35 : 15)))
        .stop();

      for (let i = 0; i < (isMobile ? 30 : 100); ++i) simulation.tick();

      g.selectAll(".link").data(constellationLinks).enter().append("line").attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y).attr("stroke", "rgba(255,255,255,0.08)").attr("stroke-width", 1);
      g.selectAll(".star").data(nodes, d => d.id).enter().append("circle").attr("class", d => `star star-${d.type}`).attr("cx", d => d.x).attr("cy", d => d.y).attr("r", d => getStarRadius(d)).attr("fill", d => getStarColor(d)).attr("opacity", d => Math.max(0.2, 1 - (Date.now() - new Date(d.lastActivity)) / 3888000000)).style("filter", "url(#glow)");

      const eventCircles = g.selectAll(".event").data(nodes, d => d.id).enter().append("circle").attr("cx", d => d.x).attr("cy", d => d.y).attr("r", d => getStarRadius(d) + (isFullscreenMobile ? 30 : 10)).attr("fill", "transparent").style("cursor", (enableClicks && !isFullscreenMobile) ? "pointer" : "default").style("pointer-events", (enableClicks || enableTooltips) ? "auto" : "none");

      if (enableTooltips && !isFullscreenMobile) {
        eventCircles.on("mouseover", (event, d) => {
          tooltipD3.transition().duration(200).style("opacity", 0.9);
          tooltipD3.html(`<div class="tooltip-name">${d.name}</div><div class="tooltip-status">${d.status}</div>`).style("left", (event.pageX + 10) + "px").style("top", (event.pageY + 10) + "px");
        }).on("mouseout", () => tooltipD3.transition().duration(500).style("opacity", 0));
      }

      if (enableClicks && !isFullscreenMobile) eventCircles.on("click", (event, d) => navigateToNode(d));

      if (enableClicks && isFullscreenMobile) {
        let lastTap = 0;
        svg.on("touchstart", (event) => {
          const now = Date.now(), touch = event.touches[0];
          const pt = svg.node().createSVGPoint();
          pt.x = touch.clientX; pt.y = touch.clientY;
          const cursor = pt.matrixTransform(svg.node().getScreenCTM().inverse());
          const d = nodes.find(n => Math.hypot(n.x - cursor.x, n.y - cursor.y) < (getStarRadius(n) + 40));
          if (d) {
            if (now - lastTap < 300) { navigateToNode(d); tooltipD3.style("opacity", 0); }
            else {
              tooltipD3.transition().duration(200).style("opacity", 0.9).style("pointer-events", "auto");
              tooltipD3.html(`<div class="tooltip-name">${d.name}</div><div class="tooltip-status">${d.status}</div><button class="tooltip-nav-btn" data-id="${d.id}" style="margin-top:10px;width:100%;background:#00f3ff;border:none;padding:8px;font-family:Orbitron;font-weight:bold;color:#000;">VIEW DETAILS</button>`).style("left", (touch.pageX + 10) + "px").style("top", (touch.pageY + 10) + "px");
            }
          } else if (!event.target.closest('.galactic-tooltip')) { tooltipD3.transition().duration(500).style("opacity", 0).style("pointer-events", "none"); }
          lastTap = now;
        });
      }
    }
    return () => { d3.select("body").selectAll(".galactic-tooltip-managed-by-d3").remove(); document.removeEventListener('click', handleGlobalNavClick); };
  }, [starData, links, isLoading, error, dimensions, isMobile, isFullscreenMobile, navigate, enableClicks, enableTooltips, getStarRadius, getRelevanceScore]);

  if (isLoading && starData.length === 0) return showLoadingText ? <div className="galactic-activity-map-container"><h1>Galactic Activity Map</h1><p>Loading...</p></div> : null;

  return (
    <div className="galactic-activity-map-container">
      <div ref={d3Container} style={{ width: "100%", height: "100%", position: "relative", boxSizing: "border-box" }} />
    </div>
  );
};

export default GalacticActivityMap;
