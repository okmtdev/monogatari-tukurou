/**
 * Gemini API で えを つくる
 */

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent";

/**
 * ぶんしょうから えを つくる
 * @param {string} sentence - ぶんしょう
 * @param {string} apiKey - Gemini API Key
 * @returns {Promise<string>} base64 がぞうデータ
 */
export async function generateImage(sentence, apiKey) {
  const prompt = `You are an illustrator for children's picture books.
Create a single cute, colorful, simple illustration in a warm children's book style for the following Japanese sentence.
The illustration should be cheerful, use soft pastel colors, and be easy for young children to understand.
Do not include any text or letters in the image.

Sentence: "${sentence}"`;

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const message = errorData?.error?.message || response.statusText;
    throw new Error(`API エラー: ${message}`);
  }

  const data = await response.json();

  // レスポンスから画像データを探す
  const candidates = data.candidates || [];
  for (const candidate of candidates) {
    const parts = candidate.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }

  throw new Error("えを つくれませんでした。もういちど ためしてね。");
}
