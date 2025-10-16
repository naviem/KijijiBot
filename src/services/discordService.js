const axios = require('axios');

function truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

class DiscordService {
    async sendWebhook(webhookUrl, listing, searchName, regionName) {
        try {
            const price = listing.price ? `$${(listing.price / 100).toFixed(2)}` : 'Price not specified';
            const title = truncate(listing.title, 256);
            const region = truncate(regionName, 256);
            const search = truncate(searchName, 256);
            const priceField = truncate(price, 1024);
            const description = truncate(listing.description, 2048);

            const embed = {
                title,
                url: listing.url,
                description,
                color: 0x00ff00, // Green color
                fields: [
                    {
                        name: '💰 Price',
                        value: priceField,
                        inline: true
                    },
                    {
                        name: '📍 Region',
                        value: region,
                        inline: true
                    },
                    {
                        name: '🔍 Search',
                        value: search,
                        inline: true
                    }
                ],
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'Kijiji Bot'
                }
            };

            // Remove empty/undefined fields
            embed.fields = embed.fields.filter(f => f.value && f.value.length > 0);

            const payload = {
                embeds: [embed]
            };

            // Discord requires at least one of content or embeds
            if (!embed.title || embed.fields.length === 0) {
                payload.content = `New Kijiji listing: ${listing.title} - ${listing.url}`;
            }

            // DEBUG: Log the payload being sent
            console.log('--- Discord Webhook Payload ---');
            console.dir(payload, { depth: null });
            console.log('-------------------------------');

            const response = await axios.post(webhookUrl, payload, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            return {
                success: true,
                message: 'Webhook sent successfully'
            };

        } catch (error) {
            console.error('Error sending Discord webhook:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async testWebhook(webhookUrl) {
        try {
            const embed = {
                title: '🧪 Webhook Test',
                description: 'This is a test message from your Kijiji bot!',
                color: 0x0099ff, // Blue color
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'Kijiji Bot - Test'
                }
            };

            const payload = {
                embeds: [embed]
            };

            const response = await axios.post(webhookUrl, payload, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            return {
                success: true,
                message: 'Test webhook sent successfully'
            };

        } catch (error) {
            console.error('Error testing Discord webhook:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = DiscordService; 