// api/get-muse.js
import fetch from 'node-fetch';

// Allow JSON parsing for POST requests
export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  try {
    // Default prompt
    let prompt = "Generate a single, short, and profound creative idea. It could be a poetic thought, a melody idea, a visual prompt for an artist, or a unique story concept. Make it intriguing and concise.";

    // If POST request with a prompt
    if (req.method === 'POST' && req.body && req.body.prompt) {
      prompt = req.body.prompt;
    }

    console.log('Prompt received:', prompt);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://your-vercel-project.vercel.app', // optional but recommended
        'X-Title': 'Creative Muse API', // optional
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 1.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter Error:', errorText);
      throw new Error(`OpenRouter call failed: ${response.status}`);
    }

    const data = await response.json();
    const muse = data?.choices?.[0]?.message?.content?.trim() || 'No creative muse returned.';

    return res.status(200).json({ muse });

  } catch (err) {
    console.error('Backend Error:', err);
    return res.status(500).json({ error: 'Internal server error occurred.' });
  }
}
