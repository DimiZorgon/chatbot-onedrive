const res = await fetch("https://chatbot-api-onedrive.azurewebsites.net/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt })
});
