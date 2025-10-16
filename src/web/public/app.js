// Tab switching
function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));

    document.querySelector(`[onclick="switchTab('${tab}')"]`).classList.add('active');
    document.getElementById(`${tab}-tab`).classList.add('active');
}

// Toast notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadWebhooks();
    loadRegions();
    loadSearches();
    loadCategories();
});

// Webhooks
async function addWebhook() {
    const name = document.getElementById('webhookName').value.trim();
    const url = document.getElementById('webhookUrl').value.trim();

    if (!name || !url) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    try {
        const response = await fetch('/api/webhooks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, url })
        });

        const result = await response.json();
        if (result.success) {
            showToast('Webhook added and tested successfully!', 'success');
            document.getElementById('webhookName').value = '';
            document.getElementById('webhookUrl').value = '';
            loadWebhooks();
        } else {
            showToast('Error: ' + result.error, 'error');
        }
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

async function loadWebhooks() {
    try {
        const response = await fetch('/api/webhooks');
        const result = await response.json();

        if (result.success) {
            displayWebhooks(result.data);
            updateWebhookSelects(result.data);
        }
    } catch (error) {
        console.error('Error loading webhooks:', error);
    }
}

function displayWebhooks(webhooks) {
    const container = document.getElementById('webhooksList');

    if (webhooks.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No webhooks configured yet. Add one above to get started!</p></div>';
        return;
    }

    container.innerHTML = webhooks.map(webhook => `
        <div class="item-card">
            <h3>${webhook.name}</h3>
            <p><strong>URL:</strong> ${webhook.url.substring(0, 40)}...</p>
            <p><strong>Created:</strong> ${new Date(webhook.created_at).toLocaleDateString()}</p>
            <div class="item-actions">
                <button class="btn btn-sm btn-secondary" onclick="testWebhook(${webhook.id})">Test</button>
                <button class="btn btn-sm btn-danger" onclick="deleteWebhook(${webhook.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

async function testWebhook(id) {
    try {
        const response = await fetch(`/api/webhooks/${id}/test`, { method: 'POST' });
        const result = await response.json();

        if (result.success) {
            showToast('Webhook test successful!', 'success');
        } else {
            showToast('Webhook test failed: ' + result.error, 'error');
        }
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

async function deleteWebhook(id) {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
        const response = await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
        const result = await response.json();

        if (result.success) {
            showToast('Webhook deleted successfully!', 'success');
            loadWebhooks();
        } else {
            showToast('Error deleting webhook', 'error');
        }
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

// Regions
async function loadRegions() {
    try {
        const response = await fetch('/api/regions');
        const result = await response.json();

        if (result.success) {
            displayRegions(result.data);
            updateRegionSelects(result.data);
        }
    } catch (error) {
        console.error('Error loading regions:', error);
    }
}

function displayRegions(regions) {
    const container = document.getElementById('regionsList');

    if (regions.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No regions loaded yet.</p></div>';
        return;
    }

    container.innerHTML = regions.map(region => `
        <div class="item-card">
            <h3>${region.name}</h3>
            <p><strong>Created:</strong> ${new Date(region.created_at).toLocaleDateString()}</p>
        </div>
    `).join('');
}

// Searches
async function addSearch() {
    const name = document.getElementById('searchName').value.trim();
    const keyword = document.getElementById('searchKeyword').value.trim();
    const regionId = document.getElementById('searchRegion').value;
    const webhookId = document.getElementById('searchWebhook').value;
    const intervalMinutes = document.getElementById('searchInterval').value;
    const minPrice = document.getElementById('minPrice').value;
    const maxPrice = document.getElementById('maxPrice').value;
    const category = document.getElementById('searchCategory').value;
    const noDuplicates = document.getElementById('noDuplicates').checked;
    const radius = document.getElementById('searchRadius').value;

    if (!name || !regionId || !webhookId || !intervalMinutes) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    try {
        const response = await fetch('/api/searches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name, keyword, regionId, webhookId, intervalMinutes,
                minPrice, maxPrice, category, noDuplicates, radius
            })
        });

        const result = await response.json();
        if (result.success) {
            showToast('Search added successfully! Restart the bot to activate.', 'success');
            document.getElementById('searchName').value = '';
            document.getElementById('searchKeyword').value = '';
            document.getElementById('searchInterval').value = '5';
            document.getElementById('minPrice').value = '';
            document.getElementById('maxPrice').value = '';
            document.getElementById('noDuplicates').checked = false;
            loadSearches();
        } else {
            showToast('Error: ' + result.error, 'error');
        }
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

async function loadSearches() {
    try {
        const response = await fetch('/api/searches');
        const result = await response.json();

        if (result.success) {
            displaySearches(result.data);
        }
    } catch (error) {
        console.error('Error loading searches:', error);
    }
}

function displaySearches(searches) {
    const container = document.getElementById('searchesList');

    if (searches.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No searches configured yet. Add one above to get started!</p></div>';
        return;
    }

    container.innerHTML = searches.map(search => {
        const status = search.is_active ? 'active' : 'paused';
        const statusBadge = search.is_active
            ? '<span class="badge badge-active">Active</span>'
            : '<span class="badge badge-paused">Paused</span>';

        return `
            <div class="item-card">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                    <h3>${search.name}</h3>
                    ${statusBadge}
                </div>
                <p><strong>Keyword:</strong> <span>${search.keyword || 'All in category'}</span></p>
                <p><strong>Region:</strong> <span>${search.region_name}</span></p>
                <p><strong>Category:</strong> <span>${search.category || 'All'}</span></p>
                <p><strong>Webhook:</strong> <span>${search.webhook_name}</span></p>
                <p><strong>Interval:</strong> <span>${search.interval_minutes} min</span></p>
                <p><strong>Price:</strong> <span>${search.min_price ? '$' + search.min_price : 'Any'} - ${search.max_price ? '$' + search.max_price : 'Any'}</span></p>
                <p><strong>Radius:</strong> <span>${search.radius || 50} km</span></p>
                <p><strong>Duplicates:</strong> <span>${search.no_duplicates ? 'Ignored' : 'Allowed'}</span></p>
                <p><strong>Last Scan:</strong> <span>${search.last_scan ? new Date(search.last_scan).toLocaleString() : 'Never'}</span></p>
                <div class="item-actions">
                    <button class="btn btn-sm btn-secondary" onclick="openEditModal(${search.id})"  >Edit</button>
                    <button class="btn btn-sm ${search.is_active ? 'btn-secondary' : 'btn-success'}" onclick="toggleSearch(${search.id})">
                        ${search.is_active ? 'Pause' : 'Resume'}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSearch(${search.id})">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

async function toggleSearch(id) {
    try {
        const response = await fetch(`/api/searches/${id}/toggle`, { method: 'PATCH' });
        const result = await response.json();

        if (result.success) {
            showToast('Search status updated! Restart bot to apply changes.', 'success');
            loadSearches();
        } else {
            showToast('Error toggling search', 'error');
        }
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

async function deleteSearch(id) {
    if (!confirm('Are you sure you want to delete this search?')) return;

    try {
        const response = await fetch(`/api/searches/${id}`, { method: 'DELETE' });
        const result = await response.json();

        if (result.success) {
            showToast('Search deleted successfully!', 'success');
            loadSearches();
        } else {
            showToast('Error deleting search', 'error');
        }
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

// Edit Modal
async function openEditModal(id) {
    try {
        const response = await fetch('/api/searches');
        const result = await response.json();
        const search = result.data.find(s => s.id === id);

        if (!search) return;

        document.getElementById('editSearchId').value = search.id;
        document.getElementById('editSearchName').value = search.name;
        document.getElementById('editSearchKeyword').value = search.keyword || '';
        document.getElementById('editSearchInterval').value = search.interval_minutes;
        document.getElementById('editMinPrice').value = search.min_price || '';
        document.getElementById('editMaxPrice').value = search.max_price || '';
        document.getElementById('editSearchRadius').value = search.radius || 50;
        document.getElementById('editNoDuplicates').checked = search.no_duplicates;

        // Load dropdowns
        const [webhooksRes, regionsRes, categoriesRes] = await Promise.all([
            fetch('/api/webhooks'),
            fetch('/api/regions'),
            fetch('/api/categories')
        ]);

        const webhooks = (await webhooksRes.json()).data;
        const regions = (await regionsRes.json()).data;
        const categories = (await categoriesRes.json()).data;

        // Populate region dropdown
        const regionSelect = document.getElementById('editSearchRegion');
        regionSelect.innerHTML = regions.map(r =>
            `<option value="${r.id}" ${r.id === search.region_id ? 'selected' : ''}>${r.name}</option>`
        ).join('');

        // Populate webhook dropdown
        const webhookSelect = document.getElementById('editSearchWebhook');
        webhookSelect.innerHTML = webhooks.map(w =>
            `<option value="${w.id}" ${w.id === search.webhook_id ? 'selected' : ''}>${w.name}</option>`
        ).join('');

        // Populate category dropdown
        const categorySelect = document.getElementById('editSearchCategory');
        categorySelect.innerHTML = '<option value="">Choose a category...</option>';
        const categoryMap = {};
        const rootCategories = [];

        categories.forEach(cat => {
            categoryMap[cat.id] = { ...cat, children: [] };
        });

        categories.forEach(cat => {
            if (cat.parentId && categoryMap[cat.parentId]) {
                categoryMap[cat.parentId].children.push(categoryMap[cat.id]);
            } else {
                rootCategories.push(categoryMap[cat.id]);
            }
        });

        function addCategoryOption(category, level = 0) {
            const opt = document.createElement('option');
            opt.value = category.id;
            const indent = '  '.repeat(level);
            opt.textContent = indent + category.localizedName;
            if (category.id === search.category) {
                opt.selected = true;
            }
            if (level > 0) {
                opt.style.fontStyle = 'italic';
                opt.style.color = '#666';
            }
            categorySelect.appendChild(opt);
            category.children.forEach(child => addCategoryOption(child, level + 1));
        }

        rootCategories.forEach(cat => addCategoryOption(cat));

        document.getElementById('editModal').classList.add('active');
    } catch (error) {
        showToast('Error loading search details: ' + error.message, 'error');
    }
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
}

async function saveSearch() {
    const id = document.getElementById('editSearchId').value;
    const name = document.getElementById('editSearchName').value.trim();
    const keyword = document.getElementById('editSearchKeyword').value.trim();
    const regionId = document.getElementById('editSearchRegion').value;
    const webhookId = document.getElementById('editSearchWebhook').value;
    const intervalMinutes = document.getElementById('editSearchInterval').value;
    const minPrice = document.getElementById('editMinPrice').value;
    const maxPrice = document.getElementById('editMaxPrice').value;
    const category = document.getElementById('editSearchCategory').value;
    const noDuplicates = document.getElementById('editNoDuplicates').checked;
    const radius = document.getElementById('editSearchRadius').value;

    if (!name || !regionId || !webhookId || !intervalMinutes) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/searches/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name, keyword, regionId, webhookId, intervalMinutes,
                minPrice, maxPrice, category, noDuplicates, radius
            })
        });

        const result = await response.json();
        if (result.success) {
            showToast('Search updated! Restart bot to apply changes.', 'success');
            closeEditModal();
            loadSearches();
        } else {
            showToast('Error: ' + result.error, 'error');
        }
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

// Helper functions
function updateWebhookSelects(webhooks) {
    const selects = [document.getElementById('searchWebhook')];
    selects.forEach(select => {
        select.innerHTML = '<option value="">Select a webhook</option>' +
            webhooks.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
    });
}

function updateRegionSelects(regions) {
    const selects = [document.getElementById('searchRegion')];
    selects.forEach(select => {
        select.innerHTML = '<option value="">Select a region</option>' +
            regions.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
    });
}

async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        const result = await response.json();
        const categories = result.data;

        const select = document.getElementById('searchCategory');
        select.innerHTML = '<option value="">Choose a category...</option>';

        const categoryMap = {};
        const rootCategories = [];

        categories.forEach(cat => {
            categoryMap[cat.id] = { ...cat, children: [] };
        });

        categories.forEach(cat => {
            if (cat.parentId && categoryMap[cat.parentId]) {
                categoryMap[cat.parentId].children.push(categoryMap[cat.id]);
            } else {
                rootCategories.push(categoryMap[cat.id]);
            }
        });

        function addCategoryToSelect(category, level = 0) {
            const opt = document.createElement('option');
            opt.value = category.id;
            const indent = '  '.repeat(level);
            opt.textContent = indent + category.localizedName;
            if (level > 0) {
                opt.style.fontStyle = 'italic';
                opt.style.color = '#666';
            }
            select.appendChild(opt);
            category.children.forEach(child => addCategoryToSelect(child, level + 1));
        }

        rootCategories.forEach(cat => addCategoryToSelect(cat));
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Settings
async function purgeDatabase() {
    if (!confirm('Are you sure you want to clean the database? This will remove orphaned results and searches. This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch('/api/database/purge', { method: 'POST' });
        const result = await response.json();

        if (result.success) {
            showToast('Database cleaned successfully!', 'success');
        } else {
            showToast('Error: ' + result.error, 'error');
        }
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}
