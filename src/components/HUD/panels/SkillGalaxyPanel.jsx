import React, { useState, useEffect, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import useSkillData from '../../../hooks/useSkillData';
import { useUserProfile } from '../../../hooks/useUserProfile';
import * as d3 from 'd3';
import './SkillGalaxyPanel.css';
import '../HUDPanel.css';
import theme from '../../../styles/theme';
import { processSkillDataForGalaxy } from '../../../utils/skillUtils';
import SkillDetailPopup from './SkillDetailPopup';
import PropTypes from 'prop-types';

const hexToRgb = (hex) => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex[1] + hex[2], 16);
    g = parseInt(hex[3] + hex[4], 16);
    b = parseInt(hex[5] + hex[6], 16);
  }
  return { r, g, b };
};

const getPastelColor = (hexColor, lightnessFactor = 0.8) => {
  const { r, g, b } = hexToRgb(hexColor);
  const pr = Math.round((1 - lightnessFactor) * r + lightnessFactor * 255);
  const pg = Math.round((1 - lightnessFactor) * g + lightnessFactor * 255);
  const pb = Math.round((1 - lightnessFactor) * b + lightnessFactor * 255);
  return `#${pr.toString(16).padStart(2, '0')}${pg.toString(16).padStart(2, '0')}${pb.toString(16).padStart(2, '0')}`;
};

const SkillGalaxyPanel = ({ isFullPage = false, userId: propUserId }) => {
  const { user, isAuthenticated } = useAuth0();
  const { allSkills, loading: skillsLoading, error: skillsError } = useSkillData();
  const { profile } = useUserProfile();
  const svgRef = useRef(null);

  // FIX (Infinite Loop 1): Store the simulation in a REF, not state.
  // When simulation was state, calling setSimulation() inside the D3 effect
  // caused the effect to re-run (simulation was in its deps), which called
  // setSimulation() again → infinite loop.
  const simulationRef = useRef(null);

  useEffect(() => {
    simulationRef.current = d3.forceSimulation()
      .force('link', d3.forceLink().id((d) => d.id).distance(80).strength(0.3))
      .force('charge', d3.forceManyBody().strength(-800))
      .force('collide', d3.forceCollide().radius(30));

    return () => simulationRef.current?.stop();
  }, []);

  const fixedStarPositionsRef = useRef(new Map());
  const initialZoomAppliedRef = useRef(false);

  // FIX (Infinite Loop 2): Removed the forceDataUpdate state entirely.
  // It was toggled inside the simulation's 'end' handler, which put it into
  // the data-processing effect's deps, which re-ran that effect, which
  // updated d3Nodes, which re-ran the D3 effect, which started a new
  // simulation, which ended and toggled forceDataUpdate again → infinite loop.
  //
  // fixedStarPositionsRef is a ref — its .current is always up-to-date and
  // is read directly during data processing. No state toggle needed.

  const [selectedSkillForPopup, setSelectedSkillForPopup] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const panelRef = useRef(null);

  const toggleMinimize = (e) => {
    if (e && e.currentTarget.tagName === 'BUTTON' && e.target.tagName === 'BUTTON') {
      e.stopPropagation();
    }
    setIsMinimized((prev) => !prev);
  };

  const getStarGradientUrl = React.useCallback((level) => {
    if (level >= 20) return 'url(#star-gradient-3)';
    if (level >= 10) return 'url(#star-gradient-2)';
    if (level >= 5) return 'url(#star-gradient-1)';
    return 'url(#star-gradient-0)';
  }, []);

  // ── Data processing effect ────────────────────────────────────────────────
  // FIX: Removed forceDataUpdate from deps. fixedStarPositionsRef.current is
  // always current (it's a ref), so re-running this effect to "pick up" new
  // fixed positions is unnecessary and was the trigger for loop 2.
  useEffect(() => {
    if (!skillsLoading && allSkills && allSkills.length > 0 && isAuthenticated && (user?.sub || propUserId)) {
      const userId = propUserId || profile?.id || user?.sub;
      const skillsForGalaxy = processSkillDataForGalaxy(allSkills, userId);

      const validSkills = skillsForGalaxy.filter((skill) => {
        if (skill && skill.id != null) return true;
        console.warn('[SkillGalaxy] Filtered out skill with missing ID:', skill);
        return false;
      });

      const nodes = validSkills.map((skill) => {
        let fx = null, fy = null;
        if (skill.category === 'star') {
          const fixedPos = fixedStarPositionsRef.current.get(skill.id.toString());
          if (fixedPos) { fx = fixedPos.fx; fy = fixedPos.fy; }
        }
        return {
          id: skill.id.toString(),
          name: skill.name || 'Unnamed Skill',
          parent: skill.parent_skill_id && skill.parent_skill_id !== skill.id
            ? skill.parent_skill_id.toString()
            : null,
          level: skill.userLevel,
          userLevel: skill.userLevel,
          experience: skill.userExperience,
          experienceNeeded: skill.experienceNeededForNextLevel,
          levelForColor: skill.levelForColor !== undefined
            ? skill.levelForColor
            : (skill.category === 'star' ? 0 : skill.userLevel),
          category: skill.category || 'star',
          originalData: skill,
          fx,
          fy,
        };
      });

      const skillsMap = new Map(validSkills.map((s) => [s.id.toString(), s]));
      const newLinks = [];
      validSkills.forEach((skill) => {
        if (skill.parent_skill_id) {
          const pid = skill.parent_skill_id.toString();
          if (skillsMap.has(pid)) {
            newLinks.push({
              source: pid,
              target: skill.id.toString(),
              id: `link-${pid}-${skill.id}`,
            });
          }
        }
      });

      // Avoid unnecessary state updates if data hasn't changed.
      // We compare IDs to see if the structure is the same.
      setD3Nodes((prev) => {
        const isSame = prev.length === newNodes.length && prev.every((n, i) => n.id === newNodes[i].id);
        return isSame ? prev : newNodes;
      });
      setD3Links((prev) => {
        const isSame = prev.length === newLinks.length && prev.every((l, i) => l.id === newLinks[i].id);
        return isSame ? prev : newLinks;
      });
      setProcessedSkills(skillsForGalaxy);
    } else {
      if (d3Nodes.length > 0) setD3Nodes([]);
      if (d3Links.length > 0) setD3Links([]);
      if (processedSkills.length > 0) setProcessedSkills([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSkills, skillsLoading, isAuthenticated, user?.sub, profile?.id, propUserId]);

  // Update simulation instead of recreating
  useEffect(() => {
    const sim = simulationRef.current;
    if (!sim || d3Nodes.length === 0) return;

    sim.nodes(d3Nodes);
    sim.force('link').links(d3Links);

    sim.alpha(0.5).alphaDecay(0.08).restart();
  }, [d3Nodes, d3Links]);

  // ── D3 rendering effect ───────────────────────────────────────────────────
  // FIX: simulation is now a ref (simulationRef) — not in deps, not state.
  // This effect only re-runs when the actual data (nodes/links) changes.
  useEffect(() => {
    if (d3Nodes.length === 0 || !svgRef.current) {
      if (svgRef.current) d3.select(svgRef.current).selectAll('.everything').remove();
      return;
    }

    const svg = d3.select(svgRef.current);
    const container = svgRef.current.parentElement;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    svg.attr('width', width).attr('height', height);

    let defs = svg.select('defs');
    if (defs.empty()) defs = svg.append('defs');

    const newStarColors = [
      theme.colors.primary,
      theme.colors.accentGreen,
      theme.colors.secondary,
      theme.colors.accentPurple || '#800080',
    ];

    newStarColors.forEach((color, i) => {
      const gradientId = `star-gradient-${i}`;
      if (defs.select(`#${gradientId}`).empty()) {
        const gradient = defs.append('radialGradient')
          .attr('id', gradientId)
          .attr('cx', '50%').attr('cy', '50%').attr('r', '50%')
          .attr('fx', '40%').attr('fy', '40%');
        gradient.append('stop').attr('offset', '0%').attr('stop-color', d3.color(color).brighter(1.8).formatHex());
        gradient.append('stop').attr('offset', '25%').attr('stop-color', d3.color(color).brighter(0.7).formatHex());
        gradient.append('stop').attr('offset', '50%').attr('stop-color', color);
        gradient.append('stop').attr('offset', '100%').attr('stop-color', d3.color(color).darker(0.8).formatHex());
      }
    });

    let mainGroup = svg.select('g.everything');
    if (mainGroup.empty()) mainGroup = svg.append('g').attr('class', 'everything');

    const sim = simulationRef.current;
    sim.force('center', d3.forceCenter(width / 2, height / 2));

    let linksLayer = mainGroup.select('g.links');
    if (linksLayer.empty()) linksLayer = mainGroup.append('g').attr('class', 'links');

    const link = linksLayer.selectAll('line')
      .data(d3Links, (d) => d.id)
      .join('line')
      .attr('stroke', theme.colors.border || '#666')
      .attr('stroke-width', 1.5)
      .style('stroke-opacity', 0.6);

    let nodesLayer = mainGroup.select('g.nodes');
    if (nodesLayer.empty()) nodesLayer = mainGroup.append('g').attr('class', 'nodes');

    const node = nodesLayer.selectAll('g.node-group')
      .data(d3Nodes, (d) => d.id)
      .join(
        (enter) => {
          const group = enter.append('g')
            .attr('class', 'node-group')
            .style('opacity', 0)
            .call((g) => g.transition().duration(500).style('opacity', 1));

          group.append('circle')
            .attr('r', (d) => {
              const cat = d.category || 'star';
              return cat === 'star' ? 25 : cat === 'planet' ? 15 : cat === 'moon' ? 8 : 5;
            })
            .style('fill', (d) => {
              const cat = d.category || 'star';
              const lvl = cat === 'star' ? (d.levelForColor || 0) : (d.userLevel || 0);
              return getStarGradientUrl(lvl);
            })
            .style('stroke', theme.colors.border || '#666')
            .style('stroke-width', 1)
            .on('click', (event, d) => {
              event.stopPropagation();
              setSelectedSkillForPopup(d);
            });

          group.append('text')
            .attr('class', 'node-label')
            .text((d) => d.name)
            .attr('dy', (d) => {
              const cat = d.category || 'star';
              return cat === 'star' ? -30 : cat === 'planet' ? -20 : cat === 'moon' ? -12 : -9;
            })
            .style('fill', theme.colors.textPrimary || '#fff')
            .style('font-size', (d) => d.category === 'star' ? '14px' : '10px')
            .style('text-anchor', 'middle')
            .style('pointer-events', 'none');

          group.filter((d) =>
            (d.category === 'star' && d.levelForColor > 0) ||
            (['planet', 'moon', 'satellite'].includes(d.category) && d.userLevel > 0)
          )
            .append('text')
            .attr('class', 'level-label')
            .text((d) => d.category === 'star' ? `Lvl ${d.levelForColor}` : `Lvl ${d.userLevel}`)
            .attr('dy', (d) => {
              if (d.category === 'star') return 35;
              if (d.category === 'planet') return 25;
              if (d.category === 'moon') return 18;
              return 13;
            });

          const attachHover = (sel) => {
            sel
              .on('mouseenter', (event, d_hovered) => {
                const constellationIds = new Set();

                // Optimized collection using a pre-built map would be better,
                // but at minimum let's avoid redundant searches.
                const nodesMap = new Map(d3Nodes.map(n => [n.id, n]));
                const childrenMap = new Map();
                d3Nodes.forEach(n => {
                  if (n.parent) {
                    if (!childrenMap.has(n.parent)) childrenMap.set(n.parent, []);
                    childrenMap.get(n.parent).push(n.id);
                  }
                });

                const collect = (nodeId) => {
                  if (constellationIds.has(nodeId)) return;
                  constellationIds.add(nodeId);

                  const n = nodesMap.get(nodeId);
                  if (n?.parent) collect(n.parent);

                  const children = childrenMap.get(nodeId);
                  if (children) children.forEach(childId => collect(childId));
                };
                collect(d_hovered.id);

                mainGroup.selectAll('.links line')
                  .style('stroke', (l) => {
                    const s = l.source.id || l.source;
                    const t = l.target.id || l.target;
                    return constellationIds.has(s) && constellationIds.has(t) ? 'white' : (theme.colors.border || '#666');
                  })
                  .style('stroke-width', (l) => {
                    const s = l.source.id || l.source;
                    const t = l.target.id || l.target;
                    return constellationIds.has(s) && constellationIds.has(t) ? 3 : 1.5;
                  })
                  .style('stroke-opacity', (l) => {
                    const s = l.source.id || l.source;
                    const t = l.target.id || l.target;
                    return constellationIds.has(s) && constellationIds.has(t) ? 1 : 0.6;
                  });
                mainGroup.selectAll('.nodes .node-group')
                  .style('opacity', (n) => constellationIds.has(n.id) ? 1 : 0.3);
              })
              .on('mouseleave', () => {
                mainGroup.selectAll('.links line')
                  .style('stroke', theme.colors.border || '#666')
                  .style('stroke-width', 1.5)
                  .style('stroke-opacity', 0.6);
                mainGroup.selectAll('.nodes .node-group').style('opacity', 1);
              });
          };

          attachHover(group);
          return group;
        },
        (update) => {
          update.selectAll('.level-label')
            .filter((d) =>
              (d.category === 'star' && d.levelForColor > 0) ||
              (['planet', 'moon', 'satellite'].includes(d.category) && d.userLevel > 0)
            )
            .text((d) => d.category === 'star' ? `Lvl ${d.levelForColor}` : `Lvl ${d.userLevel}`);

          update.select('circle').style('fill', (d) => {
            const cat = d.category || 'star';
            const lvl = cat === 'star' ? (d.levelForColor || 0) : (d.userLevel || 0);
            return getStarGradientUrl(lvl);
          });
          return update;
        },
        (exit) => exit.transition().duration(300).style('opacity', 0).remove()
      );

    sim.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y);
      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    const zoomBehavior = d3.zoom()
      .scaleExtent([0.1, 5])
      .on('zoom', (event) => {
        mainGroup.attr('transform', event.transform);
        const k = event.transform.k;
        mainGroup.selectAll('.node-label, .level-label')
          .style('font-size', function (d) {
            const isLevel = d3.select(this).classed('level-label');
            let base = isLevel ? 9 : (d.category === 'star' ? 14 : 10);
            return Math.max(base / k, base * (isLevel ? 0.4 : d.category === 'star' ? 0.7 : 0.5)) + 'px';
          })
          .style('display', function (d) {
            if (d.category === 'star') return k < 0.125 ? 'none' : 'block';
            return k < 0.5 ? 'none' : 'block';
          });
      });

    svg.call(zoomBehavior);

    // FIX: The 'end' handler no longer calls setForceDataUpdate.
    // It updates fixedStarPositionsRef and mutates node fx/fy in place.
    // That's sufficient — the next data processing run will read from
    // fixedStarPositionsRef.current directly (ref is always current).
    sim.on('end.fixStars', () => {
      const svgWidth = parseFloat(svg.attr('width'));
      const svgHeight = parseFloat(svg.attr('height'));

      if (!initialZoomAppliedRef.current) {
        const starNodes = d3Nodes.filter((d) => d.category === 'star');
        if (starNodes.length > 0) {
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          starNodes.forEach((d) => {
            if (d.x < minX) minX = d.x; if (d.x > maxX) maxX = d.x;
            if (d.y < minY) minY = d.y; if (d.y > maxY) maxY = d.y;
          });
          const dW = maxX - minX, dH = maxY - minY;
          const pad = 80;
          let k = 0.75, tx = svgWidth / 2, ty = svgHeight / 2;
          if (dW > 0 && dH > 0) {
            k = Math.min((svgWidth - pad * 2) / dW, (svgHeight - pad * 2) / dH, 1);
            k = Math.max(k, 0.2);
            tx = svgWidth / 2 - k * (minX + dW / 2);
            ty = svgHeight / 2 - k * (minY + dH / 2);
          } else if (starNodes.length === 1) {
            tx = svgWidth / 2 - k * starNodes[0].x;
            ty = svgHeight / 2 - k * starNodes[0].y;
          }
          svg.transition().duration(750).call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(k));
        } else {
          svg.call(zoomBehavior.transform, d3.zoomIdentity);
        }
        initialZoomAppliedRef.current = true;
      }

      // Persist fixed positions for next data processing run (no state update needed)
      d3Nodes.forEach((dNode) => {
        dNode.fx = dNode.x;
        dNode.fy = dNode.y;
        if (dNode.category === 'star') {
          fixedStarPositionsRef.current.set(dNode.id, { fx: dNode.x, fy: dNode.y });
        }
      });
    });

    return () => {
      sim.on('end.fixStars', null);
    };
  }, [d3Nodes, d3Links, getStarGradientUrl, theme.colors]);
  // FIX: Removed `simulation` (now a ref) and `forceDataUpdate` (removed entirely)
  // from deps. Also removed memoizedGetPastelColor (unused in current render logic)
  // and fixedStarPositionsRef (refs don't need to be in deps).

  if (skillsLoading) {
    return <div className="skill-galaxy-panel-loading" style={{ color: theme.colors.textSecondary }}>Loading Skill Data...</div>;
  }
  if (skillsError) {
    return <div className="skill-galaxy-panel-error" style={{ color: theme.colors.error }}>Error loading skills: {skillsError.message || skillsError.toString()}</div>;
  }
  if (processedSkills.length === 0 && d3Nodes.length === 0 && !skillsLoading && !skillsError) {
    return (
      <div className={`hud-panel skill-galaxy-panel ${isMinimized ? 'minimized' : ''}`}>
        <h2 style={{ color: theme.colors.textPrimary }}>Skill Constellations</h2>
        <div className="skill-galaxy-empty" style={{ color: theme.colors.textSecondary, textAlign: 'center', marginTop: '50px' }}>
          <p>Your Skill Constellation is forming.</p>
          <p>Unlock skills by completing missions or training!</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className={isFullPage ? 'skill-galaxy-panel full-page' : `hud-panel skill-galaxy-panel ${isMinimized ? 'minimized' : ''}`}
      style={isFullPage ? { height: '100%', width: '100%', margin: 0, border: 'none', borderRadius: 0, backgroundColor: 'transparent' } : {}}
    >
      {!isFullPage && (
        <div className="hud-panel-header" onClick={toggleMinimize} title={isMinimized ? 'Expand Panel' : 'Minimize Panel'}>
          <h4>Skill Constellations</h4>
          <button onClick={toggleMinimize} className="minimize-btn" aria-label={isMinimized ? 'Expand Skill Constellations' : 'Minimize Skill Constellations'}>
            {isMinimized ? '+' : '-'}
          </button>
        </div>
      )}
      <div style={{ width: '100%', height: isFullPage ? '100%' : '500px', minHeight: isFullPage ? '100%' : '400px' }}>
        <svg
          ref={svgRef}
          className="skill-galaxy-svg"
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: theme.colors.background || 'transparent',
            border: '1px solid ' + (theme.colors.border || '#666'),
          }}
        />
      </div>
      {selectedSkillForPopup && (
        <SkillDetailPopup
          skillData={selectedSkillForPopup}
          onClose={() => setSelectedSkillForPopup(null)}
          parentRef={panelRef}
        />
      )}
    </div>
  );
};

SkillGalaxyPanel.propTypes = {
  isFullPage: PropTypes.bool,
  userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default SkillGalaxyPanel;