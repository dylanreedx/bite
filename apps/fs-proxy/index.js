const express = require("express");
const axios = require("axios");
const FatSecret = require("fatsecret.js");

require("dotenv").config(); // Load environment variables from .env file

const { FATSECRET_CONSUMER_KEY, FATSECRET_CONSUMER_SECRET, PORT } = process.env;

// --- Input Validation ---
if (!FATSECRET_CONSUMER_KEY || !FATSECRET_CONSUMER_SECRET) {
  console.error(
    "FATAL ERROR: FATSECRET_CONSUMER_KEY and FATSECRET_CONSUMER_SECRET must be set in environment variables.",
  );
  process.exit(1); // Exit if keys are missing
}

// --- Initialize FatSecret Client ---
const fatSecretClient = new FatSecret.Client({
  credentials: {
    clientId: FATSECRET_CONSUMER_KEY,
    clientSecret: FATSECRET_CONSUMER_SECRET,
    scope: ["basic"],
  },
});

// --- Initialize Express App ---
const app = express();
const port = PORT || 3000;

// Add CORS middleware for your SvelteKit app
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept",
  );
  next();
});

// --- Proxy Search Endpoint ---
app.get("/search", async (req, res) => {
  const query = req.query.q;
  const maxResults = req.query.max_results || 20;

  if (!query || typeof query !== "string" || query.trim() === "") {
    return res
      .status(400)
      .json({ error: "Missing or invalid search query parameter 'q'" });
  }

  console.log(`[Proxy] Received search request for: "${query}"`);

  try {
    // Use searchFoods method for searching
    const searchResults = await fatSecretClient.searchFoods({
      search_expression: query,
      max_results: maxResults,
    });

    console.log(`[Proxy] Successfully fetched search data for: "${query}"`);
    res.status(200).json(searchResults);
  } catch (error) {
    console.error(
      `[Proxy] Error searching FatSecret for "${query}":`,
      error.message,
    );
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: "Failed to fetch data from FatSecret",
      details: error.message || "Unknown error",
    });
  }
});

// --- Food Details Endpoint (multiple aliases for compatibility) ---
app.get("/food", async (req, res) => {
  const foodIdQuery = req.query.food_id;
  return getFoodDetails(req, res, foodIdQuery);
});

app.get("/get-food", async (req, res) => {
  const foodIdQuery = req.query.id;
  return getFoodDetails(req, res, foodIdQuery);
});

// Shared function for getting food details
async function getFoodDetails(req, res, foodIdQuery) {
  if (!foodIdQuery || typeof foodIdQuery !== "string") {
    return res
      .status(400)
      .json({ error: "Missing or invalid food ID parameter" });
  }

  const foodId = Number.parseInt(foodIdQuery);
  if (isNaN(foodId)) {
    return res.status(400).json({ error: "Invalid food ID format" });
  }

  console.log(`[Proxy] Received food details request for ID: ${foodId}`);

  try {
    // Use the correct getFood method directly on the client
    const foodDetails = await fatSecretClient.getFood({
      foodId: String(foodId),
    });

    console.log(`[Proxy] Successfully fetched details for ID: ${foodId}`);
    res.status(200).json(foodDetails);
  } catch (error) {
    console.error(
      `[Proxy] Error getting food details from FatSecret for ID ${foodId}:`,
      error.message,
    );
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: "Failed to get food details from FatSecret",
      details: error.message || "Unknown error",
    });
  }
}

// --- Autocomplete Endpoint ---
app.get("/autocomplete", async (req, res) => {
  const query = req.query.q;
  const maxResults = req.query.max_results || 8;

  if (!query || typeof query !== "string" || query.trim() === "") {
    return res
      .status(400)
      .json({ error: "Missing or invalid search query parameter 'q'" });
  }

  console.log(`[Proxy] Received autocomplete request for: "${query}"`);

  try {
    // Fallback to search since autocomplete might not be supported
    const searchResults = await fatSecretClient.searchFoods({
      search_expression: query,
      max_results: maxResults,
    });

    console.log(
      `[Proxy] Successfully fetched autocomplete data for: "${query}"`,
    );
    res.status(200).json(searchResults);
  } catch (error) {
    console.error(`[Proxy] Error in autocomplete:`, error.message);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: "Failed to fetch autocomplete data from FatSecret",
      details: error.message || "Unknown error",
    });
  }
});

// --- Basic Root Route ---
app.get("/", (req, res) => {
  res.status(200).send("FatSecret Proxy is running!");
});

// --- Health Check ---
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    endpoints: [
      "GET /search?q={query}&max_results={limit}",
      "GET /food?food_id={id}",
      "GET /get-food?id={id}",
      "GET /autocomplete?q={query}&max_results={limit}",
    ],
  });
});

// --- Start Server ---
app.listen(port, () => {
  console.log(`FatSecret Proxy server listening on port ${port}`);
  console.log(`Available endpoints:`);
  console.log(`  GET /search?q={query}`);
  console.log(`  GET /food?food_id={id}`);
  console.log(`  GET /get-food?id={id}`);
  console.log(`  GET /autocomplete?q={query}`);
  console.log(`  GET /health`);
});
