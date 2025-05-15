const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

const listHandler = require('./list');
const searchHandler = require('./search');
const uploadHandler = require('./upload');

app.get('/list', listHandler);
app.get('/search', searchHandler);
app.post('/upload', uploadHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
