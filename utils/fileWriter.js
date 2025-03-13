
const fs = require('fs');
const path = require('path');

// Path to the config folder and JSON file
const configFolderPath = path.join(__dirname, '../config');

// Function to save data as JSON
function saveDataToConfigFile(data, filePath) {
	const file = path.join(configFolderPath, filePath);

	try {
		// Ensure the config directory exists
		if (!fs.existsSync(configFolderPath)) {
			fs.mkdirSync(configFolderPath);
		}

		// Convert data to JSON and write to file
		fs.writeFileSync(file, JSON.stringify(data, null, 2));
	} catch (error) {
		console.error('Error saving data:', error);
	}
}

module.exports = {saveDataToConfigFile};