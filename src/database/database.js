const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('../config/config');

class Database {
    constructor() {
        // Resolve database path relative to project root
        this.dbPath = path.resolve(__dirname, '../..', config.database.path);
        this.db = new sqlite3.Database(this.dbPath);
        this.init();
    }

    init() {
        // Create tables if they don't exist
        this.db.serialize(() => {
            // Webhooks table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS webhooks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    url TEXT NOT NULL UNIQUE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Regions table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS regions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    url TEXT NOT NULL UNIQUE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Searches table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS searches (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    keyword TEXT,
                    region_id INTEGER NOT NULL,
                    webhook_id INTEGER NOT NULL,
                    interval_minutes INTEGER NOT NULL DEFAULT 5,
                    min_price INTEGER,
                    max_price INTEGER,
                    category TEXT,
                    no_duplicates BOOLEAN DEFAULT 0,
                    last_scan DATETIME,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    radius INTEGER DEFAULT 50,
                    FOREIGN KEY (region_id) REFERENCES regions (id),
                    FOREIGN KEY (webhook_id) REFERENCES webhooks (id)
                )
            `);

            // Results table (to track what we've already sent)
            this.db.run(`
                CREATE TABLE IF NOT EXISTS results (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    search_id INTEGER NOT NULL,
                    listing_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    price INTEGER,
                    url TEXT NOT NULL,
                    description TEXT,
                    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (search_id) REFERENCES searches (id),
                    UNIQUE(search_id, listing_id)
                )
            `);
        });
    }

    // Webhook operations
    async addWebhook(name, url) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO webhooks (name, url) VALUES (?, ?)',
                [name, url],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async getWebhooks() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM webhooks ORDER BY name', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async deleteWebhook(id) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM webhooks WHERE id = ?', [id], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }

    // Region operations
    async addRegion(name, url) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO regions (name, url) VALUES (?, ?)',
                [name, url],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async getRegions() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM regions ORDER BY name', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async deleteRegion(id) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM regions WHERE id = ?', [id], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }

    // Search operations
    async addSearch(name, keyword, regionId, webhookId, intervalMinutes, minPrice, maxPrice, category, noDuplicates, radius) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO searches (name, keyword, region_id, webhook_id, interval_minutes, min_price, max_price, category, no_duplicates, radius) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [name, keyword, regionId, webhookId, intervalMinutes, minPrice || null, maxPrice || null, category || null, noDuplicates ? 1 : 0, radius || 50],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async getSearches() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT s.*, r.name as region_name, r.url as region_url, w.name as webhook_name, w.url as webhook_url
                FROM searches s
                JOIN regions r ON s.region_id = r.id
                JOIN webhooks w ON s.webhook_id = w.id
                ORDER BY s.name
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async getActiveSearches() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT s.*, r.name as region_name, r.url as region_url, w.name as webhook_name, w.url as webhook_url
                FROM searches s
                JOIN regions r ON s.region_id = r.id
                JOIN webhooks w ON s.webhook_id = w.id
                WHERE s.is_active = 1
                ORDER BY s.name
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async deleteSearch(id) {
        return new Promise((resolve, reject) => {
            // First, delete all results for this search
            this.db.run('DELETE FROM results WHERE search_id = ?', [id], (err) => {
                if (err) return reject(err);
                // Then, delete the search itself
                this.db.run('DELETE FROM searches WHERE id = ?', [id], function(err2) {
                    if (err2) reject(err2);
                    else resolve(this.changes);
                });
            });
        });
    }

    async updateSearch(id, name, keyword, regionId, webhookId, intervalMinutes, minPrice, maxPrice, category, noDuplicates, radius) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE searches SET name = ?, keyword = ?, region_id = ?, webhook_id = ?, interval_minutes = ?, min_price = ?, max_price = ?, category = ?, no_duplicates = ?, radius = ? WHERE id = ?',
                [name, keyword, regionId, webhookId, intervalMinutes, minPrice || null, maxPrice || null, category || null, noDuplicates ? 1 : 0, radius || 50, id],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    async toggleSearchActive(id) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE searches SET is_active = NOT is_active WHERE id = ?',
                [id],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    async updateLastScan(id) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE searches SET last_scan = CURRENT_TIMESTAMP WHERE id = ?',
                [id],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    // Results operations
    async addResult(searchId, listingId, title, price, url, description) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT OR IGNORE INTO results (search_id, listing_id, title, price, url, description) VALUES (?, ?, ?, ?, ?, ?)',
                [searchId, listingId, title, price, url, description || ''],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    async isNewListing(searchId, listingId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT id FROM results WHERE search_id = ? AND listing_id = ?',
                [searchId, listingId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(!row); // Return true if no row found (new listing)
                }
            );
        });
    }

    async getResultsForSearch(searchId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM results WHERE search_id = ?',
                [searchId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    // Purge orphaned results and searches
    async purgeOrphanedData() {
        return new Promise((resolve, reject) => {
            // Delete results with non-existent search_id
            this.db.run(`DELETE FROM results WHERE search_id NOT IN (SELECT id FROM searches)`, (err) => {
                if (err) return reject(err);
                // Optionally, delete searches with missing webhook or region
                this.db.run(`DELETE FROM searches WHERE webhook_id NOT IN (SELECT id FROM webhooks) OR region_id NOT IN (SELECT id FROM regions)`, (err2) => {
                    if (err2) reject(err2);
                    else resolve(true);
                });
            });
        });
    }

    async hasDuplicateResult(searchId, title, price, description) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT id FROM results WHERE search_id = ? AND title = ? AND price = ? AND (description IS NULL OR description = ?)',
                [searchId, title, price, description || ''],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(!!row);
                }
            );
        });
    }

    close() {
        this.db.close();
    }
}

module.exports = Database; 