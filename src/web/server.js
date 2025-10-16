const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const config = require('../config/config');
const Database = require('../database/database');
const DiscordService = require('../services/discordService');
const KijijiService = require('../services/kijijiService');

async function startWebServer(sharedServices = {}) {
    const PORT = process.env.PORT || config.server.port;

    // Use shared services if provided, otherwise create new instances
    const db = sharedServices.db || new Database();
    const discordService = sharedServices.discordService || new DiscordService();
    const kijijiService = sharedServices.kijijiService || new KijijiService();

    // Initialize KijijiService if not already initialized
    if (!sharedServices.kijijiService) {
        await kijijiService.init();
    }

    const app = express();

    // Middleware
    app.use(cors());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, 'public')));

    // Routes
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // API Routes
    app.get('/api/webhooks', async (req, res) => {
        try {
            const webhooks = await db.getWebhooks();
            res.json({ success: true, data: webhooks });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.post('/api/webhooks', async (req, res) => {
        try {
            const { name, url } = req.body;
            const id = await db.addWebhook(name, url);

            // Test the webhook
            const testResult = await discordService.testWebhook(url);

            res.json({
                success: true,
                id,
                testResult: testResult.success ? 'Test successful' : 'Test failed'
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.delete('/api/webhooks/:id', async (req, res) => {
        try {
            const result = await db.deleteWebhook(parseInt(req.params.id));
            res.json({ success: result > 0 });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.get('/api/regions', async (req, res) => {
        try {
            // Get database regions first
            const dbRegions = await db.getRegions();

            // If no database regions exist, create them from the API regions
            if (dbRegions.length === 0) {
                console.log('🌍 No database regions found, creating from API regions...');
                for (const region of kijijiService.regions) {
                    const regionName = region.displayName;
                    const regionUrl = `https://www.kijiji.ca/b-buy-sell/${regionName.toLowerCase().replace(/[^a-z0-9]/g, '-')}/k0c10l0`;
                    await db.addRegion(regionName, regionUrl);
                }
                // Get the newly created regions
                const newDbRegions = await db.getRegions();
                res.json({ success: true, data: newDbRegions });
            } else {
                res.json({ success: true, data: dbRegions });
            }
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.get('/api/regions/search', async (req, res) => {
        try {
            const { query } = req.query;
            if (!query) {
                return res.json({ success: true, data: [] });
            }
            const results = await kijijiService.searchLocationByName(query);
            const formattedResults = results.map(region => ({
                id: region.id,
                name: region.displayName,
                locationPaths: region.locationPaths,
                fullName: region.locationPaths?.map(path => path.name).join(', ') || region.displayName
            }));
            res.json({ success: true, data: formattedResults });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.post('/api/regions/coordinates', async (req, res) => {
        try {
            const { latitude, longitude } = req.body;
            const locationData = await kijijiService.getLocationFromCoordinates(latitude, longitude);
            if (locationData) {
                const formattedLocation = {
                    id: locationData.id,
                    locationPaths: locationData.locationPaths,
                    fullName: locationData.locationPaths?.map(path => path.name).join(', ') || 'Unknown Location'
                };
                res.json({ success: true, data: formattedLocation });
            } else {
                res.json({ success: false, error: 'Location not found' });
            }
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.post('/api/regions/place', async (req, res) => {
        try {
            const { placeId, sessionToken } = req.body;
            const placeData = await kijijiService.getLocationFromPlace(placeId, sessionToken);
            if (placeData) {
                const formattedPlace = {
                    id: placeData.location.id,
                    address: placeData.address,
                    locationPaths: placeData.location.locationPaths,
                    fullName: placeData.location.locationPaths?.map(path => path.name).join(', ') || placeData.address
                };
                res.json({ success: true, data: formattedPlace });
            } else {
                res.json({ success: false, error: 'Place not found' });
            }
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.post('/api/regions', async (req, res) => {
        try {
            const { name, url } = req.body;
            const id = await db.addRegion(name, url);
            res.json({ success: true, id });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.delete('/api/regions/:id', async (req, res) => {
        try {
            const result = await db.deleteRegion(parseInt(req.params.id));
            res.json({ success: result > 0 });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.get('/api/searches', async (req, res) => {
        try {
            const searches = await db.getSearches();
            res.json({ success: true, data: searches });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.post('/api/searches', async (req, res) => {
        try {
            const { name, keyword, regionId, webhookId, intervalMinutes, minPrice, maxPrice, category, noDuplicates, radius } = req.body;
            const id = await db.addSearch(name, keyword, regionId, webhookId, intervalMinutes, minPrice, maxPrice, category, noDuplicates, radius);
            res.json({ success: true, id });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.delete('/api/searches/:id', async (req, res) => {
        try {
            const result = await db.deleteSearch(parseInt(req.params.id));
            res.json({ success: result > 0 });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.put('/api/searches/:id', async (req, res) => {
        try {
            const { name, keyword, regionId, webhookId, intervalMinutes, minPrice, maxPrice, category, noDuplicates, radius } = req.body;
            const result = await db.updateSearch(parseInt(req.params.id), name, keyword, regionId, webhookId, intervalMinutes, minPrice, maxPrice, category, noDuplicates, radius);
            res.json({ success: result > 0 });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.patch('/api/searches/:id/toggle', async (req, res) => {
        try {
            const result = await db.toggleSearchActive(parseInt(req.params.id));
            res.json({ success: result > 0 });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.post('/api/webhooks/:id/test', async (req, res) => {
        try {
            const webhooks = await db.getWebhooks();
            const webhook = webhooks.find(w => w.id === parseInt(req.params.id));

            if (!webhook) {
                return res.status(404).json({ success: false, error: 'Webhook not found' });
            }

            const testResult = await discordService.testWebhook(webhook.url);
            res.json(testResult);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.get('/api/categories', (req, res) => {
        res.json({ success: true, data: kijijiService.categories });
    });

    app.post('/api/database/purge', async (req, res) => {
        try {
            await db.purgeOrphanedData();
            res.json({ success: true, message: 'Orphaned data purged successfully' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Start server
    const server = app.listen(PORT, () => {
        console.log(`🌐 Web UI running on http://localhost:${PORT}`);
    });

    return { app, server, port: PORT };
}

// Allow running standalone
if (require.main === module) {
    startWebServer().catch(error => {
        console.error('Failed to start web server:', error);
        process.exit(1);
    });
}

module.exports = { startWebServer }; 