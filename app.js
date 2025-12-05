document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("chat-form");
  const input = document.getElementById("user-input");
  const messages = document.getElementById("messages");
  const loader = document.getElementById("loader");

  if (!form || !input || !messages) {
    console.error("Certains éléments du DOM sont introuvables.");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const userInput = input.value.trim();
    if (!userInput) return;

    // Affiche le message utilisateur
    const userMessage = document.createElement("div");
    userMessage.className = "message user";
    userMessage.textContent = userInput;
    messages.appendChild(userMessage);

    // Affiche le loader si présent
    if (loader) {
      loader.style.display = "block";
    }

    try {
      const response = await fetch(
        "https://chatbot-api-onedrive-bpbzcuenbrf4ezbj.francecentral-01.azurewebsites.net/api/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: userInput })
        }
      );

      const data = await response.json();
      console.log("Réponse brute de l'API :", data);

      // Affiche la réponse du bot
      const botMessage = document.createElement("div");
      botMessage.className = "message bot";
      botMessage.textContent = data.answer || "Pas de réponse reçue.";
      messages.appendChild(botMessage);
    } catch (error) {
      console.error("Erreur lors de l'appel à l'API :", error);
      const errorMessage = document.createElement("div");
      errorMessage.className = "message error";
      errorMessage.textContent = "Erreur de connexion au serveur.";
      messages.appendChild(errorMessage);
    } finally {
      // Cache le loader si présent
      if (loader) {
        loader.style.display = "none";
      }
      input.value = "";
    }
  });
});
