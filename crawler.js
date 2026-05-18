const CRAWLER = {
  cacheKey: 'islamicAudioCache',
  cacheExpiry: 30 * 60 * 1000,
  collections: [],
  crawledData: [],

  init() {
    this.loadCache();
    this.collections = DATA.collections || [];
  },

  loadCache() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < this.cacheExpiry) {
          this.crawledData = parsed.data || [];
          return true;
        }
      }
    } catch (e) { console.warn('Cache load error:', e); }
    return false;
  },

  saveCache() {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data: this.crawledData
      }));
    } catch (e) { console.warn('Cache save error:', e); }
  },

  clearCache() {
    this.crawledData = [];
    localStorage.removeItem(this.cacheKey);
  },

  async crawlCollections(onProgress) {
    this.crawledData = [];
    const total = this.collections.length;

    for (let i = 0; i < total; i++) {
      const collection = this.collections[i];
      if (onProgress) onProgress(i, total, collection);

      try {
        const items = await this.crawlCollection(collection, 1);
        this.crawledData.push(...items);
      } catch (err) {
        console.warn(`Failed to crawl collection "${collection}":`, err);
      }

      if (onProgress) onProgress(i + 1, total, collection);
    }

    this.saveCache();
    return this.crawledData;
  },

  async crawlCollection(collectionId, maxPages = 5) {
    let allItems = [];

    for (let page = 1; page <= maxPages; page++) {
      try {
        const result = await API.getCollectionItems(collectionId, page);
        const docs = result?.docs || [];

        if (docs.length === 0) break;

        const validItems = docs.filter(item => API.isIslamicContent(item));
        allItems.push(...validItems);

        if (docs.length < 50) break;
      } catch (err) {
        console.warn(`Page ${page} error for ${collectionId}:`, err);
        break;
      }
    }

    return allItems;
  },

  async searchIslamicAudio(query) {
    const searchQuery = API.buildSearchQuery(query, null, null);
    try {
      const res = await API.search(searchQuery, { rows: 30 });
      return res?.docs || [];
    } catch (err) {
      console.error('Search error:', err);
      return [];
    }
  },

  async advancedSearch(keyword, sheikh, category) {
    const searchQuery = API.buildSearchQuery(keyword, sheikh, category);
    try {
      const res = await API.search(searchQuery, { rows: 30 });
      return res?.docs || [];
    } catch (err) {
      console.error('Advanced search error:', err);
      return [];
    }
  },

  searchBySheikh(sheikhName) {
    return this.advancedSearch(null, sheikhName, null);
  },

  searchByCategory(category) {
    return this.advancedSearch(null, null, category);
  },

  searchByKeyword(keyword) {
    return this.advancedSearch(keyword, null, null);
  },

  getCachedResults() {
    return this.crawledData;
  },

  formatDuration(seconds) {
    if (!seconds || seconds === '0') return '00:00';
    const s = parseInt(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
};
