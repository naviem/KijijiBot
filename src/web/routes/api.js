const { name, keyword, regionId, webhookId, intervalMinutes, minPrice, maxPrice, category, noDuplicates, radius } = req.body;
const id = await db.addSearch(name, keyword, regionId, webhookId, intervalMinutes, minPrice, maxPrice, category, noDuplicates, radius);
res.json({ id, name, keyword, regionId, webhookId, intervalMinutes, minPrice, maxPrice, category, noDuplicates, radius }); 