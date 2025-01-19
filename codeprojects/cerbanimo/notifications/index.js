const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Notification Service Running');
});

app.listen(PORT, () => {
  console.log(`Notification Service listening on port ${PORT}`);
});