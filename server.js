// Import required packages
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); // To use environment variables

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
// Enable CORS (Cross-Origin Resource Sharing)
app.use(cors()); 
// Allow the server to understand JSON
app.use(express.json()); 
// Serve static files (our 'public' folder)
app.use(express.static(path.join(__dirname, 'public'))); 

// --- Database Connection ---
const mongoUri = process.env.MONGODB_URI; // Get the DB string from Railway
if (!mongoUri) {
  console.error("Error: MONGODB_URI environment variable is not set.");
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => console.log('Successfully connected to MongoDB.'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- API Routes ---
const apiRoutes = require('./backend/routes/api');
app.use('/api', apiRoutes); // All our API routes will start with /api

// --- Frontend Route ---
// For any other GET request, send the index.html file
// This is key for a Single Page Application (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Start the Server ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});