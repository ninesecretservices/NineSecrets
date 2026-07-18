import ApiError from '../utils/ApiError.js';

// Google AI Studio / Gemini API — Flash-Lite is the cheapest multimodal model
// that still reliably describes a product photo, which is all this needs.
// Override with GEMINI_MODEL if Google renames/retires this one.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const GEMINI_URL = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

function buildPrompt(context = {}) {
  const { name, department, item, fabric, colour } = context;
  const known = [
    name && `Product name: ${name}`,
    department && `Department: ${department}`,
    item && `Category: ${item}`,
    fabric && `Fabric: ${fabric}`,
    colour && `Colour: ${colour}`,
  ].filter(Boolean).join('. ');

  return [
    'You are writing a product description for an e-commerce innerwear/nightwear store.',
    'Look at the attached product photo and write a concise, appealing description (2-4 sentences, plain text, no markdown, no headings).',
    'Describe only what is visibly true in the photo (garment style, visible fabric texture/pattern, colour, notable design details like lace or straps).',
    'Do not invent fit claims, model measurements, care instructions, or fabric composition that are not visible in the image.',
    known && `Known product details — use these instead of guessing where they overlap with the photo: ${known}.`,
  ].filter(Boolean).join(' ');
}

class AiDescriptionController {
  async generateDescription(req, res, next) {
    const { imageUrl, context } = req.body;
    if (!imageUrl) throw new ApiError(400, 'imageUrl is required');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ApiError(500, 'AI description is not configured on this server. Set GEMINI_API_KEY.');
    }

    let mimeType;
    let base64;
    try {
      const imageRes = await fetch(imageUrl);
      if (!imageRes.ok) throw new Error(`Could not fetch image (HTTP ${imageRes.status})`);
      mimeType = imageRes.headers.get('content-type') || 'image/jpeg';
      const buffer = Buffer.from(await imageRes.arrayBuffer());
      base64 = buffer.toString('base64');
    } catch (err) {
      throw new ApiError(400, `Could not load the image to describe it: ${err.message}`);
    }

    let text;
    try {
      const geminiRes = await fetch(GEMINI_URL(apiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: buildPrompt(context) },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          }],
        }),
      });

      const payload = await geminiRes.json();
      if (!geminiRes.ok) {
        throw new Error(payload?.error?.message || `Gemini API returned HTTP ${geminiRes.status}`);
      }
      text = payload?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim();
      if (!text) throw new Error('Gemini returned no description text');
    } catch (err) {
      throw new ApiError(502, `AI description generation failed: ${err.message}`);
    }

    res.locals.responseData = { success: true, message: 'Description generated', data: { description: text } };
    next();
  }
}

export default AiDescriptionController;
