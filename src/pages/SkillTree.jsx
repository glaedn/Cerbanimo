import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import * as d3 from 'd3';
import './SkillTree.css';

const SkillTree = () => {
  const svgRef = useRef();
  const transformRef = useRef({ x: 0, y: 0 });
  const [skills, setSkills] = useState([]);
  const gRef = useRef();
  const [dimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const response = await axios.get('http://localhost:4000/skills/all');
        const userId = "15";

        const processedSkills = response.data.map(skill => ({
          ...skill,
          unlocked_users: Array.isArray(skill.unlocked_users) ? skill.unlocked_users : [],
          unlocked: (skill.unlocked_users || []).includes(userId),
          hidden: true,
        }));
        setSkills(processedSkills);
      } catch (error) {
        console.error('Failed to fetch skills:', error);
      }
    };

    fetchSkills();
  }, []);

  useEffect(() => {
    if (!skills.length) return;

    const margin = { top: 20, right: 120, bottom: 20, left: 120 };
    const { width, height } = dimensions;

    // Build tree data
    const rootSkills = skills.filter(skill => skill.parent_skill_id === null && skill.unlocked);
    if (!rootSkills.length) return;

    function buildTree(skill, allSkills, depth = 0) {
      const children = allSkills.filter(s => s.parent_skill_id === skill.id);
      return {
        name: skill.name,
        unlocked: skill.unlocked,
        depth: depth,
        hidden: depth > 0,
        children: children.map(child => buildTree(child, allSkills, depth + 1)),
      };
    }

    const treeData = {
      name: 'Skils',
      children: rootSkills.map(rootSkill => buildTree(rootSkill, skills)),
    };

    // Create tree layout
    const tree = d3.tree()
      .size([height - margin.top - margin.bottom, 
            width - margin.left - margin.right]);

    const root = d3.hierarchy(treeData);
    tree(root);

    // Calculate initial positioning
    const nodes = root.descendants();
    const minY = d3.min(nodes, d => d.y);
    const initialX = (width * 0.03)
    const initialY = margin.top - root.descendants()[0].x + height / 3.5;
    
    transformRef.current = { x: initialX, y: initialY };

    // Set up SVG
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width)
       .attr('height', height);

    // Create main group with initial transform
    const g = svg.append('g')
                 .attr('transform', `translate(${transformRef.current.x},${transformRef.current.y})`);
    gRef.current = g;

    // Draw links
    g.selectAll('.link')
      .data(root.links())
      .enter().append('line')
      .attr('class', 'link')
      .attr('x1', d => d.source.y)
      .attr('y1', d => d.source.x)
      .attr('x2', d => d.target.y)
      .attr('y2', d => d.target.x)
      .attr('stroke', '#ccc')
      .style('display', d => d.target.data.hidden ? 'none' : 'block');

    // Draw nodes
    const node = g.selectAll('.node')
      .data(root.descendants())
      .enter().append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`)
      .on('click', function(event, d) {
        if (d.children) {
          const isExpanded = !d.children[0].data.hidden;
          d.children.forEach(child => {
            child.data.hidden = isExpanded;
            // Collapse all descendants when hiding
            if (isExpanded) {
              child.each(desc => {
                if (desc !== child) desc.data.hidden = true;
              });
            }
          });
        }
        updateView(d);
      });

    node.append('circle')
      .attr('r', 8)
      .attr('fill', d => d.data.unlocked ? 'green' : 'gray')
      .style('display', d => d.data.hidden ? 'none' : 'block');

    node.append('text')
      .attr('dx', 12)
      .attr('dy', 4)
      .text(d => d.data.name)
      .style('fill', 'white')
      .style('font-size', '12px')
      .style('display', d => d.data.hidden ? 'none' : 'block');

    // Set up drag behavior
    const dragHandler = d3.drag()
      .on('drag', (event) => {
        transformRef.current.x += event.dx;
        transformRef.current.y += event.dy;
        g.attr('transform', `translate(${transformRef.current.x},${transformRef.current.y})`);
      });

    svg.call(dragHandler);

    function updateView(selectedNode) {
      // Update visibility
      g.selectAll('.link')
        .style('display', d => d.target.data.hidden ? 'none' : 'block');
      
      node.selectAll('circle')
        .style('display', d => d.data.hidden ? 'none' : 'block');
      
      node.selectAll('text')
        .style('display', d => d.data.hidden ? 'none' : 'block');

      // Calculate target position for left-center alignment
      if (selectedNode.children?.length) {
        const targetX = (width * 0.03) - selectedNode.y;
        const targetY = (height * 0.3) - selectedNode.x;

        g.transition()
          .duration(500)
          .attr('transform', `translate(${targetX},${targetY})`)
          .on('end', () => {
            transformRef.current = { x: targetX, y: targetY };
          });
      }
    }
  }, [skills, dimensions]);

  return (
    <div>
      <h2>Skill Tree</h2>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default SkillTree;