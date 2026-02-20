// Backend entry point
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ message: 'ControlPlane Project Manager API' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
