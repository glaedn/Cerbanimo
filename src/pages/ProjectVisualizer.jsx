import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import PropTypes from "prop-types";
import * as d3 from "d3";
import axios from "axios";
import TaskEditor from "./TaskEditor";
import ServiceSettingsModal from "../components/ServiceSettingsModal";
import { useProjectTasks } from "../hooks/useProjectTasks";
import useUserProjects from "../hooks/useUserProjects";
import "./ProjectVisualizer.css";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { Chip, Box, Typography, IconButton, Modal, Autocomplete, TextField } from "@mui/material";
import { useIsMobile } from "../hooks/useIsMobile";
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import GroupIcon from '@mui/icons-material/Group';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const ArcCarouselItem = ({
  realIndex,
  pos,
  item,
  N,
  angleStep,
  radiusX,
  radiusY,
  onClick
}) => {
  const active = Math.round(pos) === realIndex;
  const textRef = useRef(null);
  const [overflow, setOverflow] = useState(0);

  let o = 0;
  if (N > 0) {
    o = ((realIndex - pos + N / 2) % N + N) % N - N / 2;
  }

  const baseAngle = Math.PI / 2;
  const angle = baseAngle + o * angleStep;

  const x = radiusX * Math.cos(angle);
  const y = radiusY * Math.sin(angle);

  const zDepth = Math.sin(angle);
  const scale = 0.8 + (zDepth * 0.4);
  const opacity = 0.3 + (zDepth * 0.7);
  const rotateX = -10 + (zDepth * 15);

  useEffect(() => {
    if (active && textRef.current) {
      const el = textRef.current;
      if (el.scrollWidth > el.clientWidth) {
        setOverflow(el.scrollWidth - el.clientWidth);
      } else {
        setOverflow(0);
      }
    } else {
      setOverflow(0);
    }
  }, [active, item]); // pos removed to prevent jank during animation

  return (
    <div
      className={`arc-item ${active ? "active" : ""} ${overflow > 0 ? "marquee" : ""}`}
      style={{
        transform: `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${zDepth * 50}px) scale(${scale}) rotateX(${rotateX}deg)`,
        opacity,
        zIndex: Math.round(zDepth * 100) + 100,
        pointerEvents: zDepth > 0 ? 'auto' : 'none',
        "--overflow-dist": `-${overflow}px`
      }}
      onClick={onClick}
    >
      <span ref={textRef} className="arc-text">
        {item?.name || item}
      </span>
    </div>
  );
};

ArcCarouselItem.propTypes = {
  realIndex: PropTypes.number.isRequired,
  pos: PropTypes.number.isRequired,
  item: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
    }),
  ]),
  N: PropTypes.number.isRequired,
  angleStep: PropTypes.number.isRequired,
  radiusX: PropTypes.number.isRequired,
  radiusY: PropTypes.number.isRequired,
  onClick: PropTypes.func.isRequired,
};

const ArcCarousel = ({
  items,
  activeIndex,
  setActiveIndex,
  radiusX = 200,
  radiusY = 30, // Tighter Y for better targeting
  angleStep = 0.45,
  visibleCount = 7,
  snapDuration = 220,
}) => {
  const N = items.length;
  const isSingle = N <= 1;

  const [pos, setPos] = useState(activeIndex || 0);
  const posRef = useRef(pos);
  const rafRef = useRef(null);
  const prevActiveRef = useRef(activeIndex);

  const drag = useRef({
    down: false,
    startX: 0,
    lastX: 0,
    lastT: 0,
    velocity: 0,
  });

  useEffect(() => {
    if (prevActiveRef.current !== activeIndex) {
      setPos(activeIndex || 0);
      posRef.current = activeIndex || 0;
      prevActiveRef.current = activeIndex;
    }
  }, [activeIndex]);

  const mod = (i) => {
    if (N === 0) return 0;
    return ((i % N) + N) % N;
  };

  const getWindow = () => {
    if (N === 0) return [];
    if (isSingle) return [0];
    const center = Math.round(posRef.current);
    const arr = [];
    // If N is small, we might want to show all items.
    // If N is large, we show a window.
    const count = Math.min(N, visibleCount);
    const h = Math.floor(count / 2);

    for (let k = -h; k <= h; k++) {
      arr.push(mod(center + k));
    }
    return arr;
  };

  const stopRAF = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const animateTo = (target, shouldSelect = false) => {
    stopRAF();
    const start = posRef.current;
    const startTime = performance.now();

    const tick = (t) => {
      const p = clamp((t - startTime) / snapDuration, 0, 1);
      const e = 1 - Math.pow(1 - p, 3);
      const next = start + (target - start) * e;

      posRef.current = next;
      setPos(next);

      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        posRef.current = target;
        setPos(target);
        if (shouldSelect) {
          setActiveIndex(mod(Math.round(target)));
        }
        stopRAF();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  };

  const startMomentum = () => {
    if (isSingle) return;
    const friction = 0.0025;
    const threshold = 0.02;
    let v = drag.current.velocity;
    stopRAF();

    const tick = () => {
      const pxPerItem = 120;
      const dt = 16;
      const dv = v * dt;
      const next = posRef.current + dv / pxPerItem;
      posRef.current = next;
      setPos(next);
      const sign = Math.sign(v);
      v -= sign * friction * dt;
      if (Math.abs(v) > threshold) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        const snapped = Math.round(posRef.current);
        animateTo(snapped, false);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const onDown = (e) => {
    if (isSingle) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    drag.current.down = true;
    drag.current.startX = x;
    drag.current.lastX = x;
    drag.current.lastT = performance.now();
    drag.current.velocity = 0;
    stopRAF();
  };

  const onMove = (e) => {
    if (!drag.current.down || isSingle) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const now = performance.now();
    const dx = x - drag.current.lastX;
    const dt = now - drag.current.lastT || 16;
    drag.current.velocity = dx / dt;
    const pxPerItem = 120;
    const deltaIndex = dx / pxPerItem;
    const next = posRef.current + deltaIndex;
    posRef.current = next;
    setPos(next);
    drag.current.lastX = x;
    drag.current.lastT = now;
  };

  const onUp = () => {
    if (!drag.current.down) return;
    drag.current.down = false;
    startMomentum();
  };

  const windowIdx = getWindow();

  return (
    <div className="arc-carousel-perspective">
      <div
        className="arc-carousel"
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        onTouchStart={onDown}
        onTouchMove={onMove}
        onTouchEnd={onUp}
        style={{
          pointerEvents: isSingle ? "none" : "auto",
          opacity: isSingle && N > 0 ? 0.7 : 1,
          zIndex: 1,
        }}
      >
        {N === 0 && (
          <div className="arc-item active" style={{ transform: 'translate(-50%, -50%)', opacity: 0.5 }}>
            EMPTY_RING
          </div>
        )}
        {windowIdx.map((realIndex, i) => (
          <ArcCarouselItem
            key={`${realIndex}-${i}`}
            realIndex={realIndex}
            pos={pos}
            item={items[realIndex]}
            N={N}
            angleStep={angleStep}
            radiusX={radiusX}
            radiusY={radiusY}
            onClick={() => animateTo(realIndex, true)}
          />
        ))}
      </div>
    </div>
  );
};

ArcCarousel.propTypes = {
  items: PropTypes.arrayOf(PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
    }),
  ])).isRequired,
  activeIndex: PropTypes.number.isRequired,
  setActiveIndex: PropTypes.func.isRequired,
  radiusX: PropTypes.number,
  radiusY: PropTypes.number,
  angleStep: PropTypes.number,
  visibleCount: PropTypes.number,
  snapDuration: PropTypes.number,
};

const ProjectVisualizer = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const { projectId, taskId } = useParams();
  const { getAccessTokenSilently, user } = useAuth0();
  const [userId, setUserId] = useState(null);
  const { tasks, skills, project, handleTaskAction, fetchTasks, updateProject } = useProjectTasks(projectId, user);
  const { projects: allProjects } = useUserProjects(userId);
  const [activeCategory, setActiveCategory] = useState("All Tasks");
  const [isEditMode, setIsEditMode] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const zoomTransformRef = useRef({ k: 1, x: 0, y: 0 });
  const [svgDimensions, setSvgDimensions] = useState({ width: 800, height: 600 });
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [activeSkillId, setActiveSkillId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const tabsContainerRef = useRef(null);
  const hoverIntentRef = useRef(null);
  const tooltipRef = useRef(null);
  const [showCommunityProposalPopup, setShowCommunityProposalPopup] = useState(false);
  const [userCommunities, setUserCommunities] = useState([]);
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [popupLaunched, setPopupLaunched] = useState(false);
  const [outcomes, setOutcomes] = useState([]);
  const [interests, setInterests] = useState([]);
  const linksGroupRef = useRef(null);
  const [projectIsActive, setProjectIsActive] = useState(false);
  const [communityIndex, setCommunityIndex] = useState(0);
  const [projectIndex, setProjectIndex] = useState(0);
  const [skillIndex, setSkillIndex] = useState(0);

  const displayCommunities = useMemo(() => {
    const list = [...userCommunities];
    const projectCommunityId = project?.community_id ?? null;
    // Ensure project's own community is present even if not in userCommunities (rare)
    if (projectCommunityId !== null && !list.find(c => c.id === projectCommunityId)) {
      list.push({ id: projectCommunityId, name: project.community_name || "Current Community" });
    }
    const nc = { id: null, name: "No Community" };
    const currentCommIdx = list.findIndex(c => (c.id ?? null) === projectCommunityId);
    if (currentCommIdx !== -1) {
      // To appear to the left, it needs a higher index in our coordinate system
      list.splice(currentCommIdx + 1, 0, nc);
    } else {
      list.push(nc);
    }
    return list;
  }, [userCommunities, project?.community_id, project?.community_name]);

  useEffect(() => {
    setProjectIsActive(tasks.some(t => ["completed", "active-assigned", "active-unassigned", "urgent-unassigned", "urgent-assigned", "submitted"].includes(t.status)));
  }, [tasks]);

  const fetchUserCommunities = useCallback(async () => {
    if (!userId) return;
    try {
      const token = await getAccessTokenSilently({ audience: `${import.meta.env.VITE_BACKEND_URL}`, scope: "openid profile email" });
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/communities`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`Failed to fetch communities`);
      const data = await response.json();
      if (data && Array.isArray(data.communities)) setUserCommunities(data.communities);
    } catch { setUserCommunities([]); }
  }, [getAccessTokenSilently, userId]);

  const handleGranularizeTasks = async (pid) => {
    if (!window.confirm('Are you sure? This will delete and replace ALL tasks in the project.')) return;
    setLoading(true);
    try {
      const token = await getAccessTokenSilently({ audience: `${import.meta.env.VITE_BACKEND_URL}`, scope: "openid profile email" });
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/tasks/${pid}/granularize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ projectId: pid }),
      });
      if (!response.ok) throw new Error(`Failed to granularize tasks`);
      const data = await response.json();
      if (data.success) { await fetchTasks(); alert('Task granularization successful!'); }
      else alert('Task granularization failed: ' + data.error);
    } catch (error) { alert('Error granularizing task: ' + error.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (userId) fetchUserCommunities(); }, [userId, fetchUserCommunities]);

  const handleSubmitCommunityProposal = async () => {
    if (!selectedCommunity) return;
    try {
      const token = await getAccessTokenSilently({ audience: `${import.meta.env.VITE_BACKEND_URL}`, scope: "openid profile email" });
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/communities/${selectedCommunity.id}/submit/${projectId}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to submit proposal');
      updateProject({ community_id: selectedCommunity.id });
      setShowCommunityProposalPopup(false);
      window.location.href = `/communityhub/${selectedCommunity.id}`;
    } catch (error) { console.error('Error submitting proposal:', error); }
  };

  const handleUpdateTags = async (newTags) => {
    try {
      const token = await getAccessTokenSilently({ audience: `${import.meta.env.VITE_BACKEND_URL}`, scope: "openid profile email" });
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/projects/${projectId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tags: newTags }),
      });
      if (!response.ok) throw new Error('Failed to update tags');
      updateProject({ tags: newTags });
    } catch (error) { console.error('Error updating tags:', error); }
  };

  useEffect(() => {
    const fetchInterests = async () => {
      try {
        const token = await getAccessTokenSilently({ audience: `${import.meta.env.VITE_BACKEND_URL}`, scope: "openid profile email" });
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/profile/options`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();
        setInterests(data.interestsPool || []);
      } catch (error) { console.error('Error fetching interests:', error.message); }
    };
    fetchInterests();
  }, [getAccessTokenSilently]);

  useEffect(() => {
    const fetchOutcomes = async () => {
        try {
            const token = await getAccessTokenSilently();
            const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/impact/project/${projectId}/outcomes`, { headers: { Authorization: `Bearer ${token}` } });
            setOutcomes(res.data || []);
        } catch (err) { console.error("Failed to fetch outcomes:", err); }
    };
    if (projectId) fetchOutcomes();
  }, [projectId, getAccessTokenSilently]);

  const refreshTasks = async () => {
    const cat = activeCategory;
    const sid = activeSkillId;
    await fetchTasks();
    if (cat) { setActiveCategory(cat); setActiveSkillId(sid); }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await getAccessTokenSilently({ audience: `${import.meta.env.VITE_BACKEND_URL}`, scope: "openid profile email" });
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/profile/userId`, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
        const data = await response.json();
        setUserId(data.id);
      } catch (error) { console.error('Error fetching profile:', error.message); }
    };
    if (user) fetchProfile();
  }, [user, getAccessTokenSilently]);

  const usedSkills = useMemo(() => {
    const skillMap = new Map();
    tasks.forEach(t => {
      if (t.skill_id && !skillMap.has(t.skill_id)) {
        skillMap.set(t.skill_id, { id: t.skill_id, name: t.skill_name || "Unknown Skill" });
      }
    });
    return Array.from(skillMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  const categorizedTasks = useMemo(() => {
    const taskMap = { "All Tasks": [...tasks] };
    usedSkills.forEach(s => { taskMap[s.name] = tasks.filter(t => t.skill_id === s.id); });
    return taskMap;
  }, [tasks, usedSkills]);

  const initialForm = { id: null, name: "", description: "", status: "inactive-unassigned", dependencies: [], skill_id: 0, project_id: projectId, reward_tokens: 10 };
  const [taskForm, setTaskForm] = useState(initialForm);
  const [showTaskPopup, setShowTaskPopup] = useState(false);

  const handleMouseDown = (e) => { setIsDragging(true); setStartX(e.pageX - tabsContainerRef.current.offsetLeft); setScrollLeft(tabsContainerRef.current.scrollLeft); };
  const handleTabsLeave = () => setIsDragging(false);
  const handleMouseLeave = () => { hoverIntentRef.current = setTimeout(() => { if (!tooltipRef.current?.matches(":hover")) setHoveredNode(null); }, 200); };
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseOver = (event, d) => {
    clearTimeout(hoverIntentRef.current);
    if (hoveredNode?.id === d.id) return;
    setHoveredNode({ ...d, rawX: event.clientX, rawY: event.clientY, element: event.currentTarget });
  };
  const handleMouseOut = () => { hoverIntentRef.current = setTimeout(() => { if (!tooltipRef.current?.matches(":hover")) setHoveredNode(null); }, 200); };
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - tabsContainerRef.current.offsetLeft;
    tabsContainerRef.current.scrollLeft = scrollLeft - (x - startX) * 2;
  };

  const handleAddTask = (dependencyId = null) => {
    const currentSkill = skills.find(s => s.name === activeCategory);
    const form = { ...initialForm, project_id: projectId, skill_id: currentSkill?.id || "" };
    if (dependencyId) {
      const depTask = allTasks[dependencyId];
      form.dependencies = [parseInt(dependencyId, 10)];
      form.dependenciesWithNames = depTask ? [{ id: parseInt(dependencyId, 10), name: depTask.name }] : [];
    }
    setTaskForm(form); setShowTaskPopup(true);
  };

  const allTasks = useMemo(() => tasks.reduce((acc, t) => { acc[t.id] = t; return acc; }, {}), [tasks]);

  const getPressureColor = (task) => {
    if (task.status === "completed") return "#FF69B4";

    const start = task.start_date ? new Date(task.start_date).getTime() : new Date(project?.created_at || Date.now()).getTime();
    const end = task.due_date ? new Date(task.due_date).getTime() : null;
    const now = Date.now();

    const baseColor = task.status.includes("inactive") ? "#4682B4" : "#00FF00";

    if (!end) return baseColor;
    if (now >= end) return "#FF0000"; // Overdue

    // Percent of task duration elapsed
    const total = end - start;
    const elapsed = now - start;
    const percent = Math.max(0, Math.min(1, elapsed / total));

    return d3.interpolateRgb(baseColor, "#FF0000")(percent);
  };

  const getNodeColor = (task) => {
    const s = task.status;
    if (s === "completed") return "#FF69B4";
    if (s === "submitted") return "#FFA500";
    return getPressureColor(task);
  };

  const updateLinkColors = () => { if (linksGroupRef.current) linksGroupRef.current.selectAll(".link").attr("stroke", d => getLinkStroke(d.target)); };

  const getNodeStroke = (task) => {
    if (task.status === "completed") return "#FF69B4";
    return getPressureColor(task);
  };

  const getLinkStroke = (task) => {
    if (task.status === "completed") return "#FF69B4";
    if (task.status === "submitted") return "#FFA500";
    return "#FFFFFF";
  };

  const getNodeFill = (task) => task.status.includes("unassigned") ? "#888888" : getNodeColor(task);
  const truncateText = (t, m = 13) => t.length <= m ? t : t.substring(0, m) + "...";
  const zoomRef = useRef(null);

  useEffect(() => { if (!activeCategory) { setActiveCategory("All Tasks"); setActiveSkillId(null); } }, [activeCategory, skills, tasks]);

  useEffect(() => {
    if (project && displayCommunities.length > 0) {
      const projectCommunityId = project.community_id ?? null;
      const commIdx = displayCommunities.findIndex(c => (c.id ?? null) === projectCommunityId);
      if (commIdx !== -1) setCommunityIndex(commIdx);

      const sc = displayCommunities[commIdx] || { id: projectCommunityId };
      const cp = allProjects.filter(p => (p.community_id ?? null) === (sc.id ?? null));
      const pIdx = cp.findIndex(p => p.id === Number(projectId));
      if (pIdx !== -1) setProjectIndex(pIdx);
      else setProjectIndex(0);
    }
  }, [projectId, project, allProjects, displayCommunities]);

  // Reset skill index when project or category changes externally
  useEffect(() => {
    setSkillIndex(0);
    setActiveCategory("All Tasks");
    setActiveSkillId(null);
  }, [projectId]);

  useEffect(() => {
    if (hoveredNode && tooltipRef.current) {
      const { width: tw, height: th } = tooltipRef.current.getBoundingClientRect();
      const sw = window.innerWidth, sh = window.innerHeight, off = 20;
      let fx = hoveredNode.rawX - tw / 2, fy = hoveredNode.rawY + off;
      if (hoveredNode.rawY < th + off * 1.5) fy = hoveredNode.rawY - th - off;
      else if (hoveredNode.rawY + th + off * 1.5 > sh) fy = hoveredNode.rawY - th - off;
      if (fx < 0) fx = 0; if (fx + tw > sw) fx = sw - tw; if (fy < 0) fy = 0; if (fy + th > sh) fy = sh - th;
      setTooltipPosition({ x: fx, y: fy });
    }
  }, [hoveredNode]);

  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      setSvgDimensions({ width: 800, height: 600 });
    };
    updateDimensions();
    const ro = new ResizeObserver(updateDimensions);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    const data = categorizedTasks[activeCategory] || [];
    if (data.length === 0) return;
    const { width } = svgDimensions;
    d3.select(svgRef.current).selectAll("*").remove();
    if (!zoomRef.current) zoomRef.current = d3.zoom().scaleExtent([0.3, 3]).filter(e => isMobile && e.touches ? e.touches.length > 1 : true);

    // Calculate nowY before its first use
    // (Removed duplicate declarations: timelineHeight, projectStart, projectEnd, timeToY, now, nowY)

    const svg = d3.select(svgRef.current)
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", "0 0 800 600")
      .attr("preserveAspectRatio", "xMidYMid meet")
      .call(zoomRef.current)
      .style("touch-action", "none");
    const timelineHeight = 1500;
    const earliestTaskStart = d3.min(tasks, t => t.start_date ? new Date(t.start_date).getTime() : null);
    const projectStart = earliestTaskStart || new Date(project?.created_at || Date.now()).getTime();
    const projectEnd = project?.due_date
        ? new Date(project.due_date).getTime()
        : (projectStart + 30 * 24 * 60 * 60 * 1000);

    const timeToY = (time) => {
        const t = typeof time === 'string' ? new Date(time).getTime() : time;
        const progress = (t - projectStart) / (projectEnd - projectStart);
        return 150 + (progress * timelineHeight);
    };

    const now = Date.now();
    const nowY = timeToY(now);

    if (!zoomTransformRef.current.initialized) {
        const initialK = 0.8;
        const initialX = 400 - (400 * initialK);
        const initialY = 150 - (nowY * initialK);
        zoomTransformRef.current = d3.zoomIdentity.translate(initialX, initialY).scale(initialK);
        zoomTransformRef.current.initialized = true;
        d3.select(svgRef.current).call(zoomRef.current.transform, zoomTransformRef.current);
    }

    const mainGroup = svg.append("g").attr("transform", zoomTransformRef.current);
    const gridGroup = mainGroup.append("g").attr("class", "grid-group");
    const linksGroup = mainGroup.append("g"); linksGroupRef.current = linksGroup;
    const nodesGroup = mainGroup.append("g");
    const addButtonsGroup = mainGroup.append("g");
    zoomRef.current.on("zoom", e => {
        zoomTransformRef.current = e.transform;
        zoomTransformRef.current.initialized = true;
        mainGroup.attr("transform", e.transform);
        gridGroup.selectAll(".day-label").attr("x", (20 - e.transform.x) / e.transform.k);
    });
    const graph = {}; data.forEach(n => graph[n.id] = { ...n, children: [], level: -1 });
    data.forEach(n => n.dependencies.forEach(did => { if (graph[did]) graph[did].children.push(n.id); }));
    const rootNodes = data.filter(n => {
      if (activeCategory === "All Tasks") return n.dependencies.length === 0;
      const idps = n.dependencies.filter(did => allTasks[did] && allTasks[did].skill_id === activeSkillId);
      return idps.length === 0;
    }).map(n => n.id);
    const assignLevels = () => {
      rootNodes.forEach(id => graph[id].level = 0);
      let changed = true;
      while (changed) {
        changed = false;
        Object.values(graph).forEach(n => {
          if (n.level === -1) {
            const idps = n.dependencies.filter(did => graph[did]);
            if (idps.every(did => graph[did].level !== -1)) {
              n.level = Math.max(...idps.map(did => graph[did].level), -1) + 1;
              changed = true;
            }
          }
        });
      }
      Object.values(graph).forEach(n => { if (n.level === -1) n.level = 0; });
    };
    assignLevels();
    const lvls = []; const maxL = Math.max(...Object.values(graph).map(n => n.level));
    for (let i = 0; i <= maxL; i++) lvls[i] = Object.values(graph).filter(n => n.level === i);
    const hsp = isMobile ? 85 : 100;

    lvls.forEach((lns, li) => {
      const tw = (lns.length - 1) * hsp, sx = (width - tw) / 2;
      lns.forEach((n, i) => {
        n.x = sx + i * hsp;

        if (n.due_date && n.start_date) {
          const taskStart = new Date(n.start_date).getTime();
          const taskEnd = new Date(n.due_date).getTime();

          n.railTop = timeToY(taskStart);
          n.railBottom = timeToY(taskEnd);

          const railProgress = Math.max(0, Math.min(1, (now - taskStart) / (taskEnd - taskStart)));
          n.y = Math.max(n.railTop, Math.min(n.railBottom, n.railTop + (railProgress * (n.railBottom - n.railTop))));

          if (n.status === "completed" && n.completed_at) {
              const compTime = new Date(n.completed_at).getTime();
              n.y = timeToY(compTime);
              n.railBottom = n.y;
          }
        } else {
          n.y = 150 + li * 200;
          n.railTop = n.y - 30;
          n.railBottom = n.y + 30;
        }
      });
    });
    const lnks = []; let lid = 0;
    data.forEach(s => {
      s.dependencies.forEach(did => {
        const t = graph[did];
        if (t && (activeCategory === "All Tasks" || (allTasks[did] && allTasks[did].skill_id === activeSkillId)))
          lnks.push({ id: `link-${lid++}`, source: graph[s.id], target: t });
      });
    });
    linksGroup.selectAll(".link").data(lnks).enter().append("path").attr("id", d => d.id).attr("class", "link")
      .attr("fill", "none").attr("stroke", d => getLinkStroke(d.target)).attr("stroke-width", 1).attr("stroke-opacity", 0.6)
      .attr("d", d => {
          const source = d.source;
          const target = d.target;
          const targetY = target.railBottom !== undefined ? target.railBottom : target.y;
          return `M${target.x},${targetY} C${target.x},${(targetY + source.y) / 2} ${source.x},${(targetY + source.y) / 2} ${source.x},${source.y}`;
      });
    // lnks.forEach(l => { if (l.targetStatus === "completed") d3.select(`#${l.id}`).attr("stroke", "#FF69B4"); });
    if (activeCategory !== "All Tasks") {
      Object.values(graph).forEach(n => {
        const edps = n.dependencies.filter(did => allTasks[did] && allTasks[did].skill_id !== activeSkillId).map(did => ({ id: did, sourceNode: n, type: "depends-on", taskInfo: allTasks[did] }));
        const edpts = Object.values(allTasks).filter(t => t.skill_id !== activeSkillId && t.dependencies.includes(n.id)).map(t => ({ id: t.id, sourceNode: n, type: "depended-by", taskInfo: t }));
        [...edps.slice(0, 3), ...edpts.slice(0, 3)].forEach((dep, idx) => {
          const isDep = dep.type === "depends-on", x2 = n.x + (idx - 1) * 30, y2 = n.y + (isDep ? -30 : 40);
          linksGroup.append("line").attr("stroke", "#666").attr("stroke-dasharray", "2,2").attr("x1", n.x).attr("y1", n.y).attr("x2", x2).attr("y2", y2);
          const enode = nodesGroup.append("g").attr("transform", `translate(${x2}, ${y2})`)
            .on("mouseover", (e) => { if (dep.taskInfo) setHoveredNode({ ...dep.taskInfo, type: dep.type, rawX: e.clientX, rawY: e.clientY, element: e.currentTarget }); })
            .on("mouseout", handleMouseOut).on("click", () => navigate(`/Visualizer/${dep.taskInfo.project_id}/${dep.taskInfo.id}`));
          enode.append("circle").attr("r", 7).attr("fill", getNodeFill(dep.taskInfo)).attr("stroke", getNodeStroke(dep.taskInfo)).attr("stroke-dasharray", "2,1");
        });
      });
    }
    // Timeline Grid and Day Labels
    const totalDays = Math.ceil((projectEnd - projectStart) / (24 * 60 * 60 * 1000));
    for (let i = 0; i <= totalDays; i++) {
        const dayTime = projectStart + i * 24 * 60 * 60 * 1000;
        const y = timeToY(dayTime);

        gridGroup.append("line")
          .attr("x1", -1000).attr("y1", y).attr("x2", 2000).attr("y2", y)
          .attr("stroke", "rgba(128, 128, 128, 0.2)").attr("stroke-width", 1);

        gridGroup.append("text")
          .attr("class", "day-label")
          .attr("x", (20 - zoomTransformRef.current.x) / zoomTransformRef.current.k)
          .attr("y", y + 15)
          .attr("fill", "rgba(128, 128, 128, 0.4)")
          .attr("font-size", "12px").attr("font-family", "Space Mono")
          .text(`DAY ${i + 1}`);
    }

    // Current Time Marker
    mainGroup.append("line")
      .attr("x1", -1000).attr("y1", nowY).attr("x2", 2000).attr("y2", nowY)
      .attr("stroke", "rgba(0, 243, 255, 0.4)").attr("stroke-width", 1).attr("stroke-dasharray", "8,4");

    mainGroup.append("text")
      .attr("x", 10).attr("y", nowY - 8).attr("fill", "rgba(0, 243, 255, 0.6)")
      .attr("font-size", "12px").attr("font-family", "Orbitron").text("PRESENT_SIGNAL");

    // Render Rails
    nodesGroup.selectAll(".rail")
      .data(Object.values(graph).filter(d => d.railTop !== undefined))
      .enter()
      .append("line")
      .attr("class", "rail")
      .attr("x1", d => d.x)
      .attr("y1", d => d.railTop)
      .attr("x2", d => d.x)
      .attr("y2", d => d.railBottom)
      .attr("stroke", d => getNodeStroke(d))
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.4);

    // Impact Circles (Deadline Terminals)
    nodesGroup.selectAll(".impact-circle")
      .data(Object.values(graph).filter(d => d.railBottom !== undefined))
      .enter()
      .append("circle")
      .attr("class", "impact-circle")
      .attr("cx", d => d.x)
      .attr("cy", d => d.railBottom)
      .attr("r", 5)
      .attr("fill", d => {
          if (d.status === "completed") return "#FF69B4";
          const end = new Date(d.due_date).getTime();
          return Date.now() >= end ? "#FF0000" : "#333";
      })
      .attr("stroke", d => getPressureColor(d))
      .attr("stroke-width", 1.5);

    const nGroups = nodesGroup.selectAll(".node").data(Object.values(graph)).enter().append("g").attr("class", "node").attr("transform", d => `translate(${d.x}, ${d.y})`)
      .on("mouseover", handleMouseOver).on("mouseout", handleMouseOut).on("click", (e, d) => {
        e.stopPropagation();
        navigate(`/Visualizer/${projectId}/${d.id}`);
      });
    nGroups.append("circle").attr("r", isMobile ? 18 : 15).attr("fill", d => getNodeFill(d)).attr("stroke", d => getNodeStroke(d)).attr("stroke-width", 2)
      .style("filter", d => `drop-shadow(0 0 ${4 + d.level * 2}px ${getNodeColor(d)})`)
      .on("touchstart", function() { d3.select(this).transition().duration(100).attr("r", isMobile ? 24 : 20); })
      .on("touchend", function() { d3.select(this).transition().duration(100).attr("r", isMobile ? 18 : 15); });
    nGroups.append("text").attr("dy", isMobile ? 36 : 25).attr("text-anchor", "middle").text(d => truncateText(d.name, isMobile ? 11 : 13)).attr("font-size", isMobile ? "11px" : "10px").attr("font-weight", isMobile ? "600" : "400").style("fill", "#fff").style("text-shadow", "0 0 4px #000");
    nGroups.append("text").attr("dy", 4).attr("text-anchor", "middle").text(d => d.status === "completed" ? "✓" : (d.status.includes("urgent") ? "!" : (d.status.includes("unassigned") ? "+" : "")))
      .attr("font-size", "12px").attr("fill", d => d.status.includes("unassigned") ? "#000000" : "#FFFFFF");
    if (isEditMode) {
      Object.values(graph).forEach(n => {
        const ab = addButtonsGroup.append("g").attr("transform", `translate(${n.x + 35}, ${n.y})`).style("cursor", "pointer").on("click", (e) => { e.stopPropagation(); handleAddTask(n.id); });
        ab.append("circle").attr("r", 10).attr("fill", "#FFA500").attr("stroke", "#FF8C00");
        ab.append("text").attr("dy", 4).attr("text-anchor", "middle").text("+").attr("font-size", "14px").attr("fill", "#FFFFFF");
      });
    }
  // D3 owns the graph DOM in this effect; keep dependencies scoped to redraw triggers.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, allTasks, skills, isEditMode, svgDimensions, tasks, isMobile]);

  useEffect(() => {
    const fetchFullTask = async () => {
      if (taskId && !popupLaunched) {
        try {
          const tkn = await getAccessTokenSilently();
          const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/${taskId}`, { headers: { Authorization: `Bearer ${tkn}` } });
          const t = res.data; if (t) { setTaskForm(t); setPopupLaunched(true); setActiveSkillId(t.skill_id); setShowTaskPopup(true); const s = skills.find(sk => sk.id === t.skill_id); if (s) setActiveCategory(s.name); }
        } catch {
          const t = tasks.find(tk => tk.id === parseInt(taskId, 10));
          if (t) { setTaskForm(t); setPopupLaunched(true); setActiveSkillId(t.skill_id); setShowTaskPopup(true); const s = skills.find(sk => sk.id === t.skill_id); if (s) setActiveCategory(s.name); }
        }
      }
    };
    fetchFullTask();
  }, [taskId, tasks, skills, popupLaunched, getAccessTokenSilently]);

  const isProjectCreator = project?.creator_id === Number(userId);
  const colorClasses = ["pink", "green", "blue", "orange"];

  
  const filteredProjects = useMemo(() => {
    const sc = displayCommunities[communityIndex];
    if (!sc) return project ? [project] : [];

    const selectedCommunityId = sc.id ?? null;
    const cp = allProjects.filter(p => (p.community_id ?? null) === selectedCommunityId);
    const projectCommunityId = project?.community_id ?? null;

    if (project && projectCommunityId === selectedCommunityId && !cp.some(p => p.id === Number(projectId))) {
      return [project, ...cp];
    }

    return cp.length > 0 ? cp : (project ? [project] : []);
  }, [displayCommunities, communityIndex, allProjects, project, projectId]);

  const skillOptions = useMemo(() => [
    { name: "All Tasks" },
    ...(usedSkills.length > 0 ? usedSkills.map(s => ({ id: s.id, name: s.name })) : [])
  ], [usedSkills]);

  return (
    <div className={isMobile ? "mobile-visualizer" : "skill-hierarchy-container"} ref={containerRef} onMouseLeave={handleMouseLeave}>
      {isMobile ? (
        <>
          <Box sx={{ zIndex: 40, position: 'relative' }}>
            <ArcCarousel items={displayCommunities} activeIndex={communityIndex} setActiveIndex={i => { setCommunityIndex(i); setProjectIndex(0); }} />
          </Box>
          <Box sx={{ zIndex: 35, position: 'relative' }}>
            <ArcCarousel items={filteredProjects} activeIndex={projectIndex} setActiveIndex={idx => {
              const sel = filteredProjects[idx];
              if (sel && sel.id !== Number(projectId)) {
                setProjectIndex(idx);
                navigate(`/Visualizer/${sel.id}`);
              }
            }} />
          </Box>
          <Box sx={{ zIndex: 30, position: 'relative' }}>
            <ArcCarousel items={skillOptions} activeIndex={skillIndex} setActiveIndex={idx => {
              setSkillIndex(idx);
              const cat = skillOptions[idx];
              if (cat) {
                setActiveCategory(cat.name);
                setActiveSkillId(cat.id || null);
              }
            }} />
          </Box>

          <Box className="mobile-graph-wrapper" sx={{
            position: 'relative',
            width: '100%',
            height: '500px',
            bgcolor: '#000',
            borderRadius: '12px',
            overflow: 'hidden',
            mb: 2,
            zIndex: 1
          }}>
            <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet" className="mobile-graph" />

            {isProjectCreator && (
              <Box sx={{
                position: 'absolute',
                bottom: 16,
                right: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                zIndex: 1000,
                pointerEvents: 'auto'
              }}>
                <IconButton
                  sx={{
                    width: 56, height: 56, minWidth: 56, minHeight: 56, flexShrink: 0,
                    borderRadius: '50%', padding: 0,
                    bgcolor: isEditMode ? 'primary.main' : 'rgba(0,0,0,0.9)',
                    color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
                    border: '1.5px solid rgba(0,243,255,0.3)',
                    '& .MuiSvgIcon-root': { fontSize: '1.8rem' }
                  }}
                  onClick={() => setIsEditMode(!isEditMode)}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  sx={{
                    width: 56, height: 56, minWidth: 56, minHeight: 56, flexShrink: 0,
                    borderRadius: '50%', padding: 0,
                    bgcolor: 'rgba(0,0,0,0.9)', color: '#fff',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
                    border: '1.5px solid rgba(0,243,255,0.3)',
                    '& .MuiSvgIcon-root': { fontSize: '1.8rem' }
                  }}
                  onClick={() => setShowServiceModal(true)}
                >
                  <ShoppingCartIcon />
                </IconButton>
                {project?.community_id === null && (
                  <IconButton
                    sx={{
                      width: 56, height: 56, minWidth: 56, minHeight: 56, flexShrink: 0,
                      borderRadius: '50%', padding: 0,
                      bgcolor: 'rgba(0,0,0,0.9)', color: '#fff',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
                      border: '1.5px solid rgba(0,243,255,0.3)',
                      '& .MuiSvgIcon-root': { fontSize: '1.8rem' }
                    }}
                    onClick={() => { fetchUserCommunities(); setShowCommunityProposalPopup(true); }}
                  >
                    <GroupIcon />
                  </IconButton>
                )}
                {isEditMode && (
                  <IconButton
                    sx={{
                      width: 56, height: 56, minWidth: 56, minHeight: 56, flexShrink: 0,
                      borderRadius: '50%', padding: 0,
                      bgcolor: '#FFA500', color: '#fff',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
                      border: '1.5px solid rgba(255,255,255,0.3)',
                      '& .MuiSvgIcon-root': { fontSize: '1.8rem' }
                    }}
                    onClick={() => handleAddTask()}
                  >
                    <AddIcon />
                  </IconButton>
                )}
              </Box>
            )}
          </Box>
        </>
      ) : (
        <div className="tabs-container-wrapper" style={{ position: "relative" }}>
          <div className="scroll-shadow left-shadow" />
          <div ref={tabsContainerRef} className="category-tabs" onMouseDown={handleMouseDown} onMouseLeave={handleTabsLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
            <button className={`tab all-tasks ${activeCategory === "All Tasks" ? "active" : ""}`} onClick={() => { setActiveCategory("All Tasks"); setActiveSkillId(null); }}>All Tasks</button>
            {usedSkills.map((c, i) => (
              <button key={c.id} className={`tab ${colorClasses[i % 4]} ${activeCategory === c.name ? "active" : ""}`} onClick={() => { setActiveCategory(c.name); setActiveSkillId(c.id); }}>{c.name}</button>
            ))}
            {isEditMode && <button className="tab new-skill-tab" onClick={() => { setTaskForm({ ...initialForm, project_id: projectId, skill_id: "" }); setShowTaskPopup(true); }}>+ New Skill</button>}
          </div>
          <div className="scroll-shadow right-shadow" />
          <div className="visualization-container" style={{ width: "100%", overflow: "hidden" }}>
            <svg ref={svgRef} width={svgDimensions.width} height={svgDimensions.height}></svg>
            {isProjectCreator && (
              <div className="edit-buttons">
                {isEditMode && <button className="new-task-button" onClick={() => handleAddTask()}>+ New Task</button>}
                {!projectIsActive && <button className={`new-task-button ${loading ? 'disabled' : ''}`} onClick={() => handleGranularizeTasks(projectId)} disabled={loading}>{loading ? 'Granularizing...' : 'Granularize all project tasks'}</button>}
                {project?.community_id === null && <button className="community-proposal-button" onClick={() => { fetchUserCommunities(); setShowCommunityProposalPopup(true); }}>Propose to Community</button>}
                <button className="edit-mode-button" onClick={() => setShowServiceModal(true)}>Make a Service</button>
                <button className="edit-mode-button" onClick={() => setIsEditMode(!isEditMode)}>{isEditMode ? "Exit Edit Mode" : "Edit Mode"}</button>
              </div>
            )}
          </div>
        </div>
      )}
      <ServiceSettingsModal open={showServiceModal} onClose={() => setShowServiceModal(false)} project={project} onUpdate={u => updateProject(u)} userId={userId} />
      {hoveredNode && (
        <div ref={tooltipRef} className="tooltip-container" style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, opacity: 1, zIndex: 9999, pointerEvents: 'none' }}>
          <div className="node-tooltip">
            <h4>{hoveredNode.name}</h4>
            {hoveredNode.category && <p>Category: {hoveredNode.category}</p>}
            <p>Status: {hoveredNode.status}</p>
            {hoveredNode.dependencies?.length > 0 && <div><p>Depends on:</p><ul>{hoveredNode.dependencies.map(did => allTasks[did]).filter(Boolean).map(t => <li key={t.id}>{t.name}</li>)}</ul></div>}
          </div>
        </div>
      )}
      <div className="project-info">
        <h3>{project?.name}</h3><p className="project-description">{project?.description}</p>
        {outcomes.length > 0 && <Box sx={{ mt: 2, mb: 2, p: 1, borderLeft: '3px solid #ff5ca2', bgcolor: 'rgba(255, 92, 162, 0.1)' }}><Typography variant="caption" sx={{ color: '#ff5ca2', fontFamily: 'Orbitron', display: 'block', mb: 0.5 }}>INTENDED REAL-WORLD EFFECT</Typography>{outcomes.map(o => <Typography key={o.id} variant="body2" sx={{ color: '#eee', fontStyle: 'italic' }}>&quot;{o.statement}&quot;</Typography>)}</Box>}
        {/* <div className="token-pool">
          <div className="token-metric"><span className="token-label">Allocated:</span><span className="token-value">{project?.reserved_tokens}</span></div>
          <div className="token-metric"><span className="token-label">Distributed:</span><span className="token-value">{project?.used_tokens}</span></div>
          <div className="token-metric"><span className="token-label">Available:</span><span className="token-value">{Number(project?.token_pool || 0) - Number(project?.used_tokens || 0) - Number(project?.reserved_tokens || 0)}</span></div>
        </div> */}
        <div className="vproject-tags">
          {isEditMode ? <Autocomplete multiple freeSolo options={interests || []} value={project?.tags || []} onChange={(e, nv) => handleUpdateTags(nv)} renderTags={(v, gtp) => v.map((o, i) => <Chip {...gtp({ i })} key={i} label={o} variant="outlined" style={{ backgroundColor: "#000", color: "#FFF", margin: "2px" }} />)} renderInput={p => <TextField {...p} variant="outlined" placeholder="Add tags..." size="small" />} /> : project?.tags?.map((t, i) => <Chip key={i} label={t} variant="outlined" style={{ backgroundColor: "#000", color: "#FFF", margin: "2px" }} />)}
        </div>
      </div>
      <TaskEditor open={showTaskPopup} onClose={() => { setShowTaskPopup(false); refreshTasks(); }} projectId={projectId} taskForm={taskForm} setTaskForm={setTaskForm} onSubmit={async f => { const r = await handleTaskAction(f, f.id ? 'update' : 'create'); if (!r.error) { await refreshTasks(); updateLinkColors(); } return r; }} skills={skills} isEdit={isEditMode} currentUser={user} projectCreatorId={project?.creator_id} isReviewer={allTasks[taskForm?.id]?.reviewer_ids?.includes(Number(userId))} />
      <div className="legend">
        <div><span style={{ color: "#FF69B4" }}>● </span>Pink: Completed</div>
        <div><span style={{ color: "#00FF00" }}>● </span>Green: Active (Redshifts over time)</div>
        <div><span style={{ color: "#4682B4" }}>● </span>Blue: Inactive (Redshifts over time)</div>
        <div><span style={{ border: "2px solid #00FF00", borderRadius: "50%", display: "inline-block", width: "10px", height: "10px", backgroundColor: "#888" }}></span> Outline: Vacancy / Filled: Assigned</div>
        <div><span style={{ border: "1px dashed #666", borderRadius: "50%", display: "inline-block", width: "10px", height: "10px" }}></span> External</div>
      </div>
      <Modal open={showCommunityProposalPopup} onClose={() => setShowCommunityProposalPopup(false)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="cyber-modal"><div className="cyber-border"><h3 className="cyber-title">Submit to Community</h3><div className="cyber-content"><Autocomplete options={userCommunities} getOptionLabel={o => o.name} onChange={(e, v) => setSelectedCommunity(v)} renderInput={p => <TextField {...p} label="Select Community" variant="outlined" fullWidth />} /><div className="cyber-button-group"><button onClick={() => setShowCommunityProposalPopup(false)} className="cyber-button cancel">Cancel</button><button onClick={handleSubmitCommunityProposal} className="community-proposal-button" disabled={!selectedCommunity}>Submit Proposal</button></div></div></div></div>
      </Modal>
    </div>
  );
};

export default ProjectVisualizer;
