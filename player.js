const PLAYER = {
  audio: null,
  currentTrack: null,
  playlist: [],
  playlistIndex: -1,
  isShuffled: false,
  isRepeating: false,
  isMinimized: false,
  isVisible: false,
  playbackSpeed: 1,
  volume: 0.7,
  shuffledOrder: [],

  elements: {},
  favorites: [],

  init() {
    this.audio = new Audio();
    this.cacheElements();
    this.loadState();
    this.bindEvents();
    this.visualize();
  },

  cacheElements() {
    this.elements = {
      player: document.getElementById('audioPlayer'),
      playBtn: document.getElementById('playBtn'),
      playIcon: document.getElementById('playIcon'),
      prevBtn: document.getElementById('prevBtn'),
      nextBtn: document.getElementById('nextBtn'),
      shuffleBtn: document.getElementById('shuffleBtn'),
      repeatBtn: document.getElementById('repeatBtn'),
      volumeBtn: document.getElementById('volumeBtn'),
      volumeIcon: document.getElementById('volumeIcon'),
      progressTrack: document.getElementById('progressTrack'),
      progressFill: document.getElementById('progressFill'),
      volumeSlider: document.getElementById('volumeSlider'),
      volumeFill: document.getElementById('volumeFill'),
      currentTime: document.getElementById('currentTime'),
      totalTime: document.getElementById('totalTime'),
      trackName: document.getElementById('playerTrackName'),
      trackArtist: document.getElementById('playerTrackArtist'),
      trackImg: document.getElementById('playerTrackImg'),
      speedBtn: document.getElementById('speedBtn'),
      favoriteBtn: document.getElementById('favoriteBtn'),
      downloadBtn: document.getElementById('downloadBtn'),
      shareBtn: document.getElementById('shareBtn'),
      minimizeBtn: document.getElementById('minimizeBtn'),
      visualizer: document.getElementById('visualizer')
    };
  },

  bindEvents() {
    this.audio.addEventListener('timeupdate', () => this.onTimeUpdate());
    this.audio.addEventListener('loadedmetadata', () => this.onLoadedMetadata());
    this.audio.addEventListener('ended', () => this.onTrackEnd());
    this.audio.addEventListener('play', () => this.onPlay());
    this.audio.addEventListener('pause', () => this.onPause());

    this.elements.playBtn.addEventListener('click', () => this.togglePlay());
    this.elements.prevBtn.addEventListener('click', () => this.prev());
    this.elements.nextBtn.addEventListener('click', () => this.next());
    this.elements.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
    this.elements.repeatBtn.addEventListener('click', () => this.toggleRepeat());
    this.elements.volumeBtn.addEventListener('click', () => this.toggleMute());

    this.elements.progressTrack.addEventListener('click', (e) => this.seek(e));
    this.elements.volumeSlider.addEventListener('click', (e) => this.setVolume(e));

    this.elements.speedBtn.addEventListener('click', () => this.cycleSpeed());
    this.elements.favoriteBtn.addEventListener('click', () => this.toggleFavorite());
    this.elements.downloadBtn.addEventListener('click', () => this.download());
    this.elements.shareBtn.addEventListener('click', () => this.share());
    this.elements.minimizeBtn.addEventListener('click', () => this.toggleMinimize());

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); this.togglePlay(); }
      if (e.code === 'ArrowRight') this.audio.currentTime = Math.min(this.audio.currentTime + 5, this.audio.duration || 0);
      if (e.code === 'ArrowLeft') this.audio.currentTime = Math.max(this.audio.currentTime - 5, 0);
      if (e.code === 'ArrowUp') { this.setVolumeValue(Math.min(this.volume + 0.1, 1)); }
      if (e.code === 'ArrowDown') { this.setVolumeValue(Math.max(this.volume - 0.1, 0)); }
    });
  },

  playTrack(track, playlist) {
    if (!track || !track.url) return;

    this.currentTrack = track;
    if (playlist) {
      this.playlist = playlist;
      this.playlistIndex = playlist.findIndex(t => t.name === track.name && t.url === track.url);
      if (this.playlistIndex === -1) this.playlistIndex = 0;
    }

    this.audio.src = track.url;
    this.audio.volume = this.volume;
    this.audio.playbackRate = this.playbackSpeed;
    this.audio.play().catch(() => {});

    this.elements.trackName.textContent = track.title || track.name || 'غير معروف';
    this.elements.trackArtist.textContent = track.creator || track.sheikh || 'المكتبة الإسلامية';

    if (track.image) {
      this.elements.trackImg.src = track.image;
    }

    this.show();
    this.updateFavoriteUI();
    this.saveState();
  },

  playTrackByIdentifier(identifier, trackName, playlist) {
    const url = `https://archive.org/download/${identifier}/${trackName}`;
    const track = {
      name: trackName,
      title: trackName.replace(/\.mp3$/i, '').replace(/[-_]/g, ' '),
      url: url,
      creator: this.currentTrack?.creator || '',
      identifier: identifier
    };
    this.playTrack(track, playlist);
  },

  togglePlay() {
    if (!this.currentTrack) return;

    if (this.audio.paused) {
      this.audio.play().catch(() => {});
    } else {
      this.audio.pause();
    }
  },

  onPlay() {
    this.elements.playIcon.className = 'fas fa-pause';
    this.elements.visualizer.classList.remove('paused');
  },

  onPause() {
    this.elements.playIcon.className = 'fas fa-play';
    this.elements.visualizer.classList.add('paused');
  },

  onTimeUpdate() {
    if (!this.audio.duration) return;
    const progress = (this.audio.currentTime / this.audio.duration) * 100;
    this.elements.progressFill.style.width = `${progress}%`;
    this.elements.currentTime.textContent = this.formatTime(this.audio.currentTime);
  },

  onLoadedMetadata() {
    this.elements.totalTime.textContent = this.formatTime(this.audio.duration);
  },

  onTrackEnd() {
    if (this.isRepeating) {
      this.audio.currentTime = 0;
      this.audio.play().catch(() => {});
    } else if (this.playlist.length > 0) {
      this.next();
    }
  },

  prev() {
    if (this.playlist.length === 0) return;
    let idx = this.playlistIndex - 1;
    if (idx < 0) idx = this.playlist.length - 1;
    this.playlistIndex = idx;
    const track = this.playlist[this.playlistIndex];
    this.playTrack(track, this.playlist);
  },

  next() {
    if (this.playlist.length === 0) return;

    let idx;
    if (this.isShuffled) {
      const currentShuffleIdx = this.shuffledOrder.indexOf(this.playlistIndex);
      const nextShuffleIdx = (currentShuffleIdx + 1) % this.shuffledOrder.length;
      idx = this.shuffledOrder[nextShuffleIdx];
    } else {
      idx = (this.playlistIndex + 1) % this.playlist.length;
    }

    this.playlistIndex = idx;
    const track = this.playlist[this.playlistIndex];
    this.playTrack(track, this.playlist);
  },

  seek(e) {
    const rect = this.elements.progressTrack.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    if (this.audio.duration) {
      this.audio.currentTime = ratio * this.audio.duration;
    }
  },

  setVolume(e) {
    const rect = this.elements.volumeSlider.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    this.setVolumeValue(ratio);
  },

  setVolumeValue(val) {
    this.volume = val;
    this.audio.volume = val;
    this.elements.volumeFill.style.width = `${val * 100}%`;
    this.updateVolumeIcon();
    this.saveState();
  },

  toggleMute() {
    if (this.audio.volume > 0) {
      this._prevVolume = this.audio.volume;
      this.setVolumeValue(0);
    } else {
      this.setVolumeValue(this._prevVolume || 0.7);
    }
  },

  updateVolumeIcon() {
    const v = this.volume;
    if (v === 0) this.elements.volumeIcon.className = 'fas fa-volume-mute';
    else if (v < 0.3) this.elements.volumeIcon.className = 'fas fa-volume-off';
    else if (v < 0.7) this.elements.volumeIcon.className = 'fas fa-volume-down';
    else this.elements.volumeIcon.className = 'fas fa-volume-up';
  },

  toggleShuffle() {
    this.isShuffled = !this.isShuffled;
    this.elements.shuffleBtn.classList.toggle('active-control', this.isShuffled);
    if (this.isShuffled && this.playlist.length > 0) {
      this.shuffledOrder = this.generateShuffleOrder();
    }
    this.saveState();
  },

  generateShuffleOrder() {
    const order = Array.from({ length: this.playlist.length }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  },

  toggleRepeat() {
    this.isRepeating = !this.isRepeating;
    this.elements.repeatBtn.classList.toggle('active-control', this.isRepeating);
    this.saveState();
  },

  cycleSpeed() {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const idx = speeds.indexOf(this.playbackSpeed);
    this.playbackSpeed = speeds[(idx + 1) % speeds.length];
    this.audio.playbackRate = this.playbackSpeed;
    this.elements.speedBtn.textContent = `${this.playbackSpeed}x`;
    this.saveState();
  },

  toggleFavorite() {
    if (!this.currentTrack) return;
    const key = this.currentTrack.url;
    const idx = this.favorites.findIndex(f => f.url === key);

    if (idx >= 0) {
      this.favorites.splice(idx, 1);
      APP.showToast('تمت إزالتها من المفضلة', 'info');
    } else {
      this.favorites.push({
        url: this.currentTrack.url,
        title: this.currentTrack.title || this.currentTrack.name,
        creator: this.currentTrack.creator || this.currentTrack.sheikh
      });
      APP.showToast('تمت الإضافة إلى المفضلة', 'success');
    }

    this.updateFavoriteUI();
    this.saveState();
  },

  updateFavoriteUI() {
    if (!this.currentTrack) return;
    const isFav = this.favorites.some(f => f.url === this.currentTrack.url);
    this.elements.favoriteBtn.innerHTML = isFav ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
    this.elements.favoriteBtn.classList.toggle('active', isFav);
  },

  download() {
    if (!this.currentTrack || !this.currentTrack.url) return;
    const a = document.createElement('a');
    a.href = this.currentTrack.url;
    a.download = this.currentTrack.name || 'audio.mp3';
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
  },

  share() {
    if (!this.currentTrack) return;
    const text = `استمع إلى: ${this.currentTrack.title || this.currentTrack.name}`;
    if (navigator.share) {
      navigator.share({ title: text, url: this.currentTrack.url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(this.currentTrack.url).then(() => {
        APP.showToast('تم نسخ الرابط', 'success');
      }).catch(() => {});
    }
  },

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    this.elements.player.classList.toggle('minimized', this.isMinimized);
    this.elements.minimizeBtn.innerHTML = this.isMinimized
      ? '<i class="fas fa-chevron-up"></i>' : '<i class="fas fa-chevron-down"></i>';
    this.saveState();
  },

  show() {
    this.isVisible = true;
    this.elements.player.classList.add('show');
  },

  hide() {
    this.isVisible = false;
    this.elements.player.classList.remove('show');
  },

  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },

  visualize() {
    if (!this.audio) return;
    const bars = this.elements.visualizer.querySelectorAll('.visualizer-bar');

    if (this.audio.paused) {
      bars.forEach(bar => { bar.style.height = '3px'; });
      return;
    }

    if (this.audio.buffer && this.audio.buffer.length > 0) {
      try {
        const buffer = this.audio.buffer;
        const data = buffer.getChannelData(0);
        const step = Math.floor(data.length / bars.length);
        for (let i = 0; i < bars.length; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) {
            sum += Math.abs(data[i * step + j] || 0);
          }
          const val = Math.min(1, sum / step * 3);
          bars[i].style.height = `${Math.max(3, val * 25)}px`;
        }
      } catch {
        bars.forEach((bar, i) => {
          const h = Math.max(3, Math.sin(Date.now() / 300 + i) * 10 + 12);
          bar.style.height = `${h}px`;
        });
      }
    } else {
      bars.forEach((bar, i) => {
        const h = Math.max(3, Math.sin(Date.now() / 300 + i) * 10 + 12);
        bar.style.height = `${h}px`;
      });
    }

    if (!this.audio.paused) {
      requestAnimationFrame(() => this.visualize());
    }
  },

  saveState() {
    try {
      const state = {
        currentTrack: this.currentTrack ? {
          url: this.currentTrack.url,
          title: this.currentTrack.title,
          name: this.currentTrack.name,
          creator: this.currentTrack.creator
        } : null,
        currentTime: this.audio.currentTime || 0,
        volume: this.volume,
        isShuffled: this.isShuffled,
        isRepeating: this.isRepeating,
        isMinimized: this.isMinimized,
        playbackSpeed: this.playbackSpeed,
        favorites: this.favorites,
        playlist: this.playlist.slice(0, 50).map(t => ({
          url: t.url,
          title: t.title,
          name: t.name,
          creator: t.creator
        })),
        playlistIndex: this.playlistIndex
      };
      localStorage.setItem('playerState', JSON.stringify(state));
    } catch (e) { console.warn('Save state error:', e); }
  },

  loadState() {
    try {
      const saved = localStorage.getItem('playerState');
      if (!saved) return;
      const state = JSON.parse(saved);

      this.volume = state.volume ?? 0.7;
      this.isShuffled = state.isShuffled ?? false;
      this.isRepeating = state.isRepeating ?? false;
      this.isMinimized = state.isMinimized ?? false;
      this.playbackSpeed = state.playbackSpeed ?? 1;
      this.favorites = state.favorites || [];
      this.playlist = state.playlist || [];
      this.playlistIndex = state.playlistIndex ?? -1;

      this.setVolumeValue(this.volume);
      this.elements.speedBtn.textContent = `${this.playbackSpeed}x`;
      this.elements.shuffleBtn.classList.toggle('active-control', this.isShuffled);
      this.elements.repeatBtn.classList.toggle('active-control', this.isRepeating);

      if (state.currentTrack) {
        this.currentTrack = state.currentTrack;
        this.elements.trackName.textContent = state.currentTrack.title || 'غير معروف';
        this.elements.trackArtist.textContent = state.currentTrack.creator || 'المكتبة الإسلامية';
        this.audio.src = state.currentTrack.url;
        this.audio.currentTime = state.currentTime || 0;
        this.elements.player.classList.add('show');
        this.isVisible = true;
      }
    } catch (e) { console.warn('Load state error:', e); }
  }
};
