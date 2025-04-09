import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import TaskEditor from './TaskEditor';
import { useProjectTasks } from '../hooks/useProjectTasks';
import './ProjectVisualizer.css';
import { useParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useMemo } from 'react';

const ProjectVisualizer = () => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const { projectId } = useParams();
  const { user } = useAuth0();
  const { tasks, skills, project, handleTaskAction, fetchTasks } = useProjectTasks(projectId, user);
  const [activeCategory, setActiveCategory] = useState(skills[0]?.name || '');
  const [isEditMode, setIsEditMode] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [visibleSkillsStart, setVisibleSkillsStart] = useState(0);
  const [zoomTransform, setZoomTransform] = useState({ k: 1, x: 0, y: 0 });
  const [svgDimensions, setSvgDimensions] = useState({ width: 800, height: 600 });
  const [activeSkillId, setActiveSkillId] = useState(null);

  const categorizedTasks = useMemo(() => {
    const filteredSkills = skills.filter(skill =>
      tasks.some(task => task.skill_id === skill.id)
    );
  
    const taskMap = filteredSkills.reduce((acc, skill) => {
      acc[skill.name] = tasks.filter(task => task.skill_id === skill.id);
      return acc;
    }, {});
  
    return taskMap;
  }, [tasks, skills]);

  const initialForm = {
    id: null,
    name: '',
    description: '',
    status: 'inactive-unassigned',
    dependencies: [],
    skill_id: 0,
    project_id: projectId,
    reward_tokens: 10
  };


  // local modal control here
  const [taskForm, setTaskForm] = useState(initialForm);
  const [showTaskPopup, setShowTaskPopup] = useState(false);

  const handleEditTask = (task) => {
    setTaskForm(task);        // Fill in form with task values
    setShowTaskPopup(true);   // Show the TaskEditor modal
  };

  const handleAddTask = (dependencyId = null) => {
    setTaskForm({
      ...initialForm,
      project_id: projectId,
      dependencies: dependencyId ? [dependencyId] : [],
      skill_id: activeSkillId ? activeSkillId : ''
    });
    setShowTaskPopup(true);
  };

  const MAX_VISIBLE_TABS = 5;
  const FIXED_LEVEL_HEIGHT = 120; 
  const MAX_EXTERNAL_DEPS = 3; 

  // All tasks across all skills - used to find external dependencies
  const allTasks = tasks.reduce((acc, task) => {
    acc[task.id] = task;
    return acc;
  }, {});

  const getNodeColor = (status) => {
    switch(status) {
      case 'completed': return '#FF69B4';
      case 'urgent-unassigned': return '#888888';
      case 'urgent-assigned': return '#32CD32';
      case 'inactive-unassigned': return '#87CEFA';
      case 'inactive-assigned': return '#4682B4';
      case 'active-assigned': return '#32CD32';
      case 'active-unassigned': return '#00FF00';
      default: return '#CCCCCC';
    }
  };

  const getNodeStroke = (status) => {
    if (status === 'active-unassigned' || status === 'active-assigned') return '#32CD32';
    if (status === 'inactive-unassigned' || status === 'inactive-assigned') return '#4682B4';
    if (status === 'urgent-unassigned' || status === 'urgent-assigned') return '#FF0000';
    if (status === 'completed') return '#FF69B4';
    return '#CCCCCC';
  };

  const getNodeFill = (status) => {
    if (status.includes('unassigned')) return '#888888';
    return getNodeColor(status);
  };

  const truncateText = (text, maxLength = 13) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const navigateTabs = (direction) => {
    const newStart = direction === 'next' 
      ? Math.min(visibleSkillsStart + 1, skills.length - MAX_VISIBLE_TABS)
      : Math.max(visibleSkillsStart - 1, 0);
    setVisibleSkillsStart(newStart);
  };

  const usedSkills = skills.filter(skill => tasks.some(task => task.skill_id === skill.id));
  const visibleSkills = usedSkills.slice(visibleSkillsStart, visibleSkillsStart + MAX_VISIBLE_TABS);

  const showRightArrow = visibleSkillsStart + MAX_VISIBLE_TABS < usedSkills.length;
  const showLeftArrow = visibleSkillsStart > 0;
  
  // Handle mouse leave for the entire visualization container
  const handleMouseLeave = () => {
    setHoveredNode(null);
  };

  // Store the zoom object in a ref to maintain it across renders
  const zoomRef = useRef(null);

  useEffect(() => {
    const firstUsedSkill = skills.find(skill =>
      tasks.some(task => task.skill_id === skill.id)
    );
    if (firstUsedSkill) {
      setActiveCategory(firstUsedSkill.name);
      setActiveSkillId(firstUsedSkill.id);
    }
  }, [skills, tasks]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!containerRef.current.contains(e.target)) {
        setHoveredNode(null);
      }
    };
  
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Effect for updating SVG dimensions to match container
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDimensions = () => {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      
      // Update the visualization size based on container
      if (containerWidth > 0 && containerHeight > 0) {
        // Make sure we have some reasonable minimum dimensions
        const width = Math.max(containerWidth - 30, 800);
        const height = 600;
        
        setSvgDimensions({ width, height });
      }
    };
    
    // Initial update
    updateDimensions();
    
    // Set up resize observer
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);
    
    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    const data = categorizedTasks[activeCategory] || [];
    if (data.length === 0) return;

    const { width, height } = svgDimensions;
    const NODE_HORIZONTAL_SPACING = 100; // Fixed horizontal spacing between nodes
    
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Create zoom behavior that will be maintained across renders
    if (!zoomRef.current) {
      zoomRef.current = d3.zoom()
        .scaleExtent([0.3, 3])
        .on('zoom', (event) => {
            const {x, y, k} = event.transform;
            setZoomTransform({x, y, k});
            mainGroup.attr('transform', event.transform);
        });
    }

    // Create main SVG with zoom capabilities
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .call(zoomRef.current);
    
    // Create a main group that will be transformed during zooming
    const mainGroup = svg.append('g')
      .attr('transform', `translate(${zoomTransform.x}, ${zoomTransform.y}) scale(${zoomTransform.k})`);
      
    // Create separate groups for links and nodes to control layering
    // Links should be drawn first (below nodes)
    const linksGroup = mainGroup.append('g').attr('class', 'links-group');
    const nodesGroup = mainGroup.append('g').attr('class', 'nodes-group');
    const addButtonsGroup = mainGroup.append('g').attr('class', 'add-buttons-group');

    // Find the skill_id for the active category
    setActiveSkillId(skills.find(s => s.name === activeCategory)?.id);
    
    // Create a directed graph representation
    const graph = {};
    data.forEach(node => {
      graph[node.id] = {
        ...node,
        children: [],
        level: -1 // Will be assigned later
      };
    });
    
    // Populate children arrays
    data.forEach(node => {
      node.dependencies.forEach(depId => {
        if (graph[depId]) {
          graph[depId].children.push(node.id);
        }
      });
    });
    
    // Find root nodes (those with no dependencies within the category)
    const rootNodes = data.filter(node => {
      // Check if all dependencies are from external skills
      const internalDeps = node.dependencies.filter(depId => {
        const depTask = allTasks[depId];
        return depTask && depTask.skill_id === activeSkillId;
      });
      return internalDeps.length === 0;
    }).map(node => node.id);

    const handleNodeClick = (event, d) => {
        event.stopPropagation(); // Prevent click bubbling
      
        // Get node position relative to the SVG container
        const [x, y] = d3.pointer(event, containerRef.current);
      
        setHoveredNode({
          ...d,
          x,
          y
        });
      };
    
    // Perform topological sorting to assign levels
    const assignLevels = () => {
      // Mark all root nodes as level 0
      rootNodes.forEach(id => {
        graph[id].level = 0;
      });
      
      let hasChanged = true;
      
      // Continue until no more changes
      while (hasChanged) {
        hasChanged = false;
        
        // Check all nodes
        Object.values(graph).forEach(node => {
          if (node.level === -1) {
            // Check if all dependencies have levels assigned
            const internalDeps = node.dependencies.filter(depId => graph[depId]);
            const allDepsAssigned = internalDeps.every(depId => graph[depId].level !== -1);
            
            if (allDepsAssigned) {
              // Find maximum level of dependencies and add 1
              const maxDepLevel = Math.max(...internalDeps.map(depId => graph[depId].level), -1);
              node.level = maxDepLevel + 1;
              hasChanged = true;
            }
          }
        });
      }
      
      // Handle any remaining nodes (possible circular dependencies)
      Object.values(graph).forEach(node => {
        if (node.level === -1) {
          node.level = 0; // Assign to root level as fallback
        }
      });
    };
    
    assignLevels();
    
    // Group nodes by level
    const levels = [];
    const maxLevel = Math.max(...Object.values(graph).map(node => node.level));
    
    for (let i = 0; i <= maxLevel; i++) {
      levels[i] = Object.values(graph).filter(node => node.level === i);
    }
    
    // Calculate positions with fixed level height
    // For each level, calculate horizontal positions
    levels.forEach((levelNodes, levelIndex) => {
        // Calculate the total width of nodes in this level
        const levelWidth = NODE_HORIZONTAL_SPACING * (levelNodes.length - 1);
      
        // Start X is based on centering just this level — starting from 0
        const startX = 200 - levelWidth / 2;
      
        levelNodes.forEach((node, nodeIndex) => {
          node.x = startX + NODE_HORIZONTAL_SPACING * nodeIndex;
          node.y = FIXED_LEVEL_HEIGHT * (levelIndex + 0.5);
        });
      });
    
    // Create links array from dependencies
    const links = [];
    
    data.forEach(source => {
      const sourceNode = graph[source.id];
      if (!sourceNode) return;
      
      // Internal dependencies
      const internalDeps = source.dependencies.filter(depId => {
        const depTask = allTasks[depId];
        return depTask && depTask.skill_id === activeSkillId;
      });
      
      internalDeps.forEach(depId => {
        const targetNode = graph[depId];
        if (targetNode) {
          links.push({
            source: { x: sourceNode.x, y: sourceNode.y },
            target: { x: targetNode.x, y: targetNode.y },
            type: 'internal'
          });
        }
      });
    });

    // Draw links first (so they appear under nodes)
    linksGroup.selectAll('.link')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', d => d.type === 'internal' ? '#999' : '#666')
      .attr('stroke-width', d => d.type === 'internal' ? 1 : 1.5)
      .attr('stroke-dasharray', d => d.type === 'internal' ? 'none' : '5,5')
      .attr('d', d => {
        return `M${d.source.x},${d.source.y} C${d.source.x},${(d.source.y + d.target.y)/2} ${d.target.x},${(d.source.y + d.target.y)/2} ${d.target.x},${d.target.y}`;
      });

    // Process external dependencies for each node
    Object.values(graph).forEach(node => {
      // Get external dependencies (things this node depends on)
      const externalDeps = node.dependencies
        .filter(depId => {
          const depTask = allTasks[depId];
          return depTask && depTask.skill_id !== activeSkillId;
        })
        .map(depId => ({
          id: depId,
          sourceNode: node,
          type: 'depends-on', // This node depends on the external node
          taskInfo: allTasks[depId]
        }));
      
      // Get external dependents (things that depend on this node)
      const externalDependents = Object.values(allTasks)
        .filter(task => 
          task.skill_id !== activeSkillId &&
          task.dependencies.includes(node.id)
        )
        .map(task => ({
          id: task.id,
          sourceNode: node,
          type: 'depended-by', // The external node depends on this node
          taskInfo: task
        }));
        
      // Limit to MAX_EXTERNAL_DEPS dependencies of each type
      const limitedDeps = externalDeps.slice(0, MAX_EXTERNAL_DEPS);
      const limitedDependents = externalDependents.slice(0, MAX_EXTERNAL_DEPS);
      
      // Draw external dependency links first (under nodes)
      // Position external dependencies in a row above the node
      limitedDeps.forEach((dep, index) => {
        const totalDeps = limitedDeps.length;
        const offset = (index - (totalDeps - 1) / 2) * 30; // Distribute horizontally
        
        const x2 = node.x + offset;
        const y2 = node.y - 30; // Fixed distance above
        
        // Draw link
        linksGroup.append('line')
          .attr('class', 'external-link')
          .attr('stroke', '#666')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '2,2')
          .attr('x1', node.x)
          .attr('y1', node.y)
          .attr('x2', x2)
          .attr('y2', y2);
          
        // Draw external node
        const externalNodeGroup = nodesGroup.append('g')
          .attr('class', 'external-node')
          .attr('transform', `translate(${x2}, ${y2})`)
          .style('pointer-events', 'visible') 
          .on('mouseover', (event) => {
            if (dep.taskInfo) {
              setHoveredNode({
                id: dep.id,
                name: dep.taskInfo.name,
                status: dep.taskInfo.status,
                category: dep.taskInfo.category,
                type: dep.type,
                x: event.pageX,
                y: event.pageY
              });
            }
          })
          .on('mouseout', () => setHoveredNode(null))
          .on('mouseleave', () => setHoveredNode(null)) // Additional check to ensure tooltip disappears
          .on('click', () => handleEditTask(dep.taskInfo.id))
          
        externalNodeGroup.append('circle')
          .attr('r', 7)
          .attr('fill', dep.taskInfo ? getNodeFill(dep.taskInfo.status) : '#CCCCCC')
          .attr('stroke', dep.taskInfo ? getNodeStroke(dep.taskInfo.status) : '#999999')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '2,1');
      });
      
      // Position external dependents in a row below the node
      limitedDependents.forEach((dep, index) => {
        const totalDeps = limitedDependents.length;
        const offset = (index - (totalDeps - 1) / 2) * 30; // Distribute horizontally
        
        const x2 = node.x + offset;
        const y2 = node.y + 40; // Fixed distance below
        
        // Draw link
        linksGroup.append('line')
          .attr('class', 'external-link')
          .attr('stroke', '#666')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '2,2')
          .attr('x1', node.x)
          .attr('y1', node.y)
          .attr('x2', x2)
          .attr('y2', y2);
          
        // Draw external node
        const externalNodeGroup = nodesGroup.append('g')
          .attr('class', 'external-node')
          .attr('transform', `translate(${x2}, ${y2})`)
          .on('mouseover', (event) => {
            const [x, y] = d3.pointer(event); // Get coordinates relative to SVG
            if (dep.taskInfo) {
              setHoveredNode({
                id: dep.id,
                name: dep.taskInfo.name,
                status: dep.taskInfo.status,
                category: dep.taskInfo.category,
                type: dep.type,
                x: x + zoomTransform.x, // Account for zoom/pan
                y: y + zoomTransform.y  // Account for zoom/pan
              });
            }
          })
          .on('mouseout', () => setHoveredNode(null))
          .on('mouseleave', () => setHoveredNode(null)); // Additional check

          
        externalNodeGroup.append('circle')
          .attr('r', 7)
          .attr('fill', dep.taskInfo ? getNodeFill(dep.taskInfo.status) : '#CCCCCC')
          .attr('stroke', dep.taskInfo ? getNodeStroke(dep.taskInfo.status) : '#999999')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '2,1');
      });
    });

    // Draw the main nodes last (on top)
    const nodeGroups = nodesGroup.selectAll('.node')
      .data(Object.values(graph))
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x}, ${d.y})`)
      .style('pointer-events', 'all')
      .on('mouseover', (event, d) => {
        const [x, y] = d3.pointer(event); // Get coordinates relative to SVG
        // Find tasks depending on this one and tasks this one depends on
        const dependents = Object.values(allTasks).filter(task => 
          task.dependencies.includes(d.id)
        );
        
        const dependencies = d.dependencies.map(depId => allTasks[depId]).filter(Boolean);
        
        setHoveredNode({
          id: d.id,
          name: d.name,
          status: d.status,
          dependencies: dependencies.map(dep => ({ id: dep.id, skill: dep.skill_id, name: dep.name, category: dep.category })),
          dependents: dependents.map(dep => ({ id: dep.id, skill: dep.skill_id, name: dep.name, category: dep.category })),
          x: x + zoomTransform.x, // Account for zoom/pan
          y: y + zoomTransform.y  // Account for zoom/pan
        });
      })
      .on('mouseout', () => setHoveredNode(null))
      .on('mouseleave', () => setHoveredNode(null)) // Additional check
      .on('click', (event, d) => {
        if (isEditMode) handleEditTask(d);
      });
    nodeGroups.append('circle')
      .attr('r', 15)
      .attr('fill', d => getNodeFill(d.status))
      .attr('stroke', d => getNodeStroke(d.status))
      .attr('stroke-width', 2);

    nodeGroups.append('text')
      .attr('dy', 25)
      .attr('text-anchor', 'middle')
      .text(d => truncateText(d.name))
      .attr('font-size', '10px');

    nodeGroups.append('text')
      .attr('dy', 4)
      .attr('text-anchor', 'middle')
      .text(d => {
        if (d.status === 'completed') return '✓';
        if (d.status.includes('urgent')) return '!';
        if (d.status.includes('unassigned')) return '+';
        return '';
      })
      .attr('font-size', '12px')
      .attr('fill', d => d.status.includes('unassigned') ? '#000000' : '#FFFFFF');

    // Add the orange "+" nodes in edit mode
    if (isEditMode) {
      Object.values(graph).forEach(node => {
        const addButtonGroup = addButtonsGroup.append('g')
          .attr('class', 'add-button')
          .attr('transform', `translate(${node.x + 35}, ${node.y})`) // Position to the right of the node
          .attr('cursor', 'pointer')
          .on('mouseover', (event) => {
            setHoveredNode({
              name: "Create New Task",
              x: event.pageX,
              y: event.pageY,
              isAddButton: true,
              connectedToNodeId: node.id
            });
          })
          .on('mouseout', () => setHoveredNode(null))
          .on('mouseleave', () => setHoveredNode(null))
          .on('click', () => handleAddTask(node.id))
          
        addButtonGroup.append('circle')
          .attr('r', 10) // Size between task nodes and external dependencies
          .attr('fill', '#FFA500') // Orange color
          .attr('stroke', '#FF8C00')
          .attr('stroke-width', 1.5);
          
        addButtonGroup.append('text')
          .attr('dy', 4)
          .attr('text-anchor', 'middle')
          .text('+')
          .attr('font-size', '14px')
          .attr('fill', '#FFFFFF');
      });
    }

    
      
  }, [activeCategory, allTasks, skills, isEditMode, zoomTransform, svgDimensions]);

  const colorClasses = ['pink', 'green', 'blue', 'orange'];
  
  return (
    <div 
      className="skill-hierarchy-container" 
      ref={containerRef}
      onMouseLeave={handleMouseLeave}
    >
      <div className="category-tabs">
        {showLeftArrow && (
          <button 
            className="tab-arrow" 
            onClick={() => navigateTabs('prev')}
          >
            &larr;
          </button>
        )}
        
        {visibleSkills.map((category, index) => {
          const colorClass = colorClasses[index % colorClasses.length];
          return (
            <button 
              key={category.id}
              className={`tab ${colorClass} ${activeCategory === category.name ? 'active' : ''}`}
              onClick={() => setActiveCategory(category.name)}
            >
              {category.name}
            </button>
          );
        })}
        
        {showRightArrow && (
          <button 
            className="tab-arrow" 
            onClick={() => navigateTabs('next')}
          >
            &rarr;
          </button>
        )}
      </div>

      <div 
        className="visualization-container" 
        style={{ width: '100%', overflow: 'hidden' }}
      >
        <svg 
          ref={svgRef}
          width={svgDimensions.width}
          height={svgDimensions.height}
        ></svg>
        {isEditMode && (
          <button className="new-task-button" onClick={() => {
            console.log("Button clicked");
            handleAddTask();
          }}>
            + New Task
          </button>
        )}
        <button className="edit-mode-button" onClick={() => setIsEditMode(!isEditMode)}>
          {isEditMode ? 'Exit Edit Mode' : 'Edit Mode'}
        </button>
      </div>

      {hoveredNode && (
        <div 
          className="node-tooltip"
          style={{
            position: 'absolute',
            left: hoveredNode.x,
            top: hoveredNode.y,
            transform: 'translate(20px, 20px)',
            background: '#000',
            border: '1px solid #ccc',
            padding: '5px',
            borderRadius: '4px',
            zIndex: 100
          }}>
          <h4>{hoveredNode.name}</h4>
          {hoveredNode.isAddButton ? (
            <p>Creates a new task connected to node {hoveredNode.connectedToNodeId}</p>
          ) : (
            <>
              {hoveredNode.category && hoveredNode.category !== activeCategory && (
                <p>Category: {hoveredNode.category}</p>
              )}
              {hoveredNode.status && <p>Status: {hoveredNode.status}</p>}
              {hoveredNode.type && (
                <p>Relationship: {hoveredNode.type === 'depends-on' ? 
                  'Current task depends on this' : 
                  'This depends on current task'}</p>
              )}
              {hoveredNode.dependencies && hoveredNode.dependencies.length > 0 && (
                <div>
                  <p>Depends on:</p>
                  <ul>
                    {hoveredNode.dependencies.map(dep => (
                      <li key={dep.id}>{dep.name} {dep.category !== activeCategory ? `(${dep.category})` : ''}</li>
                    ))}
                  </ul>
                </div>
              )}
              {hoveredNode.dependents && hoveredNode.dependents.length > 0 && (
                <div>
                  <p>Required by:</p>
                  <ul>
                    {hoveredNode.dependents.map(dep => (
                      <li key={dep.id}>{dep.name} {dep.category !== activeCategory ? `(${dep.category})` : ''}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
      
      <div className="project-info">
        <h3>Project Name</h3>
        <p>Interest Tags</p>
        <p>Description</p>
      </div>

      <TaskEditor
        open={showTaskPopup}
        onClose={() => setShowTaskPopup(false)}
        taskForm={taskForm}
        setTaskForm={setTaskForm}
        onSubmit={(formData) => handleTaskAction(formData, 'submit')}
        skills={skills}
/     >

      <div className="legend">
        <div><span style={{color: '#FF69B4'}}>● </span>Pink indicates a completed task</div>
        <div><span style={{color: '#FF0000'}}>● </span>Red circle indicates urgent</div>
        <div><span style={{color: '#87CEFA'}}>○ </span>Blue circle indicates inactive vacancy</div>
        <div><span style={{color: '#4682B4'}}>● </span>Filled blue indicates inactive assigned</div>
        <div><span style={{color: '#32CD32'}}>● </span>Green filled indicates active assigned</div>
        <div><span style={{color: '#00FF00'}}>○ </span>Green circle with gray interior indicates active unassigned</div>
        <div><span style={{border: '1px dashed #666', borderRadius: '50%', display: 'inline-block', width: '10px', height: '10px'}}></span> Dashed circles indicate external dependencies</div>
      </div>
    </div>
  );
};

export default ProjectVisualizer;