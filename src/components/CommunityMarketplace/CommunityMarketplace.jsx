// src/components/CommunityMarketplace/CommunityMarketplace.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

const CommunityMarketplace = () => {
  const [goods, setGoods] = useState([]);
  const [newGood, setNewGood] = useState({ name: '', description: '', price: '' });
  const [communityId, setCommunityId] = useState(1); // Hardcoded for now, should be dynamic
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { getAccessTokenSilently } from useAuth0();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  // Fetch goods from the backend
  useEffect(() => {
    const fetchGoods = async () => {
      try {
        setIsLoading(true);
        const token = await getAccessTokenSilently();
        const response = await axios.get(`${apiBaseUrl}/goods/community/${communityId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setGoods(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch goods. Please try again later.');
        console.error("Error fetching goods:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (communityId) {
      fetchGoods();
    }
  }, [communityId, getAccessTokenSilently]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewGood(prevState => ({ ...prevState, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newGood.name || !newGood.price) {
      alert('Please provide a name and a price.');
      return;
    }

    try {
      const token = await getAccessTokenSilently();
      const payload = { ...newGood, communityId, price: parseInt(newGood.price) };
      const response = await axios.post(`${apiBaseUrl}/goods`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGoods(prevGoods => [response.data, ...prevGoods]);
      setNewGood({ name: '', description: '', price: '' }); // Reset form
    } catch (err) {
      setError('Failed to list new good. Please try again.');
      console.error("Error creating good:", err);
    }
  };

    // Handle purchasing a good
  const handlePurchase = async (goodId) => {
    try {
      const token = await getAccessTokenSilently();
      await axios.post(`${apiBaseUrl}/goods/${goodId}/purchase`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Refresh the list of goods to reflect the change in status
      setGoods(goods.filter(g => g.id !== goodId));
      alert('Purchase initiated! The item is now in escrow.');
    } catch (err) {
      setError('Purchase failed. You may not have enough tokens, or the item is no longer available.');
      console.error("Error purchasing good:", err);
    }
  };

  return (
    <div>
      <h2>Community Marketplace</h2>

      {/* Form to list a new good */}
      <div className="list-good-form">
        <h3>List a New Good</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            value={newGood.name}
            onChange={handleInputChange}
            placeholder="Good Name"
            required
          />
          <textarea
            name="description"
            value={newGood.description}
            onChange={handleInputChange}
            placeholder="Description"
          />
          <input
            type="number"
            name="price"
            value={newGood.price}
            onChange={handleInputChange}
            placeholder="Price in Tokens"
            required
          />
          <button type="submit">List Good</button>
        </form>
      </div>

      {error && <p className="error-message">{error}</p>}

      {/* Display goods */}
      <div className="goods-list">
        <h3>Available Goods</h3>
        {isLoading ? (
          <p>Loading goods...</p>
        ) : (
          goods.map(good => (
            <div key={good.id} className="good-item">
              <h4>{good.name}</h4>
              <p>{good.description}</p>
              <p>Price: {good.price} tokens</p>
              <p>Seller: {good.seller_name}</p>
              <button onClick={() => handlePurchase(good.id)}>Purchase</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommunityMarketplace;
