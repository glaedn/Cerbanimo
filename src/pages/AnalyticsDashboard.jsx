import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import axios from 'axios';
import * as d3 from 'd3';
import { useAuth0 } from '@auth0/auth0-react';
import './AnalyticsDashboard.css';

const ResonanceHeatmap = ({ data }) => {
  const ref = useRef();

  useEffect(() => {
    if (data && data.length > 0) {
      const svg = d3.select(ref.current);
      svg.selectAll("*").remove(); // Clear previous renders

      const width = 800;
      const height = 600;
      const margin = { top: 20, right: 20, bottom: 100, left: 40 };

      const x = d3.scaleBand()
        .domain(data.map(d => d.name))
        .range([margin.left, width - margin.right])
        .padding(0.1);

      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.resonance_count)])
        .nice()
        .range([height - margin.bottom, margin.top]);

      const color = d3.scaleSequential(d3.interpolateViridis)
        .domain([0, d3.max(data, d => d.resonance_count)]);

      svg.attr('width', width)
         .attr('height', height);

      svg.append("g")
        .selectAll("rect")
        .data(data)
        .join("rect")
          .attr("x", d => x(d.name))
          .attr("y", d => y(d.resonance_count))
          .attr("height", d => y(0) - y(d.resonance_count))
          .attr("width", x.bandwidth())
          .attr("fill", d => color(d.resonance_count));

      svg.append("g")
          .attr("transform", `translate(0,${height - margin.bottom})`)
          .call(d3.axisBottom(x))
          .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-65)");

      svg.append("g")
          .attr("transform", `translate(${margin.left},0)`)
          .call(d3.axisLeft(y));
    }
  }, [data]);

  return <svg ref={ref}></svg>;
};

const InfluenceGraph = ({ data }) => {
  const ref = useRef();

  useEffect(() => {
    if (data && data.length > 0) {
      const svg = d3.select(ref.current);
      svg.selectAll("*").remove();

      const width = 800;
      const height = 600;
      const margin = { top: 20, right: 20, bottom: 100, left: 40 };

      const x = d3.scaleBand()
        .domain(data.map(d => d.username))
        .range([margin.left, width - margin.right])
        .padding(0.1);

      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.experience)])
        .nice()
        .range([height - margin.bottom, margin.top]);

      svg.attr('width', width)
         .attr('height', height);

      svg.append("g")
        .selectAll("rect")
        .data(data)
        .join("rect")
          .attr("x", d => x(d.username))
          .attr("y", d => y(d.experience))
          .attr("height", d => y(0) - y(d.experience))
          .attr("width", x.bandwidth())
          .attr("fill", "steelblue");

      svg.append("g")
          .attr("transform", `translate(0,${height - margin.bottom})`)
          .call(d3.axisBottom(x))
          .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-65)");

      svg.append("g")
          .attr("transform", `translate(${margin.left},0)`)
          .call(d3.axisLeft(y));
    }
  }, [data]);

  return <svg ref={ref}></svg>;
};

const AnalyticsDashboard = () => {
  const [heatmapData, setHeatmapData] = useState([]);
  const [influenceData, setInfluenceData] = useState([]);
  const { getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getAccessTokenSilently();
        const [heatmapResponse, influenceResponse] = await Promise.all([
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/analytics/resonance-heatmap`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/analytics/influence-graph`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setHeatmapData(heatmapResponse.data);
        setInfluenceData(influenceResponse.data);
      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
      }
    };

    fetchData();
  }, [getAccessTokenSilently]);

  return (
    <Box className="analytics-dashboard-container">
      <Typography className="dashboard-title" variant="h4" gutterBottom>
        Analytics Dashboard
      </Typography>
      <Box className="dashboard-grid">
        <Box className="dashboard-card">
          <Typography variant="h6">Resonance Heatmap</Typography>
          <ResonanceHeatmap data={heatmapData} />
        </Box>
        <Box className="dashboard-card">
          <Typography variant="h6">Chronicle Influence Graph</Typography>
          <InfluenceGraph data={influenceData} />
        </Box>
      </Box>
    </Box>
  );
};

export default AnalyticsDashboard;