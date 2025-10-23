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
    const { reference, candidates, max_results = 5, model = "claude-3-5-haiku-20241022" } = body;

    if (!reference || !candidates || !Array.isArray(candidates)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing reference or candidates" }),
      };
    }

    // Build ranking prompt
    let prompt = `Given the following academic reference, rank the search results by how likely they are to be the correct source.

Reference:
- Title: ${reference.title || "Unknown"}
- Authors: ${reference.authors || "Unknown"}
- Year: ${reference.year || "Unknown"}
- Publication: ${reference.publication || "Unknown"}

Search Results:
`;

    candidates.forEach((candidate: any, i: number) => {
      prompt += `\n${i + 1}. ${candidate.title}\n   URL: ${candidate.url}\n   Snippet: ${candidate.snippet}\n`;
    });

    prompt += `\n\nReturn the top ${max_results} most likely matches as a JSON array with this format:\n`;
    prompt += '[{"url": "...", "title": "...", "score": 0.95, "reasoning": "..."}, ...]\n\n';
    prompt += "The score should be between 0 and 1, with 1 being a perfect match.\n";
    prompt += "IMPORTANT: Return ONLY the JSON array, no other text.";

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
        max_tokens: 2000,
        temperature: 0.3,
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
    const result_text = data.content?.[0]?.text || "";

    // Parse JSON response
    try {
      // Extract JSON from the response
      const jsonMatch = result_text.match(/\[.*\]/s);
      let ranked_data;
      
      if (jsonMatch) {
        ranked_data = JSON.parse(jsonMatch[0]);
      } else {
        ranked_data = JSON.parse(result_text);
      }

      // Build ranked array
      const ranked = ranked_data.slice(0, max_results).map((item: any) => ({
        url: item.url || "",
        title: item.title || "",
        score: parseFloat(item.score || 0),
        reasoning: item.reasoning || "",
      }));

      // Sort by score descending
      ranked.sort((a: any, b: any) => b.score - a.score);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ranked }),
      };
    } catch (parseError) {
      console.error("Failed to parse LLM ranking response:", parseError);
      
      // Fallback: return candidates in order with decreasing scores
      const ranked = candidates.slice(0, max_results).map((candidate: any, i: number) => ({
        url: candidate.url,
        title: candidate.title,
        score: 1.0 - i * 0.1,
        reasoning: "Fallback ranking (parsing failed)",
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ranked }),
      };
    }
  } catch (error: any) {
    console.error("LLM ranking error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Internal server error" }),
    };
  }
};
