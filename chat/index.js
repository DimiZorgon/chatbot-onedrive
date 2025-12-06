const { app } = require('@azure/functions');
const OpenAI = require('openai');
const { AzureOpenAI } = require('openai');


// --- Récupération des variables d'environnement ---
// Celles-ci sont lues depuis la configuration de votre Function App (Configuration > Application settings)
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
const systemMessage = "Vous êtes un assistant utile et concis spécialisé dans OneDrive et les services Microsoft 365.";

// Vérification des configurations au démarrage -> lister précisément ce qui manque
const missingEnv = [];
if (!endpoint) missingEnv.push('AZURE_OPENAI_ENDPOINT');
if (!apiKey) missingEnv.push('AZURE_OPENAI_API_KEY');
if (!deploymentName) missingEnv.push('AZURE_OPENAI_DEPLOYMENT_NAME');
if (missingEnv.length > 0) {
    throw new Error(`Erreur de configuration critique - variables manquantes: ${missingEnv.join(', ')}`);
}

// Initialisation du client OpenAI
const client = new AzureOpenAI({
    apiKey: apiKey,
    apiVersion: "2024-02-15-preview",
    baseURL: `${endpoint}/openai/deployments/${deploymentName}`,
});

app.http('chat', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        let prompt = '';

        // 1. Extraction du Prompt de la requête HTTP
        try {
            // Lecture du corps JSON (le frontend envoie { prompt: "..." })
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

            const response = await client.chat.completions.create({
                model: deploymentName,
                messages: messages,
                temperature: 0.7
            });

            context.log('OpenAI response (raw):', response);

            // Extraction robuste de la réponse
            const choice = response?.choices && response.choices[0];
            if (choice) {
                botAnswer = choice.message?.content ?? "L'IA n'a pas renvoyé de contenu.";
            } else {
                context.warn("Réponse OpenAI reçue mais sans 'choices'.", response);
                botAnswer = "L'IA n'a pas pu générer de réponse.";
            }

        } catch (apiError) {
            // 3. Gérer l'erreur API tout en renvoyant des informations utiles pour le debugging
            context.error("Erreur lors de l'appel à l'API Azure OpenAI:", apiError);

            // Essayer d'extraire des informations utiles (sans exposer de secret)
            const errorMessage = apiError?.message || String(apiError);
            const statusCode = apiError?.statusCode ?? apiError?.status ?? null;

            return {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: `OpenAI error: ${errorMessage}`, statusCode })
            };
        }

        // 4. Succès : Retourner la réponse au format JSON attendu
        return {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answer: botAnswer }) // Le frontend attend "answer"
        };
    }
});