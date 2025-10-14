import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import axios from "axios";
import PetalEditor from "./PetalEditor";
import { useIntentionPetals } from "../hooks/useIntentionPetals";
import "./IntentionLotusMap.css";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useMemo } from "react";

const IntentionLotusMap = ({ intentionId: propIntentionId }) => {
  console.log("Rendering IntentionLotusMap");
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const { intentionId: paramIntentionId } = useParams();
  const navigate = useNavigate();
  const intentionId = propIntentionId || paramIntentionId;
  const { getAccessTokenSilently, user } = useAuth0();

  const [userId, setUserId] = useState(null);
  const { petals, skills, intention, handlePetalAction, fetchPetals } = useIntentionPetals(intentionId, user);

  const [isEditMode, setIsEditMode] = useState(false);
  const [isManifestView, setIsManifestView] = useState(false);
  const [session, setSession] = useState(null);
  const [resonanceEvents, setResonanceEvents] = useState([]);
  const [manifestationSummary, setManifestationSummary] = useState("");
  const [zoomTransform, setZoomTransform] = useState({ k: 1, x: 0, y: 0 });
  const [svgDimensions, setSvgDimensions] = useState({ width: 800, height: 600 });
  
  const [petalForm, setPetalForm] = useState(null);
  const [showPetalPopup, setShowPetalPopup] = useState(false);

  // Fetch user ID
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const token = await getAccessTokenSilently();
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/profile/userId`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setUserId(data.id);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    fetchProfile();
  }, [user, getAccessTokenSilently]);

  const allPetals = useMemo(() => {
    const petalMap = {};
    petals.forEach(p => { petalMap[p.id] = p; });
    return petalMap;
  }, [petals]);

  const handleAddPetal = (parentId = null) => {
    const form = {
      id: null,
      name: "",
      description: "",
      status: "inactive-unassigned",
      parent_id: parentId,
      intention_id: intentionId,
      reward_tokens: 10
    };
    setPetalForm(form);
    setShowPetalPopup(true);
  };

  const handleEditPetal = (petal) => {
    setPetalForm(petal);
    setShowPetalPopup(true);
  };

  const handleStartSession = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/manifestation-sessions`,
        {
          intentionId: intentionId,
          realmId: intention.realm_id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setSession(response.data);
      setManifestationSummary(""); // Clear previous summary
      setIsManifestView(true); // Automatically switch to manifest view
    } catch (error) {
      console.error('Error starting manifestation session:', error);
    }
  };

  const handleEndSession = async () => {
    if (!session) return;
    try {
      const token = await getAccessTokenSilently();
      if (resonanceEvents.length > 0) {
        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/manifestation-sessions/${session.id}/batch-resonance`,
          { resonanceEvents },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setResonanceEvents([]);
      }
      const summary = await generateManifestationSummary(session.id);
      if (summary) {
        setManifestationSummary(summary);
      }
      setSession(null);
      setIsManifestView(false); // Switch back to normal view
    } catch (error) {
      console.error('Error ending manifestation session:', error);
    }
  };

  const getPetalColor = (status) => {
    switch (status) {
      case "completed":
      case "Blossomed":
        return "#2ECC71"; // 🟢 Completed
      case "active-assigned":
      case "active-unassigned":
      case "Sprouting":
      case "Blooming":
        return "#3498DB"; // 🔵 In Progress
      case "urgent-assigned":
      case "urgent-unassigned":
      case "submitted":
      case "Radiant":
      case "Beacon":
      case "Unfurled":
        return "#9B59B6"; // 🟣 Active
      case "inactive-unassigned":
      case "inactive-assigned":
      case "Dormant":
      case "Seeded":
      default:
        return "#FDFEFE"; // ⚪ Future
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || !entries.length) return;
      const { width, height } = entries[0].contentRect;
      setSvgDimensions({ width, height: height || 600 });
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || petals.length === 0) return;

    const { width, height } = svgDimensions;
    d3.select(svgRef.current).selectAll("*").remove();

    const zoom = d3.zoom().scaleExtent([0.3, 3]).on("zoom", (event) => {
      mainGroup.attr("transform", event.transform);
      setZoomTransform(event.transform);
    });

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .call(zoom);

    const mainGroup = svg.append("g").attr("transform", `translate(${zoomTransform.x}, ${zoomTransform.y}) scale(${zoomTransform.k})`);

    const linksGroup = mainGroup.append("g").attr("class", "links-group");
    const nodesGroup = mainGroup.append("g").attr("class", "nodes-group");

    const graph = {};
    petals.forEach(p => { graph[p.id] = { ...p, children: [], level: -1 }; });
    petals.forEach(p => p.dependencies.forEach(depId => {
      if (graph[depId]) graph[depId].children.push(p.id);
    }));

    const rootNodes = petals.filter(p => p.dependencies.length === 0).map(p => p.id);

    const assignLevels = () => {
      const queue = rootNodes.map(id => ({ id, level: 1 }));
      const visited = new Set(rootNodes);

      while(queue.length > 0){
        const {id, level} = queue.shift();
        if(graph[id]) {
          graph[id].level = level;
          graph[id].children.forEach(childId => {
            if(!visited.has(childId) && graph[childId]){
              visited.add(childId);
              queue.push({id: childId, level: level + 1});
            }
          });
        }
      }
      // Handle cycles or detached nodes
      petals.forEach(p => { if(graph[p.id].level === -1) graph[p.id].level = 1; });
    };

    assignLevels();

    const levels = {};
    Object.values(graph).forEach(node => {
      if (!levels[node.level]) levels[node.level] = [];
      levels[node.level].push(node);
    });

    const centerX = width / 2;
    const centerY = height / 2;
    const radiusStep = 120;

    const sortedLevels = Object.keys(levels).sort((a, b) => a - b);
    sortedLevels.forEach((level, levelIndex) => {
      const levelNodes = levels[level];
      const radius = (levelIndex + 1) * 110; // Adjusted radius step
      const angleStep = (2 * Math.PI) / levelNodes.length;
      levelNodes.forEach((node, nodeIndex) => {
        const angle = nodeIndex * angleStep - Math.PI / 2; // Start from top
        node.x = centerX + radius * Math.cos(angle);
        node.y = centerY + radius * Math.sin(angle);
        node.radius = radius;
        node.angle = angle;
      });
    });

    const centerNode = mainGroup.append("g")
      .attr("transform", `translate(${centerX}, ${centerY})`)
      .attr("class", "intention-center-node");
    
    centerNode.append("circle").attr("r", 40).attr("fill", "#4a0e6b").attr("stroke", "#c471ed").attr("stroke-width", 3);
    centerNode.append("text").text("⊙").attr("text-anchor", "middle").attr("dy", 8).attr("fill", "white").style("font-size", "30px");

    const links = [];
    petals.forEach(p => {
      p.dependencies.forEach(depId => {
        if (graph[p.id] && graph[depId]) {
          links.push({ source: graph[depId], target: graph[p.id] });
        }
      });
    });

    const linkElements = linksGroup.selectAll(".link").data(links).enter()
      .append("line")
      .attr("class", "link")
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    if (isManifestView) {
      linkElements.style("stroke-opacity", d => 0.3 + (d.source.resonance_score || Math.random()) * 0.7)
        .classed('shimmering', true);
    }
    
    const renderPetals = (nodes, parentGroup) => {
      const nodeGroups = parentGroup.selectAll(".node").data(nodes).enter()
        .append("g").attr("class", d => `node ${isManifestView ? 'manifest-node' : ''}`)
        .attr("transform", d => `translate(${d.x || 0}, ${d.y || 0})`)
        .on("click", (event, d) => handleEditPetal(d));

      const circles = nodeGroups.append("circle").attr("r", 15).attr("fill", d => getPetalColor(d.status))
        .style("opacity", d => isManifestView ? 0.3 + (d.resonance_score || 0) * 0.7 : 1)
        .style("box-shadow", d => `0 0 ${d.resonance_score * 20}px ${getPetalColor(d.status)}`)
        .classed('pulsing', d => isManifestView && d.resonance_score > 0.5);

      nodeGroups.append("text").attr("dy", 25).attr("text-anchor", "middle").text(d => d.name.substring(0,10) + (d.name.length > 10 ? '...' : '')).attr("class", "petal-label");

      if (isEditMode) {
          nodeGroups.append("circle")
            .attr("class", "add-subpetal-handle")
            .attr("r", 8)
            .attr("cx", 15)
            .attr("cy", -15)
            .on("click", (e, d) => {
                e.stopPropagation();
                handleAddPetal(d.id);
            });
      }

      const resonateButton = nodeGroups.append("g")
        .attr("class", "resonate-button")
        .style("display", "none")
        .on("click", async (event, d) => {
          event.stopPropagation();
          const resonanceEvent = {
            petal_id: d.id,
            user_id: userId,
            timestamp: new Date().toISOString(),
          };
          if (session) {
            setResonanceEvents([...resonanceEvents, resonanceEvent]);
            try {
              const token = await getAccessTokenSilently();
              await axios.post(`${import.meta.env.VITE_BACKEND_URL}/manifestation-sessions/${session.id}/events`, {
                event: {
                  type: 'resonance',
                  ...resonanceEvent
                }
              }, {
                headers: { Authorization: `Bearer ${token}` }
              });
            } catch (error) {
              console.error('Error recording resonance event:', error);
            }
          } else {
            try {
              const token = await getAccessTokenSilently();
              await axios.post(`${import.meta.env.VITE_BACKEND_URL}/petals/${d.id}/resonate`, {}, {
                headers: { Authorization: `Bearer ${token}` }
              });
              fetchPetals();
            } catch (error)
{
              console.error('Error resonating with petal:', error);
            }
          }
        });

      resonateButton.append("circle").attr("r", 10).attr("fill", "gold");
      resonateButton.append("text").text("✨").attr("text-anchor", "middle").attr("dy", 4);

      nodeGroups.on("mouseover", function() {
        d3.select(this).select(".resonate-button").style("display", "block");
      }).on("mouseout", function() {
        d3.select(this).select(".resonate-button").style("display", "none");
      });
    };
    renderPetals(petals, nodesGroup);
  }, [petals, skills, svgDimensions, isEditMode, isManifestView, zoomTransform, userId, session, resonanceEvents, intentionId, intention, getAccessTokenSilently, fetchPetals, handlePetalAction, handleAddPetal, handleEditPetal]);

  return (
    <div className="lotus-map-container" ref={containerRef}>
      <div className="lotus-header">
        <h1>✿ INTENTION LOTUS MAP ✿</h1>
        <div className="intention-details">
          <span>[ Intention: “{intention?.name}” ]</span>
          <span>Realm: “{intention?.realm_name || 'None'}”</span>
        </div>
      </div>

      <div className="visualization-wrapper">
        <svg ref={svgRef}></svg>
      </div>

      <div className="lotus-controls">
        <div className="color-legend">
          <span><span className="legend-color" style={{background: '#9B59B6'}}></span> Active</span>
          <span><span className="legend-color" style={{background: '#3498DB'}}></span> In Progress</span>
          <span><span className="legend-color" style={{background: '#2ECC71'}}></span> Completed</span>
          <span><span className="legend-color" style={{background: '#FDFEFE'}}></span> Future</span>
          <span className="glow-info">Glow = resonance intensity</span>
        </div>
        <div className="action-buttons">
          {intention?.creator_id === userId && (
            <>
              <button className="control-button" onClick={() => handleAddPetal()}>[ Add Petal ]</button>
              <button className="control-button" onClick={() => setIsEditMode(!isEditMode)}>
                {isEditMode ? "[ Finish Editing ]" : "[ Edit Links ]"}
              </button>
            </>
          )}
          <button className="control-button" onClick={() => setIsManifestView(!isManifestView)}>
            [ Manifest View {isManifestView ? 'ON' : 'OFF'} 🌠 ]
          </button>
          {session ? (
            <button className="control-button" onClick={() => navigate('/manifestation-session', { state: { sessionId: session.id } })}>
              [ Go to Session ]
            </button>
          ) : (
            <button className="control-button" onClick={handleStartSession}>
              [ Start Manifestation Session ]
            </button>
          )}
        </div>
      </div>

      {isManifestView && manifestationSummary && (
          <div className="narration-overlay">
              <p>{manifestationSummary}</p>
          </div>
      )}

      {showPetalPopup && (
        <PetalEditor
          open={showPetalPopup}
          onClose={() => {
            setShowPetalPopup(false);
            fetchPetals();
          }}
          intentionId={intentionId}
          petalForm={petalForm}
          setPetalForm={setPetalForm}
          onSubmit={async (formData) => {
            const action = formData.id ? 'update' : 'create';
            await handlePetalAction(formData, action);
            fetchPetals();
          }}
          skills={skills}
          isEdit={true} // Keep editor always editable for simplicity
          currentUser={user}
          intentionCreatorId={intention?.creator_id}
          isReviewer={petalForm?.reviewer_ids?.includes(userId)}
        />
      )}
    </div>
  );
};

export default IntentionLotusMap;
