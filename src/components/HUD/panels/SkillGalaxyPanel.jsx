import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import PropTypes from 'prop-types';
import useSkillData from '../../../hooks/useSkillData';
import { useUserProfile } from '../../../hooks/useUserProfile';
import * as d3 from 'd3';
import './SkillGalaxyPanel.css';
import '../HUDPanel.css';
import theme from '../../../styles/theme';
import { processSkillDataForGalaxy } from '../../../utils/skillUtils';
import SkillDetailPopup from './SkillDetailPopup';

const SkillGalaxyPanel = ({ isFullPage = false, userId: propUserId }) => {
  const { user, isAuthenticated } = useAuth0();
  const { allSkills, loading: skillsLoading, error: skillsError } = useSkillData();
  const { profile } = useUserProfile();

  const [selectedSkillForPopup, setSelectedSkillForPopup] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const svgRef = useRef(null);
  const simulationRef = useRef(null);
  const fixedStarPositionsRef = useRef(new Map());
  const initialZoomAppliedRef = useRef(false);
  const panelRef = useRef(null);

  // Use correct keys in the ref to match the return structure of useMemo
  const lastGalaxyDataRef = useRef({ galaxyNodes: [], galaxyLinks: [], processedSkills: [] });

  const toggleMinimize = useCallback((e) => {
    if (e && e.currentTarget.tagName === 'BUTTON' && e.target.tagName === 'BUTTON') {
      e.stopPropagation();
    }
    setIsMinimized((prev) => !prev);
  }, []);

  const getStarGradientUrl = useCallback((level) => {
    if (level >= 20) return 'url(#star-gradient-3)';
    if (level >= 10) return 'url(#star-gradient-2)';
    if (level >= 5) return 'url(#star-gradient-1)';
    return 'url(#star-gradient-0)';
  }, []);

  // ── Data processing memo ──────────────────────────────────────────────────
  // Refactor to useMemo to resolve ReferenceErrors and ensure stable data for D3
  const { galaxyNodes, galaxyLinks, processedSkills } = useMemo(() => {
    if (!skillsLoading && allSkills && allSkills.length > 0 && isAuthenticated && (user?.sub || propUserId)) {
      const userId = propUserId || profile?.id || user?.sub;
      const skillsForGalaxy = processSkillDataForGalaxy(allSkills, userId);
      const validSkills = skillsForGalaxy.filter((skill) => skill && skill.id != null);

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

      // Structural identity check to prevent D3 restarts if nodes/links are effectively the same.
      // This preserves object identity so React dependencies (like in useEffect) don't trigger unnecessarily.
      const prev = lastGalaxyDataRef.current;
      const nodesSame = prev.galaxyNodes.length === newNodes.length &&
                        prev.galaxyNodes.every((n, i) => n.id === newNodes[i].id);
      const linksSame = prev.galaxyLinks.length === newLinks.length &&
                        prev.galaxyLinks.every((l, i) => l.id === newLinks[i].id);

      if (nodesSame && linksSame) {
        return prev;
      }

      const newData = { galaxyNodes: newNodes, galaxyLinks: newLinks, processedSkills: skillsForGalaxy };
      lastGalaxyDataRef.current = newData;
      return newData;
    }

    // Default empty state
    return { galaxyNodes: [], galaxyLinks: [], processedSkills: [] };
  }, [allSkills, skillsLoading, isAuthenticated, user?.sub, profile?.id, propUserId]);

  // ── D3 rendering effect ───────────────────────────────────────────────────
  useEffect(() => {
    if (galaxyNodes.length === 0 || !svgRef.current) {
      if (svgRef.current) d3.select(svgRef.current).selectAll('.everything').remove();
      return;
    }

    const svg = d3.select(svgRef.current);
    const container = svgRef.current.parentElement;
    // Use clientWidth/Height for better measurement during initialization
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    svg.attr('width', width).attr('height', height);

    let defs = svg.select('defs');
    if (defs.empty()) defs = svg.append('defs');

    const starColors = [
      theme.colors.primary,
      theme.colors.accentGreen,
      theme.colors.secondary,
      theme.colors.accentPurple || '#800080',
    ];

    starColors.forEach((color, i) => {
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

    const mainGroup = svg.append('g').attr('class', 'everything');

    // Clean up previous simulation
    simulationRef.current?.stop();
    const sim = d3.forceSimulation()
      .nodes(galaxyNodes)
      .force('link', d3.forceLink(galaxyLinks).id((d) => d.id).distance(80).strength(0.3))
      .force('charge', d3.forceManyBody().strength(-800))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(30));

    simulationRef.current = sim;

    const link = mainGroup.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(galaxyLinks, (d) => d.id)
      .join('line')
      .attr('stroke', theme.colors.border || '#666')
      .attr('stroke-width', 1.5)
      .style('stroke-opacity', 0.6);

    const node = mainGroup.append('g')
      .attr('class', 'nodes')
      .selectAll('g.node-group')
      .data(galaxyNodes, (d) => d.id)
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
            .text((d) => (d.category === 'star' ? `Lvl ${d.levelForColor}` : `Lvl ${d.userLevel}`))
            .attr('dy', (d) => {
              if (d.category === 'star') return 35;
              if (d.category === 'planet') return 25;
              if (d.category === 'moon') return 18;
              return 13;
            });

          group
            .on('mouseenter', (event, d_hovered) => {
              const constellationIds = new Set();
              const nodesMap = new Map(galaxyNodes.map((n) => [n.id, n]));
              const childrenMap = new Map();
              galaxyNodes.forEach((n) => {
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
                if (children) children.forEach((childId) => collect(childId));
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
                .style('opacity', (n) => (constellationIds.has(n.id) ? 1 : 0.3));
            })
            .on('mouseleave', () => {
              mainGroup.selectAll('.links line')
                .style('stroke', theme.colors.border || '#666')
                .style('stroke-width', 1.5)
                .style('stroke-opacity', 0.6);
              mainGroup.selectAll('.nodes .node-group').style('opacity', 1);
            });

          return group;
        },
        (update) => {
          update.selectAll('.level-label')
            .filter((d) =>
              (d.category === 'star' && d.levelForColor > 0) ||
              (['planet', 'moon', 'satellite'].includes(d.category) && d.userLevel > 0)
            )
            .text((d) => (d.category === 'star' ? `Lvl ${d.levelForColor}` : `Lvl ${d.userLevel}`));

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
            const base = isLevel ? 9 : (d.category === 'star' ? 14 : 10);
            return Math.max(base / k, base * (isLevel ? 0.4 : d.category === 'star' ? 0.7 : 0.5)) + 'px';
          })
          .style('display', (d) => {
            if (d.category === 'star') return k < 0.125 ? 'none' : 'block';
            return k < 0.5 ? 'none' : 'block';
          });
      });

    svg.call(zoomBehavior);

    sim.on('end.fixStars', () => {
      const svgWidth = parseFloat(svg.attr('width'));
      const svgHeight = parseFloat(svg.attr('height'));

      if (!initialZoomAppliedRef.current) {
        const starNodes = galaxyNodes.filter((d) => d.category === 'star');
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

      // Persist star positions in the ref for the next useMemo run
      galaxyNodes.forEach((dNode) => {
        if (dNode.category === 'star') {
          fixedStarPositionsRef.current.set(dNode.id, { fx: dNode.x, fy: dNode.y });
        }
      });
    });

    return () => {
      sim.on('end.fixStars', null);
    };
  }, [galaxyNodes, galaxyLinks, getStarGradientUrl, theme.colors]);

  if (skillsLoading) {
    return <div className="skill-galaxy-panel-loading" style={{ color: theme.colors.textSecondary }}>Loading Skill Data...</div>;
  }
  if (skillsError) {
    return <div className="skill-galaxy-panel-error" style={{ color: theme.colors.error }}>Error loading skills: {skillsError.message || skillsError.toString()}</div>;
  }
  if (processedSkills.length === 0 && galaxyNodes.length === 0 && !skillsLoading && !skillsError) {
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
