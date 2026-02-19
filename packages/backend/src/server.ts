import express from 'express';
import { app } from './app';

const PORT = process.env.PORT || 4000;
const server = express();
server.use('/api', app);

server.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}/api`);
});
