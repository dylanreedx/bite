// apps/fatsecret-proxy/server.js
const express = require('express');
const axios = require('axios');
const FatSecret = require('fatsecret.js');

require('dotenv').config(); // Load environment variables from .env file

const {FATSECRET_CONSUMER_KEY, FATSECRET_CONSUMER_SECRET, PORT} = process.env;

// --- Input Validation ---
if (!FATSECRET_CONSUMER_KEY || !FATSECRET_CONSUMER_SECRET) {
  console.error(
    'FATAL ERROR: FATSECRET_CONSUMER_KEY and FATSECRET_CONSUMER_SECRET must be set in environment variables.'
  );
  process.exit(1); // Exit if keys are missing
}

// --- Initialize FatSecret Client ---
// Using the same setup as your db package
const fatSecretClient = new FatSecret.Client({
  credentials: {
    clientId: FATSECRET_CONSUMER_KEY,
    clientSecret: FATSECRET_CONSUMER_SECRET,
    // Scope might be needed depending on the operations, 'basic' is often default
    scope: ['basic'],
  },
});

// --- Initialize Express App ---
const app = express();
const port = PORT || 3001; // Use PORT from environment or default to 3001

// --- Proxy Search Endpoint ---
app.get('/search', async (req, res) => {
  const query = req.query.q; // Get search term from ?q=...

  if (!query || typeof query !== 'string' || query.trim() === '') {
    return res
      .status(400)
      .json({error: "Missing or invalid search query parameter 'q'"});
  }

  console.log(`[Proxy] Received search request for: "${query}"`);

  try {
    // --- Call FatSecret using the library ---
    // The library handles authentication and request formatting
    const searchResults = await fatSecretClient.foods.search({
      search_expression: query,
      // Add any other parameters the library or FatSecret API supports/requires
      // e.g., max_results: 20, page_number: 0
    });

    console.log(`[Proxy] Successfully fetched data for: "${query}"`);

    // --- Return FatSecret's response ---
    // The structure of searchResults depends on the fatsecret.js library.
    // Assuming it returns the data directly:
    res.status(200).json(searchResults);
  } catch (error) {
    console.error(
      `[Proxy] Error searching FatSecret for "${query}":`,
      error.message
    );
    // Log the full error for debugging if needed
    // console.error(error);

    // Try to return a meaningful error status code if possible
    // (The library might throw errors with status codes, or it might be generic)
    const statusCode = error.statusCode || 500; // Default to 500 Internal Server Error
    res.status(statusCode).json({
      error: 'Failed to fetch data from FatSecret',
      details: error.message || 'Unknown error',
    });
  }
});

app.get('/get-food', async (req, res) => {
  const foodIdQuery = req.query.id; // Get food ID from ?id=...

  if (!foodIdQuery || typeof foodIdQuery !== 'string') {
    return res
      .status(400)
      .json({error: "Missing or invalid food ID parameter 'id'"});
  }

  const foodId = Number.parseInt(foodIdQuery);
  if (isNaN(foodId)) {
    return res.status(400).json({error: 'Invalid food ID format'});
  }

  console.log(`[Proxy] Received get-food request for ID: ${foodId}`);

  try {
    // --- Call FatSecret using the library's getFood method ---
    // The library handles auth. This runs on the proxy server with the whitelisted IP.
    // NOTE: The fatsecret.js library might expect the ID as a string.
    const foodDetails = await fatSecretClient.getFood({
      foodId: String(foodId),
    });

    console.log(`[Proxy] Successfully fetched details for ID: ${foodId}`);

    // --- Return FatSecret's response ---
    res.status(200).json(foodDetails);
  } catch (error) {
    console.error(
      `[Proxy] Error getting food details from FatSecret for ID ${foodId}:`,
      error.message
    );
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: 'Failed to get food details from FatSecret',
      details: error.message || 'Unknown error',
    });
  }
});

// --- Basic Root Route ---
app.get('/', (req, res) => {
  res.status(200).send('FatSecret Proxy is running!');
});

// --- Start Server ---
app.listen(port, () => {
  console.log(`FatSecret Proxy server listening on port ${port}`);
});
