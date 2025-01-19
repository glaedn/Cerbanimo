const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('DAO Governance Service Running');
});

app.listen(PORT, () => {
  console.log(`DAO Governance Service listening on port ${PORT}`);
});