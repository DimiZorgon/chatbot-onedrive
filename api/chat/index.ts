import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import fetch from "node-fetch";

const SEARCH_ENDPOINT = process.env.SEARCH_ENDPOINT; // https://chatbotrecherche.search.windows.net
const SEARCH_API_KEY = process.env.SEARCH_API_KEY;
const SEARCH_INDEX = process.env.SEARCH_INDEX;      // doc-index
const SEMANTIC_CONFIG = process.env.SEMANTIC_CONFIG || "default";

const AOAI_ENDPOINT = process.env.AOAI_ENDPOINT;    // https://<your-openai-resource>.openai.azure.com
const AOAI_API_KEY = process.env.AOAI_API_KEY;
const AOAI_DEPLOYMENT = process.env.AOAI_DEPLOYMENT; // gpt-4o or your deployment name

const MAX_DOCS = Number(process.env.MAX_DOCS || "5");
const STRICTNESS = Number(process.env.STRICTNESS || "2");

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  try {
    const { prompt } = req.body || {};
    if (!prompt) {
      context.res = { status: 400, body: { error: "Missing prompt" } };
      return;
    }

    // 1) Retrieve documents from Azure Cognitive Search (semantic)
    const searchUrl = `${SEARCH_ENDPOINT}/indexes/${SEARCH_INDEX}/docs/search?api-version=2024-03-01-preview`;
    const searchBody = {
      search: prompt,
      queryType: "semantic",
      semanticConfiguration: SEMANTIC_CONFIG,
      top: MAX_DOCS
    };

    const searchRes = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": SEARCH_API_KEY
      },
      body: JSON.stringify(searchBody)
    });
    if (!searchRes.ok) {
      const errText = await searchRes.text();
      throw new Error(`Search error ${searchRes.status}: ${errText}`);
    }
    const searchData = await searchRes.json();
    const docs = (searchData.value || []).map((d: any) => ({
      name: d.name,
      snippet: (d.content || "").slice(0, 1500),
      extension: d.extension,
      filepath: d.filepath
    }));

    // Build system prompt with strictness guidance
    const system = `You are a helpful assistant that must answer using ONLY the provided documents.
Strictness level: ${STRICTNESS}. If documents are weakly relevant, still summarize carefully.
If no relevant docs, say you cannot find the answer in the retrieved data.`;

    const messages = [
      { role: "system", content: system },
      { role: "user", content: prompt },
      { role: "system", content: `Retrieved documents:\n${JSON.stringify(docs, null, 2)}` }
    ];

    // 2) Call Azure OpenAI (Chat Completions)
    const aoaiUrl = `${AOAI_ENDPOINT}/openai/deployments/${AOAI_DEPLOYMENT}/chat/completions?api-version=2024-08-01-preview`;
    const aoaiRes = await fetch(aoaiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": AOAI_API_KEY
      },
      body: JSON.stringify({
        messages,
        temperature: 0.7,
        top_p: 0.95,
        max_tokens: 1024
      })
    });

    if (!aoaiRes.ok) {
      const errText = await aoaiRes.text();
      throw new Error(`AOAI error ${aoaiRes.status}: ${errText}`);
    }
    const aoaiData = await aoaiRes.json();
    const answer = aoaiData.choices?.[0]?.message?.content ?? "No answer.";

    context.res = { status: 200, body: { answer, citations: docs } };
  } catch (err: any) {
    context.res = { status: 500, body: { error: err.message } };
  }
};

export default httpTrigger;
