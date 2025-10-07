export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // Récupérer le Bearer token
  const authHeader = req.headers['authorization'] || '';
  const providedKey = authHeader.replace('Bearer ', '');
  if (!providedKey || providedKey !== process.env.BOT_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { message, context } = req.body || {};
  if (!message) return res.status(400).json({ error: 'message required' });

  const contextText = context ? JSON.stringify(context, null, 2) : 'Aucun contexte';
  const prompt = `Tu es un assistant utile. Utilise le contexte si nécessaire.\nContexte:\n${contextText}\nUtilisateur: ${message}\nAssistant:`;

  try {
    const hfRes = await fetch(`https://api-inference.huggingface.co/models/${process.env.HF_MODEL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HF_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 150 }
      })
    });

    const hfData = await hfRes.json();

    let reply = '';
    if (Array.isArray(hfData) && hfData[0]?.generated_text) reply = hfData[0].generated_text;
    else if (hfData.generated_text) reply = hfData.generated_text;
    else reply = JSON.stringify(hfData);

    if (reply.startsWith(prompt)) reply = reply.slice(prompt.length);

    res.status(200).json({ reply: reply.trim() });
  } catch (err) {
    console.error(err);  // Les logs Vercel vont montrer l’erreur exacte
    res.status(500).json({ error: 'backend error', details: String(err) });
  }
}
