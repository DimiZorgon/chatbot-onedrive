module.exports = async function (context, req) {
  const prompt = req.body?.prompt ?? "";

  // Ici tu mettras ta logique GPT + Azure Search
  const answer = "Réponse générée par GPT‑4o"; 

  context.res = {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "https://dimizorgon.github.io",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    },
    body: { answer }
  };
};
