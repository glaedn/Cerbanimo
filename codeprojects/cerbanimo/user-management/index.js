const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('User Management Service Running');
});

app.listen(PORT, () => {
  console.log(`User Management Service listening on port ${PORT}`);
});