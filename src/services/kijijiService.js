const axios = require('axios');

// Mapping of region names to Kijiji location codes
const REGION_CODES = {
    'Edmonton': 'l1700203',
    'Calgary': 'l1700199',
    'Toronto': 'l1700273',
    'Vancouver': 'l1700287',
    'Montreal': 'l1700281',
    'Ottawa': 'l1700185',
    'Winnipeg': 'l1700192',
    'Quebec City': 'l1700209',
    'Hamilton': 'l1700191',
    'Kitchener': 'l1700212',
    'London': 'l1700214',
    'Victoria': 'l1700173',
    'Halifax': 'l1700321',
    'Saskatoon': 'l1700197',
    'Regina': 'l1700196',
    "St. John's": 'l1700118'
};

// Mapping of category names to Kijiji category codes
const CATEGORY_CODES = {
    'b-cell-phone': 'c760',
    'b-electronics': 'c16',
    'b-cars-vehicles': 'c27',
    'b-real-estate': 'c34',
    'b-jobs': 'c45',
    'b-services': 'c4',
    'b-buy-sell': 'c10',
    'b-community': 'c1',
    'b-pets': 'c112',
    'b-furniture': 'c235',
    'b-bikes': 'c644',
    'b-boats-watercraft': 'c29',
    'b-books': 'c109',
    'b-clothing': 'c275',
    'b-computers': 'c16',
    'b-tickets': 'c141'
};

// Popular Canadian cities with coordinates for initial location fetching
const POPULAR_CITIES = [
    { name: 'Toronto', lat: 43.6532, lng: -79.3832 },
    { name: 'Montreal', lat: 45.5017, lng: -73.5673 },
    { name: 'Vancouver', lat: 49.2827, lng: -123.1207 },
    { name: 'Calgary', lat: 51.0447, lng: -114.0719 },
    { name: 'Edmonton', lat: 53.5461, lng: -113.4938 },
    { name: 'Ottawa', lat: 45.4215, lng: -75.6972 },
    { name: 'Winnipeg', lat: 49.8951, lng: -97.1384 },
    { name: 'Quebec City', lat: 46.8139, lng: -71.2080 },
    { name: 'Hamilton', lat: 43.2557, lng: -79.8711 },
    { name: 'Kitchener', lat: 43.4516, lng: -80.4925 },
    { name: 'London', lat: 42.9849, lng: -81.2453 },
    { name: 'Victoria', lat: 48.4284, lng: -123.3656 },
    { name: 'Halifax', lat: 44.6488, lng: -63.5752 },
    { name: 'Saskatoon', lat: 52.1332, lng: -106.6700 },
    { name: 'Regina', lat: 50.4452, lng: -104.6189 },
    { name: 'St. John\'s', lat: 47.5615, lng: -52.7126 }
];

class KijijiService {
    constructor() {
        this.baseURL = 'https://www.kijiji.ca/anvil/api';
        this.headers = {
            'accept': '*/*',
            'accept-language': 'en',
            'apollo-require-preflight': 'true',
            'cache-control': 'no-cache',
            'content-type': 'application/json',
            'dnt': '1',
            'origin': 'https://www.kijiji.ca',
            'pragma': 'no-cache',
            'priority': 'u=1, i',
            'sec-ch-ua': 'Microsoft Edge;v=137, Chromium;v=137, Not/A)Brand;v=24',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': 'Windows',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0',
            'x-experiments': 'KJCA4700=1;KJCA5475=-1;KJCA5002=-1;KJCA6480=1;KJCA5530=0;'
        };
        this.categories = [];
        this.regions = [];
        this.googleMapsKey = null;
    }

    async init() {
        console.log('🔄 Initializing Kijiji API data...');
        await this.fetchCategories();
        await this.fetchPopularRegions();
        await this.getGoogleMapsKey();
        console.log(`✅ Loaded ${this.categories.length} categories and ${this.regions.length} regions`);
    }

    async fetchCategories() {
        try {
            // First, get top-level categories
            const body = {
                operationName: 'getSearchCategories',
                variables: { locale: 'en-CA' },
                query: `query getSearchCategories($locale: String!) { 
                    searchCategories { 
                        id 
                        localizedName(locale: $locale) 
                        parentId 
                        __typename 
                    } 
                }`
            };
            const res = await axios.post(this.baseURL, body, { headers: this.headers });
            const topLevelCategories = res.data?.data?.searchCategories || [];
            
            // Now add subcategories for common categories we know exist
            const knownSubcategories = [
                { id: 760, localizedName: 'Cell Phones', parentId: 132, __typename: 'Category' },
                { id: 132, localizedName: 'Phones', parentId: 10, __typename: 'Category' },
                { id: 772, localizedName: 'Desktop Computers', parentId: 16, __typename: 'Category' },
                { id: 773, localizedName: 'Laptops', parentId: 16, __typename: 'Category' },
                { id: 774, localizedName: 'Tablets', parentId: 16, __typename: 'Category' },
                { id: 16, localizedName: 'Computers', parentId: 10, __typename: 'Category' },
                { id: 658, localizedName: 'Golf', parentId: 657, __typename: 'Category' },
                { id: 657, localizedName: 'Sports Equipment', parentId: 10, __typename: 'Category' },
                { id: 26, localizedName: 'Furniture', parentId: 10, __typename: 'Category' },
                { id: 235, localizedName: 'Home & Garden', parentId: 10, __typename: 'Category' },
                { id: 638, localizedName: 'Garage Sales', parentId: 10, __typename: 'Category' },
                { id: 12, localizedName: 'Art & Collectibles', parentId: 10, __typename: 'Category' },
                { id: 174, localizedName: 'Cars & Trucks', parentId: 27, __typename: 'Category' },
                { id: 320, localizedName: 'Tires & Rims', parentId: 27, __typename: 'Category' },
                { id: 332, localizedName: 'Other Boat & Watercraft', parentId: 29, __typename: 'Category' },
                { id: 336, localizedName: 'Powerboats & Motorboats', parentId: 29, __typename: 'Category' },
                { id: 29, localizedName: 'Boats & Watercraft', parentId: 27, __typename: 'Category' },
                { id: 37, localizedName: 'Apartments & Condos', parentId: 34, __typename: 'Category' },
                { id: 141, localizedName: 'Tickets', parentId: 10, __typename: 'Category' }
            ];
            
            // Combine top-level and known subcategories
            this.categories = [...topLevelCategories, ...knownSubcategories];
            
            console.log(`📂 Fetched ${this.categories.length} categories (${topLevelCategories.length} top-level + ${knownSubcategories.length} subcategories)`);
        } catch (e) {
            console.error('❌ Failed to fetch categories:', e.message);
        }
    }

    async fetchPopularRegions() {
        try {
            console.log('🌍 Loading popular regions...');
            const regions = [];
            
            // Use static region data that we know works
            POPULAR_CITIES.forEach((city, index) => {
                regions.push({
                    id: `region_${index}`,
                    displayName: city.name,
                    locationPaths: [
                        { id: `path_${index}`, name: city.name, __typename: 'LocationPath' }
                    ],
                    coordinates: { lat: city.lat, lng: city.lng },
                    __typename: 'Location'
                });
            });
            
            this.regions = regions;
            console.log(`🌍 Loaded ${regions.length} regions`);
        } catch (e) {
            console.error('❌ Failed to load regions:', e.message);
        }
    }

    async getGoogleMapsKey() {
        try {
            const body = {
                operationName: 'GetGoogleMapsKey',
                variables: {},
                query: `mutation GetGoogleMapsKey { getGoogleMapsKey }`
            };
            const res = await axios.post(this.baseURL, body, { headers: this.headers });
            this.googleMapsKey = res.data?.data?.getGoogleMapsKey;
            console.log('🗺️ Google Maps key fetched');
        } catch (e) {
            console.error('❌ Failed to fetch Google Maps key:', e.message);
        }
    }

    async getLocationFromCoordinates(latitude, longitude) {
        try {
            const body = {
                operationName: 'GetLocationFromCoordinates',
                variables: { 
                    coordinates: { latitude, longitude } 
                },
                query: `query GetLocationFromCoordinates($coordinates: LocationQueryCoordsOptions!) { 
                    locationFromCoordinates(coordinates: $coordinates) { 
                        location { 
                            id 
                            locationPaths { 
                                id 
                                name 
                                __typename 
                            } 
                            __typename 
                        } 
                        __typename 
                    } 
                }`
            };
            const res = await axios.post(this.baseURL, body, { headers: this.headers });
            return res.data?.data?.locationFromCoordinates?.location;
        } catch (e) {
            console.error(`❌ Failed to get location from coordinates (${latitude}, ${longitude}):`, e.message);
            return null;
        }
    }

    async getLocationFromPlace(placeId, sessionToken = null) {
        try {
            const body = {
                operationName: 'GetLocationFromPlace',
                variables: { 
                    placeId,
                    sessionToken 
                },
                query: `query GetLocationFromPlace($placeId: String!, $sessionToken: String) { 
                    locationFromPlace(placeId: $placeId, sessionToken: $sessionToken) { 
                        place { 
                            id 
                            address 
                            location { 
                                id 
                                locationPaths { 
                                    id 
                                    name 
                                    __typename 
                                } 
                                __typename 
                            } 
                            __typename 
                        } 
                        __typename 
                    } 
                }`
            };
            const res = await axios.post(this.baseURL, body, { headers: this.headers });
            return res.data?.data?.locationFromPlace?.place;
        } catch (e) {
            console.error(`❌ Failed to get location from place ID ${placeId}:`, e.message);
            return null;
        }
    }

    async searchLocationByName(query) {
        // This would require Google Places API integration
        // For now, we'll search through our cached regions
        const results = this.regions.filter(region => 
            region.displayName?.toLowerCase().includes(query.toLowerCase()) ||
            region.locationPaths?.some(path => 
                path.name?.toLowerCase().includes(query.toLowerCase())
            )
        );
        return results;
    }

    async fetchRegions() {
        try {
            const body = {
                operationName: 'GetGeocodeReverseFromIp',
                variables: {},
                query: `query GetGeocodeReverseFromIp { geocodeReverseFromIp { city province locationId __typename } }`
            };
            const res = await axios.post(this.baseURL, body, { headers: this.headers });
            // This only gets the current region; for all, you may need to scrape or use a static list
            this.regions = res.data?.data?.geocodeReverseFromIp ? [res.data.data.geocodeReverseFromIp] : [];
        } catch (e) {
            console.error('Failed to fetch regions:', e.message);
        }
    }



    async searchListings(searchUrl, limit = 40, offset = 0) {
        try {
            // Update referer header with the search URL
            this.headers.referer = searchUrl;

            const body = {
                "operationName": "GetSearchResultsPageByUrl",
                "variables": {
                    "searchResultsByUrlInput": {
                        "url": searchUrl,
                        "pagination": {
                            "limit": limit,
                            "offset": offset
                        }
                    },
                    "pagination": {
                        "limit": limit,
                        "offset": offset
                    }
                },
                "query": "query GetSearchResultsPageByUrl($searchResultsByUrlInput: SearchResultsByUrlInput!, $pagination: PaginationInputV2!) { searchResultsPageByUrl(input: $searchResultsByUrlInput) { results { mainListings(pagination: $pagination) { id title url description price { ... on AmountPrice { amount } } } } } }"
            };

            const response = await axios.post(this.baseURL, body, { headers: this.headers });
            
            const listings = response.data?.data?.searchResultsPageByUrl?.results?.mainListings || [];
            
            return {
                success: true,
                listings: listings.map(listing => ({
                    id: listing.id,
                    title: listing.title,
                    url: listing.url.startsWith('http') ? listing.url : `https://www.kijiji.ca${listing.url}`,
                    price: listing.price?.amount || null,
                    description: listing.description || ''
                })),
                total: listings.length
            };

        } catch (error) {
            console.error('Error fetching Kijiji listings:', error.message);
            return {
                success: false,
                error: error.message,
                listings: [],
                total: 0
            };
        }
    }

    buildSearchUrl(regionUrl, keyword, categoryId, radius = 50.0) {
        // Extract region from the regionUrl
        const url = new URL(regionUrl);
        const pathParts = url.pathname.split('/');
        let regionName = pathParts.find(part => part && !part.startsWith('b-') && !part.startsWith('k0')) || '';
        let regionCode = REGION_CODES[regionName.charAt(0).toUpperCase() + regionName.slice(1)] || 'l1700203';
        
        // Map category ID to category path and code
        const categoryMapping = {
            // Cars & Vehicles
            '27': { path: 'b-cars-vehicles', code: 'c27' },
            '174': { path: 'b-cars-trucks', code: 'c174' },
            '320': { path: 'b-tires-rims', code: 'c320' },
            // Buy & Sell
            '10': { path: 'b-buy-sell', code: 'c10' },
            '760': { path: 'b-cell-phone', code: 'c760' },
            '132': { path: 'b-phones', code: 'c132' },
            '16': { path: 'b-computers', code: 'c16' },
            '772': { path: 'b-desktop-computers', code: 'c772' },
            '773': { path: 'b-laptops', code: 'c773' },
            '774': { path: 'b-tablets', code: 'c774' },
            '26': { path: 'b-furniture', code: 'c26' },
            '235': { path: 'b-home-garden', code: 'c235' },
            '638': { path: 'b-garage-sales', code: 'c638' },
            '12': { path: 'b-art-collectibles', code: 'c12' },
            '141': { path: 'b-tickets', code: 'c141' },
            '657': { path: 'b-sports-equipment', code: 'c657' },
            '658': { path: 'b-golf', code: 'c658' },
            // Real Estate
            '34': { path: 'b-real-estate', code: 'c34' },
            '37': { path: 'b-apartments-condos', code: 'c37' },
            // Boats & Watercraft
            '29': { path: 'b-boats-watercraft', code: 'c29' },
            '332': { path: 'b-other-boat-watercraft', code: 'c332' },
            '336': { path: 'b-powerboats-motorboats', code: 'c336' }
        };

        const categoryInfo = categoryMapping[String(categoryId)] || { path: 'b-buy-sell', code: 'c10' };
        
        // Build the search URL
        let baseUrl = `https://www.kijiji.ca/${categoryInfo.path}/${regionName}`;
        let path = '';
        if (keyword && keyword.trim() !== '') {
            path = `/${encodeURIComponent(keyword)}/k0${categoryInfo.code}${regionCode}`;
        } else {
            path = `/${categoryInfo.code}${regionCode}`;
        }
        let query = `?address=${encodeURIComponent(regionName)}&radius=${radius}&sort=dateDesc&view=list`;
        return baseUrl + path + query;
    }
}

module.exports = KijijiService; 