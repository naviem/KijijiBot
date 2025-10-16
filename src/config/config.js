const fs = require('fs');
const path = require('path');

// Default configuration
const defaultConfig = {
    server: {
        port: 3000
    },
    database: {
        path: './data/kijiji_bot.db'
    },
    scanner: {
        immediateStart: true
    }
};

/**
 * Load configuration from config.json, falling back to config.example.json, then defaults
 */
function loadConfig() {
    const configPath = path.join(__dirname, '../../config.json');
    const exampleConfigPath = path.join(__dirname, '../../config.example.json');

    // Try loading config.json first
    if (fs.existsSync(configPath)) {
        try {
            const configData = fs.readFileSync(configPath, 'utf8');
            const userConfig = JSON.parse(configData);
            console.log('✅ Loaded configuration from config.json');
            return mergeConfig(defaultConfig, userConfig);
        } catch (error) {
            console.error('❌ Error loading config.json:', error.message);
            console.log('⚠️  Falling back to defaults');
            return defaultConfig;
        }
    }

    // Try loading config.example.json
    if (fs.existsSync(exampleConfigPath)) {
        try {
            const configData = fs.readFileSync(exampleConfigPath, 'utf8');
            const exampleConfig = JSON.parse(configData);
            console.log('⚠️  No config.json found, using config.example.json');
            console.log('💡 Tip: Copy config.example.json to config.json to customize settings');
            return mergeConfig(defaultConfig, exampleConfig);
        } catch (error) {
            console.error('❌ Error loading config.example.json:', error.message);
            console.log('⚠️  Falling back to defaults');
            return defaultConfig;
        }
    }

    // Fall back to defaults
    console.log('⚠️  No config files found, using default configuration');
    console.log('💡 Tip: Create config.json to customize settings');
    return defaultConfig;
}

/**
 * Deep merge two config objects
 */
function mergeConfig(defaults, overrides) {
    const result = { ...defaults };

    for (const key in overrides) {
        if (overrides[key] && typeof overrides[key] === 'object' && !Array.isArray(overrides[key])) {
            result[key] = mergeConfig(defaults[key] || {}, overrides[key]);
        } else {
            result[key] = overrides[key];
        }
    }

    return result;
}

// Export singleton config instance
const config = loadConfig();

module.exports = config;
