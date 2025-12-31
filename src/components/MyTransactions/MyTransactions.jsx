// src/components/MyTransactions/MyTransactions.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

const MyTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, getAccessTokenSilently } = useAuth0();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return;
      try {
        setIsLoading(true);
        const token = await getAccessTokenSilently();
        const response = await axios.get(`${apiBaseUrl}/goods/transactions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTransactions(response.data);
      } catch (err) {
        setError('Failed to fetch transactions.');
        console.error("Error fetching transactions:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTransactions();
  }, [user, getAccessTokenSilently]);

  const handleVerify = async (transactionId) => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.post(`${apiBaseUrl}/goods/transactions/${transactionId}/verify`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Update the local state to reflect the change
      setTransactions(transactions.map(t => t.id === transactionId ? response.data.transaction : t));
      alert('Verification successful!');
    } catch (err) {
      setError('Verification failed. Please try again.');
      console.error('Error verifying transaction:', err);
    }
  };

  if (isLoading) return <p>Loading transactions...</p>;
  if (error) return <p className="error-message">{error}</p>;

  return (
    <div>
      <h2>My Transactions</h2>
      <div className="transactions-list">
        {transactions.length === 0 ? (
          <p>You have no transactions.</p>
        ) : (
          transactions.map(tx => {
            const isBuyer = tx.buyer_id === user.sub; // Assuming user.sub is the user ID
            const canVerify = (isBuyer && !tx.buyer_verified) || (!isBuyer && !tx.seller_verified);

            return (
              <div key={tx.id} className="transaction-item">
                <h4>Good: {tx.good_name}</h4>
                <p>Status: {tx.status}</p>
                <p>Role: {isBuyer ? 'Buyer' : 'Seller'}</p>
                <p>Your Verification: {isBuyer ? (tx.buyer_verified ? 'Verified' : 'Pending') : (tx.seller_verified ? 'Verified' : 'Pending')}</p>
                {tx.status === 'pending' && canVerify && (
                  <button onClick={() => handleVerify(tx.id)}>Verify Exchange</button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MyTransactions;
