import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import './Realms.css';

const Realms = () => {
  const { user, getAccessTokenSilently } = useAuth0();
  const [realms, setRealms] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [links, setLinks] = useState([]);
  const svgRef = useRef(null);

  const navigate = useNavigate();

  // Comprehensive case-insensitive search function
  const matchesSearch = (text, searchTerm) => {
    if (!searchTerm) return true;
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  };

  const fetchRealms = async () => {
    try {
      const token = await getAccessTokenSilently();

      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/realms`, {
        params: { search, page },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('Fetched Realms:', response.data);

      // Extract the realms array from the response data
      const realmsArray = response.data.realms || [];

      if (realmsArray.length === 0) {
        console.log('No realms data returned from API');
      }

      // Apply search filter if there's a search term
      const searchTerm = search.trim();
      const filteredRealms = searchTerm
        ? realmsArray.filter(realm => {
            // Check if search term matches name or description
            return matchesSearch(realm.name || '', searchTerm) ||
                   matchesSearch(realm.description || '', searchTerm);
          })
        : realmsArray;

      console.log('Filtered Realms:', filteredRealms);

      // Set the realms state
      setRealms(filteredRealms);
    } catch (error) {
      console.error('Failed to fetch realms:', error);
      // Initialize with empty array on error
      setRealms([]);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRealms();
    }
  }, [user, page, search]);

useEffect(() => {
    if (realms.length > 0 && svgRef.current) {
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const width = +svg.attr('width');
        const height = +svg.attr('height');

        const simulation = d3.forceSimulation(realms)
            .force("link", d3.forceLink().id(d => d.id).distance(150))
            .force("charge", d3.forceManyBody().strength(-400))
            .force("center", d3.forceCenter(width / 2, height / 2));

        const fetchResonance = async () => {
            try {
                const token = await getAccessTokenSilently();
                const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/realms/resonance`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setLinks(response.data);
            } catch (error) {
                console.error("Failed to fetch resonance data:", error);
            }
        };

        fetchResonance();

        const link = svg.append("g")
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("class", "realm-link")
            .style("stroke-width", 2)
            .style("stroke-opacity", d => 0.4 + d.alignment * 0.6)
            .style("stroke", "#fff")
            .style("filter", "url(#glow)");

        const node = svg.append("g")
            .selectAll("g")
            .data(realms)
            .join("g")
            .attr("class", "realm-node")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        node.append("rect")
            .attr("width", 120)
            .attr("height", 60)
            .attr("rx", 10)
            .attr("ry", 10)
            .on("click", (event, d) => navigate(`/realm/${d.id}`));

        node.append("text")
            .attr("x", 60)
            .attr("y", 35)
            .text(d => d.name);

        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);
            node
                .attr("transform", d => `translate(${d.x - 60}, ${d.y - 30})`);
        });

        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }
        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
    }
}, [realms, navigate]);

return (
    <div className="realms-container">
        <h1 className="realm-page-title">✦ REALMS MESH ✦</h1>

        <div className="search-bar-container">
            <input
                className="search-input"
                type="text"
                placeholder="Search Realms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
            <button
                className="add-realm-button"
                onClick={() => navigate('/form-new-realm')}
                title="Form New Realm"
            >
                ✦
            </button>
        </div>

        <div className="realm-mesh-wrapper">
            <svg ref={svgRef} width="1000" height="700">
                <defs>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
            </svg>
        </div>

        <div className="pagination-container">
            <button
                className="pagination-button"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1}
            >
                Previous
            </button>
            <span className="page-text">Page {page}</span>
            <button
                className="pagination-button"
                onClick={() => setPage((prev) => prev + 1)}
            >
                Next
            </button>
        </div>
    </div>
);
};

export default Realms;