const cron = require('node-cron');
const config = require('../config/config');
const Database = require('../database/database');
const KijijiService = require('../services/kijijiService');
const DiscordService = require('../services/discordService');

class Scanner {
    constructor() {
        this.db = new Database();
        this.kijijiService = new KijijiService();
        this.discordService = new DiscordService();
        this.activeJobs = new Map();
    }

    async start() {
        console.log('🚀 Starting Kijiji Scanner...');

        // Initialize Kijiji API data (categories, regions, etc.)
        await this.kijijiService.init();

        // Load all active searches and schedule them
        const searches = await this.db.getActiveSearches();

        for (const search of searches) {
            this.scheduleSearch(search);
        }

        console.log(`✅ Scheduled ${searches.length} active searches`);

        // Immediately perform a scan for all active searches (if configured)
        if (config.scanner.immediateStart) {
            for (const search of searches) {
                console.log(`⏩ Performing immediate scan for: ${search.name}`);
                await this.performSearch(search);
            }
        }
    }

    scheduleSearch(search) {
        // Cancel existing job if it exists
        if (this.activeJobs.has(search.id)) {
            this.activeJobs.get(search.id).stop();
        }

        // Create cron expression (every X minutes)
        const cronExpression = `*/${search.interval_minutes} * * * *`;
        
        const job = cron.schedule(cronExpression, async () => {
            console.log(`⏰ Scheduled scan triggered for: ${search.name}`);
            await this.performSearch(search);
            console.log(`🕒 Waiting ${search.interval_minutes} minutes for next scan of: ${search.name}`);
        }, {
            scheduled: false
        });

        this.activeJobs.set(search.id, job);
        job.start();

        console.log(`📅 Scheduled search "${search.name}" to run every ${search.interval_minutes} minutes`);
    }

    async performSearch(search) {
        try {
            console.log(`🔍 Performing search: ${search.name} (${search.keyword || 'All'} in ${search.region_name})`);
            
            // Build search URL using selected category and radius
            const searchUrl = this.kijijiService.buildSearchUrl(
                search.region_url,
                search.keyword || '',
                search.category,
                search.radius || 50.0
            );
            
            // Fetch listings
            const result = await this.kijijiService.searchListings(searchUrl);
            
            if (!result.success) {
                console.error(`❌ Failed to fetch listings for ${search.name}:`, result.error);
                return;
            }

            // Filter by price if set
            let filteredListings = result.listings;
            if (search.min_price) {
                filteredListings = filteredListings.filter(l => l.price !== null && l.price >= search.min_price * 100);
            }
            if (search.max_price) {
                filteredListings = filteredListings.filter(l => l.price !== null && l.price <= search.max_price * 100);
            }

            console.log(`📊 Found ${filteredListings.length} listings for ${search.name}`);

            // Check if this is the first scan (no results in DB for this search)
            const seenListings = new Set();
            const allResults = await this.db.getResultsForSearch ? await this.db.getResultsForSearch(search.id) : [];
            if (allResults && allResults.length > 0) {
                allResults.forEach(r => seenListings.add(r.listing_id));
            }

            let newListings = [];
            for (const listing of filteredListings) {
                const isNew = await this.db.isNewListing(search.id, listing.id);
                if (isNew) newListings.push(listing);
            }

            let newListingsCount = 0;
            if (seenListings.size === 0) {
                // First scan: only send 2, mark the rest as seen
                for (let i = 0; i < newListings.length; i++) {
                    const listing = newListings[i];
                    let isDuplicate = false;
                    if (search.no_duplicates) {
                        isDuplicate = await this.db.hasDuplicateResult(search.id, listing.title, listing.price, listing.description);
                    }
                    if (i < 2 && !isDuplicate) {
                        // Send Discord notification
                        const webhookResult = await this.discordService.sendWebhook(
                            search.webhook_url,
                            listing,
                            search.name,
                            search.region_name
                        );
                        if (webhookResult.success) {
                            newListingsCount++;
                            console.log(`✅ Sent notification for: ${listing.title}`);
                        } else {
                            console.error(`❌ Failed to send webhook for ${listing.title}:`, webhookResult.error);
                        }
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    // Mark as seen in DB (for all)
                    await this.db.addResult(search.id, listing.id, listing.title, listing.price, listing.url, listing.description);
                }
            } else {
                // Not first scan: send all new
                for (const listing of newListings) {
                    let isDuplicate = false;
                    if (search.no_duplicates) {
                        isDuplicate = await this.db.hasDuplicateResult(search.id, listing.title, listing.price, listing.description);
                    }
                    if (!isDuplicate) {
                        // Send Discord notification
                        const webhookResult = await this.discordService.sendWebhook(
                            search.webhook_url,
                            listing,
                            search.name,
                            search.region_name
                        );
                        if (webhookResult.success) {
                            await this.db.addResult(search.id, listing.id, listing.title, listing.price, listing.url, listing.description);
                            newListingsCount++;
                            console.log(`✅ Sent notification for: ${listing.title}`);
                        } else {
                            console.error(`❌ Failed to send webhook for ${listing.title}:`, webhookResult.error);
                        }
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } else {
                        // Still mark as seen
                        await this.db.addResult(search.id, listing.id, listing.title, listing.price, listing.url, listing.description);
                    }
                }
            }

            // Update last scan time
            await this.db.updateLastScan(search.id);

            if (newListingsCount > 0) {
                console.log(`🎉 Found ${newListingsCount} new listings for ${search.name}`);
            } else {
                console.log(`📭 No new listings found for ${search.name}`);
            }

        } catch (error) {
            console.error(`❌ Error performing search ${search.name}:`, error.message);
        }
    }

    async addSearch(searchData) {
        try {
            const searchId = await this.db.addSearch(
                searchData.name,
                searchData.keyword,
                searchData.regionId,
                searchData.webhookId,
                searchData.intervalMinutes
            );

            // Get the full search data and schedule it
            const searches = await this.db.getSearches();
            const newSearch = searches.find(s => s.id === searchId);
            
            if (newSearch) {
                this.scheduleSearch(newSearch);
            }

            return { success: true, searchId };
        } catch (error) {
            console.error('Error adding search:', error.message);
            return { success: false, error: error.message };
        }
    }

    async removeSearch(searchId) {
        try {
            // Stop the cron job
            if (this.activeJobs.has(searchId)) {
                this.activeJobs.get(searchId).stop();
                this.activeJobs.delete(searchId);
            }

            // Remove from database
            await this.db.deleteSearch(searchId);

            return { success: true };
        } catch (error) {
            console.error('Error removing search:', error.message);
            return { success: false, error: error.message };
        }
    }

    async refreshSchedules() {
        // Stop all current jobs
        for (const [searchId, job] of this.activeJobs) {
            job.stop();
        }
        this.activeJobs.clear();

        // Reload and reschedule all active searches
        const searches = await this.db.getActiveSearches();
        
        for (const search of searches) {
            this.scheduleSearch(search);
        }

        console.log(`🔄 Refreshed schedules for ${searches.length} searches`);
    }

    getActiveJobs() {
        return Array.from(this.activeJobs.keys());
    }

    stop() {
        console.log('🛑 Stopping Kijiji Scanner...');
        
        for (const [searchId, job] of this.activeJobs) {
            job.stop();
        }
        
        this.activeJobs.clear();
        this.db.close();
    }
}

module.exports = Scanner; 