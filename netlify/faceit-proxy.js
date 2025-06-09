// Plik: netlify/functions/faceit-proxy.js
const fetch = require('node-fetch');

const FACEIT_API_KEY = '531c6bf2-b10d-4aed-9081-d5736b27dc39';
const FACEIT_API_URL_BASE = 'https://open.faceit.com/data/v4';

exports.handler = async function(event, context) {
    const endpoint = event.queryStringParameters.endpoint;
    if (!endpoint) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Brak parametru "endpoint"' }) };
    }

    // Usuwamy 'endpoint' z parametrów, żeby nie wysłać go do Faceit
    delete event.queryStringParameters.endpoint;
    const queryString = new URLSearchParams(event.queryStringParameters).toString();
    
    const apiUrl = `${FACEIT_API_URL_BASE}${endpoint}?${queryString}`;

    try {
        const response = await fetch(apiUrl, {
            headers: { 'Authorization': `Bearer ${FACEIT_API_KEY}` }
        });
        const data = await response.json();
        
        return {
            statusCode: response.status,
            body: JSON.stringify(data)
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Błąd proxy', details: error.message }) };
    }
};