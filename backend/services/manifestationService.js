const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateManifestationSummary(intention, petals) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Analyze the following intention and its petals to generate a concise, emergent 'Manifestation Summary.'
    The summary should capture the core theme and purpose of the intention based on the collective details of its petals.
    Weight the summary towards petals with higher resonance scores, as they represent greater collective energy and focus.

    Intention: ${intention.name}
    Description: ${intention.description}

    Petals:
    ${petals.map(p => `- ${p.name} (Resonance: ${p.resonance_score || 0}): ${p.description}`).join("\n")}

    Generate a Manifestation Summary (1-2 sentences):
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text().trim();
    return summary;
  } catch (error) {
    console.error("Error generating manifestation summary:", error);
    return "The collective energy is still gathering. A summary will emerge soon.";
  }
}

module.exports = { generateManifestationSummary };