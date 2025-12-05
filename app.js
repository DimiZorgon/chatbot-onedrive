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

      // 🛑 CORRECTION ICI : Vérifie le statut HTTP avant de tenter response.json()
      if (!response.ok) {
        // Tente d'analyser le JSON pour récupérer le message d'erreur du backend (s'il existe)
        const errorData = await response.json().catch(() => ({ answer: `Erreur HTTP ${response.status}: Le serveur a renvoyé une erreur.` }));
        
        // Affiche l'erreur
        const errorMessage = document.createElement("div");
        errorMessage.className = "message error";
        errorMessage.textContent = errorData.answer || errorData.error || `Erreur de connexion au serveur (${response.status}).`;
        messages.appendChild(errorMessage);
        
        // Arrête le traitement pour ne pas exécuter la ligne 47 (response.json())
        return;
      }
      
      // Ligne 47 : S'exécute uniquement si le statut est 2xx
      const data = await response.json();
      console.log("Réponse brute de l'API :", data);

      // Affiche la réponse du bot
      const botMessage = document.createElement("div");
      botMessage.className = "message bot";
      botMessage.textContent = data.answer || "Pas de réponse reçue.";
      messages.appendChild(botMessage);
    } catch (error) {
      // Catch les erreurs de réseau
      console.error("Erreur lors de l'appel à l'API :", error);
      const networkErrorMessage = document.createElement("div");
      networkErrorMessage.className = "message error";
      networkErrorMessage.textContent = "Erreur de connexion (problème réseau ou serveur injoignable).";
      messages.appendChild(networkErrorMessage);
    } finally {
      // Correction du loader
      if (loader) {
        loader.style.display = "none";
      }
      input.value = "";
    }
  });
});