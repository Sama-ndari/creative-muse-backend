import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    const prompt = "Generate a single, short, and profound creative idea for introverts to connect socially.";

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 60,
        temperature: 1.1,
      }),
    });

    const data = await response.json();
    const muse = data.choices?.[0]?.message?.content?.trim() || 'No muse today 😅';
    res.status(200).json({ muse });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
}
