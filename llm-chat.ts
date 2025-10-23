import type { Handler } from "@netlify/functions";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  if (!ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Anthropic API not configured" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { prompt, model = "claude-3-5-haiku-20241022", temperature = 0.7, max_tokens = 1000 } = body;

    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing prompt" }),
      };
    }

    // Call Claude Messages API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model,
        max_tokens: max_tokens,
        temperature: temperature,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Claude API error:", errorData);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: errorData.error?.message || `API error: ${response.status}`,
        }),
      };
    }

    const data = await response.json();
    
    // Extract text from Claude's response format
    const result = data.content?.[0]?.text || "";
    const tokens_used = data.usage?.input_tokens + data.usage?.output_tokens || 0;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        result,
        model: data.model,
        tokens_used,
      }),
    };
  } catch (error: any) {
    console.error("LLM chat error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Internal server error" }),
    };
  }
};
