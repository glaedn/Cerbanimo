import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import * as d3 from 'd3';
import './SkillTree.css';
import { useAuth0 } from '@auth0/auth0-react';

const SkillTree = () => {
  const svgRef = useRef();
  const transformRef = useRef({ x: 0, y: 0 });
  const [skills, setSkills] = useState([]);
  const gRef = useRef();
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [dimensions] = useState({ width: 800, height: 600 });
  const userIdRef = useRef(null);

  useEffect(() => {
    const fetchSkills = async () => {
      if (!isAuthenticated || !user) return;

      try {
        const token = await getAccessTokenSilently({
          audience: 'http://localhost:4000',
          scope: 'openid profile email read:profile',
        });

        // Fetch the user's profile to get their ID
        const profileResponse = await axios.get('http://localhost:4000/profile', {
          params: { 
            sub: user.sub, 
            email: user.email, 
            name: user.name 
          },
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        userIdRef.current = profileResponse.data.id;

        const skillsResponse = await axios.get('http://localhost:4000/skills/all', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const processedSkills = skillsResponse.data.map(skill => {
          // Handle both array and non-array cases for unlocked_users
          let unlockedUsers = skill.unlocked_users || [];
          if (typeof unlockedUsers === 'string') {
            unlockedUsers = JSON.parse(unlockedUsers); // Parse the stringified JSON if necessary
          }
          if (!Array.isArray(unlockedUsers)) {
            unlockedUsers = [unlockedUsers];
          }
          console.log("Unlocked Users for skill:", skill.name, unlockedUsers);

          // Check if user is in unlocked_users array (now array of objects)
          const isUnlocked = unlockedUsers.some(userObj => {
            // Handle both string and number user IDs
            return userObj && (
              userObj.user_id === parseInt(userIdRef.current) || 
              userObj.user_id === userId.toString()
            );
          });
          console.log("unlockedUsers:", unlockedUsers);
console.log("Checking for user_id:", userIdRef.current, userIdRef.current.toString());
          return {
            ...skill,
            unlocked_users: unlockedUsers,
            unlocked: isUnlocked,
            hidden: true,
            // Store user's level directly on the skill for easier access
            userLevel: isUnlocked 
              ? unlockedUsers.find(userObj => userObj.user_id === parseInt(userIdRef.current))?.level || 0
              : 0
          };
        });
        console.log("Processed skills:", processedSkills);
        setSkills(processedSkills);
      } catch (error) {
        console.error('Failed to fetch skills:', error);
      }
    };

    fetchSkills();
  }, [isAuthenticated, user, getAccessTokenSilently]);

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
      .attr('r', 15)
      .attr('fill', d => d.data.unlocked ? 'green' : 'gray')
      .style('display', d => d.data.hidden ? 'none' : 'block');

    // Add level text inside the circles
    node.append('text')
      .attr('dy', 4) // Vertical alignment
      .attr('text-anchor', 'middle') // Center text horizontally
      .style('font-size', '10px') // Smaller font for circle
      .style('fill', 'white')
      .style('pointer-events', 'none') // Prevent text from blocking clicks
      .text(d => d.data.unlocked ? (d.data.userLevel || 0) : '') // Show 0 as fallback if no level
      .style('display', d => (d.data.unlocked && !d.data.hidden ? 'block' : 'none'))
      .style('dominant-baseline', 'middle')
      .style('font-weight', 'bold');



    // Keep your existing node text (skill name) but adjust positioning
    node.append('text')
      .attr('dx', 20) // Move further right to avoid circle
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