import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';
import './SkillTree.css';

const SkillTree = () => {
  const svgRef = useRef();
  const [skills, setSkills] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      const response = await axios.get('http://localhost:4000/skills');
      setSkills(response.data);
      renderSkillTree(response.data);
    } catch (err) {
      setError('Failed to fetch skills');
      console.error(err);
    }
  };

  const renderSkillTree = (data) => {
    if (!data.length) return;

    const treeData = buildTree(data);
    const width = 800;
    const height = 600;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const hierarchyData = d3.hierarchy(treeData);
    const treeLayout = d3.tree().size([width - 100, height - 100]);
    treeLayout(hierarchyData);

    const linkGenerator = d3.linkVertical()
      .x(d => d.x)
      .y(d => d.y);

    svg.selectAll('line')
      .data(hierarchyData.links())
      .enter()
      .append('line')
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)
      .attr('stroke', 'gray');

    svg.selectAll('circle')
      .data(hierarchyData.descendants())
      .enter()
      .append('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', 20)
      .attr('fill', d => d.data.unlocked ? 'green' : 'gray')
      .on('mouseover', (event, d) => {
        console.log('Hovered on:', d.data.name);
      });
  };

  const buildTree = (flatData) => {
    const idMap = {};
    flatData.forEach(node => idMap[node.id] = { ...node, children: [] });
    const treeData = [];

    flatData.forEach(node => {
      if (node.parent_skill_id) {
        idMap[node.parent_skill_id].children.push(idMap[node.id]);
      } else {
        treeData.push(idMap[node.id]);
      }
    });
    return { name: 'Root', children: treeData };
  };

  return (
    <div>
      <h2>Skill Tree</h2>
      {error && <p className="error">{error}</p>}
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default SkillTree;