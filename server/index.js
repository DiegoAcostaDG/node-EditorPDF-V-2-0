const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;
const MODEL_URL = "https://api-inference.huggingface.co/models/microsoft/presidio-anonymization";

app.post('/anonymize', async (req, res) => {
  try {
    const { text } = req.body;
    
    const response = await fetch(MODEL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUGGING_FACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text }),
    });

    const result = await response.json();
    res.json({ anonymizedText: result[0].text });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to anonymize text' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});