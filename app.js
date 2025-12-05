const messagesEl = document.getElementById('messages');
const form = document.getElementById('chat-form');
const promptEl = document.getElementById('prompt');

function addMessage(text, role) {
  const div = document.createElement('div');
  div.className = role;
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const prompt = promptEl.value.trim();
  if (!prompt) return;
  addMessage(prompt, 'user');
  promptEl.value = '';

  try {
    const res = await fetch("https://chatbot-api-onedrive.azurewebsites.net/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();
    console.log("Réponse brute de l'API :", data); // Debug dans la console navigateur
    addMessage(data.answer ?? '(Pas de réponse)', 'assistant');
  } catch (err) {
    addMessage(`Erreur: ${err.message}`, 'assistant');
  }
});
