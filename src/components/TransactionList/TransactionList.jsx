import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api'; // Assuming apiFetch is in utils
import TransactionListItem from './TransactionListItem';
import { List, Typography, CircularProgress, Alert, Box } from '@mui/material';
// import './TransactionList.css'; // Styles can be centralized or specific

const TransactionList = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch('/api/transactions/user');
        setTransactions(data || []); // Ensure data is not null
      } catch (err) {
        console.error("Error fetching transactions:", err);
        setError(err.message || 'Failed to fetch transactions. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }} className="transaction-list-container">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }} className="transaction-list-container">
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (transactions.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }} className="transaction-list-container">
        <Typography variant="subtitle1" className="empty-transactions-message">
          You have no transactions yet.
        </Typography>
      </Box>
    );
  }

  return (
    <List sx={{ width: '100%' }} className="transaction-list-container">
      {transactions.map((transaction) => (
        <TransactionListItem key={transaction.id} transaction={transaction} />
      ))}
    </List>
  );
};

export default TransactionList;
