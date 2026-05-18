const API = {
  BASE_URL: 'https://archive.org',
  SEARCH_URL: 'https://archive.org/advancedsearch.php',
  METADATA_URL: 'https://archive.org/metadata',
  DETAILS_URL: 'https://archive.org/details',
  PROXY: 'https://api.allorigins.win/raw?url=',
  CORS_PROXY: 'https://corsproxy.io/?url=',

  async search(query, params = {}) {
    const defaults = {
      q: query,
      'fl[]': ['identifier', 'title', 'creator', 'description', 'subject', 'date', 'downloads', 'avg_rating'],
      'sort[]': 'downloads desc',
      rows: 20,
      page: 1,
      output: 'json'
    };
    const searchParams = { ...defaults, ...params };
    const url = new URL(this.SEARCH_URL);
    Object.entries(searchParams).forEach(([key, val]) => {
      if (Array.isArray(val)) {
        val.forEach(v => url.searchParams.append(key, v));
      } else {
        url.searchParams.append(key, val);
      }
    });
    const targetUrl = url.toString();

    const proxiedUrl1 = this.CORS_PROXY + encodeURIComponent(targetUrl);
    const proxiedUrl2 = this.PROXY + encodeURIComponent(targetUrl);

    const attempts = [
      { url: targetUrl, label: 'direct' },
      { url: proxiedUrl1, label: 'corsproxy.io' },
      { url: proxiedUrl2, label: 'allorigins.win' }
    ];

    for (const attempt of attempts) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(attempt.url, { mode: 'cors', signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) {
          console.warn(`Search ${attempt.label}: HTTP ${res.status}`);
          continue;
        }
        const text = await res.text();
        const json = JSON.parse(text);
        const response = json.response || json;
        if (response?.docs) return response;
        if (response?.numFound !== undefined) return response;
      } catch (e) {
        clearTimeout(timeout);
        console.warn(`Search ${attempt.label} failed:`, e.message);
      }
    }

    console.error('All search methods failed for query:', query);
    return { docs: [], numFound: 0 };
  },

  async getCollectionItems(collectionId, page = 1, rows = 50) {
    const query = `collection:${collectionId} AND mediatype:(audio)`;
    return this.search(query, { page, rows, 'sort[]': 'downloads desc' });
  },

  async getItemMetadata(identifier) {
    const url = `${this.METADATA_URL}/${identifier}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(url, { mode: 'cors', signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (data && data.files) return data;
      }
    } catch (e) {
      clearTimeout(timeout);
      console.warn('Metadata direct fetch failed:', e.message);
    }

    for (const proxyUrl of [this.CORS_PROXY, this.PROXY]) {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 10000);
      try {
        const res = await fetch(proxyUrl + encodeURIComponent(url), { mode: 'cors', signal: ctrl.signal });
        clearTimeout(to);
        if (res.ok) {
          const text = await res.text();
          const data = JSON.parse(text);
          if (data && data.files) return data;
        }
      } catch (e) {
        clearTimeout(to);
        console.warn(`Metadata proxy (${proxyUrl}) failed:`, e.message);
      }
    }

    console.error('All metadata methods failed for:', identifier);
    return { files: [] };
  },

  filterAudioFiles(files, identifier) {
    const mp3Files = files.filter(f => {
      const name = (f.name || '').toLowerCase();
      const format = (f.format || '').toLowerCase();
      const isMp3 = format.includes('mp3') || name.endsWith('.mp3');
      const isInvalid = name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') ||
                        name.endsWith('.gif') || name.endsWith('.pdf') || name.endsWith('.txt') ||
                        name.endsWith('.yml') || name.endsWith('.json') || name.endsWith('.xml') ||
                        name.endsWith('.csv') || name.endsWith('.svg') || name.startsWith('.') ||
                        name.includes('thumbs') || name.includes('screenshots') || name.includes('_folder');
      return isMp3 && !isInvalid;
    });

    return mp3Files.map(f => ({
      name: f.name,
      title: f.title || f.name?.replace(/\.mp3$/i, '').replace(/[-_]/g, ' ').trim(),
      format: f.format,
      size: f.size,
      length: f.length || f.duration || '0',
      track: f.track || null,
      source: identifier || f.source || '',
      url: `https://archive.org/download/${identifier || f.source || ''}/${f.name}`,
      downloadUrl: `https://archive.org/download/${identifier || f.source || ''}/${f.name}`
    }));
  },

  async getItemFiles(identifier) {
    try {
      const data = await this.getItemMetadata(identifier);
      const totalFiles = (data.files || []).length;
      const mp3Files = this.filterAudioFiles(data.files || [], identifier);
      console.log(`getItemFiles(${identifier}): ${totalFiles} total files, ${mp3Files.length} MP3`);
      if (totalFiles > 0 && mp3Files.length === 0) {
        console.log('Sample files:', data.files.slice(0, 3).map(f => ({ name: f.name, format: f.format, title: f.title })));
      }
      return mp3Files;
    } catch (err) {
      console.error('API Files Error:', err);
      return [];
    }
  },

  buildSearchQuery(keyword, sheikh, category) {
    let parts = ['mediatype:(audio)'];

    if (keyword) {
      const escaped = keyword.replace(/"/g, '\\"');
      parts.push(`(title:(${escaped}) OR creator:(${escaped}))`);
    }
    if (sheikh) {
      const escaped = sheikh.replace(/"/g, '\\"');
      parts.push(`creator:("${escaped}")`);
    }
    if (category) {
      const escaped = category.replace(/"/g, '\\"');
      parts.push(`subject:("${escaped}")`);
    }

    parts.push('-mediatype:(movies) -mediatype:(video)');
    return parts.join(' AND ');
  },

  cleanLegacyParams(params = {}) {
    const cleaned = { ...params };
    delete cleaned._hasMP3;
    delete cleaned._mp3Count;
    delete cleaned._mp3Files;
    return cleaned;
  }
};
