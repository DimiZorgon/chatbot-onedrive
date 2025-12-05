const { app } = require('@azure/functions');
const { OpenAIClient, AzureKeyCredential } = require('@azure/openai'); 

// --- Récupération des variables d'environnement ---
// Ces variables sont lues depuis la configuration de votre Function App
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME; 
const systemMessage = "Vous êtes un assistant utile et concis spécialisé dans OneDrive et les services Microsoft 365."; 

// Vérification des configurations pour éviter le RpcException si une clé est manquante au démarrage
if (!endpoint || !apiKey || !deploymentName) {
    // Si une variable est manquante, lever une exception claire.
    // L'erreur sera logguée dans Azure.
    console.error("CONFIGURATION MANQUANTE : Veuillez définir AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY et AZURE_OPENAI_DEPLOYMENT_NAME dans les Application Settings.");
    throw new Error("Erreur de configuration critique : Clés Azure OpenAI manquantes ou client non initialisé.");
}

// Initialisation du client OpenAI
const client = new OpenAIClient(
    endpoint,
    new AzureKeyCredential(apiKey)
);

app.http('chat', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        let prompt = '';
        
        // 1. Extraction du Prompt de la requête HTTP
        try {
            // Le frontend envoie un corps JSON du type { prompt: "..." }
            const body = await request.json();
            prompt = body.prompt;
        } catch (error) {
            context.warn("Corps de requête invalide ou manquant.");
            return { status: 400, body: 'Request body must be valid JSON and contain a "prompt" field.' };
        }

        if (!prompt) {
             return { status: 400, body: 'Missing "prompt" field in request body.' };
        }

        context.log(`Prompt reçu: ${prompt}`);
        let botAnswer = "Erreur du serveur : Impossible de communiquer avec l'IA.";

        // 2. LOGIQUE CHATBOT : Appel à Azure OpenAI
        try {
            const messages = [
                { role: "system", content: systemMessage },
                { role: "user", content: prompt }
            ];

            const response = await client.getChatCompletions(
                deploymentName,
                messages,
                { temperature: 0.7 }
            );
            
            // Extraction de la réponse
            if (response.choices && response.choices.length > 0) {
                botAnswer = response.choices[0].message.content;
            } else {
                context.warn("Réponse OpenAI reçue mais sans contenu de choix.");
                botAnswer = "L'IA n'a pas pu générer de réponse.";
            }

        } catch (apiError) {
            // 3. Gérer l'erreur API et la renvoyer proprement au frontend
            context.error("Erreur lors de l'appel à l'API Azure OpenAI:", apiError);
            return { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answer: `Erreur du serveur (OpenAI) : ${apiError.message}` })
            };
        }

        // 4. Succès : Retourner la réponse au format JSON attendu par le frontend
        return { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answer: botAnswer }) // Le frontend attend "answer"
        };
    }
});