import React, { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import "./GalacticActivityMap.css";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate, useLocation } from 'react-router-dom';
import axios from "axios";
import { useCrisis } from "../../context/CrisisContext";
import { useLoFi } from "../../context/LoFiContext";
import { useUserProfile } from "../../hooks/useUserProfile";
import LoFiActivityList from "./LoFiActivityList";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useAppStore } from "../../store/useAppStore";

const GalacticActivityMap = ({ showLoadingText = true, enableTooltips = true, enableClicks = true }) => {
  const d3Container = useRef(null);
  const { isCrisisMode } = useCrisis();
  const { isLoFiMode } = useLoFi();
  const { profile } = useUserProfile();
  const isMobile = useIsMobile();
  const location = useLocation();
  const { entities, relationships, selectEntity, selectedEntity } = useAppStore();
  const isFullscreenMobile = location.pathname === '/activity-map';
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const navigate = useNavigate();

  const [mapState, setMapState] = useState({ starData: [], links: [], isLoading: true, error: null });
  const { starData, links, isLoading, error } = mapState;
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const hasWarped = useRef(false);
  const isFetching = useRef(false);
  const simulationRef = useRef(null);
  const nodesRef = useRef([]);

  useEffect(() => {
    const update = () => {
      if (d3Container.current) {
        const { clientWidth: w, clientHeight: h } = d3Container.current;
        if (w > 0 && h > 0) {
          setDimensions(p => {
            if (Math.abs(p.width - w) < 5 && Math.abs(p.height - h) < 5) return p;
            return { width: w, height: h };
          });
        }
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (d3Container.current) ro.observe(d3Container.current);
    return () => ro.disconnect();
  }, []);

  const getStarColor = (item) => {
    if (item.type === "need") return "#ff00ff";
    if (item.type === "resource") return "#00ffff";
    const s = (item.status || "").toLowerCase();
    if (s.includes("urgent") || s.includes("critical")) return "#ff0000";
    if (s.includes("completed") || s.includes("archived")) return "#ff69b4";
    if (s.includes("submitted")) return "#ffa500";
    if (s.startsWith("active")) return "#00ff00";
    if (s.includes("inactive")) return "#00bfff";
    return "#ffffff";
  };

  const getStarRadius = useCallback((item) => {
    const age = (Date.now() - new Date(item.lastActivity).getTime()) / 86400000;
    let r = item.type === "task" ? 1.5 : item.type === "project" ? 3 : 5;
    if ((item.status || "").toLowerCase().includes("urgent")) r *= 1.5;
    r = r * Math.max(0.5, 1 - age / 90) + Math.min((item.contributors || 0) / 4, 2);
    return isFullscreenMobile ? r * 1.5 : r;
  }, [isFullscreenMobile]);

  const getRelevance = useCallback((item) => {
    let s = 0;
    const age = (Date.now() - new Date(item.lastActivity).getTime()) / 86400000;
    s += Math.max(0, 0.5 * (1 - age / 30));
    const st = (item.status || "").toLowerCase();
    if (st.includes('urgent') || st.includes('critical')) s += 0.3;
    else if (st.includes('active')) s += 0.15;
    if (item.type === 'community') s += 0.2;
    else if (item.type === 'need') s += 0.15;
    else if (item.type === 'project') s += 0.1;
    else s += 0.05;
    return Math.min(1, s);
  }, []);

  useEffect(() => {
    const processGraphData = () => {
      const allNodes = Object.values(entities);
      if (allNodes.length === 0) return;

      let filtered = isCrisisMode ? allNodes.filter(d => (d.type === 'need' && /(urgent|critical|high)/.test((d.status || "").toLowerCase())) || (d.type === 'resource' && (d.status || "").toLowerCase() === 'available') || (d.type === 'task' && (d.status || "").toLowerCase().includes('urgent'))) : allNodes;

      // Expand Nodes: Always include neighbors of selected entity
      if (selectedEntity) {
        const neighborIds = new Set(
          relationships
            .filter(r => r.source === selectedEntity.id || r.target === selectedEntity.id)
            .flatMap(r => [r.source, r.target])
        );

        allNodes.forEach(node => {
          if (neighborIds.has(node.id) && !filtered.some(f => f.id === node.id)) {
            filtered.push(node);
          }
        });
      }

      if (isMobile && !isFullscreenMobile && profile) {
        // ... (Mobile filtering logic remains similar, but uses entities and relationships from store)
        const limit = Date.now() - 1296000000;
        const uSkills = new Set((profile.skills || []).map(s => s.id));
        const uComms = new Set((profile.communities || []).map(c => c.id));
        const relIds = new Set();

        filtered.forEach(item => {
          const date = new Date(item.lastActivity).getTime();
          const recent = !isNaN(date) && date > limit;
          const raw = item.raw || {};
          if ((item.type === 'community' && uComms.has(raw.id)) ||
              (item.type === 'project' && (uComms.has(raw.community_id) || recent)) ||
              (item.type === 'task' && (uSkills.has(raw.skill_id) || recent)) ||
              ((item.type === 'need' || item.type === 'resource') && (recent || uComms.has(raw.requestor_community_id || raw.owner_community_id)))) {
            relIds.add(item.id);
            // Trace parents using relationships
            let currentId = item.id;
            for (let i = 0; i < 5; i++) {
              const parentRel = relationships.find(r => r.target === currentId);
              if (parentRel) {
                relIds.add(parentRel.source);
                currentId = parentRel.source;
              } else break;
            }
          }
        });
        if (relIds.size < 5) filtered.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity)).slice(0, 10).forEach(d => relIds.add(d.id));
        filtered = filtered.filter(d => relIds.has(d.id));
      }

      const mapLinks = relationships.filter(r =>
        filtered.some(n => n.id === r.source) && filtered.some(n => n.id === r.target)
      );

      setMapState({ starData: filtered, links: mapLinks, isLoading: false, error: null });
    };

    processGraphData();
  }, [entities, relationships, isCrisisMode, profile, isMobile, isFullscreenMobile, selectedEntity]);

  useEffect(() => {
    d3.select("body").selectAll(".galactic-tooltip-managed-by-d3").remove();
    const tt = d3.select("body").append("div")
      .attr("class", "galactic-tooltip galactic-tooltip-managed-by-d3")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("pointer-events", isFullscreenMobile ? "auto" : "none")
      .style("z-index", 1000);

    const nav = (d) => {
      if (!d) return;
      selectEntity(d);
      // Optional: Auto-zoom to node
    };

    const hClick = (e) => {
      if (e.target.classList.contains('tooltip-nav-btn')) {
        const d = starData.find(n => n.id === e.target.getAttribute('data-id'));
        if (d) { nav(d); tt.style("opacity", 0).style("pointer-events", "none"); }
      }
    };
    document.addEventListener('click', hClick);

    if (d3Container.current && dimensions.width > 0 && starData.length > 0) {
      const { width: w, height: h } = dimensions;
      let svg = d3.select(d3Container.current).select("svg");
      if (svg.empty()) {
        svg = d3.select(d3Container.current).append("svg");
        const filter = svg.append("defs").append("filter").attr("id", "glow");
        filter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "blur");
        const feMerge = filter.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "blur");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");
        svg.append("g").attr("class", "map-content");
      }

      svg.attr("viewBox", `0 0 ${w} ${h}`).attr("width", "100%").attr("height", "100%");
      const g = svg.select(".map-content");

      if (enableClicks) {
        const zoom = d3.zoom()
          .scaleExtent([0.01, 40])
          .on("zoom", (e) => g.attr("transform", e.transform));

        svg.call(zoom);
        if (isFullscreenMobile) {
          svg.on("dblclick.zoom", null);
        }

        if (!hasWarped.current) {
          const initialScale = isFullscreenMobile ? 0.5 : 0.1;
          svg.call(zoom.transform, d3.zoomIdentity.translate(w / 2, h / 2).scale(initialScale).translate(-w / 2, -h / 2));
          svg.transition().duration(2500).ease(d3.easeExpOut).call(zoom.transform, d3.zoomIdentity);
          hasWarped.current = true;
        }
      }

      const getP = (id, width, height) => {
        let hash = 0;
        for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
        const rad = Math.min(width, height) * 0.45;
        const ang = (Math.abs(hash) % 360) * (Math.PI / 180);
        const dist = (Math.abs(hash * 13) % rad);
        return { x: width / 2 + dist * Math.cos(ang), y: height / 2 + dist * Math.sin(ang) };
      };

      const nodes = starData.map(d => {
        const existing = nodesRef.current.find(n => n.id === d.id);
        if (existing) {
          return { ...d, x: existing.x, y: existing.y, vx: existing.vx, vy: existing.vy };
        }
        return { ...d, ...getP(d.id, w, h) };
      });
      nodesRef.current = nodes;

      const lks = links.map(l => ({
        id: `link-${(l.source.id || l.source)}-${(l.target.id || l.target)}`,
        source: nodes.find(n => n.id === (l.source.id || l.source)),
        target: nodes.find(n => n.id === (l.target.id || l.target))
      })).filter(l => l.source && l.target);

      if (simulationRef.current) simulationRef.current.stop();

      // Constellation Layout: Higher link strength, center gravity, and moderate repulsion
      simulationRef.current = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(lks).id(d => d.id).distance(isFullscreenMobile ? 120 : 60).strength(0.4))
        .force("charge", d3.forceManyBody().strength(isFullscreenMobile ? -1200 : -150))
        .force("center", d3.forceCenter(w / 2, h / 2))
        .force("x", d3.forceX(w / 2).strength(0.1))
        .force("y", d3.forceY(h / 2).strength(0.1))
        .force("collide", d3.forceCollide().radius(d => getStarRadius(d) + (isFullscreenMobile ? 30 : 15)).strength(1))
        .alphaDecay(0.02)
        .stop();

      // Optimization: drastically reduced ticks to prevent freezing, especially on mobile
      const ticks = isMobile ? 150 : 300;
      for (let i = 0; i < ticks; ++i) simulationRef.current.tick();

      const link = g.selectAll(".link").data(lks, d => d.id);
      link.exit().remove();
      link.enter().append("line")
        .attr("class", "link")
        .attr("id", d => d.id)
        .merge(link)
        .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x).attr("y2", d => d.target.y)
        .attr("stroke", "rgba(255,255,255,0.12)")
        .attr("stroke-width", 1);

      const star = g.selectAll(".star").data(nodes, d => d.id);
      star.exit().remove();
      star.enter().append("circle").attr("class", d => `star star-${d.type}`)
        .style("filter", "url(#glow)")
        .merge(star)
        .attr("cx", d => d.x).attr("cy", d => d.y)
        .attr("r", d => getStarRadius(d))
        .attr("fill", d => getStarColor(d))
        .attr("stroke", d => (selectedEntity && d.id === selectedEntity.id) ? "#00f3ff" : "none")
        .attr("stroke-width", d => (selectedEntity && d.id === selectedEntity.id) ? 3 : 0)
        .attr("opacity", d => Math.max(0.25, 1 - (Date.now() - new Date(d.lastActivity).getTime()) / 3888000000));

      const ev = g.selectAll(".ev").data(nodes, d => d.id);
      ev.exit().remove();
      const evEnter = ev.enter().append("circle").attr("class", "ev").attr("fill", "transparent");

      let lastT = 0;
      let tapTimeout;

      evEnter.merge(ev)
        .attr("cx", d => d.x).attr("cy", d => d.y)
        .attr("r", d => getStarRadius(d) + (isFullscreenMobile ? 100 : 15))
        .style("cursor", (enableClicks && !isFullscreenMobile) ? "pointer" : "default")
        .style("pointer-events", (enableClicks || enableTooltips) ? "auto" : "none")
        .on("mouseover", (event, d) => {
          // Visual Feedback: Highlight connected links
          g.selectAll(".link")
            .filter(l => l.source.id === d.id || l.target.id === d.id)
            .transition().duration(200)
            .attr("stroke", "#00f3ff")
            .attr("stroke-width", 3)
            .attr("stroke-opacity", 1);

          if (!enableTooltips || isFullscreenMobile) return;
          tt.transition().duration(200).style("opacity", 0.9);
          tt.html(`
            <div class="tooltip-name">${d.name} (${d.type})</div>
            <div class="tooltip-status">Status: ${d.status}</div>
            <div class="tooltip-activity">Last Active: ${new Date(d.lastActivity).toLocaleDateString()}</div>
            <div class="tooltip-contributors">Contributors: ${d.contributors || 0}</div>
          `)
            .style("left", (event.pageX + 10) + "px").style("top", (event.pageY + 10) + "px");
        })
        .on("mouseout", () => {
          // Reset highlights
          g.selectAll(".link")
            .transition().duration(500)
            .attr("stroke", "rgba(255,255,255,0.12)")
            .attr("stroke-width", 1)
            .attr("stroke-opacity", 0.6);

          if (!enableTooltips || isFullscreenMobile) return;
          tt.transition().duration(500).style("opacity", 0);
        })
        .on("click", (event, d) => {
          if (!enableClicks) return;
          nav(d);
        })
        .on("touchstart", function(event, d) {
          if (!enableClicks) return;
          if (event.touches.length > 1) return;

          // CRITICAL: Block browser zoom and interaction on these hits
          event.preventDefault();
          event.stopPropagation();

          // Reset previous highlights
          g.selectAll(".link")
            .attr("stroke", "rgba(255,255,255,0.12)")
            .attr("stroke-width", 1)
            .attr("stroke-opacity", 0.6);

          // Highlight connected links
          g.selectAll(".link")
            .filter(l => l.source.id === d.id || l.target.id === d.id)
            .attr("stroke", "#00f3ff")
            .attr("stroke-width", 3)
            .attr("stroke-opacity", 1);

          const now = Date.now();
          const touch = event.touches[0];

          if (now - lastT < 350) {
            clearTimeout(tapTimeout);
            nav(d);
            tt.style("opacity", 0).style("pointer-events", "none");
          } else {
            if (enableTooltips) {
                tapTimeout = setTimeout(() => {
                  tt.transition().duration(200).style("opacity", 1).style("pointer-events", "auto");
                  tt.html(`
                    <div class="tooltip-name">${d.name} (${d.type})</div>
                    <div class="tooltip-status">Status: ${d.status}</div>
                    <div class="tooltip-activity">Last Active: ${new Date(d.lastActivity).toLocaleDateString()}</div>
                    <div class="tooltip-contributors">Contributors: ${d.contributors || 0}</div>
                    <button class="tooltip-nav-btn" data-id="${d.id}" style="margin-top:12px;width:100%;background:#00f3ff;border:none;padding:10px;font-family:Orbitron;font-weight:bold;color:#000;cursor:pointer;border-radius:4px;">VIEW DETAILS</button>
                  `)
                    .style("left", Math.min(window.innerWidth - 240, touch.pageX + 10) + "px")
                    .style("top", Math.max(10, touch.pageY - 150) + "px");
                }, 350);
            }
          }
          lastT = now;
        }, { passive: false });

      if (enableClicks && isFullscreenMobile) {
        svg.on("touchstart", (event) => {
          if (!event.target.closest('.ev') && !event.target.closest('.galactic-tooltip')) {
            tt.transition().duration(400).style("opacity", 0).style("pointer-events", "none");
          }
        });
      }
    }
    return () => {
      if (simulationRef.current) simulationRef.current.stop();
      d3.select("body").selectAll(".galactic-tooltip-managed-by-d3").remove();
      document.removeEventListener('click', hClick);
    };
  }, [starData, links, isLoading, error, dimensions, isMobile, isFullscreenMobile, navigate, enableClicks, enableTooltips, getStarRadius, getRelevance]);

  return (
    <div className="galactic-activity-map-container">
      {isLoading && starData.length === 0 && showLoadingText && <div className="loading-overlay"><h1>Galactic Activity Map</h1><p>Loading...</p></div>}
      {isLoFiMode ? (
        <LoFiActivityList starData={starData} />
      ) : (
        <div ref={d3Container} style={{ width: "100%", height: "100%", position: "relative", boxSizing: "border-box" }} />
      )}
    </div>
  );
};

export default GalacticActivityMap;
