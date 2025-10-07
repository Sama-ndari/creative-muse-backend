const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());

app.get('/get-muse', async (req, res) => {
  try {
    const prompt = "Generate a single, short, and profound creative idea that helps introverts grow emotionally, connect better with people, and feel more confident socially. Make it poetic and concise.";

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct', // free model
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 60,
        temperature: 1.1,
      }),
    });

    const data = await response.json();
    const muse = data.choices?.[0]?.message?.content?.trim() || 'No muse today 😅';
    res.json({ muse });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Server running on port ${port}`));

module.exports = app;
