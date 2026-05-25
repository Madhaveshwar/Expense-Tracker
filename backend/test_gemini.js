import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

async function testGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("=========================================");
  console.log("🤖 Gemini SDK API Key Verification Utility");
  console.log("=========================================");
  
  if (!apiKey) {
    console.error("❌ Error: GEMINI_API_KEY is not defined in your backend/.env file.");
    console.log("Please define it like so inside D:\\LLM Training\\Expense Tracker\\backend\\.env:");
    console.log("GEMINI_API_KEY=your_actual_api_key_here\n");
    process.exit(1);
  }

  // Obfuscate key for display
  const maskedKey = apiKey.length > 8 
    ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` 
    : '***';
  
  console.log(`🔑 Loaded API Key: ${maskedKey}`);
  console.log("📡 Connecting to Google Generative AI servers via SDK...");

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // We discovered "gemini-2.5-flash" is the active and supported model on this subscription.
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    console.log("🧠 Querying model 'gemini-2.5-flash' with: 'Write a 3-word response.'...");
    const response = await model.generateContent("Write a 3-word response.");
    
    console.log("\n✅ SUCCESS! Your Gemini API key is working perfectly through the SDK!");
    console.log(`🤖 Gemini response: "${response.response.text().trim()}"`);
    console.log("=========================================");
  } catch (error) {
    console.error("\n❌ FAILED! The Gemini API key verification failed through the SDK.");
    console.error("=========================================");
    console.error("🔴 Error Code / Message:", error.message);
    
    console.error("\n📋 Troubleshoot Instructions:");
    if (error.message.includes("API key not valid")) {
      console.error("👉 Double check your backend/.env file. Ensure there are no spaces or extra characters in the key.");
    } else if (error.message.includes("quota") || error.message.includes("limit")) {
      console.error("👉 Your account may have hit a quota limit or requires billing configured inside Google AI Studio.");
    } else {
      console.error("👉 Verify internet connectivity or proxy settings.");
    }
    console.error("=========================================");
    process.exit(1);
  }
}

testGeminiApiKey();
