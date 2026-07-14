require('dotenv').config();
const app = require('./server');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`E-Learning API running locally at http://localhost:${PORT}`);
  console.log(`Try: curl http://localhost:${PORT}/api/health`);
});
