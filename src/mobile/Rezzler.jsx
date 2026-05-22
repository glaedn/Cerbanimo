import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUserProfile } from '../hooks/useUserProfile';
import LotusBlossom from './components/LotusBlossom';
import DoubleHelix from './components/DoubleHelix';
import RootTasks from './components/RootTasks';
import './Rezzler.css';

const Rezzler = () => {
  const spineHeight = Math.min(window.innerHeight, 700);
  const { profile } = useUserProfile();
  const [communities, setCommunities] = useState([]);

  useEffect(() => {
    const fetchCommunities = async () => {
      if (profile?.id) {
        try {
          const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities/user/${profile.id}`);
          setCommunities(res.data);
        } catch (err) {
          console.error('Error fetching communities for Rezzler:', err);
        }
      }
    };
    fetchCommunities();
  }, [profile?.id]);

  const petals = communities.map(c => ({
    id: c.id,
    title: c.name,
    capability: c.description
  }));

  return (
    <div className="rezzler-container">
      <LotusBlossom spineHeight={spineHeight} petals={petals} />
      <DoubleHelix spineHeight={spineHeight} />
      <RootTasks spineHeight={spineHeight} />
    </div>
  );
};


export default Rezzler;
