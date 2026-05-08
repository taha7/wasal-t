import app from './app.js';
import { startCleanup } from './cleanup.js';

const PORT = Number(process.env['PORT'] ?? 3002);

app.listen(PORT, () => {
  console.log(`Location service listening on port ${PORT}`);
  startCleanup();
});
