// Import the 'fs' and 'dotenv' modules
const fs = require('fs');

// Check if the config.env file exists, then load the environment variables from it
if (fs.existsSync('config.env')) {
    require('dotenv').config({ path: './config.env' });
}

// Helper function to convert a string to a boolean
function convertToBool(text, fault = 'true') {
    return text.toLowerCase() === fault.toLowerCase(); // This makes it case-insensitive
}

// Export environment configurations with defaults
module.exports = {
    SESSION_ID: process.env.SESSION_ID || '',  // Default to empty if SESSION_ID is not set
    ALIVE_IMG: process.env.ALIVE_IMG || "https://envs.sh/0Nq.jpg",
    ALIVE_MSG: process.env.ALIVE_MSG || "HI THERE, VIHANGA BOT IS ONLINE NOW 💗",
};
