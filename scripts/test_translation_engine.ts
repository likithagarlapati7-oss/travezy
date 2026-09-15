import { translateTravelText } from "../src/lib/ai.server.ts";

async function testReal() {
  const inputs = [
    { text: "Where can I find the nearest vegetarian restaurant?", targetLanguage: "hi" },
    { text: "How much does a taxi to the beach cost?", targetLanguage: "te" },
    { text: "Can you recommend a clean and quiet budget hotel?", targetLanguage: "ta" },
    { text: "Bonjour, quel est le meilleur endroit pour voir le coucher de soleil ?", sourceLanguage: "auto", targetLanguage: "en" },
    { text: "Where is the nearest hospital?", targetLanguage: "fr" },
  ];

  for (const item of inputs) {
    try {
      const res = await translateTravelText(item);
      console.log(`[${res.sourceLanguage} -> ${res.targetLanguage}] Provider: ${res.providerUsed}`);
      console.log(`   IN:  ${res.originalText}`);
      console.log(`   OUT: ${res.translatedText}\n`);
    } catch (e) {
      console.error("Translation failed:", e);
    }
  }
}

testReal();
