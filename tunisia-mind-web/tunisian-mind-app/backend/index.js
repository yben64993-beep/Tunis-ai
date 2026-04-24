
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Tunisian Mind API is running...');
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
