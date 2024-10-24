const { GoogleGenerativeAI } = require("@google/generative-ai");
import { NextResponse } from "next/server";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash", // Use Gemini 1.5 model
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

// POST request handler
export async function POST(request: Request) {
  const { text, language } = await request.json();  // Accept text and language from the request body

  // Dynamic prompt with the language and text passed in
  const chatSession = model.startChat({
    generationConfig,
    history: [
      {
        role: "user",
        parts: [
          {
            text: `You will be provided with a sentence. Your tasks are to:
              - Detect what language the sentence is in.
              - Translate the sentence into ${language}. 
              Do not return anything other than the translated sentence.`,
          },
          { text },  // Use the provided text for translation
        ],
      },
    ],
  });

  const result = await chatSession.sendMessage(text);  // Send the user's input text to the model

  // Extract the response text
  const translatedText = result.response.text();
  console.log(translatedText);

  // Return the translated response in the correct format
  return NextResponse.json({
    text: translatedText,
  });
}
