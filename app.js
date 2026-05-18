const DATA = {
  keywords: [],
  sheikhs: [],
  categories: [],
  collections: [],

  async load() {
    try {
      const res = await fetch('keywords.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      this.keywords = data.keywords || [];
      this.sheikhs = data.sheikhs || [];
      this.categories = data.categories || [];
      this.collections = data.archiveCollections || [];
    } catch (err) {
      console.warn('Failed to load keywords.json, using defaults');
      this.keywords = ['قرآن', 'محاضرة', 'درس'];
      this.sheikhs = ['مشاري العفاسي', 'عبد الباسط عبد الصمد'];
      this.categories = ['القرآن الكريم', 'المحاضرات'];
      this.collections = ['islamic_audio'];
    }
  }
};

const APP = {
  currentPage: 'home',
  searchResults: [],
  currentPageNum: 1,
  totalResults: 0,
  resultsPerPage: 12,
  isLoading: false,
  currentPlaylistIdentifier: null,
  currentPlaylistFiles: [],

  elements: {},

  async init() {
    await DATA.load();
    this.cacheElements();
    this.populateSelects();
    this.bindEvents();
    this.setupScrollAnimations();
    this.setupAdminTabs();
    this.renderAdminTables();
    PLAYER.init();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('q')) {
      document.getElementById('searchInput').value = urlParams.get('q');
      this.performSearch(urlParams.get('q'));
    }
  },

  cacheElements() {
    this.elements = {
      searchInput: document.getElementById('searchInput'),
      searchBtn: document.getElementById('searchBtn'),
      resetBtn: document.getElementById('resetSearch'),
      advancedToggle: document.getElementById('advancedToggle'),
      advancedPanel: document.getElementById('advancedPanel'),
      sheikhSelect: document.getElementById('sheikhSelect'),
      categorySelect: document.getElementById('categorySelect'),
      advancedSearchBtn: document.getElementById('advancedSearchBtn'),
      resultsContainer: document.getElementById('resultsContainer'),
      resultsInfo: document.getElementById('resultsInfo'),
      resultCount: document.getElementById('resultCount'),
      countNum: document.getElementById('countNum'),
      paginationWrapper: document.getElementById('paginationWrapper'),
      pagination: document.getElementById('pagination'),
      errorMsg: document.getElementById('errorMsg'),
      errorText: document.getElementById('errorText'),
      themeToggle: document.getElementById('themeToggle'),
      navLinks: document.querySelectorAll('[data-page]'),
      homePage: document.getElementById('homePage'),
      resultsSection: document.getElementById('resultsSection'),
      keywordsPage: document.getElementById('keywordsPage'),
      favoritesPage: document.getElementById('favoritesPage'),
      favoritesContainer: document.getElementById('favoritesContainer'),
      favoritesEmpty: document.getElementById('favoritesEmpty'),
      manualPage: document.getElementById('manualPage'),
      aboutPage: document.getElementById('aboutPage'),
      playlistModal: document.getElementById('playlistModal'),
      playlistModalTitle: document.getElementById('playlistModalTitle'),
      playlistTracks: document.getElementById('playlistTracks'),
      playlistSearch: document.getElementById('playlistSearch'),
      playlistTotalInfo: document.getElementById('playlistTotalInfo'),
      adminType: document.getElementById('adminType'),
      adminValue: document.getElementById('adminValue'),
      adminAddBtn: document.getElementById('adminAddBtn'),
      adminSearch: document.getElementById('adminSearch'),
      keywordsTableBody: document.getElementById('keywordsTableBody'),
      sheikhsTableBody: document.getElementById('sheikhsTableBody'),
      categoriesTableBody: document.getElementById('categoriesTableBody'),
      exportJsonBtn: document.getElementById('exportJsonBtn'),
      importJsonBtn: document.getElementById('importJsonBtn'),
      importFileInput: document.getElementById('importFileInput'),
      resetDataBtn: document.getElementById('resetDataBtn')
    };
  },

  populateSelects() {
    const sheikhSelect = this.elements.sheikhSelect;
    const categorySelect = this.elements.categorySelect;

    DATA.sheikhs.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      sheikhSelect.appendChild(opt);
    });

    DATA.categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      categorySelect.appendChild(opt);
    });

    sheikhSelect.addEventListener('change', () => {
      if (sheikhSelect.value) {
        categorySelect.disabled = true;
        categorySelect.value = '';
      } else {
        categorySelect.disabled = false;
      }
    });

    categorySelect.addEventListener('change', () => {
      if (categorySelect.value) {
        sheikhSelect.disabled = true;
        sheikhSelect.value = '';
      } else {
        sheikhSelect.disabled = false;
      }
    });
  },

  bindEvents() {
    this.elements.searchBtn.addEventListener('click', () => {
      const q = this.elements.searchInput.value.trim();
      if (q) this.performSearch(q);
      else this.showError('يرجى إدخال كلمة للبحث');
    });

    this.elements.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = this.elements.searchInput.value.trim();
        if (q) this.performSearch(q);
        else this.showError('يرجى إدخال كلمة للبحث');
      }
    });

    this.elements.resetBtn.addEventListener('click', () => this.resetSearch());

    this.elements.advancedToggle.addEventListener('click', () => {
      this.elements.advancedPanel.classList.toggle('show');
    });

    this.elements.advancedSearchBtn.addEventListener('click', () => {
      const sheikh = this.elements.sheikhSelect.value;
      const category = this.elements.categorySelect.value;
      if (!sheikh && !category) {
        this.showError('يرجى اختيار شيخ أو تصنيف للبحث المتقدم');
        return;
      }
      this.performAdvancedSearch(sheikh, category);
    });

    this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());

    this.elements.navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        if (page) this.navigateTo(page);
      });
    });

    this.elements.adminAddBtn.addEventListener('click', () => this.addAdminItem());
    this.elements.adminSearch.addEventListener('input', () => this.renderAdminTables());
    this.elements.exportJsonBtn.addEventListener('click', () => this.exportJSON());
    this.elements.importJsonBtn.addEventListener('click', () => this.elements.importFileInput.click());
    this.elements.importFileInput.addEventListener('change', (e) => this.importJSON(e));
    this.elements.resetDataBtn.addEventListener('click', () => this.resetData());

    this.elements.playlistSearch.addEventListener('input', () => this.renderPlaylistTracks());

    document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

    window.addEventListener('scroll', () => {
      const nav = document.getElementById('mainNav');
      nav.classList.toggle('scrolled', window.scrollY > 50);
    });
  },

  toggleTheme() {
    const body = document.body;
    body.classList.toggle('light-mode');
    const icon = this.elements.themeToggle.querySelector('i');
    if (body.classList.contains('light-mode')) {
      icon.className = 'fas fa-sun';
      localStorage.setItem('theme', 'light');
    } else {
      icon.className = 'fas fa-moon';
      localStorage.setItem('theme', 'dark');
    }
  },

  navigateTo(page) {
    this.currentPage = page;

    this.elements.navLinks.forEach(l => l.classList.remove('active'));
    document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

    this.elements.homePage.style.display = page === 'home' ? '' : 'none';
    this.elements.resultsSection.style.display = page === 'home' ? '' : 'none';
    this.elements.favoritesPage.style.display = page === 'favorites' ? '' : 'none';
    this.elements.keywordsPage.style.display = page === 'keywords' ? '' : 'none';
    this.elements.manualPage.style.display = page === 'manual' ? '' : 'none';
    this.elements.aboutPage.style.display = page === 'about' ? '' : 'none';

    if (page === 'home') {
      document.querySelector('.search-section').style.display = '';
    } else {
      document.querySelector('.search-section').style.display = 'none';
    }

    if (page === 'favorites') {
      this.renderFavorites();
    }

    if (page === 'keywords') {
      this.renderAdminTables();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  async performSearch(query) {
    this.hideError();
    this.isLoading = true;
    this.currentPageNum = 1;
    this.showLoadingSkeletons();

    try {
      const results = await CRAWLER.searchByKeyword(query);
      this.searchResults = results;
      this.totalResults = results.length;
      this.renderResults();
      this.updateHistory(query);
    } catch (err) {
      console.error('Search failed:', err);
      this.showError('حدث خطأ في البحث. يرجى المحاولة مرة أخرى.');
      this.elements.resultsContainer.innerHTML = '';
    }

    this.isLoading = false;
  },

  async performAdvancedSearch(sheikh, category) {
    this.hideError();
    this.isLoading = true;
    this.currentPageNum = 1;
    this.showLoadingSkeletons();

    try {
      const results = await CRAWLER.advancedSearch(null, sheikh, category);
      this.searchResults = results;
      this.totalResults = results.length;
      this.renderResults();
    } catch (err) {
      console.error('Advanced search failed:', err);
      this.showError('حدث خطأ في البحث المتقدم');
      this.elements.resultsContainer.innerHTML = '';
    }

    this.isLoading = false;
  },

  renderResults() {
    const container = this.elements.resultsContainer;
    container.innerHTML = '';

    if (this.searchResults.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fas fa-search"></i></div>
          <h4>لا توجد نتائج</h4>
          <p>لم يتم العثور على نتائج. يرجى تجربة كلمات بحث مختلفة.</p>
        </div>
      `;
      this.elements.resultCount.style.display = 'none';
      this.elements.paginationWrapper.style.display = 'none';
      this.elements.resultsInfo.textContent = 'لم يتم العثور على نتائج';
      return;
    }

    this.elements.resultCount.style.display = 'inline-flex';
    this.elements.countNum.textContent = this.totalResults;
    this.elements.resultsInfo.textContent = `تم العثور على ${this.totalResults} نتيجة`;

    const startIdx = (this.currentPageNum - 1) * this.resultsPerPage;
    const endIdx = Math.min(startIdx + this.resultsPerPage, this.searchResults.length);
    const pageItems = this.searchResults.slice(startIdx, endIdx);

    pageItems.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'col-md-6 col-lg-4 slide-up';
      card.style.animationDelay = `${idx * 0.05}s`;

      const title = item.title || 'بدون عنوان';
      const creator = item.creator || 'شيخ غير معروف';
      const identifier = item.identifier || '';
      const description = (item.description || '').substring(0, 120);
      const subjects = Array.isArray(item.subject) ? item.subject : (item.subject ? [item.subject] : []);
      const date = item.date || '';
      const downloads = item.downloads || 0;

      const badges = subjects.slice(0, 3).map(s =>
        `<span class="badge">${s}</span>`
      ).join('');

      card.innerHTML = `
        <div class="result-card">
          <div class="result-card-img-placeholder">
            <i class="fas fa-headphones"></i>
          </div>
          <div class="result-card-body">
            <div class="result-card-title">${this.escapeHtml(title)}</div>
            <div class="result-card-sheikh"><i class="fas fa-microphone"></i> ${this.escapeHtml(creator)}</div>
            <div class="result-card-desc">${this.escapeHtml(description)}</div>
            <div class="result-card-meta">
              ${badges}
              <span class="badge gold"><i class="fas fa-download"></i> ${this.formatNumber(downloads)}</span>
            </div>
            <div class="result-card-actions">
              <button class="btn btn-play" data-identifier="${identifier}"><i class="fas fa-play"></i> استمع الآن</button>
              <button class="btn btn-playlist" data-identifier="${identifier}"><i class="fas fa-list"></i> القائمة</button>
            </div>
          </div>
        </div>
      `;

      container.appendChild(card);
    });

    this.renderPagination();
    this.observeAnimations();
    this.bindResultButtons();
  },

  renderFavorites() {
    const container = this.elements.favoritesContainer;
    const favs = PLAYER.favorites || [];

    container.innerHTML = '';

    if (favs.length === 0) {
      container.innerHTML = `
        <div class="col-12">
          <div class="empty-state">
            <div class="empty-state-icon"><i class="far fa-heart"></i></div>
            <h4>المفضلة فارغة</h4>
            <p>أضف مقاطع إلى المفضلة بالضغط على أيقونة القلب أثناء الاستماع</p>
          </div>
        </div>`;
      return;
    }

    favs.forEach((fav, idx) => {
      const col = document.createElement('div');
      col.className = 'col-12 slide-up';
      col.style.animationDelay = `${idx * 0.05}s`;

      col.innerHTML = `
        <div class="fav-card">
          <div class="fav-card-icon"><i class="fas fa-headphones"></i></div>
          <div class="fav-card-info">
            <div class="fav-card-title">${this.escapeHtml(fav.title || 'غير معروف')}</div>
            <div class="fav-card-creator"><i class="fas fa-microphone ms-1"></i>${this.escapeHtml(fav.creator || 'غير معروف')}</div>
          </div>
          <div class="fav-card-actions">
            <button class="fav-play-btn" data-url="${this.escapeHtml(fav.url)}" title="تشغيل"><i class="fas fa-play"></i></button>
            <button class="fav-remove-btn" data-url="${this.escapeHtml(fav.url)}" title="حذف"><i class="fas fa-trash"></i></button>
          </div>
        </div>`;
      container.appendChild(col);
    });

    container.querySelectorAll('.fav-play-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.dataset.url;
        const track = PLAYER.favorites.find(f => f.url === url);
        if (track) {
          const trackWithUrl = { ...track, name: track.title || 'audio', url: track.url };
          PLAYER.playTrack(trackWithUrl, PLAYER.favorites.map(f => ({ ...f, name: f.title || 'audio', url: f.url })));
          APP.showToast(`جاري تشغيل: ${track.title}`, 'success');
        }
      });
    });

    container.querySelectorAll('.fav-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.dataset.url;
        const idx = PLAYER.favorites.findIndex(f => f.url === url);
        if (idx >= 0) {
          PLAYER.favorites.splice(idx, 1);
          PLAYER.saveState();
          this.renderFavorites();
          this.showToast('تمت إزالتها من المفضلة', 'info');
        }
      });
    });

    this.observeAnimations();
  },

  bindResultButtons() {
    document.querySelectorAll('.btn-play').forEach(btn => {
      btn.addEventListener('click', async () => {
        const identifier = btn.dataset.identifier;
        await this.playCollection(identifier);
      });
    });

    document.querySelectorAll('.btn-playlist').forEach(btn => {
      btn.addEventListener('click', async () => {
        const identifier = btn.dataset.identifier;
        await this.openPlaylist(identifier);
      });
    });
  },

  async playCollection(identifier) {
    try {
      const files = await API.getItemFiles(identifier);
      if (files.length === 0) {
        this.showToast('لا توجد ملفات صوتية متاحة', 'error');
        return;
      }

      const item = this.searchResults.find(r => r.identifier === identifier) || {};
      const playlist = files.map(f => ({
        ...f,
        title: f.title || f.name,
        creator: item.creator || 'غير معروف',
        image: `https://archive.org/services/img/${identifier}`
      }));

      PLAYER.playTrack(playlist[0], playlist);
      this.showToast(`جاري تشغيل: ${playlist[0].title}`, 'success');
    } catch (err) {
      console.error('Play error:', err);
      this.showToast('فشل في تحميل الملفات', 'error');
    }
  },

  async openPlaylist(identifier) {
    try {
      this.currentPlaylistIdentifier = identifier;
      const files = await API.getItemFiles(identifier);
      const item = this.searchResults.find(r => r.identifier === identifier) || {};

      if (files.length === 0) {
        this.showToast('لم يتم العثور على ملفات MP3 في هذه المجموعة', 'error');
        return;
      }

      this.currentPlaylistFiles = files.map((f, i) => ({
        ...f,
        index: i + 1,
        title: f.title || f.name,
        creator: item.creator || 'غير معروف',
        identifier: identifier,
        sheikh: item.creator || 'غير معروف'
      }));

      this.elements.playlistModalTitle.textContent = `قائمة التشغيل: ${item.title || identifier}`;
      this.renderPlaylistTracks();

      const modal = new bootstrap.Modal(this.elements.playlistModal);
      modal.show();
    } catch (err) {
      console.error('Playlist error:', err);
      this.showToast('فشل في تحميل قائمة التشغيل', 'error');
    }
  },

  renderPlaylistTracks() {
    const container = this.elements.playlistTracks;
    const search = this.elements.playlistSearch.value.trim().toLowerCase();
    let files = this.currentPlaylistFiles;

    if (search) {
      files = files.filter(f =>
        (f.title || '').toLowerCase().includes(search) ||
        (f.creator || '').toLowerCase().includes(search)
      );
    }

    this.elements.playlistTotalInfo.textContent = `${files.length} مقطع`;

    if (files.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>لا توجد مقاطع تطابق بحثك</p>
        </div>`;
      return;
    }

    container.innerHTML = files.map((f, idx) => `
      <div class="playlist-track ${PLAYER.currentTrack?.url === f.url ? 'active' : ''}" data-index="${idx}">
        <div class="playlist-track-number">${f.index}</div>
        <div class="playlist-track-info">
          <div class="playlist-track-title">${this.escapeHtml(f.title)}</div>
          <div class="playlist-track-duration">${CRAWLER.formatDuration(f.length)}</div>
        </div>
        <div class="playlist-track-actions">
          <button class="play-this" title="تشغيل"><i class="fas fa-play"></i></button>
          <button class="fav-this" title="مفضلة"><i class="far fa-heart"></i></button>
          <button class="dl-this" title="تحميل"><i class="fas fa-download"></i></button>
          <button class="share-this" title="مشاركة"><i class="fas fa-share-alt"></i></button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.play-this').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        const track = files[idx];
        const playlist = files.map(f => ({
          ...f,
          title: f.title || f.name,
          creator: f.creator || f.sheikh,
          image: `https://archive.org/services/img/${this.currentPlaylistIdentifier}`
        }));
        PLAYER.playTrack(track, playlist);
      });
    });

    container.querySelectorAll('.fav-this').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        const track = files[idx];
        const isFav = PLAYER.favorites.some(f => f.url === track.url);
        if (isFav) {
          const fi = PLAYER.favorites.findIndex(f => f.url === track.url);
          PLAYER.favorites.splice(fi, 1);
          this.showToast('تمت إزالتها من المفضلة', 'info');
        } else {
          PLAYER.favorites.push({
            url: track.url,
            title: track.title || track.name,
            creator: track.creator || track.sheikh
          });
          this.showToast('تمت الإضافة إلى المفضلة', 'success');
        }
        PLAYER.saveState();
      });
    });

    container.querySelectorAll('.dl-this').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = files[idx].url;
        a.download = files[idx].name || 'audio.mp3';
        a.click();
      });
    });

    container.querySelectorAll('.share-this').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        if (navigator.share) {
          navigator.share({ title: files[idx].title, url: files[idx].url }).catch(() => {});
        } else {
          navigator.clipboard.writeText(files[idx].url).then(() => {
            this.showToast('تم نسخ الرابط', 'success');
          });
        }
      });
    });
  },

  renderPagination() {
    const wrapper = this.elements.paginationWrapper;
    const pagination = this.elements.pagination;
    const totalPages = Math.ceil(this.totalResults / this.resultsPerPage);

    if (totalPages <= 1) {
      wrapper.style.display = 'none';
      return;
    }

    wrapper.style.display = 'block';
    pagination.innerHTML = '';

    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${this.currentPageNum <= 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = '<button class="page-link"><i class="fas fa-chevron-right"></i></button>';
    prevLi.addEventListener('click', () => {
      if (this.currentPageNum > 1) {
        this.currentPageNum--;
        this.renderResults();
        document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
      }
    });
    pagination.appendChild(prevLi);

    const startP = Math.max(1, this.currentPageNum - 2);
    const endP = Math.min(totalPages, this.currentPageNum + 2);
    for (let i = startP; i <= endP; i++) {
      const li = document.createElement('li');
      li.className = `page-item ${i === this.currentPageNum ? 'active' : ''}`;
      li.innerHTML = `<button class="page-link">${i}</button>`;
      li.addEventListener('click', () => {
        this.currentPageNum = i;
        this.renderResults();
        document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
      });
      pagination.appendChild(li);
    }

    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${this.currentPageNum >= totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = '<button class="page-link"><i class="fas fa-chevron-left"></i></button>';
    nextLi.addEventListener('click', () => {
      if (this.currentPageNum < totalPages) {
        this.currentPageNum++;
        this.renderResults();
        document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
      }
    });
    pagination.appendChild(nextLi);
  },

  showLoadingSkeletons() {
    const container = this.elements.resultsContainer;
    container.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const col = document.createElement('div');
      col.className = 'col-md-6 col-lg-4';
      col.innerHTML = `
        <div class="skeleton-card">
          <div class="skeleton skeleton-img"></div>
          <div class="skeleton-body">
            <div class="skeleton skeleton-line"></div>
            <div class="skeleton skeleton-line" style="width: 70%;"></div>
            <div class="skeleton skeleton-line" style="width: 50%;"></div>
            <div class="skeleton skeleton-line" style="width: 90%;"></div>
          </div>
        </div>
      `;
      container.appendChild(col);
    }
  },

  resetSearch() {
    this.elements.searchInput.value = '';
    this.elements.sheikhSelect.value = '';
    this.elements.categorySelect.value = '';
    this.elements.sheikhSelect.disabled = false;
    this.elements.categorySelect.disabled = false;
    this.elements.resultsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i class="fas fa-mosque"></i></div>
        <h4>ابدأ البحث</h4>
        <p>استخدم مربع البحث أعلاه لاكتشاف المحتوى الإسلامي</p>
      </div>
    `;
    this.elements.resultCount.style.display = 'none';
    this.elements.paginationWrapper.style.display = 'none';
    this.elements.resultsInfo.textContent = 'ابدأ البحث لاكتشاف المحتوى الإسلامي';
    this.hideError();
    this.searchResults = [];
  },

  showError(msg) {
    this.elements.errorText.textContent = msg;
    this.elements.errorMsg.classList.add('show');
  },

  hideError() {
    this.elements.errorMsg.classList.remove('show');
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    const toast = document.createElement('div');
    toast.className = `toast-custom ${type}`;
    toast.innerHTML = `
      <div class="toast-icon"><i class="fas ${icons[type] || icons.info}"></i></div>
      <div class="toast-msg">${message}</div>
      <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  updateHistory(query) {
    try {
      const url = new URL(window.location);
      url.searchParams.set('q', query);
      window.history.replaceState({}, '', url);
    } catch (e) {}
  },

  setupScrollAnimations() {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      document.querySelectorAll('.slide-up').forEach(el => observer.observe(el));
    }
  },

  observeAnimations() {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      document.querySelectorAll('.slide-up').forEach(el => observer.observe(el));
    }
  },

  setupAdminTabs() {
    document.querySelectorAll('#adminTabs .tab-link').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#adminTabs .tab-link').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content-custom .tab-pane').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab)?.classList.add('active');
      });
    });
  },

  renderAdminTables() {
    const search = (this.elements.adminSearch?.value || '').trim().toLowerCase();

    this.renderTable(this.elements.keywordsTableBody, DATA.keywords, search);
    this.renderTable(this.elements.sheikhsTableBody, DATA.sheikhs, search);
    this.renderTable(this.elements.categoriesTableBody, DATA.categories, search);
  },

  renderTable(tbody, data, search) {
    const filtered = search ? data.filter(item => item.toLowerCase().includes(search)) : data;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-center" style="color: var(--text-muted);">لا توجد بيانات</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map((item, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${this.escapeHtml(item)}</td>
        <td>
          <button class="btn btn-sm btn-admin-edit" onclick="APP.editAdminItem('${this.escapeHtml(item)}')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-admin-delete" onclick="APP.deleteAdminItem('${this.escapeHtml(item)}')">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  },

  addAdminItem() {
    const type = this.elements.adminType.value;
    const value = this.elements.adminValue.value.trim();
    if (!value) {
      this.showToast('يرجى إدخال قيمة', 'error');
      return;
    }

    let arr;
    if (type === 'keyword') arr = DATA.keywords;
    else if (type === 'sheikh') arr = DATA.sheikhs;
    else arr = DATA.categories;

    if (arr.includes(value)) {
      this.showToast('القيمة موجودة بالفعل', 'error');
      return;
    }

    arr.push(value);
    this.elements.adminValue.value = '';
    this.renderAdminTables();
    this.showToast(`تمت إضافة "${value}" بنجاح`, 'success');

    if (type === 'sheikh') this.updateSheikhSelect();
    if (type === 'category') this.updateCategorySelect();
  },

  editAdminItem(value) {
    const newVal = prompt('تعديل القيمة:', value);
    if (!newVal || newVal === value) return;

    for (const arr of [DATA.keywords, DATA.sheikhs, DATA.categories]) {
      const idx = arr.indexOf(value);
      if (idx >= 0) {
        arr[idx] = newVal;
        break;
      }
    }

    this.renderAdminTables();
    this.updateSheikhSelect();
    this.updateCategorySelect();
    this.showToast('تم التعديل بنجاح', 'success');
  },

  deleteAdminItem(value) {
    if (!confirm(`هل تريد حذف "${value}"؟`)) return;

    for (const arr of [DATA.keywords, DATA.sheikhs, DATA.categories]) {
      const idx = arr.indexOf(value);
      if (idx >= 0) {
        arr.splice(idx, 1);
        break;
      }
    }

    this.renderAdminTables();
    this.updateSheikhSelect();
    this.updateCategorySelect();
    this.showToast(`تم حذف "${value}"`, 'info');
  },

  updateSheikhSelect() {
    const select = this.elements.sheikhSelect;
    const val = select.value;
    select.innerHTML = '<option value="">-- اختر الشيخ --</option>';
    DATA.sheikhs.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      if (s === val) opt.selected = true;
      select.appendChild(opt);
    });
  },

  updateCategorySelect() {
    const select = this.elements.categorySelect;
    const val = select.value;
    select.innerHTML = '<option value="">-- اختر التصنيف --</option>';
    DATA.categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      if (c === val) opt.selected = true;
      select.appendChild(opt);
    });
  },

  exportJSON() {
    const data = {
      keywords: DATA.keywords,
      sheikhs: DATA.sheikhs,
      categories: DATA.categories,
      collections: DATA.collections,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'keywords_backup.json';
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('تم تصدير البيانات بنجاح', 'success');
  },

  importJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.keywords) DATA.keywords = data.keywords;
        if (data.sheikhs) DATA.sheikhs = data.sheikhs;
        if (data.categories) DATA.categories = data.categories;
        if (data.collections) DATA.collections = data.collections;
        this.renderAdminTables();
        this.updateSheikhSelect();
        this.updateCategorySelect();
        this.showToast('تم استيراد البيانات بنجاح', 'success');
      } catch (err) {
        this.showToast('فشل استيراد الملف. تأكد من صيغة JSON', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  },

  resetData() {
    if (!confirm('هل تريد إعادة تعيين جميع البيانات إلى الإعدادات الافتراضية؟')) return;
    DATA.load().then(() => {
      this.renderAdminTables();
      this.updateSheikhSelect();
      this.updateCategorySelect();
      this.showToast('تم إعادة تعيين البيانات', 'info');
    });
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  }
};

function toggleFaq(el) {
  el.classList.toggle('open');
  const answer = el.nextElementSibling;
  answer.classList.toggle('open');
}

document.addEventListener('DOMContentLoaded', () => APP.init());
