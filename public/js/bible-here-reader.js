/**
 * Bible Here Reader JavaScript
 *
 * @package    Bible_Here
 * @subpackage Bible_Here/public/js
 * @since      1.0.0
 */

'use strict';

/**
 * Bible Here Reader Class
 */
class BibleHereReader {
		constructor(container) {
		console.log("📖 [BibleHereReader16] constructor() 開始初始化");
		if (typeof container === 'string') {
			console.log("18 container: "+container);
			this.container = document.getElementById(container);
		} else {
			this.container = container;
		}
		
		if (!this.container) {
			throw new Error('Bible Here Reader container not found');
		}
		console.log('📖 [BibleHereReader27] this.container:', this.container);
		this.readerId = this.container.getAttribute('id');
		this.currentMode = this.container.dataset.mode || 'single';
		// this.currentLanguage = this.container.dataset.language || 'en';
		this.currentLanguage1 = this.container.dataset.language || 'en';
		this.currentLanguage2 = this.container.dataset.language || 'en';
		this.currentVersion1 = this.container.dataset.version1 || 'bible_here_en_kjv';
		this.currentVersion2 = this.container.dataset.version2 || 'bible_here_en_kjv';
		console.log(`📖 [BibleHereReader35] this.container.dataset.book: ${this.container.dataset.book}, this.container.dataset.chapter: ${this.container.dataset.chapter}`);
		this.currentBook = parseInt(this.container.dataset.book) || 19;
		this.currentChapter = parseInt(this.container.dataset.chapter) || 117;
		this.currentVersion1NameShort = this.container.dataset.version1NameShort || 'KJV';
		this.currentVersion2NameShort = this.container.dataset.version2NameShort || 'KJV';
		// Initialize dual mode state
		this.isDualMode = false;
		// 初始化快取管理器
		this.cacheManager = null;
		console.log('📖 [BibleHereReader44] 初始化開始，Reader ID:', this.readerId);
		console.log('📊 初始狀態:', {
			mode: this.currentMode,
			// language: this.currentLanguage,
			language1: this.currentLanguage1, language2: this.currentLanguage2,
			version1: this.currentVersion1, version2: this.currentVersion2,
			currentVersion1NameShort: this.currentVersion1NameShort, currentVersion2NameShort: this.currentVersion2NameShort,
			book: this.currentBook,
			chapter: this.currentChapter
		});

		// Cache DOM elements
		this.elements = {
			reader: this.container,
			bookSelect: this.container.querySelector('.book-select'),
			chapterSelect: this.container.querySelector('.chapter-select'),
			bookChapterButton1: this.container.querySelector('.btn1-book-chapter'),
			bookChapterText1: this.container.querySelector('.book-chapter-text1'),
			bookChapterMenu: this.container.querySelector('.book-chapter-menu'),
			bookChapterButton2: this.container.querySelector('.btn2-book-chapter'),
			bookChapterText2: this.container.querySelector('.book-chapter-text2'),
			bookChapterSelector2: this.container.querySelector('.book-chapter-selector2'),
			prevButton: this.container.querySelector('.btn-prev'),
			nextButton: this.container.querySelector('.btn-next'),
			searchButton: this.container.querySelector('.btn-search'),
			versionsButton: this.container.querySelector('.btn-versions'),
			settingsButton: this.container.querySelector('.btn-settings'),
			themeMenu: this.container.querySelector('.theme-menu'),
			singleMode: this.container.querySelector('.single-version-mode'),
			dualMode: this.container.querySelector('.dual-version-mode'),
			loadingIndicator: this.container.querySelector('.loading-indicator'),
			errorMessage: this.container.querySelector('.error-message')
		};
		
		// Initialize theme preference
		this.themePreference = localStorage.getItem('bible-here-theme') || 'light';
		this.applyTheme(this.themePreference);
		
		// Initialize font size preference
		this.fontSizePreference = localStorage.getItem('bible-here-font-size') || 'base';
		this.applyFontSize(this.fontSizePreference);
		this.initializeFontSizeSlider();
		
		// Initialize second version properties
		this.currentVersion2 = null;
		this.currentVersion2NameShort = null;
		
		// Initialize active selector (1 for first version, 2 for second version)
		this.activeSelector = '1';
		// console.log('🎨 Prefs:', { theme: this.themePreference, fontSize: this.fontSizePreference});

		this.init();
	}

	/**
	 * Initialize the reader
	 */
	async init() {
		console.log('🚀 BibleHereReader 102 async init() just triggered.');
		this.showLoading();  // Show loading indicator for initial page load
		// Set initial data-mode attribute based on isDualMode
		// this.elements.reader.setAttribute('data-mode', this.isDualMode ? 'dual' : 'single');
		await this.initializeCacheManager(); // 初始化快取管理器
		// Parse URL parameters and apply if present
		const urlParams = this.parseURLParams();
		if (urlParams && Object.keys(urlParams).length > 0) {
			console.log('🔗 [init] 發現 URL 參數，應用設定:', urlParams);
			// this.elements.reader.setAttribute('data-mode', urlParams.get('version2') ? 'dual' : 'single');
			this.initFromParams(urlParams);
			await this._resolveVersionNameShorts();
			await this.applyURLParamsToReader(urlParams);
		} else {  // Parse shortcode attributes from container
			const shortcodeAttributes = this.parseShortcodeAttributes();
			this.elements.reader.setAttribute('data-mode', shortcodeAttributes.version2 ? 'dual' : 'single');
			console.log('🔧 [init] 116 shortcodeAttributes:', shortcodeAttributes);
			if (shortcodeAttributes && Object.keys(shortcodeAttributes).length > 0) {
				console.log('🔧 [init] 發現 shortcode 屬性，開始初始化:', shortcodeAttributes);
				const initResult = await this.initializeFromShortcode(shortcodeAttributes);
				if (initResult.success) {
					console.log('✅ [init] Shortcode 初始化成功');
				} else {
					console.warn('⚠️ [init] Shortcode 初始化失敗，使用預設值:', initResult.errors);
				}
			}

			// Set initial URL parameters to establish proper history baseline
			console.log('🔗 [init] 設置初始 URL 參數, this.currentVersion2: ', this.currentVersion2);
			this.updateURLParams({
				version1: this.currentVersion1,
				version2: this.isDualMode ? this.currentVersion2 : undefined,
				book: this.currentBook,
				chapter: this.currentChapter,
				mode: this.currentMode,
				language1: this.currentLanguage1
			}, true); // Use replaceState for initial setup
		}

		this.bindEvents();
		// this.initializeSelectors();

		// Set up popstate event listener for browser navigation
		window.addEventListener('popstate', (event) => {
			console.log('🔄 [init] Popstate 事件觸發');
			this.handlePopState(event);
		});

		// Initialize cross reference modal
		this.initializeCrossReferenceModal();

		// Initialize strong number modal
		this.initializeStrongNumberModal();

		// Initialize search modal
		this.initializeSearchModal();

		// Load default KJV Genesis Chapter 1 (unless already loaded from shortcode/URL)
		this.applyStoredFontSize();
		this.loadChapter();
		this.initializeFontResizerIntegration();
		console.log('✅ BibleHereReader init() 完成');
	}

	initializeFontResizerIntegration() {
		const resizerEl = document.querySelector('.font_resizer_plus');
		if (!resizerEl) {
			console.log('ℹ️ Simple Font Resizer plugin not found');
			return;
		}
		console.log('🔗 Simple Font Resizer detected, initializing MutationObserver');

		// 監聽 simple font resizer 按鈕點擊
		// 因為它改的是 body 的 font-size，我們監聽 body
		const increaseBtn = document.querySelector('#btn-increase_wp_font_rp');
		const decreaseBtn = document.querySelector('#btn-decrease_wp_font_rp');
		const origBtn = document.querySelector('#btn-orig_wp_font_rp');

		const applyResizerFontSize = (direction) => {
			// 取得 body 目前 font-size（simple font resizer 會改 body）
			const bodyFontSize = parseInt(window.getComputedStyle(document.body).fontSize) || 20;
			const newSize = bodyFontSize + direction;

			// 直接套用到 reader 的所有 verse-text 和 verse-number
			const verseTexts = this.container.querySelectorAll('.verse-text, .verse-number');
			verseTexts.forEach(el => {
				el.style.fontSize = newSize + 'px';
			});

			console.log(`🔡 Font size synced from Simple Font Resizer: ${newSize}px`);
		};

		if (increaseBtn) {
			increaseBtn.addEventListener('click', () => applyResizerFontSize(1));
		}
		if (decreaseBtn) {
			decreaseBtn.addEventListener('click', () => applyResizerFontSize(-1));
		}
		if (origBtn) {
			origBtn.addEventListener('click', () => {
				// 重設為原始大小，移除 inline style 讓 CSS class 接管
				const verseTexts = this.container.querySelectorAll('.verse-text, .verse-number');
				verseTexts.forEach(el => {
					el.style.fontSize = '';
				});
			});
		}

		console.log('✅ Simple Font Resizer integration ready');
	}

	/**
	 * 從 cache 查詢 version name short，找不到就從 API 補
	 */
	async _resolveVersionNameShorts() {
		if (!this.cacheManager) return;

		try {
			const versions = await this.cacheManager.getVersions(
				[this.currentLanguage1, this.currentLanguage2].filter(Boolean)
			);

			versions.forEach(v => {
				if (v.table_name === this.currentVersion1) {
					this.currentVersion1NameShort = v.name_short;
					if (this.elements.bookChapterText1) {
						this.elements.bookChapterText1.dataset.versionNameShort = v.name_short;
					}
				}
				if (v.table_name === this.currentVersion2) {
					this.currentVersion2NameShort = v.name_short;
					if (this.elements.bookChapterText2) {
						this.elements.bookChapterText2.dataset.versionNameShort = v.name_short;
					}
				}
			});

			// 語言1的書卷名
			const cachedBooks1 = await this.cacheManager.getCachedBooks(this.currentLanguage1);
			if (cachedBooks1 && cachedBooks1[this.currentBook]) {
				const bookShort1 = cachedBooks1[this.currentBook].title_short;
				if (this.elements.bookChapterText1) {
					this.elements.bookChapterText1.dataset.bookNameShort = bookShort1;
				}
				this.updateBookChapterButton(this.currentVersion1NameShort, bookShort1, '1');
			}

			// 語言2的書卷名（獨立查詢，確保語言正確）
			if (this.isDualMode && this.currentLanguage2) {
				const cachedBooks2 = await this.cacheManager.getCachedBooks(this.currentLanguage2);
				if (cachedBooks2 && cachedBooks2[this.currentBook]) {
					const bookShort2 = cachedBooks2[this.currentBook].title_short;
					if (this.elements.bookChapterText2) {
						this.elements.bookChapterText2.dataset.bookNameShort = bookShort2; // ← "太" 而非 "Matt"
					}
					this.updateBookChapterButton(this.currentVersion2NameShort, bookShort2, '2');
				}
			}

			console.log('✅ [_resolveVersionNameShorts] 更新完成:', {
				version1NameShort: this.currentVersion1NameShort,
				version2NameShort: this.currentVersion2NameShort
			});

		} catch (error) {
			console.warn('⚠️ [_resolveVersionNameShorts] 查詢失敗:', error);
		}
	}

	/**
	 * Initialize cache manager
	 */
	async initializeCacheManager() {
		console.log('🗄️ [BibleHereReader162] 初始化快取管理器開始');
		
		try {
			// 等待全域快取管理器可用
			if (typeof window.bibleHereCacheManager === 'undefined' || !window.bibleHereCacheManager) {
				console.log('⏳ [BibleHereReader] 等待全域快取管理器初始化...');
				// 等待全域快取管理器創建
				await this.waitForGlobalCacheManager();
			}
			
			// 連接到全域快取管理器
			this.cacheManager = window.bibleHereCacheManager;
			if(this.cacheManager){console.log('✅ [BibleHereReader] 快取管理器連接成功')}else{console.log('❌ [BibleHereReader] 快取管理器連接失敗')}
			
			// 等待快取管理器完全初始化（包括 seed data 載入）
			if (this.cacheManager && !this.cacheManager.isInitialized) {
				console.log('⏳ [BibleHereReader] 等待快取管理器完全初始化（包括 seed data 載入）...');
				await this.waitForCacheInitialization();
			}
			
			console.log('📊 [BibleHereReader] 快取管理器狀態:', {
				isInitialized: this.cacheManager.isInitialized,
				cacheExpiry: this.cacheManager.cacheExpiry
			});
			
			// 檢查快取統計
			const stats = await this.cacheManager.getCacheStats();
			console.log('📈 [BibleHereReader] 快取統計:', stats);
			
		} catch (error) {
			console.error('❌ [BibleHereReader] 快取管理器初始化失敗:', error);
			console.warn('⚠️ [BibleHereReader] 將直接使用 API 獲取資料');
		}
	}

	/**
	 * Initialize cross reference modal
	 */
	initializeCrossReferenceModal() {
		try {
			this.crossReferenceModal = new CrossReferenceModal(this);
			console.log('✅ [BibleHereReader] Cross reference modal initialized');
		} catch (error) {
			console.warn('⚠️ [BibleHereReader] Failed to initialize cross reference modal:', error);
		}
	}

	/**
	 * Initialize strong number modal
	 */
	initializeStrongNumberModal() {
		try {
			this.strongNumberModal = new StrongNumberModal(this);
			console.log('✅ [BibleHereReader] Strong number modal initialized');
		} catch (error) {
			console.warn('⚠️ [BibleHereReader] Failed to initialize strong number modal:', error);
		}
	}

	/**
	 * Initialize search modal
	 */
	initializeSearchModal() {
		try {
			this.searchModal = new SearchModal(this);
			console.log('✅ [BibleHereReader] Search modal initialized');
		} catch (error) {
			console.warn('⚠️ [BibleHereReader] Failed to initialize search modal:', error);
		}
	}

	/**
	 * Wait for global cache manager to be created
	 */
	async waitForGlobalCacheManager() {
		return new Promise((resolve) => {
			const checkInterval = setInterval(() => {
				if (typeof window.bibleHereCacheManager !== 'undefined' && window.bibleHereCacheManager) {
					clearInterval(checkInterval);
					resolve();
				}
			}, 50); // Check every 50ms
			
			// Timeout after 10 seconds
			setTimeout(() => {
				clearInterval(checkInterval);
				console.warn('⚠️ [BibleHereReader] 等待全域快取管理器超時');
				resolve();
			}, 10000);
		});
	}

	/**
	 * Wait for cache manager to be fully initialized
	 */
	async waitForCacheInitialization() {
		return new Promise((resolve) => {
			// 保存 setInterval 和 setTimeout 的 ID，以便後續清除
			let checkIntervalId;
			let timeoutId;

			const checkStatus = () => {
				// Check if cache manager is initialized
				if (this.cacheManager && this.cacheManager.isInitialized) {
					console.log('✅ [BibleHereReader242] 快取管理器初始化完成');
					clearInterval(checkIntervalId);  // 清除檢查狀態的計時器
					clearTimeout(timeoutId);  // 清除超時計時器
					resolve();
					return;
				}
				
				// Check if initialization failed (not initializing and not initialized)
				if (this.cacheManager && 
					!this.cacheManager.isInitializing && 
					!this.cacheManager.isInitialized) {
					console.warn('⚠️ [BibleHereReader] 快取管理器初始化失敗，將使用 API 模式');
					clearInterval(checkIntervalId);  // 清除檢查狀態的計時器
					clearTimeout(timeoutId);  // 清除超時計時器
					resolve();
					return;
				}
			};

			checkIntervalId = setInterval(checkStatus, 50);  // 每 50ms 檢查一次狀態

			timeoutId = setTimeout(() => {
				console.warn('⚠️ [BibleHereReader264] 等待快取管理器初始化超時');
				clearInterval(checkIntervalId);  // 清除檢查狀態的計時器
				resolve();
			}, 15000);  // Timeout after 15 seconds
		});
	}

	/**
	 * Bind event handlers
	 */
	bindEvents() {
		// Book and Chapter button click
		if (this.elements.bookChapterButton1) {
			this.elements.bookChapterButton1.addEventListener('click', (e) => {
				// Set current active selector to first
				this.activeSelector = e.currentTarget.value;
				this.toggleBookChapterMenu();
			});
		}

		// Second Book and Chapter button click  // 設置當前活動的選擇器為第二個
		if (this.elements.bookChapterButton2) {
			this.elements.bookChapterButton2.addEventListener('click', (e) => {
				console.log('第二個版本選擇按鈕被點擊, e.currentTarget.value: ', e.currentTarget.value, typeof e.currentTarget.value);
				// 設置當前活動的選擇器為第二個
				this.activeSelector = e.currentTarget.value;
				this.toggleBookChapterMenu();
			});
		}

		// Book Chapter Menu events
		this.bindBookChapterMenuEvents();

		// Book selection change (hidden)
		if (this.elements.bookSelect) {
			this.elements.bookSelect.addEventListener('change', (e) => {
				console.log('229 bookSelect changed here is e.target.value: ', e.target.value);
				this.currentBook = e.target.value;
				this.updateBookChapterButton();
				this.onBookChange();
			});
		}

		// Chapter selection change (hidden)
		if (this.elements.chapterSelect) {
			this.elements.chapterSelect.addEventListener('change', (e) => {
				this.currentChapter = parseInt(e.target.value);
				this.updateBookChapterButton();
				this.loadChapter();
			});
		}

		// Previous button
		if (this.elements.prevButton) {
			this.elements.prevButton.addEventListener('click', (e) => {
				console.log("prevButton clicked, e.target: ", e.target);
				this.navigatePrevious();
			});
		}

		// Next button
		if (this.elements.nextButton) {
			this.elements.nextButton.addEventListener('click', (e) => {
				this.navigateNext();
			});
		}

		// Search button and search functionality
		// if (this.elements.searchButton) {
		// 	this.elements.searchButton.addEventListener('click', () => {
		// 		this.openSearch();
		// 	});
		// }

		// Search container events (click for mobile, hover for desktop)
		const searchContainer = this.container.querySelector('.search-container');
		if (searchContainer) {
			// Click event to show search modal
			const searchBtn = searchContainer.querySelector('.btn-search');
			if (searchBtn) {
				searchBtn.addEventListener('click', (e) => {
					e.preventDefault();
					e.stopPropagation();
					if (this.searchModal) {
						this.searchModal.show();
					}
				});
			}
		}

		// Old search input events removed - now using SearchModal

		// Search results modal close button
		const searchModalCloseBtn = this.container.querySelector('.search-results-modal .modal-close');
		if (searchModalCloseBtn) {
			searchModalCloseBtn.addEventListener('click', () => {
				this.hideSearchResults();
			});
		}

		// Search results modal overlay click to close
		const searchModalOverlay = this.container.querySelector('.search-results-modal .modal-overlay');
		if (searchModalOverlay) {
			searchModalOverlay.addEventListener('click', (e) => {
				// Only close if clicking on the overlay itself, not on modal content
				if (e.target === searchModalOverlay) {
					this.hideSearchResults();
				}
			});
		}

		// ESC key to close search results modal
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') {
				const searchModal = this.container.querySelector('.search-results-modal');
				if (searchModal && searchModal.style.display !== 'none') {
					this.hideSearchResults();
				}
			}
		})

		// Versions button
		if (this.elements.versionsButton) {
			this.elements.versionsButton.addEventListener('click', () => {
				this.toggleVersions();
			});
		}

			// Settings button
		if (this.elements.settingsButton) {
			this.elements.settingsButton.addEventListener('click', (e) => {
				e.stopPropagation(); // 阻止事件冒泡到 document 層級
				this.toggleThemeMenu();
			});
		}

		// Close menus when clicking outside
		document.addEventListener('click', (e) => {
			// Close theme menu
			if (this.elements.themeMenu && 
				!this.elements.themeMenu.contains(e.target) && 
				!this.elements.settingsButton.contains(e.target)) {
				this.hideThemeMenu();
			}
			
			// Close book chapter menu
			if (this.elements.bookChapterMenu && 
				!this.elements.bookChapterMenu.contains(e.target) && 
				!this.elements.bookChapterButton1.contains(e.target) &&
				!(this.elements.bookChapterButton2 && this.elements.bookChapterButton2.contains(e.target))) {
				this.hideBookChapterMenu();
			}
		});

		// Theme preference change
		this.container.addEventListener('change', (e) => {
			if (e.target.name === 'theme-preference') {
				this.setThemePreference(e.target.value);
			}
		});
		
		// Font size slider change - with cross-browser compatibility
		this.container.addEventListener('input', (e) => {
			if (e.target.classList.contains('font-size-slider')) {
				console.log('🎚️ Font size slider input event triggered');
				console.log('📊 Slider value:', e.target.value);
				console.log('🌐 Browser:', navigator.userAgent);
				this.setFontSize(e.target.value);
			}
		});
			
		// Additional event listener for older browsers (change event)
		this.container.addEventListener('change', (e) => {
			if (e.target.classList.contains('font-size-slider')) {
				console.log('🔄 Font size slider change event triggered (fallback)');
				console.log('📊 Slider value:', e.target.value);
				this.setFontSize(e.target.value);
			}
		});


		// Retry button
		this.container.addEventListener('click', (e) => {
			if (e.target.classList.contains('btn-retry')) {
				this.hideError();
				this.loadChapter();
			}
		});

		// Close version button (for dual version mode)
		this.container.addEventListener('click', (e) => {
			// Only trigger version toggle for dual version close button, not modal close buttons
			// Ensure we're not inside a modal by checking for modal containers
			if ((e.target.classList.contains('btn-close-version') || 
				 (e.target.classList.contains('close-icon') && e.target.closest('.btn-close-version'))) &&
				 !e.target.closest('.cross-reference-modal')) {
				e.preventDefault();
				e.stopPropagation();
				console.log('🔄 Turning off dual versions');
				this.toggleVersions();
			}
		});
		
		if (this.container.querySelector('.btn-swap')) {
			this.container.querySelector('.btn-swap').addEventListener('click', (e) => {
				e.preventDefault();
				console.log(`🔄 Version switch button clicked! version1NameShort: ${this.currentVersion1NameShort} version2NameShort: ${this.currentVersion2NameShort}`);
				this.swapVersions();
			});
		}

		// Initialize synchronized scrolling for dual version mode
		this.initializeSynchronizedScrolling();
		
		// Initialize resizable divider for dual version mode
		this.initializeResizableDivider();
		
		// Strong Number click events (using event delegation)
		if (parseInt(this.container.dataset.strongInstalled)){
			this.container.addEventListener('click', (e) => {
				if (e.target.classList.contains('strong-number-link')) {
					e.preventDefault();
					this.strongNumberModal.handleStrongNumberClick(e.target);
				}
			});
		}
	}

	/**
	 * Handle book change
	 */
	onBookChange() {
		if (!this.currentBook) {
			this.resetSelectors(['chapter']);
			return;
		}
		
		this.loadChapters();
	}

	/**
	 * Load available books for selected language
	 */
	loadBooks() {
		console.log("loadBooks 522", this.currentLanguage, this.currentLanguage1, this.currentLanguage2)
		const params = new URLSearchParams({
			action: 'bible_here_public_get_books',
			language: this.currentLanguage1 || this.currentLanguage2,
		});
		fetch(`${bibleHereAjax.ajaxurl}?${params}`, {
			method: 'GET',
			headers: {
				"X-WP-Nonce": bibleHereAjax.nonce,
			},
		})
		.then(response => response.json())
		.then(data => {
			if (data.success) {
				this.populateBookSelect(data.data);
			} else {
				console.error('Failed to load books:', data.data);
			}
		})
		.catch(error => {
			console.error('Network error loading books:', error);
		});
	}

	/**
	 * Sortout the scriptiure content by table names
	 */
	splitContent(verses, tableName1, tableName2) {
		const content1 = [];
		const content2 = [];
		if (!Array.isArray(verses) || !tableName1) {  // user will see both versions identical when first clicking +version
			console.warn('⚠️ 576 params error: tableName1: ', tableName1, ' tableName2: ', tableName2, ' verses: ', verses);
			return [null, null];
		}
		for (const verse of verses) {
			if (verse.table_name === tableName1) {
				content1.push(verse);
			} else if (tableName2 && verse.table_name === tableName2) {
				content2.push(verse);
			}
		}
		return [content1, content2];
	}

	/**
	 * Load chapter content using cache manager or API
	 * @param {boolean} updateURL - Whether to update URL parameters (default: true)
	 */
	async loadChapter(updateURL = true) {
		this.showLoading();
		console.log('📖 [BibleHereReader579] async loadChapter() 開始載入章節:', {
			version1: this.currentVersion1,
			version2: this.currentVersion2,
			book: this.currentBook,
			chapter: this.currentChapter,
			updateURL
		});
		
		if (!this.currentVersion1 || !this.currentBook || !this.currentChapter) {
			console.warn('⚠️ 缺少必要參數');
			this.showError('Please select version, book, and chapter');
			return;
		}
		// Update URL parameters when loading chapter (only if not called from applyURLParamsToReader)
		if (updateURL) {
			this.updateURLParams({
				version1: this.currentVersion1,
				version2: this.isDualMode ? this.currentVersion2 : undefined,
				book: this.currentBook,
				chapter: this.currentChapter,
				mode: this.currentMode,
				language1: this.currentLanguage1,
				language2: this.currentLanguage2,
			});
		}
		
		// Switch to single version mode if in zero mode
		if (this.currentMode === 'zero') {
			this.switchMode('single');
		}

		try {
			let chapterContent = null;

			// 嘗試從快取獲取 - 使用 table_name (currentVersion), book_number, chapter_number
			if (this.cacheManager) {
				console.log('🗄️ [BibleHereReader639] async loadChapter() 嘗試從快取獲取章節內容:', {
					table_name1: this.currentVersion1, table_name2: this.currentVersion2,
					book_number: this.currentBook,
					chapter_number: this.currentChapter
				});

				chapterContent = await this.cacheManager.getVerses(
					this.currentLanguage1,
					[this.currentVersion1, this.currentVersion2],
					this.currentBook,
					this.currentChapter
				);

				const [verse1Content, verse2Content] = this.splitContent(chapterContent, this.currentVersion1, this.currentVersion2);
				// console.log('🗄️ [BibleHereReader645] async loadChapter() chapterContent: ', chapterContent, ' verse1Content: ', verse1Content, ' verse2Content ', verse2Content);

				if (chapterContent && chapterContent.length > 0 && (this.currentVersion2 ? verse1Content.length === verse2Content.length : true)) {  // user may previously cache scription only in one version but now want to see dual version
					console.log('✅ [BibleHereReader648] async loadChapter() 從快取獲取到章節內容，經文數量:', chapterContent.length);
					console.log('📖 [BibleHereReader649] async loadChapter() 快取經文資料預覽:', chapterContent.slice(0, 3));
					const displayContent = {version1: { verses: verse1Content, table_name: this.currentVersion1 }};
					if (this.isDualMode && this.currentVersion2 && this.currentVersion2 !== this.currentVersion1) {
						if (verse2Content && verse2Content.length > 0) {
							console.log("hi 653 here is verse2Content: ", verse2Content);
							this.hideLoading();
							this.displayChapterContent(displayContent);
							displayContent.version2 = { verses: verse2Content, table_name: this.currentVersion2 };
							this.displayDualVersionContent(displayContent);  // load single and dual data for faster switching
							return;
						}  // If there's no cached version2 content in dual mode, proceed to API fetch without return
						console.log("hi 660 here is verse2Content: ", verse2Content);
					} else {
						this.hideLoading();
						this.displayChapterContent(displayContent);
						this.displayDualVersionContent(displayContent);  // load single and dual data for faster switching
						return;
					}
				} else {
					console.log('⚠️ [BibleHereReader728] async loadChapter() 快取中沒有找到足夠章節內容，將從 API 獲取');
				}
			}
				
				// 從 API 獲取
			console.log('🌐 733 async loadChapter() Obtain chapter content from API');
			
			// 構建 URL 參數
			const url = new URL(bibleHereAjax.ajaxurl);
			url.searchParams.set('action', 'bible_here_public_get_verses');
			url.searchParams.set('book_number_start', this.currentBook);
			url.searchParams.set('book_number_end', this.currentBook);
			url.searchParams.set('chapter_number_start', this.currentChapter);
			url.searchParams.set('chapter_number_end', this.currentChapter);  // Todo: preload the next chapter but that need change of get_verses API shape change (move book&chapter number to verse Array)
			url.searchParams.set('version1_bible', this.currentVersion1);
			console.log(`🌐 743 async loadChapter() this.isDualMode: ${this.isDualMode}, this.currentVersion1: ${this.currentVersion1} , this.currentVersion2: ${this.currentVersion2}`);

			if (this.currentVersion2) {  // 如果是雙版本模式且有第二個版本，添加第二個版本參數
				url.searchParams.set('version2_bible', this.currentVersion2);
				console.log('🔄 Dual version mode, loading the second version:', this.currentVersion2);
			}

			if (this.currentLanguage2) {  // 如果是雙版本模式且有第二個版本，添加第二個版本參數
				url.searchParams.set('language2', this.currentLanguage2);
				console.log('🔄 Dual version mode, loading the second language:', this.currentLanguage2);
			}
			
			const response = await fetch(url, {
				method: 'GET',
				headers: {
					"X-WP-Nonce": bibleHereAjax.nonce
				}
			});
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			
			const data = await response.json();
			
			// 添加詳細的 API 回應日誌
			console.log('📋 [BibleHereReader769] async loadChapter() API complete response:', {
				success: data.success,
				data: data.data,
				message: data.message,
				fullResponse: data
			});
			
			// 檢查回應條件並添加日誌
			console.log('🔍 [BibleHereReader] async loadChapter() check response conditions:', {
				hasSuccess: !!data.success,
				hasData: !!data.data,
				hasVersion1: !!(data.data && data.data.version1),
				hasVersion2: !!(data.data && data.data.version2),
				hasVersion1Verses: !!(data.data && data.data.version1 && data.data.version1.verses),
				versesLength: data.data && data.data.version1 && data.data.version1.verses ? data.data.version1.verses.length : 0
			});
			
			if (data.success && data.data && data.data.version1 && data.data.version1.verses) {
				console.log('✅ API 返回章節內容，經文數量:', data.data.version1.verses.length);
				
				// console.log("636 loading AJAX data to cache finished data.data:", data.data);
				this.hideLoading();
				// it's necessary to load data for both single- and dual-version-mode so toggling mode will work?
				this.displayChapterContent(data.data);
				this.displayDualVersionContent(data.data);

				// 快取 API 結果
				if (this.cacheManager) {
					console.log('💾 [BibleHereReader] 將章節內容存入快取');
					
					// Cache version1 data
					if (data.data.version1 && data.data.version1.verses) {
						console.log('📊 [BibleHereReader] 準備快取 version1 經文資料:', {
							version: this.currentVersion1,
							book: this.currentBook,
							chapter: this.currentChapter,
							verseCount: data.data.version1.verses.length,
							sample: data.data.version1.verses.slice(0, 2)
						});
						
						const versesForCacheV1 = data.data.version1.verses.map(verse => ({
							// book_number: this.currentBook,
							// chapter_number: this.currentChapter,
							verse_number: verse.verse_number,
							text: verse.strong_text || verse.text,
							reference: null,
							verse_id: verse.verse_id
						}));
						
						await this.cacheManager.cacheVerses(
							versesForCacheV1,
							this.currentVersion1
						);
						console.log('✅ [BibleHereReader] version1 章節內容已成功存入快取');
					}
					
					// Cache version2 data if exists
					if (data.data.version2 && data.data.version2.verses) {
						console.log('📊 [BibleHereReader] 準備快取 version2 經文資料:', {
							book: this.currentBook,
							chapter: this.currentChapter,
							verseCount: data.data.version2.verses.length,
							sample: data.data.version2.verses.slice(0, 2)
						});
						
						const versesForCacheV2 = data.data.version2.verses.map(verse => ({
							// book_number: this.currentBook,
							// chapter_number: this.currentChapter,
							verse_number: verse.verse_number,
							text: verse.strong_text || verse.text,
							reference: null,
							verse_id: verse.verse_id
						}));
						
						// Use a different version identifier for version2
						const version2Key = data.data.version2.table_name;
						await this.cacheManager.cacheVerses(
							versesForCacheV2,
							version2Key
						);
						console.log('✅ [BibleHereReader] version2 章節內容已成功存入快取');
					}
				}
			} else {
				// 改善錯誤處理邏輯
				const errorMessage = typeof data.data === 'string' ? data.data : 
									(data.message || JSON.stringify(data) || 'Failed to load chapter');
				console.log('❌ [BibleHereReader] API 回應不符合預期:', {
					success: data.success,
					data: data.data,
					message: data.message,
					errorMessage: errorMessage
				});
				throw new Error(errorMessage);
			}
			
		} catch (error) {
			console.error('❌ 載入章節失敗:', error);
			this.hideLoading();
			this.showError('Failed to load chapter: ' + error.message);
		}
	}

	/**
	 * Display chapter content for dual version mode
	 */
	displayDualVersionContent(data) {
		console.log('📖 處理雙版本內容:', data);
		
		// 獲取雙版本模式的容器
		const version1Container = this.elements.dualMode.querySelector('.version-1 .verses-container');
		const version2Container = this.elements.dualMode.querySelector('.version-2 .verses-container');
		const referenceInstalled = "0" !=this.elements.reader.dataset.referenceInstalled;
		if (!version1Container || !version2Container) {
			console.error('❌ 找不到雙版本容器:', {
				version1Container: !!version1Container,
				version2Container: !!version2Container,
				dualMode: !!this.elements.dualMode
			});
			return;
		}
		console.log('✅ 找到雙版本容器，開始處理內容');
		console.log(`hi 818 this.currentVersion1NameShort: ${this.currentVersion1NameShort}, this.currentVersion2NameShort: ${this.currentVersion2NameShort}`);
		console.log("hi 819 referenceInstalled: ", referenceInstalled);
		if (data.version1 && data.version1.verses) {
			console.log('📖 顯示 version1 內容，經文數量:', data.version1.verses.length);
			let html1 = '';
			data.version1.verses.forEach(verse => {
				html1 += `<p class="verse" data-verse="${verse.verse_id}">`;
				html1 += `<span class="verse-number unselectable-list  ${referenceInstalled ? 'cross-reference-link':''}">${verse.verse_number}</span>`;
				html1 += `<span class="verse-text">${this.processStrongNumbers(verse.strong_text || verse.text)}</span>`;  // immediately after span.verse-number because nextElementSibling will be used.
				html1 += `</p>`;
			});
			version1Container.innerHTML = html1;
			if (data.version1.table_name){
				version1Container.dataset.tableName = data.version1.table_name;
			}
			console.log('✅ version1 內容已顯示');
		} else {
			console.log('⚠️ 沒有 version1 資料');
			version1Container.innerHTML = '<p class="no-content">No content available for this chapter.</p>';
		}
		
		// 顯示 version2 內容（如果有的話）
		if (data.version2 && data.version2.verses) {
			console.log('📖 處理 version2 內容，經文數量:', data.version2.verses.length);
			let html2 = '';
			data.version2.verses.forEach(verse => {
				html2 += `<p class="verse" data-verse="${verse.verse_id}">`;
				html2 += `<span class="verse-number unselectable-list ${referenceInstalled ? 'cross-reference-link':''}">${verse.verse_number}</span>`;
                html2 += `<span class="verse-text">${this.processStrongNumbers(verse.strong_text || verse.text)}</span>`;  // immediately after span.verse-number because nextElementSibling will be used.
				html2 += `</p>`;
			});
			version2Container.innerHTML = html2;
			if (data.version2.table_name){
				version2Container.dataset.tableName = data.version2.table_name;
			}
			console.log('✅ version2 內容已處理');
		} else {
			console.log('⚠️ 851 沒有 version2 資料，使用 version1 內容');
			// 如果沒有 version2，顯示相同的 version1 內容
			if (data.version1 && data.version1.verses) {
				let html1 = '';
				data.version1.verses.forEach(verse => {
					html1 += `<p class="verse" data-verse="${verse.verse_id}">`;
					html1 += `<span class="verse-number unselectable-list cross-reference-link">${verse.verse_number}</span>`;
                    html1 += `<span class="verse-text">${this.processStrongNumbers(verse.strong_text || verse.text)}</span>`;   // immediately after span.verse-number because nextElementSibling will be used.
					html1 += `</p>`;
				});
				version2Container.innerHTML = html1;
				if (data.version1.table_name){
					version2Container.dataset.tableName = data.version1.table_name;
				}
				console.log('✅ version2 容器已處理 version1 內容');
			} else {
				console.log('❌ 沒有任何版本資料可處理');
				version2Container.innerHTML = '<p class="no-content">No content available for this chapter.</p>';
			}
		}
		if(this.elements.errorMessage && this.elements.errorMessage.display) {this.elements.errorMessage.display='none';}
		console.log(`🎉 雙版本內容處理完成 version1NameShort: ${this.currentVersion1NameShort} version2NameShort: ${this.currentVersion2NameShort}`);
	}
	
	/**
	 * Display chapter content for single version mode
	 */
	displayChapterContent(data) {
		const versionContainer = this.elements.singleMode.querySelector('.bible-version');
		let container = versionContainer.querySelector('.verses-container');
		let chapterData = data.version1;

		if (chapterData.table_name) {
			container.dataset.tableName = chapterData.table_name;
		}

		if (!container) {
			container = document.createElement('div');
			container.className = 'verses-container';
			versionContainer.appendChild(container);
		}
		const referenceInstalled = "0" !=this.elements.reader.dataset.referenceInstalled;
		if (!chapterData || !chapterData.verses || chapterData.verses.length === 0) {
			container.innerHTML = '<p class="no-content">No content available for this chapter.</p>';
			return;
		}
		console.log("hi 974 here is referenceInstalled: ", referenceInstalled);
		let html = '';
		Object.values(chapterData.verses).forEach(verse => {
			html += `<p class="verse" data-verse="${verse.verse_id}">`;
			html += `<span class="verse-number unselectable-list ${referenceInstalled ? 'cross-reference-link':''}">${verse.verse_number}</span>`;
			html += `<span class="verse-text">${this.processStrongNumbers(verse.strong_text || verse.text)}</span>`;   // immediately after span.verse-number because nextElementSibling will be used.
			html += `</p>`;
		});

		container.innerHTML = html;
		this.updatePageTitleAndSearchBar();
		// 經文顯示完成後，載入版本資料
		this.loadVersionsAfterChapter();
	}

	/**
	 * Process Strong Numbers in verse text
	 */
	processStrongNumbers(text) {
		if (!text) return text;

		// Match a leading run of Strong tags (optionally preceded by whitespace)
		const strongNumberRegex = /(\S+?)((?:\{[HG]\d{1,5}\})+)/g;
		const leadingStrongRegex = /^(\s*)((?:\{[HG]\d{1,5}\})+)/;

		const leadingMatch = text.match(leadingStrongRegex);
		if (leadingMatch) {
			const leadingWS = leadingMatch[1] || '';
			const strongNumbers = leadingMatch[2] || '';
			const numbers = strongNumbers.match(/\{([HG]\d{1,5})\}/g) || [];
			const cleanNumbers = numbers.map(num => num.slice(1, -1));
			const prefixHTML = `${leadingWS}<span class="strong-number-link" data-strong-numbers="${cleanNumbers.join(',')}" title="Strong Numbers: ${cleanNumbers.join(', ')}">&dagger;</span>`;
			const rest = text.slice(leadingMatch[0].length);
			return prefixHTML + rest.replace(strongNumberRegex, (match, word, strongs) => {
				const nums = (strongs.match(/\{([HG]\d{1,5})\}/g) || []).map(num => num.slice(1, -1));
				return `<span class="strong-number-link" data-strong-numbers="${nums.join(',')}" title="Strong Numbers: ${nums.join(', ')}">${word}</span>`;
			});
		}

		return text.replace(strongNumberRegex, (match, word, strongNumbers) => {
			const numbers = strongNumbers.match(/\{([HG]\d{1,5})\}/g) || [];
			const cleanNumbers = numbers.map(num => num.slice(1, -1));
			return `<span class="strong-number-link" data-strong-numbers="${cleanNumbers.join(',')}" title="Strong Numbers: ${cleanNumbers.join(', ')}">${word}</span>`;
		});
	}

	// Strong Number click handling is now managed by StrongNumberModal class



	/**
	 * Load versions after chapter content is displayed
	 */
	async loadVersionsAfterChapter() {
		console.log('📚 [BibleHereReader848] 經文顯示完成，開始載入版本資料.  Todo: check cache data time before AJAX');
		// const cachedVersions = await this.cacheManager.getVersions(navigator.languages);
		// if (cachedVersions != null && Array.isArray(cachedVersions) && cachedVersions.length > 0) {
		// 	console.log('✅ [BibleHereReader923]  loadVersionsAfterChapter found previous cache, skipping loading');
		// 	return;   // this somehow prevent previously not used languages from loading
		// }
		try {
			// 構建 AJAX URL
			const url = new URL(bibleHereAjax.ajaxurl);
			url.searchParams.set('action', 'bible_here_public_get_versions');
			// console.log('📚 [BibleHereReader858] initiating ajax here is cachedVersions: ', cachedVersions);
			const response = await fetch(url, {
				method: 'GET',
				headers: {
					"X-WP-Nonce": bibleHereAjax.nonce
				}
			});
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			
			const data = await response.json();
			console.log('📚 [BibleHereReader943] 版本資料 API 回應:', data);
			
			if (data.success && data.data) {
				// 將版本資料載入到快取
				if (this.cacheManager) {
					await this.cacheManager.cacheVersions(data.data.versions);
					console.log('✅ [BibleHereReader949] 版本資料已載入快取');
				}
				
				// 更新版本列表顯示
				this.updateVersionsDisplay(data.data.versions);
			} else {
				console.warn('⚠️ [BibleHereReader] 版本資料載入失敗:', data.message || '未知錯誤');
			}
			
		} catch (error) {
			console.error('❌ [BibleHereReader] 載入版本資料時發生錯誤:', error);
		}
	}

	/**
	 * Update versions display in the UI
	 */
	updateVersionsDisplay(versions) {
		console.log('🔄 [BibleHereReader] 更新版本列表顯示:', versions);
		
		// 找到版本列表容器
		const versionsList = document.querySelector('.versions-list');
		if (!versionsList) {
			console.warn('⚠️ [BibleHereReader] 找不到版本列表容器');
			return;
		}
		
		// 按語言分組版本
		const versionsByLanguage = {};
		versions.forEach(version => {
			const lang = version.language_original || 'unknown';
			if (!versionsByLanguage[lang]) {
				versionsByLanguage[lang] = [];
			}
			versionsByLanguage[lang].push(version);
		});
		console.log('🔄 [BibleHereReader985] 按語言分組版本:', versionsByLanguage);
		// 生成 HTML
		let html = '';
		Object.keys(versionsByLanguage).forEach(language => {
			html += `<div class="language-group">`;
			html += `<h4 class="language-title">${language}</h4>`;
			html += `<div class="versions-grid">`;
			
			versionsByLanguage[language].forEach(version => {
				html += `<div class="version-item" data-version-language="${version.language_code}" data-version="${version.table_name}" data-version-name-short="${version.name_short}">`;
				html += `<span class="version-name">${version.name}</span>`;
				html += `<span class="version-abbr">${version.name_short || ''}</span>`;
				html += `</div>`;
			});
			
			html += `</div></div>`;
		});
		
		// 更新容器內容
		versionsList.innerHTML = html;
		
		console.log(`✅ [BibleHereReader] 版本列表顯示已更新 version1NameShort: ${this.currentVersion1NameShort} version2NameShort: ${this.currentVersion2NameShort}`);
	}

	/**
	 * Update book select display
	 */
	updateBookSelect() {
		if (this.elements.bookSelect) {
			this.elements.bookSelect.value = this.currentBook;
		}
	}

	/**
	 * Update chapter select display
	 */
	updateChapterSelect() {
		if (this.elements.chapterSelect) {
			this.elements.chapterSelect.value = this.currentChapter;
		}
		this.updateBookChapterButton();
	}

	/**
	 * Update book chapter button text
	 */
	updateBookChapterButton(versionLabel, bookLabel, selector) {
		const targetElement = this.elements['bookChapterText' + (selector || this.activeSelector)];
		console.log(`hi updateBookChapterButton() 1211, versionLabel: ${versionLabel} this.activeSelector: ${this.activeSelector}, 'bookChapterText' + this.activeSelector: ${'bookChapterText' + this.activeSelector}, selector: ${selector}, bookLabel: ${bookLabel}`);
		console.log(`hi updateBookChapterButton() 1043, targetElement: ${targetElement}, this.currentVersion1NameShort: ${this.currentVersion1NameShort}, this.currentVersion2NameShort: ${this.currentVersion2NameShort}`);
		if (targetElement) {
			if (versionLabel) {
				targetElement.dataset.versionNameShort = versionLabel;
			} else {
				versionLabel = targetElement.dataset.versionNameShort;
			}
			if (bookLabel){
				targetElement.dataset.bookNameShort = bookLabel;
			} else {
				bookLabel = targetElement.dataset.bookNameShort;
			}
			targetElement.textContent = `${versionLabel ? versionLabel + ' ' : ''}${bookLabel ? bookLabel : this.currentBook} ${(selector || this.activeSelector) === '1' ? this.currentChapter : ''}`.trim();
		}
		if ((selector || this.activeSelector) === '2' && this.elements.bookChapterText1) {
			console.log(`hi updateBookChapterButton() 1036, triggered by button2 updating button1`);
			this.elements.bookChapterText1.textContent = `${this.elements.bookChapterText1.dataset.versionNameShort} ${this.elements.bookChapterText1.dataset.bookNameShort} ${this.currentChapter}`;
		}  // update chapter number on button 1 only if triggered from button 2
		if ((selector || this.activeSelector) === '1' && this.currentVersion2NameShort && this.elements.bookChapterText2) {
			console.log(`hi updateBookChapterButton() 1055, triggered by button1 updating button2`);
			this.elements.bookChapterText2.textContent = `${this.elements.bookChapterText2.dataset.versionNameShort} ${this.elements.bookChapterText2.dataset.bookNameShort}`;
		}
	}

	/**
	 * Display dual versions content (載入真實資料)
	 */
	async displayDualVersions() {
		const dualMode = this.elements.dualMode;
		if (!dualMode) return;
		
		// 載入真實 API 資料而非模擬資料
		await this.loadChapter();
	}


	/**
	 * Format verse ID
	 */
	formatVerseId(book, chapter, verse) {
		// This is a simplified version - actual implementation will use proper book numbers
		const bookNumber = book || 1; // Placeholder
		return `${bookNumber.toString().padStart(2, '0')}${chapter.toString().padStart(3, '0')}${verse.toString().padStart(3, '0')}`;
	}

	/**
	 * Populate version select dropdown
	 */
	populateVersionSelect(versions) {
		const select = this.elements.versionSelect;
		if (!select) return;
		
		select.innerHTML = '<option value="">Select Version</option>';
		
		versions.forEach(version => {
			const option = document.createElement('option');
			option.value = version.table_name;
			option.textContent = version.version_name;
			select.appendChild(option);
		});
		
		select.disabled = false;
		
		// Auto-select if we have a current version
		if (this.currentVersion1) {
			select.value = this.currentVersion1;
			this.loadBooks();
		}
	}

	/**
	 * Populate book select dropdown
	 */
	populateBookSelect(books) {
		const select = this.elements.bookSelect;
		if (!select) return;
		
		select.innerHTML = '<option value="">Select Book</option>';
		
		books.forEach(book => {
			const option = document.createElement('option');
			option.value = book.book_name;
			option.textContent = book.book_name_display;
			select.appendChild(option);
		});
		
		select.disabled = false;
		
		// Auto-select if we have a current book
		if (this.currentBook) {
			select.value = this.currentBook;
			this.loadChapters();
		}
	}

	/**
	 * Populate chapter select dropdown
	 */
	populateChapterSelect(chapterCount) {
		const select = this.elements.chapterSelect;
		if (!select) return;
		
		select.innerHTML = '<option value="">Select Chapter</option>';
		
		for (let i = 1; i <= chapterCount; i++) {
			const option = document.createElement('option');
			option.value = i;
			option.textContent = i;
			select.appendChild(option);
		}
		
		select.disabled = false;
		
		// Auto-select if we have a current chapter
		if (this.currentChapter) {
			select.value = this.currentChapter;
		}
		
		this.updateLoadButton();
	}

	/**
	 * Reset selectors
	 */
	resetSelectors(selectors) {
		selectors.forEach(selector => {
			switch (selector) {
				case 'version':
					this.elements.versionSelect.empty().append('<option value="">Select Version</option>').prop('disabled', true);
					this.currentVersion1 = '';
					break;
				case 'book':
					this.elements.bookSelect.empty().append('<option value="">Select Book</option>').prop('disabled', true);
					this.currentBook = '';
					break;
				case 'chapter':
					this.elements.chapterSelect.empty().append('<option value="">Select Chapter</option>').prop('disabled', true);
					this.currentChapter = '';
					break;
			}
		});
		
		this.updateLoadButton();
	}

	/**
	 * Update load button state
	 */
	updateLoadButton() {
		const canLoad = this.currentVersion1 && this.currentBook && this.currentChapter;
		this.elements.loadButton.prop('disabled', !canLoad);
	}

	/**
	 * Navigate to previous chapter
	 */
	async navigatePrevious(versionNameShort) {
		console.log(`navigatePrevious() 1109, versionNameShort: ${versionNameShort}, this.currentLanguage1: ${this.currentLanguage1}, this.currentLanguage2: ${this.currentLanguage2} and this.currentChapter: ${this.currentChapter}`);
		if (this.currentChapter > 1) {
			this.currentChapter--;
			this.updateBookChapterButton();
			this.loadChapter(false); // Don't update URL, we'll do it manually
		} else {
			const books1 = await this.cacheManager.getCachedBooks(this.currentLanguage1);
			if (books1 && this.currentChapter > 0 && this.currentBook > 1) {
				const previousBook = books1[this.currentBook - 1];
				this.currentBook = this.currentBook - 1;
				this.currentChapter = previousBook.chapters; // 使用書卷的章節數作為最後一章
				if (this.isDualMode) {
					const books2 = await this.cacheManager.getCachedBooks(this.currentLanguage2);
					if (books2) {this.updateBookChapterButton(null, books2[this.currentBook].title_short, '2')}
				}  // updating button 2 will overwrite button 1 with last wrong value, so we update 1 again
				this.updateBookChapterButton(null, books1[this.currentBook].title_short, '1');
				this.loadChapter(false); // Don't update URL, we'll do it manually
			}
		}

		// Update URL parameters after navigation
		this.updateURLParams({
			version1: this.currentVersion1,
			version2: this.currentVersion2 ? this.currentVersion2 : undefined,
			book: this.currentBook,
			chapter: this.currentChapter,
			mode: this.currentMode,
			language1: this.currentLanguage1
		});
	}

	/**
	 * Navigate to next chapter
	 */
	async navigateNext(versionNameShort) {
		console.log(`navigateNext() 1232, versionNameShort: ${versionNameShort}, this.currentLanguage2: ${this.currentLanguage2} and this.currentChapter: ${this.currentChapter}`);
		const book1 = await this.cacheManager.getCachedBooks(this.currentLanguage1);
		const maxChapters = book1[this.currentBook] ? book1[this.currentBook].chapters : 1;
		if (this.currentChapter < maxChapters) {
			this.currentChapter++;
			this.updateBookChapterButton();
			this.loadChapter(false); // Don't update URL, we'll do it manually
		} else {
			if (book1 && this.currentBook >= 0 && this.currentBook < Object.keys(book1).length) {
				this.currentBook++;
				this.currentChapter = 1;
				if (this.currentLanguage2) {
					const book2 = await this.cacheManager.getCachedBooks(this.currentLanguage2);
					if (book2) {this.updateBookChapterButton(null, book2[this.currentBook].title_short, '2')}
				}  // updating button 2 will overwrite button 1 with last wrong value, so we update 1 again
				this.updateBookChapterButton(null, book1[this.currentBook].title_short, '1');
				this.loadChapter(false); // Don't update URL, we'll do it manually
			}
		}
		
		// Update URL parameters after navigation
		this.updateURLParams({
			version1: this.currentVersion1,
			version2: this.currentVersion2  ? this.currentVersion2 : undefined,
			book: this.currentBook,
			chapter: this.currentChapter,
			mode: this.currentMode,
			language1: this.currentLanguage1
		});
	}

	/**
	 * Perform search
	 * @param {string} searchTerm - The search term (optional, will use input value if not provided)
	 * @param {string} searchStrong - Whether to perform exact match search
	 */
	async performSearch(searchTerm = null, searchStrong = null) {
		// If searchTerm is not provided, get it from the search input (legacy behavior)
		if (!searchTerm) {
			const searchInput = this.container.querySelector('.search-input');
			if (!searchInput) return;
			searchTerm = searchInput.value.trim();
		}
		
		if (!searchTerm || searchTerm.length < 2) {
			if (!searchTerm) {
				alert('請輸入至少2個字符進行搜索');
			}
			return;
		}
		
		// Show loading only for legacy calls
		if (arguments.length === 0) {
			this.showLoading();
		}
		
		try {
			// Build search URL with all books and chapters for full text search
			let searchUrl = `${bibleHereAjax.ajaxurl}?action=bible_here_public_get_verses&version1_bible=${encodeURIComponent(this.currentVersion1)}&search=${encodeURIComponent(searchTerm)}`;

			const response = await fetch(searchUrl, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					"X-WP-Nonce": bibleHereAjax.nonce
				},
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			if (data.success && data.data && data.data.version1) {
				// Only display results for legacy calls
			if (arguments.length === 0) {
				this.displaySearchResults(searchTerm, data.data.version1);
			}
				return data.data.version1;
			} else {
				throw new Error(data.data || 'Not found');
			}
		} catch (error) {
			console.error('Search error:', error);
			// Only show error for legacy calls
			if (arguments.length === 0) {
				this.showError(`Search fail: ${error.message}`);
			}
			throw error; // Re-throw for SearchModal to handle
		} finally {
			// Only hide loading for legacy calls
			if (arguments.length === 0) {
				this.hideLoading();
			}
		}
	}
	
	/**
	 * Display search results in modal
	 */
	displaySearchResults(searchTerm, results) {
		const modal = this.container.querySelector('.search-results-modal');
		const modalTitle = modal.querySelector('.modal-title');
		const modalContent = modal.querySelector('.search-results-list');

		if (!modal || !modalTitle || !modalContent) {
			console.error('Search results modal not found');
			return;
		}
		const resultCounts = results && results.verses && results.verses.length || 0;
		// Set modal title
		modalTitle.textContent = `${resultCounts} search results: "${searchTerm}"`;

		// Generate results HTML
		let html = '<div class="search-results-container">';

		if (resultCounts > 0) {
			const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
			results.verses.forEach(verse => {
				// Highlight search term in verse text with underline
				let highlightedText = verse.text;
				if (searchTerm && searchTerm.trim()) {
					highlightedText = verse.text.replace(regex, '<strong>$1</strong>');
				}
				
				// Generate dynamic URL with book and chapter parameters
				const currentUrl = new URL(window.location);
				currentUrl.searchParams.set('book', verse.book_number);
				currentUrl.searchParams.set('chapter', verse.chapter_number);
				if (verse.verse_number) {
					currentUrl.searchParams.set('verse', verse.verse_number);
				}
				const dynamicHref = currentUrl.toString();
				
				html += `<div class="search-result-item">`;
				html += `<a href="${dynamicHref}" class="search-result-link" data-book="${verse.book_number}" data-chapter="${verse.chapter_number}" data-verse="${verse.verse_number}">`;
				html += `<span class="search-result-reference">${verse.title_full} ${verse.chapter_number}:${verse.verse_number}</span>`;
				html += `<span class="search-result-text">${highlightedText}</span>`;
				html += `</a>`;
				html += `</div>`;
			});
		} else {
			html += '<div class="no-search-results">No search results found.</div>';
		}

		html += '</div>';
		
		modalContent.innerHTML = html;
		
		// Add simplified click event listeners to search result links
		const searchResultLinks = modalContent.querySelectorAll('.search-result-link');
		searchResultLinks.forEach(link => {
			link.addEventListener('click', (e) => {
				// Hide the search results modal when clicking
				this.hideSearchResults();
				// Let the browser handle the navigation via the href URL
			});
		});
		
		// Show modal
		modal.style.display = 'block';
		document.body.style.overflow = 'hidden';
	}
	
	/**
	 * Hide search results modal
	 */
	hideSearchResults() {
		const modal = this.container.querySelector('.search-results-modal');
		if (modal) {
			modal.style.display = 'none';
			document.body.style.overflow = '';
		}
	}

	/**
	 * Navigate to a specific verse
	 * @param {number} bookNumber - The book number
	 * @param {number} chapterNumber - The chapter number
	 * @param {number} verseNumber - The verse number (optional)
	 */
	async navigateToVerse(bookNumber, chapterNumber, verseNumber = null) {
		console.log('🧭 [BibleHereReader] navigateToVerse:', { bookNumber, chapterNumber, verseNumber });
		
		// Update current book and chapter
		this.currentBook = parseInt(bookNumber);
		this.currentChapter = parseInt(chapterNumber);
		
		// Update URL parameters with book and chapter
		this.updateURLParams({
			book: this.currentBook,
			chapter: this.currentChapter
		});
		
		// Update UI selectors
		this.updateBookSelect();
		this.updateChapterSelect();
		this.updateBookChapterButton();
		
		// Load the new chapter
		await this.loadChapter();
		
		// If verse number is specified, scroll to that verse
		if (verseNumber) {
			setTimeout(() => {
				const verseElement = this.container.querySelector(`[data-verse="${verseNumber}"]`);
				if (verseElement) {
					verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
					// Highlight the verse temporarily
					verseElement.style.backgroundColor = '#ffeb3b';
					setTimeout(() => {
						verseElement.style.backgroundColor = '';
					}, 2000);
				}
			}, 500); // Wait for content to load
		}
	}

	/**
	 * Get current book data from cache
	 */
	async getCurrentBookData(language) {
		if (!this.cacheManager) return null;
		try {
			const books = await this.cacheManager.getCachedBooks(language || this.currentLanguage || this.currentLanguage1);
			if (books) {
				return books[this.currentBook];
			}
		} catch (error) {
			console.error('❌ 獲取當前書卷資料失敗:', error);
		}
		
		return null;
	}

	/**
	 * Get cached books
	 */
	// async getCachedBooks(language) {
	// 	if (!this.cacheManager) return null;
		
	// 	try {
	// 		return await this.cacheManager.getCachedBooks(language);
	// 	} catch (error) {
	// 		console.error('❌ [BibleHereReader1189] 獲取書卷快取失敗:', error);
	// 		return null;
	// 	}
	// }

	/**
	 * Toggle between single and dual version modes
	 */
	async toggleVersions() {
		console.log(`1309 Version toggle clicked - switching modes here is this.currentVersion2NameShort: ${this.currentVersion2NameShort}, this.currentVersion1NameShort: ${this.currentVersion1NameShort}`);
		// if (!this.currentVersion2NameShort && this.currentVersion1NameShort) {
		// 	this.currentVersion2NameShort = this.currentVersion1NameShort;
		// }
		// Toggle between single and dual version modes
		this.isDualMode = !this.isDualMode;
		
		// Update button text and visibility
		const versionsButton = this.elements.versionsButton;
		if (versionsButton) {
			const versionsText = versionsButton.querySelector('.versions-text');
			if (versionsText) {
				versionsText.textContent = this.isDualMode ? '- version' : '+ version';
			}
			// Hide the original version button in dual mode
			versionsButton.style.display = this.isDualMode ? 'none' : 'inline-block';
		}
		
		// Show/hide second version selector
		if (this.elements.bookChapterSelector2) {
			this.elements.bookChapterSelector2.style.display = this.isDualMode ? 'block' : 'none';
		}
		
		// Update reader mode
		this.elements.reader.setAttribute('data-mode', this.isDualMode ? 'dual' : 'single');
		
		// Clean up any existing flex styles when switching modes
		if (!this.isDualMode) {
			// Reset any flex styles that might have been applied during dragging
			const dualVersions = this.elements.reader.querySelectorAll('.dual-version-mode .bible-version');
			dualVersions.forEach(version => {
				version.style.flex = '';
				version.style.height = '';
			});
			
			// Ensure single version containers are properly reset
			const singleVersions = this.elements.reader.querySelectorAll('.single-version-mode .bible-version');
			singleVersions.forEach(version => {
				version.style.flex = '';
				version.style.height = '';
			});
		}
		
		// Show/hide appropriate containers
		if (this.elements.singleMode) {
			this.elements.singleMode.style.display = this.isDualMode ? 'none' : 'block';
		}
		
		if (this.elements.dualMode) {
			this.elements.dualMode.style.display = this.isDualMode ? 'block' : 'none';
		}
		
		// Initialize second version if not set
		if (this.isDualMode && !this.currentVersion2) {
			this.initializeSecondVersion();
		}

		const params = {
			version1: this.currentVersion1,
			book: this.currentBook,
			chapter: this.currentChapter,
			mode: this.isDualMode ? 'dual' : 'single',
			language1: this.currentLanguage1,
		}
		// Load content for the current mode - 載入真實 API 資料
		if (this.isDualMode) {
			params['version2'] = this.currentVersion2;
			params['language2'] = this.currentLanguage2;
			// 載入真實 API 資料
			await this.loadChapter();
			// Initialize resizable divider for dual mode
			setTimeout(() => {
				this.initializeResizableDivider();
			}, 100);
		} else {
			// 載入真實 API 資料
			await this.loadChapter();
		}

		this.updateURLParams(params);
	}

	/**
	 * Switch between display modes
	 */
	switchMode(newMode) {
		if (this.elements.zeroMode) this.elements.zeroMode.style.display = 'none';
		if (this.elements.singleMode) this.elements.singleMode.style.display = 'none';
		if (this.elements.dualMode) this.elements.dualMode.style.display = 'none';
		
		switch (newMode) {
			case 'zero':
				if (this.elements.zeroMode) this.elements.zeroMode.style.display = 'block';
				break;
			case 'single':
				if (this.elements.singleMode) this.elements.singleMode.style.display = 'block';
				break;
			case 'dual':
				if (this.elements.dualMode) this.elements.dualMode.style.display = 'block';
				break;
		}
		
		this.currentMode = newMode;
		this.container.data('mode', newMode);
	}

	/**
	 * Show add version interface (placeholder for phase 4)
	 */
	// showAddVersionInterface() {
	// 	alert('Add Version functionality will be implemented in Phase 4: Dual Version Mode');
	// }

	/**
	 * Show loading indicator
	 */
	showLoading() {
		if (this.elements.loadingIndicator) {
			this.elements.loadingIndicator.style.display = 'block';
		}
	}

	/**
	 * Hide loading indicator
	 */
	hideLoading() {
		if (this.elements.loadingIndicator) {
			this.elements.loadingIndicator.style.display = 'none';
		}
	}

	/**
	 * Show error message
	 */
	showError(message) {
		if (this.elements.errorMessage) {
			this.elements.errorMessage.innerHTML = `
				<div class="alert alert-danger">
					<p>${message}</p>
					<button type="button" class="btn btn-primary btn-retry">重試</button>
				</div>
			`;
			this.elements.errorMessage.style.display = 'block';
		}
	}

	/**
	 * Hide error message
	 */
	hideError() {
		if (this.elements.errorMessage) {
			this.elements.errorMessage.style.display = 'none';
		}
	}

	/**
	 * Load version data for pre-configured shortcode
	 */
	loadVersionData() {
		// This will be implemented when API is ready
		console.log('Loading version data for:', this.currentVersion1);
	}

	/**
	 * Initialize second version with default settings
	 */
	initializeSecondVersion() {
		// Set default second version (same as first version), will be updated from cookie later
		this.currentVersion2 = this.currentVersion1;
		this.currentVersion2NameShort = this.currentVersion1NameShort;
		this.currentLanguage2 = this.currentLanguage1;
		// Update second version selector text
		this.updateBookChapterText2();
		
		console.log(`1472 第二個版本初始化為: ${this.currentVersion2}, this.currentVersion2NameShort : ${this.currentVersion2NameShort}`);
	}





	/**
	 * Select version for second reader
	 */
	async selectVersion2(versionElement) {
		const version = versionElement.dataset.version;
		const versionNameShort = versionElement.dataset.versionNameShort;
		console.log(`1485 selectVersion2(), version: ${version}, versionNameShort: ${versionNameShort}`);
		if (version) {
			this.currentVersion2 = version;
			this.currentVersion2NameShort = versionNameShort || version;
			
			// Update button text
			this.updateBookChapterText2();
			
			// Update version selection state
			this.updateVersionSelection2();
			
			// Close menu
			this.elements.bookChapterMenu2.classList.remove('book-chapter-menu-visible');
			
			// Reload chapter with new version
			await this.loadChapter();
			
			console.log('✅ 第二個版本已切換為:', version, versionNameShort);
		}
	}

	/**
	 * Update second version selector text
	 */
	updateBookChapterText2() {
		if (!this.elements.bookChapterText2) return;
		
		const versionText = this.currentVersion2NameShort || this.currentVersion2 || 'KJV';
		this.elements.bookChapterText2.textContent = versionText;
	}



	/**
	 * Toggle theme menu visibility
	 */
	toggleThemeMenu(event) {
		console.log('⚙️ Settings button clicked - toggleThemeMenu called');
		console.log('🔍 Theme menu element:', this.elements.themeMenu);
		
		// 阻止事件冒泡（如果事件對象存在）
		if (event) {
			event.stopPropagation();
		}
		
		if (this.elements.themeMenu) {
			const isVisible = this.elements.themeMenu.classList.contains('theme-menu-visible');
			console.log('👁️ Theme menu currently visible:', isVisible);
			
			if (isVisible) {
				this.elements.themeMenu.classList.remove('theme-menu-visible');
				console.log('🔄 Theme menu hidden using classList');
			} else {
				this.elements.themeMenu.classList.add('theme-menu-visible');
				console.log('🔄 Theme menu shown using classList');
				
				// Update radio button selection
				const radioButton = this.elements.themeMenu.querySelector(`input[value="${this.themePreference}"]`);
				if (radioButton) {
					radioButton.checked = true;
					console.log('✅ Radio button updated for theme:', this.themePreference);
				}
			}
		} else {
			console.error('❌ Theme menu element not found!');
		}
	}

	/**
	 * Hide theme menu
	 */
	hideThemeMenu() {
		if (this.elements.themeMenu) {
			this.elements.themeMenu.classList.remove('theme-menu-visible');
		}
	}

	/**
	 * Set theme preference
	 */
	setThemePreference(preference) {
		this.themePreference = preference;
		localStorage.setItem('bible-here-theme', preference);
		this.applyTheme(preference);
	}

	/**
	 * Apply theme to the reader
	 */
	applyTheme(theme) {
		// Remove existing theme classes
		this.container.classList.remove('theme-light', 'theme-dark', 'theme-system');
		
		// Apply new theme class
		this.container.classList.add(`theme-${theme}`);
		
		// Handle system preference
		if (theme === 'system') {
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			this.container.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
			
			// Listen for system theme changes
			if (!this.systemThemeListener) {
				this.systemThemeListener = (e) => {
					if (this.themePreference === 'system') {
						this.container.classList.remove('theme-light', 'theme-dark');
						this.container.classList.add(e.matches ? 'theme-dark' : 'theme-light');
					}
				};
				window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', this.systemThemeListener);
			}
		}
	}
	
	/**
	 * Set font size preference
	 */
	setFontSize(sizeIndex) {
		console.log('🔧 setFontSize called with index:', sizeIndex);

		const fontSizes = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'];
		const fontSizePixels = ['8px', '12px', '16px', '20px', '24px', '28px', '30px', '32px'];

		// Validate index
		const index = parseInt(sizeIndex);
		if (isNaN(index) || index < 0 || index >= fontSizes.length) {
			console.error('❌ Invalid font size index:', sizeIndex);
			return;
		}

		const size = fontSizes[index];
		const pixelSize = fontSizePixels[index];

		console.log('📏 Setting font size to:', size, '(' + pixelSize + ')');

		this.fontSizePreference = size;

		// Save to localStorage with error handling
		try {
			localStorage.setItem('bible-here-font-size', size);
			console.log('💾 Font size saved to localStorage:', size);
		} catch (error) {
			console.error('❌ Failed to save font size to localStorage:', error);
		}

		this.applyFontSize(size);

		// Update the display value
		const fontSizeValue = this.container.querySelector('.font-size-value');
		if (fontSizeValue) {
			fontSizeValue.textContent = pixelSize;
			console.log('🏷️ Updated font size display to:', pixelSize);
		} else {
			console.warn('⚠️ Font size value display element not found');
		}
	}

	applyStoredFontSize() {
		const fontSizes = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'];
		// const fontSizePixels = [8, 12, 16, 20, 24, 28, 30, 32];

		const stored = localStorage.getItem('bible-here-font-size') || 'base';
		const index = fontSizes.indexOf(stored);
		const closestIndex = index !== -1 ? index : 2;

		this.setFontSize(closestIndex);
	}

	/**
	 * Apply font size to the reader
	 */
	applyFontSize(size) {
		// console.log('🎨 Applying font size:', size);
		// console.log('🔍 Container element:', this.container);
		
		// Remove existing font size classes - corrected class names to match CSS
		const existingClasses = ['font-size-xs', 'font-size-sm', 'font-size-base', 'font-size-lg', 'font-size-xl', 'font-size-2xl', 'font-size-3xl', 'font-size-4xl'];
		existingClasses.forEach(className => {
			if (this.container.classList.contains(className)) {
				console.log('🗑️ Removing existing class:', className);
				this.container.classList.remove(className);
			}
		});
		
		// Apply new font size class
		const newClassName = `font-size-${size}`;
		this.container.classList.add(newClassName);
		// console.log('✅ Added new font size class:', newClassName);
		
		// Force a style recalculation
		this.container.offsetHeight;
		
		// Verify the class was applied
		if (this.container.classList.contains(newClassName)) {
			// console.log('✅ Font size class successfully applied');
		} else {
			console.error('❌ Failed to apply font size class');
		}
		
		// Log current classes for debugging
		// console.log('📋 Current container classes:', Array.from(this.container.classList));
		
		// Check if verse elements exist and log their computed styles  Todo: change querySelectorAll to querySelector since we only need the first one.
		const verseTexts = this.container.querySelectorAll('.verse-text');
		const verseNumbers = this.container.querySelectorAll('.verse_number');
		
		console.log('📝 [BibleHereReader1676] applyFontSize() Found verse texts:', verseTexts.length);
		console.log('🔢 [BibleHereReader1677] applyFontSize() Found verse numbers:', verseNumbers.length);
		
		if (verseTexts.length > 0) {
			const firstVerseText = verseTexts[0];
			const computedStyle = window.getComputedStyle(firstVerseText);
			console.log('📏 First verse text computed font-size:', computedStyle.fontSize);
		}
		
		if (verseNumbers.length > 0) {
			const firstVerseNumber = verseNumbers[0];
			const computedStyle = window.getComputedStyle(firstVerseNumber);
			console.log('🔢 First verse number computed font-size:', computedStyle.fontSize);
		}
	}
	
	/**
	 * Initialize font size slider
	 */
	initializeFontSizeSlider() {
		const fontSizes = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'];
		const fontSizePixels = ['8px', '12px', '16px', '20px', '24px', '28px', '30px', '32px'];
		
		const slider = this.container.querySelector('.font-size-slider');
		const valueDisplay = this.container.querySelector('.font-size-value');
		
		if (slider && valueDisplay) {
			// Set current value
			let currentIndex = fontSizes.indexOf(this.fontSizePreference);
			// If preference not found, default to 'base' (index 2)
			if (currentIndex === -1) {
				currentIndex = 2;
				this.fontSizePreference = 'base';
			}
			slider.value = currentIndex;
			valueDisplay.textContent = fontSizePixels[currentIndex];
			// console.log('🎚️ Font size slider initialized with index:', currentIndex, 'size:', this.fontSizePreference);
		}
	}
	
	/**
	 * Initialize synchronized scrolling for dual version mode
	 */
	initializeSynchronizedScrolling() {
		this.isScrollSyncing = false;

		const dualMode = this.container.querySelector('.dual-version-mode');
		if (!dualMode) return;

		const version1Container = dualMode.querySelector('.version-1 .verses-container');
		const version2Container = dualMode.querySelector('.version-2 .verses-container');
		
		if (!version1Container || !version2Container) return;

		version1Container.addEventListener('scroll', () => {  // 版本1捲動時同步版本2
			if (this.isScrollSyncing) return;
			this.syncScrollByVerse(version1Container, version2Container);
		});

		version2Container.addEventListener('scroll', () => {  // 版本2捲動時同步版本1  
			if (this.isScrollSyncing) return;
			this.syncScrollByVerse(version2Container, version1Container);
		});
	}

	syncScrollByVerse(sourceContainer, targetContainer) {
		this.isScrollSyncing = true;

		try {  // 找到源容器中最頂部可見的經文
			const topVisibleVerse = this.getTopVisibleVerse(sourceContainer);
			if (topVisibleVerse) {
				const verseId = topVisibleVerse.getAttribute('data-verse');
				const targetVerse = targetContainer.querySelector(`[data-verse="${verseId}"]`);  // 在目標容器中找到相同的經文

				if (targetVerse) {  // 捲動目標容器，使該經文出現在頂部
					targetContainer.scrollTop = targetVerse.offsetTop;
				}
			}
		} catch (error) {
			console.error('Verse sync error:', error);
		} finally {
			setTimeout(() => {
				this.isScrollSyncing = false;
			}, 10);
		}
	}

	getTopVisibleVerse(container) {
		const verses = container.querySelectorAll('[data-verse]');
		const containerTop = container.scrollTop;
		const containerHeight = container.clientHeight;

		for (let verse of verses) {
			const verseTop = verse.offsetTop;
			const verseBottom = verseTop + verse.offsetHeight;

			if (verseBottom > containerTop && verseTop < containerTop + containerHeight) {  // 如果經文在可見區域內
				return verse;
			}
		}
		return null;
	}

	/**
	 * Initialize resizable divider for dual version mode
	 */
	initializeResizableDivider() {
		// Get dual version mode container
		const dualMode = this.container.querySelector('.dual-version-mode');
		if (!dualMode) return;
		
		// Get divider and version containers
		const divider = dualMode.querySelector('.resizable-divider');
		const version1 = dualMode.querySelector('.bible-version.version-1');
		const version2 = dualMode.querySelector('.bible-version.version-2');
		
		if (!divider || !version1 || !version2) {
			console.log('Divider initialization failed - missing elements:', {
				divider: !!divider,
				version1: !!version1,
				version2: !!version2
			});
			return;
		}
		
		console.log('Initializing resizable divider');
		
		// Remove any existing event listeners to prevent duplicates
		if (this.dividerMouseDown) {
			divider.removeEventListener('mousedown', this.dividerMouseDown);
		}
		if (this.dividerTouchStart) {
			divider.removeEventListener('touchstart', this.dividerTouchStart);
		}
		
		// Create bound event handlers
		this.dividerMouseDown = (e) => {
			e.preventDefault();
			console.log('Mouse down on divider');
			this.startDrag(e.clientY, dualMode, version1, version2);
		};
		
		this.dividerTouchStart = (e) => {
			e.preventDefault();
			console.log('Touch start on divider');
			const touch = e.touches[0];
			this.startDrag(touch.clientY, dualMode, version1, version2);
		};
		
		// Add event listeners
		divider.addEventListener('mousedown', this.dividerMouseDown);
		divider.addEventListener('touchstart', this.dividerTouchStart, { passive: false });
		
		// Ensure global event listeners are set up only once
		if (!this.globalDragListenersAdded) {
			this.globalDragListenersAdded = true;
			
			// Global mouse move and up events
			document.addEventListener('mousemove', (e) => {
				if (this.isDragging) {
					e.preventDefault();
					this.handleDrag(e.clientY);
				}
			});
			
			document.addEventListener('mouseup', () => {
				if (this.isDragging) {
					this.endDrag();
				}
			});
			
			// Global touch move and end events
			document.addEventListener('touchmove', (e) => {
				if (this.isDragging) {
					e.preventDefault();
					const touch = e.touches[0];
					this.handleDrag(touch.clientY);
				}
			}, { passive: false });
			
			document.addEventListener('touchend', () => {
				if (this.isDragging) {
					this.endDrag();
				}
			});
		}
	}
	
	/**
	 * Start dragging the divider
	 */
	startDrag(clientY, container, version1, version2) {
		this.isDragging = true;
		this.startY = clientY;
		this.containerHeight = container.clientHeight;
		
		// Get current flex values
		const version1Style = window.getComputedStyle(version1);
		const version2Style = window.getComputedStyle(version2);
		
		this.startVersion1Flex = parseFloat(version1Style.flexGrow) || 1;
		this.startVersion2Flex = parseFloat(version2Style.flexGrow) || 1;
		
		// Store references for dragging
		this.dragContainer = container;
		this.dragVersion1 = version1;
		this.dragVersion2 = version2;
		
		// Add dragging class for visual feedback
		container.classList.add('divider-dragging');
		document.body.style.cursor = 'ns-resize';
		document.body.style.userSelect = 'none';
	}
	
	/**
	 * Handle drag movement
	 */
	handleDrag(clientY) {
		if (!this.isDragging) return;
		
		const deltaY = clientY - this.startY;
		// Use a more sensitive ratio calculation - divide by half the container height
		// This makes the drag movement more responsive and 1:1 with mouse movement
		const deltaRatio = (deltaY * 2) / this.containerHeight;
		
		// Calculate new flex values (intuitive dragging - down increases version1, up increases version2)
		let newVersion1Flex = this.startVersion1Flex + deltaRatio;
		let newVersion2Flex = this.startVersion2Flex - deltaRatio;
		
		// Constrain flex values (minimum 0.2, maximum 1.8)
		newVersion1Flex = Math.max(0.2, Math.min(1.8, newVersion1Flex));
		newVersion2Flex = Math.max(0.2, Math.min(1.8, newVersion2Flex));
		
		// Ensure total flex is approximately 2
		const totalFlex = newVersion1Flex + newVersion2Flex;
		if (totalFlex !== 2) {
			const adjustment = (2 - totalFlex) / 2;
			newVersion1Flex += adjustment;
			newVersion2Flex += adjustment;
		}
		
		// Apply new flex values
		this.dragVersion1.style.flex = newVersion1Flex;
		this.dragVersion2.style.flex = newVersion2Flex;
	}
	
	/**
	 * End dragging
	 */
	endDrag() {
		this.isDragging = false;
		
		// Remove dragging class and reset cursor
		if (this.dragContainer) {
			this.dragContainer.classList.remove('divider-dragging');
		}
		document.body.style.cursor = '';
		document.body.style.userSelect = '';
		
		// Clear references
		this.dragContainer = null;
		this.dragVersion1 = null;
		this.dragVersion2 = null;
	}

	/**
	 * Bind book chapter menu events
	 */
	bindBookChapterMenuEvents() {
		if (!this.elements.bookChapterMenu) return;

		// Tab switching
		const tabs = this.elements.bookChapterMenu.querySelectorAll('.menu-tab');
		tabs.forEach(tab => {
			tab.addEventListener('click', (e) => {
				e.preventDefault();
				console.log('1804 Tab clicked:', tab.dataset.tab);
				this.switchBookChapterTab(tab.dataset.tab);
			});
		});

		// Version items - delegate to versions tab content
		const versionsTabContent = this.elements.bookChapterMenu.querySelector('.tab-content[data-content="versions"] .versions-list');
		if (versionsTabContent) {
			versionsTabContent.addEventListener('click', (e) => {
				const item = e.target.closest('.version-item');
				if (!item) return;
				this[`currentVersion${this.activeSelector}NameShort`] = item.dataset.versionNameShort;
				this.selectVersionAndLoadBooksTab(item.dataset);
			});
		}

		// Book selection
		const bookItems = this.elements.bookChapterMenu.querySelectorAll('.book-item');
		bookItems.forEach(item => {
			item.addEventListener('click', () => {
				console.log("1822 book-item 被點擊, here is item:", item);
				this.selectBook(item);
			});
		});
		// Chapter selection will be dynamically bound when chapters are populated
	}

	/**
	 * Toggle book chapter menu
	 */
	toggleBookChapterMenu() {
		if (!this.elements.bookChapterMenu) {
			return;
		}

		if (this.elements.bookChapterMenu.classList.contains('book-chapter-menu-visible')) {
			this.hideBookChapterMenu();
		} else {
			this.showBookChapterMenu();
		}
	}

	/**
	 * Show book chapter menu
	 */
	showBookChapterMenu() {
		if (!this.elements.bookChapterMenu) {
			return;
		}

		// Hide theme menu if open
		this.hideThemeMenu();

		// Show menu
		this.elements.bookChapterMenu.classList.add('book-chapter-menu-visible');

		// Initialize with books tab if not already set
		const activeTab = this.elements.bookChapterMenu.querySelector('.menu-tab.active');
		if (!activeTab) {
			this.switchBookChapterTab('books');
		} else {
			// Call switchBookChapterTab to ensure the corresponding load function is executed
			this.switchBookChapterTab(activeTab.dataset.tab);
		}
	}

	/**
	 * Hide book chapter menu
	 */
	hideBookChapterMenu() {
		if (this.elements.bookChapterMenu) {
			this.elements.bookChapterMenu.classList.remove('book-chapter-menu-visible');
			// console.log("hideBookChapterMenu() 1885 , nullify this.activeSelector");
			// this.activeSelector = null;  // verses loading still needs activeSelector 
		}
	}

	/**
	 * Switch book chapter menu tab
	 */
	switchBookChapterTab(tabName) {
		if (!this.elements.bookChapterMenu) {
			return;
		}

		// Update tab buttons
		const tabs = this.elements.bookChapterMenu.querySelectorAll('.menu-tab');
		tabs.forEach(tab => {
			tab.classList.toggle('active', tab.dataset.tab === tabName);
		});

		// Update content
		const contents = this.elements.bookChapterMenu.querySelectorAll('.tab-content');
		contents.forEach(content => {
			content.classList.toggle('active', content.dataset.content === tabName);
		});

		// Load content based on tab
		switch (tabName) {
			case 'versions':
				this.loadVersionsTab();
				break;
			case 'books':
				this.loadBooksTabAndUpdateBookChapterButton();
				break;
			case 'chapters':
				this.loadChaptersTab();
				break;
		}
	}

	/**
	 * Load versions tab content using cache manager or API
	 */
	async loadVersionsTab() {
		console.log('📚 開始載入版本列表');
		const versionsContent = this.elements.bookChapterMenu.querySelector('.tab-content[data-content="versions"] .versions-list');
		if (!versionsContent) {
			console.log('❌ 找不到版本內容容器');
			return;
		}

		// Show loading state
		versionsContent.innerHTML = '<div class="loading-message">Loading versions...</div>';

		try {
			let versions = null;
			
			// 嘗試從快取獲取版本列表
		if (this.cacheManager) {
			console.log('🗄️ [BibleHereReader] 嘗試從快取獲取版本列表');
			versions = await this.cacheManager.getVersions(navigator.languages, ["Bible", "Bible+Strong"]);
			
			if (versions && versions.length > 0) {
				console.log('✅ [BibleHereReader] 從快取獲取到版本列表，版本數量:', versions.length);
				console.log('📖 [BibleHereReader] 快取版本資料預覽:', versions.slice(0, 3));
				this.renderVersionsList(versions, versionsContent);
				return;
			} else {
				console.log('⚠️ [BibleHereReader] 快取中沒有找到版本列表，將從 API 獲取');
			}
		}

			// 從 API 獲取版本列表
			console.log('🌐 從 API 獲取版本列表');
			const params = new URLSearchParams({
				action: 'bible_here_public_get_versions',
			});

			const requestUrl = `${bibleHereAjax.ajaxurl}?${params}`;
			console.log('📡 發送 AJAX 請求到:', requestUrl);

			const response = await fetch(requestUrl, {
				method: 'GET',
				headers: {
					"X-WP-Nonce": bibleHereAjax.nonce
				}
			});
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			
			const data = await response.json();
			console.log('📊 API 回應資料:', data);
			
			if (data.success && data.data && data.data.versions) {
				console.log('✅ API 返回版本列表，版本數量:', data.data.versions.length);
				
				// 快取 API 結果
			if (this.cacheManager) {
				console.log('💾 [BibleHereReader] 將版本列表存入快取');
				console.log('📊 [BibleHereReader] 準備快取的版本資料:', {
					// language: this.currentLanguage,
					count: data.data.versions.length,
					sample: data.data.versions.slice(0, 2)
				});
				await this.cacheManager.cacheVersions(data.data.versions);
				console.log('✅ [BibleHereReader] 版本資料已成功存入快取');
			}
				
				this.renderVersionsList(data.data.versions, versionsContent);
			} else {
				throw new Error(data.data?.message || 'Cannot load versions');
			}
			
		} catch (error) {
			console.error('❌ 載入版本列表失敗:', error);
			versionsContent.innerHTML = `<div class="error-message">Loading versions failed: ${error.message}</div>`;
		}
	}

	/**
	 * Render versions list grouped by language
	 */
	renderVersionsList(versions, container) {
		// Group versions by language
		const languageGroups = {};
		versions.forEach(version => {
			const langKey = version.language_code;
			if (!languageGroups[langKey]) {
				languageGroups[langKey] = {
					name: version.language_name,
					original: version.language_original,
					versions: []
				};
			}
			languageGroups[langKey].versions.push(version);
		});
		console.log('🔄 [BibleHereReader1914] 按語言分組版本 (no name_short):', languageGroups);
		// Generate HTML
		let html = '';
		Object.keys(languageGroups).forEach(langKey => {
			const group = languageGroups[langKey];
			
			// Language header
			html += `<div class="language-group">`;
			html += `<h4 class="language-title">${group.original || group.name}</h4>`;
			
			// Versions in this language
			group.versions.forEach(version => {
				const isActive = version.table_name === this.currentVersion1;
				html += `<div class="version-item ${isActive ? 'active' : ''}" data-version-language="${version.language_code}" data-version="${version.table_name}" data-version-name-short="${version.name_short}">`;
				html += `<span class="version-name">${version.name}</span>`;
				if (version.publisher) {
					html += `<span class="version-publisher">${version.publisher}</span>`;
				}
				html += `</div>`;
			});
			
			html += `</div>`;
		});

		container.innerHTML = html;
	}

	/**
	 * Load books tab content using cache manager or API
	 */
	async loadBooksTabAndUpdateBookChapterButton(versionNameShort) {
		console.log('📚 2530 開始載入書卷列表: versionNameShort and this.currentBook: ', versionNameShort, this.currentBook);
		const booksContent = this.elements.bookChapterMenu.querySelector('.tab-content[data-content="books"]');
		if (!booksContent) {
			console.log('❌ 找不到書卷內容容器');
			return;
		}

		const currentLanguageVariable = 'currentLanguage' + this.activeSelector;
		const currentLanguage = this[currentLanguageVariable];
		try {
			let books = null;
			// 嘗試從快取獲取書卷列表
			if (this.cacheManager) {
				books = await this.cacheManager.getCachedBooks(this['currentLanguage' + this.activeSelector]);
			if (books && Object.keys(books).length > 0) {
					this.renderBooksList(Object.values(books), booksContent);
					this.updateBookChapterButton(versionNameShort, books[this.currentBook].title_short);
					return;
				} else {
					console.log('⚠️ [BibleHereReader] 快取中沒有找到書卷列表，將從 API 獲取');
				}
			}

			// 從 API 獲取書卷列表
			console.log('🌐 Fetch book data from API');
			const params = new URLSearchParams({
				action: 'bible_here_public_get_books',
				languages: [...navigator.languages, currentLanguage],
			});

			console.log('📡 initialize AJAX to:', `${bibleHereAjax.ajaxurl}?${params}`);

			const response = await fetch(`${bibleHereAjax.ajaxurl}?${params}`, {
				method: 'GET',
				headers: {
					"X-WP-Nonce": bibleHereAjax.nonce,
				},
			});

			const data = await response.json();
			console.log('📊 API response:', data);
			
			if (!data.success) {
				throw new Error(data.data || 'Failed to load books');
			}

			// books = data.data.books;
			console.log('📚 2585 fetched book data from API, current language number:', Object.keys(data.data[currentLanguage]).length);

			// 渲染書卷列表 - 傳入陣列格式
			this.renderBooksList(Object.values(data.data[currentLanguage]), booksContent);
			this.updateBookChapterButton(versionNameShort, data.data[currentLanguage][this.currentBook].title_short);
			// 將書卷資料存入快取 - 轉換物件為陣列格式
			// const booksArray = Object.values(books);
			if (this.cacheManager && data.data && Object.keys(data.data).length > 0) {
				console.log('💾 [BibleHereReader2593] cache fetched book data');
				try {
					this.cacheManager.cacheBooks(data.data);
					console.log('✅ [BibleHereReader] 書卷資料已開始存入快取');
				} catch (cacheError) {
					console.error('❌ [BibleHereReader] 存入快取時發生錯誤:', cacheError);
				}
				// })
			}

			
		} catch (error) {
			console.error('❌ 載入書卷列表時發生錯誤:', error);
			// 顯示錯誤訊息給用戶, Todo: just use cache when offline
			booksContent.innerHTML = '<div class="error-message">載入書卷列表時發生錯誤，請稍後再試。</div>';
		}
	}

	/**
	 * Render books list from data
	 */
	renderBooksList(books, booksContent) {
		// 分離舊約和新約書卷, genre_type可能不是英文, 故無法直接使用 genre_type 分離
		const oldTestament = books.filter(book => book.book_number && book.book_number <= 39);  // 假設舊約書卷編號 1-39
		const newTestament = books.filter(book => book.book_number && book.book_number >= 40);  // 假設新約書卷編號 40-66

		console.log('📖 舊約書卷數量:', oldTestament.length, '新約書卷數量:', newTestament.length);

		// 找到預定義的 books-grid 容器
		const oldTestamentGrid = booksContent.querySelector('.books-grid.old-testament');
		const newTestamentGrid = booksContent.querySelector('.books-grid.new-testament');
		
		if (!oldTestamentGrid || !newTestamentGrid) {
			console.error('❌ 找不到預定義的 books-grid 容器');
			return;
		}

		// 渲染舊約書卷
		let oldTestamentHtml = '';
		oldTestament.forEach(book => {
			// 使用 book_name 作為 key，如果沒有則使用 book_key
			// const bookKey = book.title_short;
			const isActive = book.book_number === this.currentBook;
			
			// const bookDisplayName = book.book_abbreviation || book.book_name;
			// const bookFullName = book.book_name;
			
			oldTestamentHtml += `<div class="book-item ${isActive ? 'active' : ''}" data-book-number=${book.book_number} data-book="${book.title_short}" title="${book.title_full}">`;
			oldTestamentHtml += `<span class="book-name">${book.title_short}</span>`;
			oldTestamentHtml += `<span class="book-full-name">${book.title_full}</span>`;
			oldTestamentHtml += `</div>`;
		});

		// 渲染新約書卷
		let newTestamentHtml = '';
		newTestament.forEach(book => {
			// 使用 book_name 作為 key，如果沒有則使用 book_key
			// const bookKey = book.title_short;
			const isActive = book.book_number === this.currentBook;
			
			// const bookDisplayName = book.book_abbreviation || book.book_name;
			// const bookFullName = book.book_name;
			
			newTestamentHtml += `<div class="book-item ${isActive ? 'active' : ''}" data-book-number=${book.book_number} data-book="${book.title_short}" title="${book.title_full}">`;
			newTestamentHtml += `<span class="book-name">${book.title_short}</span>`;
			newTestamentHtml += `<span class="book-full-name">${book.title_full}</span>`;
			newTestamentHtml += `</div>`;
		});

		// 將書卷資料插入到預定義的容器中
		oldTestamentGrid.innerHTML = oldTestamentHtml;
		newTestamentGrid.innerHTML = newTestamentHtml;
		console.log('✅ 書卷列表已插入到預定義的 books-grid 容器中');

		// 綁定書卷點擊事件  Todo: reduce the number of the event listener
		const bookItems = booksContent.querySelectorAll('.book-item');
		bookItems.forEach(item => {
			item.addEventListener('click', () => {
				// const bookName = item.querySelector('.book-full-name').textContent;
				console.log('📚 2363 書卷被點擊:', { bookKey: item.dataset.book, item: item, item_dataset_bookNumber: item.dataset.bookNumber});
				this.selectBook(item);
			});
		});
		console.log('🔗 2367 書卷點擊事件已綁定，共', bookItems.length, '個書卷');
	}

	/**
	 * Update active states for existing book items
	 */
	updateBookActiveStates() {
		const booksContent = this.elements.bookChapterMenu.querySelector('.tab-content[data-content="books"]');
		if (!booksContent) return;

		// Remove all active classes
		const allBookItems = booksContent.querySelectorAll('.book-item');
		allBookItems.forEach(item => {
			item.classList.remove('active');
		});

		// Add active class to current book
		const currentBookItem = booksContent.querySelector(`[data-book="${this.currentBook}"]`);
		if (currentBookItem) {
			currentBookItem.classList.add('active');
		}
	}

	/**
	 * Load chapters tab content dynamically from books cache
	 */
	async loadChaptersTab() {
		console.log('📖 開始載入章節列表');
		const chaptersContent = this.elements.bookChapterMenu.querySelector('.tab-content[data-content="chapters"] .chapters-grid');
		if (!chaptersContent) {
			console.log('❌ 找不到章節內容容器');
			return;
		}

		// Get chapter count from books cache
		let chapterCount = 1; // Default fallback
		
		try {
			const currentBookData = await this.getCurrentBookData();
			if (currentBookData && currentBookData.chapters) {
				chapterCount = currentBookData.chapters;
				console.log('📚 從快取獲取章節數量:', { book: this.currentBook, chapters: chapterCount });
			} else {
				console.log('⚠️ 無法從快取獲取章節數量，使用預設值 1');
			}
		} catch (error) {
			console.error('❌ 獲取章節數量時發生錯誤:', error);
		}

		// Generate chapter grid
		let html = '';
		for (let i = 1; i <= chapterCount; i++) {
			const isActive = i === this.currentChapter;
			html += `<div class="chapter-item ${isActive ? 'active' : ''}" data-chapter="${i}">${i}</div>`;
		}

		chaptersContent.innerHTML = html;
		console.log('✅ 章節列表已生成，共', chapterCount, '章');

		// Bind events for new chapter items
		const chapterItems = chaptersContent.querySelectorAll('.chapter-item');
		chapterItems.forEach(item => {
			item.addEventListener('click', () => {
				console.log('📖 章節被點擊:', item.dataset.chapter);
				this.selectChapter(parseInt(item.dataset.chapter));
			});
		});
		console.log('🔗 章節點擊事件已綁定，共', chapterItems.length, '個章節');
	}

	/**
	 * Select version
	 */
	selectVersionAndLoadBooksTab(versionDataset) {
		console.log("📚 2441 selectVersionAndLoadBooksTab(), versionDataset:", versionDataset);
		console.log(`🎯 當前活動選擇器: this.activeSelector: ${this.activeSelector} version1NameShort: ${this.currentVersion1NameShort} version2NameShort: ${this.currentVersion2NameShort}`);
		// 根據activeSelector更新對應的版本
		if (this.activeSelector === '2') {  // 更新第二版本
console.log("🎯 2445 this.currentVersion1NameShort:", this.currentVersion1NameShort);
			this.currentLanguage2 = versionDataset.versionLanguage;
			this.currentVersion2 = versionDataset.version;
			this.currentVersion2NameShort = versionDataset.versionNameShort;
			console.log("🎯 2449 this.currentVersion2NameShort:", this.currentVersion2NameShort);
			this.loadBooksTabAndUpdateBookChapterButton(versionDataset.versionNameShort);
			console.log("✅ 第二版本已更新為:", versionDataset.version);
		} else {
			// 更新第一版本（默認）
			this.currentVersion1 = versionDataset.version;
			this.currentLanguage = versionDataset.versionLanguage;
			this.currentLanguage1 = versionDataset.versionLanguage;
			this.currentVersion1NameShort = versionDataset.versionNameShort;
			console.log("🎯 2458 this.currentVersion1NameShort:", this.currentVersion1NameShort);
			this.loadBooksTabAndUpdateBookChapterButton(versionDataset.versionNameShort);
			console.log("✅ 第一版本已更新為:", versionDataset.version);
		}
		console.log(`✅ 版本列表顯示已更新 version1NameShort: ${this.currentVersion1NameShort} version2NameShort: ${this.currentVersion2NameShort}`);
		this.switchBookChapterTab('books');
		this.loadChapter();
	}

	/**
	 * Select book Todo: need to set both button's data atributes
	 */ 
	async selectBook(item) {
		this.currentBook = parseInt(item.dataset.bookNumber);
		this.currentChapter = 1; // Reset to chapter 1
		console.log('📚 2473 selectBook: item.dataset.book & bookNumber', item.dataset.book, this.currentBook );

		if (this.currentVersion1NameShort) {
			const current1BookData = await this.getCurrentBookData(this.currentLanguage1);
			if (current1BookData) {
				console.log("2483 current1BookData:", current1BookData);
				this.elements.bookChapterText1.dataset.bookNameShort = current1BookData.title_short;
			}
		}

		if (this.currentVersion2NameShort) {
			const current2BookData = await this.getCurrentBookData(this.currentLanguage2);
			if (current2BookData) {
				console.log("2486 current1BookData:", current2BookData);
				this.elements.bookChapterText2.dataset.bookNameShort = current2BookData.title_short;
			}
		}

		await this.loadChaptersTab();
		this.updateBookChapterButton(null, item.dataset.book);
		this.switchBookChapterTab('chapters');
		this.loadChapter();
	}

	/**
	 * Select chapter
	 */
	selectChapter(chapterNumber) {
		this.currentChapter = chapterNumber;
		this.updateBookChapterButton();
		this.hideBookChapterMenu();
		console.log('📚 2519 selectChapter: chapterNumber', chapterNumber);
		this.loadChapter();
	}

	swapVersions() {
    	console.log('🔄 2524 swapVersions() 開始版本切換');
		const version1BookNameShort = this.elements.bookChapterText1.dataset.bookNameShort;
		const version2BookNameShort = this.elements.bookChapterText2.dataset.bookNameShort;
		if (!this.isDualMode) return;
    	console.log('🔄 切換前狀態:', {
			language1: this.currentLanguage1,
			language2: this.currentLanguage2,
			version1: this.currentVersion1,
			version2: this.currentVersion2,
			chapter1NameShort: version1BookNameShort,
			chapter2NameShort: version2BookNameShort,
			version1NameShort: this.currentVersion1NameShort,
			version2NameShort: this.currentVersion2NameShort
		});

		// 交換語言
		const tempLanguage = this.currentLanguage1;
		this.currentLanguage1 = this.currentLanguage2;
		this.currentLanguage2 = tempLanguage;

		// 交換版本
		const tempVersion = this.currentVersion1;
		this.currentVersion1 = this.currentVersion2;
		this.currentVersion2 = tempVersion;

		// 交換版本簡稱
		const tempVersionNameShort = this.currentVersion1NameShort;
		this.currentVersion1NameShort = this.currentVersion2NameShort;
		this.currentVersion2NameShort = tempVersionNameShort;

		console.log('🔄 切換後狀態:', {
			language1: this.currentLanguage1,
			language2: this.currentLanguage2,
			version1: this.currentVersion1,
			version2: this.currentVersion2,
			version1NameShort: this.currentVersion1NameShort,
			version2NameShort: this.currentVersion2NameShort
		});

		// 更新容器的 data 屬性
		this.updateContainerDataAttributes();
		
		// 更新UI顯示
		this.updateVersionSelectors();
		
		// 重新載入章節內容（保持當前書卷和章節）
		this.loadChapter();

		this.elements.bookChapterText1.dataset.bookNameShort = version2BookNameShort;
		this.elements.bookChapterText1.dataset.versionNameShort = this.currentVersion1NameShort;
		this.elements.bookChapterText2.dataset.bookNameShort = version1BookNameShort;
		this.elements.bookChapterText2.dataset.versionNameShort = this.currentVersion2NameShort;
		this.updateBookChapterButton(this.currentVersion2NameShort, version1BookNameShort, '2');

		console.log('✅ 版本切換完成');
	}

	updateContainerDataAttributes() {
		// 更新容器的 data 屬性
		this.container.dataset.language1 = this.currentLanguage1;
		this.container.dataset.language2 = this.currentLanguage2;
		this.container.dataset.version1 = this.currentVersion1;
		this.container.dataset.version2 = this.currentVersion2;
		this.container.dataset.version1NameShort = this.currentVersion1NameShort;
		this.container.dataset.version2NameShort = this.currentVersion2NameShort;
		this.container.dataset.book = this.currentBook;
		this.container.dataset.chapter = this.currentChapter;
		this.container.dataset.mode = this.currentMode;
	}

	updateVersionSelectors() {
		// 更新第一版本的顯示文字和 data 屬性
		const bookChapterText1 = this.container.querySelector('.book-chapter-text1');
		if (bookChapterText1) {
			// 更新 data 屬性
			bookChapterText1.dataset.versionNameShort = this.currentVersion1NameShort;
			// 保持原有的書卷縮寫，只更新版本縮寫
			const bookNameShort = bookChapterText1.dataset.bookNameShort || '';
			bookChapterText1.textContent = `${this.currentVersion1NameShort} ${bookNameShort} ${this.currentChapter}`.trim();
		}
		
		// 更新第二版本的顯示文字和 data 屬性
		const bookChapterText2 = this.container.querySelector('.book-chapter-text2');
		if (bookChapterText2) {
			// 更新 data 屬性
			bookChapterText2.dataset.versionNameShort = this.currentVersion2NameShort;
			// 保持原有的書卷縮寫，只更新版本縮寫
			const bookNameShort = bookChapterText2.dataset.bookNameShort || '';
			bookChapterText2.textContent = `${this.currentVersion2NameShort} ${bookNameShort} ${this.currentChapter}`.trim();
		}
		
		// 更新版本選擇器的標題或其他UI元素
		const version1Header = this.container.querySelector('.version-1 .version-header');
		if (version1Header) {
			version1Header.textContent = this.currentVersion1NameShort;
		}
		
		const version2Header = this.container.querySelector('.version-2 .version-header');
		if (version2Header) {
			version2Header.textContent = this.currentVersion2NameShort;
		}
		
		console.log('✅ 版本列表顯示已更新，包含完整的版本縮寫、書卷縮寫和章節號');
	}

	/**
	 * Parse shortcode attributes from container dataset
	 * @returns {Object} Parsed attributes with defaults
	 */
	parseShortcodeAttributes() {
		console.log('🔍 [parseShortcodeAttributes] 開始解析 shortcode 屬性，從 container.dataset 讀取');
		console.log('📊 [parseShortcodeAttributes] Container dataset:', this.container.dataset);

		const parsed = {
			version1: this.container.dataset.version1 || null,
			version2: this.container.dataset.version2 || null,
			book: this.container.dataset.book ? parseInt(this.container.dataset.book) : null,
			chapter: this.container.dataset.chapter ? parseInt(this.container.dataset.chapter) : null,
			mode: this.container.dataset.mode || 'single'
		};

		// 驗證書卷編號範圍 (1-66)
		if (parsed.book && (parsed.book < 1 || parsed.book > 66)) {
			console.warn('⚠️ [parseShortcodeAttributes] 無效的書卷編號:', parsed.book, '，將使用預設值');
			parsed.book = null;
		}

		// 驗證章節編號 (必須大於 0)
		if (parsed.chapter && parsed.chapter < 1) {
			console.warn('⚠️ [parseShortcodeAttributes] 無效的章節編號:', parsed.chapter, '，將使用預設值');
			parsed.chapter = null;
		}

		console.log('✅ [parseShortcodeAttributes] 解析完成:', parsed);
		return parsed;
	}

	/**
	 * Validate if version exists in cached versions or fallback to API
	 * @param {string} versionTableName - The table name of the version to validate
	 * @returns {Promise<boolean>} - True if version exists, false otherwise
	 */
	async validateVersionExists(versionTableName) {
		if (!versionTableName) {
			console.warn('⚠️ Empty version table name provided');
			return false;
		}

		try {
			// First try to get from cache
			if (this.cacheManager) {
				console.log('🔍 Checking cached versions for:', versionTableName);
				const cachedVersions = await this.cacheManager.getVersions(navigator.languages);
				if (cachedVersions && cachedVersions.length > 0) {
					const versionExists = cachedVersions.some(version => 
						version.table_name === versionTableName && 
						version.rank !== null && 
						version.rank !== undefined
					);
					if (versionExists) {
						console.log('✅ Version found in cache:', versionTableName);
						return true;
					}
				}
			}

			// If not in cache, try API call
			console.log('🌐 Checking version via API:', versionTableName);
			const params = new URLSearchParams({
				action: 'bible_here_public_get_versions',
				languages: navigator.languages.join(',')
			});

			const response = await fetch(`${bibleHereAjax.ajaxurl}?${params}`, {
				method: 'GET',
				headers: {
					"X-WP-Nonce": bibleHereAjax.nonce
				}
			});

			if (!response.ok) {
				console.error('❌ API request failed:', response.status);
				return false;
			}

			const data = await response.json();
			if (data.success && data.data && data.data.versions) {
				const versionExists = data.data.versions.some(version => 
					version.table_name === versionTableName && 
					version.rank !== null && 
					version.rank !== undefined
				);
				console.log(versionExists ? '✅' : '❌', 'Version validation result:', versionTableName, versionExists);
				return versionExists;
			}

			console.warn('⚠️ Invalid API response format');
			return false;

		} catch (error) {
			console.error('❌ Error validating version:', versionTableName, error);
			return false;
		}
	}

	/**
	 * Validate book number and chapter number
	 * @param {number} bookNumber - Book number (1-66)
	 * @param {number} chapterNumber - Chapter number (must be > 0)
	 * @param {string} language - Language code for book data lookup
	 * @returns {Promise<Object>} - Validation result with isValid flag and details
	 */
	async validateBookChapter(bookNumber, chapterNumber, language = null) {
		console.log('🔍 [validateBookChapter2684] 驗證書卷和章節:', { bookNumber, chapterNumber, language });

		// Basic validation
		if (!bookNumber || bookNumber < 1 || bookNumber > 66) {
			console.warn('⚠️ [validateBookChapter] 無效的書卷編號:', bookNumber);
			return { isValid: false, reason: 'invalid_book_number', bookNumber, chapterNumber };
		}

		if (!chapterNumber || chapterNumber < 1) {
			console.warn('⚠️ [validateBookChapter] 無效的章節編號:', chapterNumber);
			return { isValid: false, reason: 'invalid_chapter_number', bookNumber, chapterNumber };
		}

		try {
			// Try to get book data from cache to validate chapter count
			if (this.cacheManager) {
				const targetLanguage = language || this.currentLanguage1;
				console.log('🔍 [validateBookChapter] 從快取檢查書卷資料，語言:', targetLanguage);

				const cachedBooks = await this.cacheManager.getCachedBooks(targetLanguage);
				if (cachedBooks && cachedBooks.length > 0) {
					const bookData = cachedBooks.find(book => book.book_number === bookNumber);
					if (bookData) {
						const maxChapters = bookData.chapter_count || bookData.chapters;
						if (maxChapters && chapterNumber > maxChapters) {
							console.warn('⚠️ [validateBookChapter] 章節編號超出範圍:', {
								bookNumber,
								chapterNumber,
								maxChapters,
								bookName: bookData.book_name
							});
							return {
								isValid: false,
								reason: 'chapter_out_of_range',
								bookNumber,
								chapterNumber,
								maxChapters,
								bookName: bookData.book_name
							};
						}

						console.log('✅ [validateBookChapter] 書卷和章節驗證通過:', {
							bookNumber,
							chapterNumber,
							maxChapters,
							bookName: bookData.book_name
						});
						return {
							isValid: true,
							bookNumber,
							chapterNumber,
							maxChapters,
							bookName: bookData.book_name
						};
					}
				}
			}

			// If no cached data available, assume valid (will be validated when loading)
			console.log('ℹ️ [validateBookChapter] 無快取資料，假設有效（載入時會再次驗證）');
			return {
				isValid: true,
				bookNumber,
				chapterNumber,
				reason: 'no_cache_data_assume_valid'
			};
			
		} catch (error) {
			console.error('❌ [validateBookChapter] 驗證過程發生錯誤:', error);
			return {
				isValid: false,
				reason: 'validation_error',
				bookNumber,
				chapterNumber,
				error: error.message
			};
		}
	}

	/**
	 * Initialize reader from shortcode attributes with validation
	 * @param {Object} attributes - Shortcode attributes from DOM element
	 * @returns {Promise<Object>} - Initialization result with success status and applied values
	 */
	async initializeFromShortcode(attributes) {
		console.log('🚀 [initializeFromShortcode] 開始初始化 shortcode 參數:', attributes);

		const result = {
			success: false,
			appliedValues: {
				version1: null,
				version2: null,
				book: null,
				chapter: null,
				mode: 'single'
			},
			errors: []
		};

		try {
			// Parse shortcode attributes
			const parsed = this.parseShortcodeAttributes(attributes);
			console.log('📋 [initializeFromShortcode] 解析後的參數:', parsed);
			
			// Validate and set version1
			if (parsed.version1) {
				const version1Valid = await this.validateVersionExists(parsed.version1);
				if (version1Valid) {
					result.appliedValues.version1 = parsed.version1;
					console.log('✅ [initializeFromShortcode] Version1 驗證通過:', parsed.version1);
				} else {
					result.errors.push(`無效的 version1: ${parsed.version1}`);
					console.warn('⚠️ [initializeFromShortcode] Version1 驗證失敗:', parsed.version1);
				}
			}

			// Validate and set version2 (for dual mode)
			if (parsed.version2) {
				const version2Valid = await this.validateVersionExists(parsed.version2);
				if (version2Valid) {
					result.appliedValues.version2 = parsed.version2;
					result.appliedValues.mode = 'dual';
					console.log('✅ [initializeFromShortcode] Version2 驗證通過:', parsed.version2);
				} else {
					result.errors.push(`無效的 version2: ${parsed.version2}`);
					console.warn('⚠️ [initializeFromShortcode] Version2 驗證失敗:', parsed.version2);
				}
			} else if (parsed.mode === 'dual') {
				// If mode is dual but no version2, fallback to single mode
				result.appliedValues.mode = 'single';
				console.log('ℹ️ [initializeFromShortcode] 雙版本模式但無 version2，回退到單版本模式');
			}

			// Validate book and chapter if provided
			if (parsed.book && parsed.chapter) {
				const bookChapterValidation = await this.validateBookChapter(
					parsed.book, 
					parsed.chapter, 
					this.currentLanguage1
				);
				
				if (bookChapterValidation.isValid) {
					result.appliedValues.book = parsed.book;
					result.appliedValues.chapter = parsed.chapter;
					console.log('✅ [initializeFromShortcode] 書卷章節驗證通過:', {
						book: parsed.book,
						chapter: parsed.chapter,
						bookName: bookChapterValidation.bookName
					});
				} else {
					result.errors.push(`無效的書卷或章節: ${parsed.book}:${parsed.chapter} (${bookChapterValidation.reason})`);
					console.warn('⚠️ [initializeFromShortcode] 書卷章節驗證失敗:', bookChapterValidation);
				}
			}

			// Apply valid values to reader
			if (result.appliedValues.version1) {
				this.currentVersion1 = result.appliedValues.version1;
			}
			if (result.appliedValues.version2) {
				this.currentVersion2 = result.appliedValues.version2;
			}
			if (result.appliedValues.book) {
				this.currentBook = result.appliedValues.book;
			}
			if (result.appliedValues.chapter) {
				this.currentChapter = result.appliedValues.chapter;
			}

			// Set mode
			this.currentMode = result.appliedValues.mode;

			result.success = true;
			console.log('🎉 [initializeFromShortcode] 初始化完成:', result);

			return result;

		} catch (error) {
			console.error('❌ [initializeFromShortcode] 初始化過程發生錯誤:', error);
			result.errors.push(`初始化錯誤: ${error.message}`);
			return result;
		}
	}

	initFromParams(urlParams) {
		this.elements.reader.setAttribute('data-mode', urlParams.version2 ? 'dual' : 'single');
		if (urlParams.version1) {
			this.currentVersion1 = urlParams.version1;
		}
		if (urlParams.version2) {
			this.isDualMode = true;
			this.currentVersion2 = urlParams.version2;
		}
		if (urlParams.language1) {
			this.currentLanguage1 = urlParams.language1;
		}
		if (urlParams.language2) {
			this.currentLanguage2 = urlParams.language2;
		}
		if (urlParams.book) {
			this.currentBook = parseInt(urlParams.book);
		}
		if (urlParams.chapter) {
			this.currentChapter = parseInt(urlParams.chapter);
		}
		if (this.isDualMode) {
			if (this.elements.singleMode) this.elements.singleMode.style.display = 'none';
			if (this.elements.dualMode) this.elements.dualMode.style.display = 'block';
			if (this.elements.bookChapterSelector2) {
				this.elements.bookChapterSelector2.style.display = 'block';
			}
			const versionsButton = this.elements.versionsButton;
			if (versionsButton) {
				const versionsText = versionsButton.querySelector('.versions-text');
				if (versionsText) versionsText.textContent = '- version';
				versionsButton.style.display = 'none';
			}
			if (this.elements.bookChapterText1) {
				this.elements.bookChapterText1.dataset.versionNameShort = this.currentVersion1NameShort || '';
				// 書卷名稱等 loadChapter 後會由 loadBooksTabAndUpdateBookChapterButton 更新
				// 但章節號碼可以先設定
				const bookShort = this.elements.bookChapterText1.dataset.bookNameShort || '';
				this.elements.bookChapterText1.textContent =
					`${this.currentVersion1NameShort || ''} ${bookShort} ${this.currentChapter}`.trim();
			}

			if (this.elements.bookChapterText2) {
				this.elements.bookChapterText2.dataset.versionNameShort = this.currentVersion2NameShort || '';
				const bookShort = this.elements.bookChapterText2.dataset.bookNameShort || '';
				this.elements.bookChapterText2.textContent =
					`${this.currentVersion2NameShort || ''} ${bookShort}`.trim();
			}
		}
	}  // do we need to set this.currentVersion1NameShort?

	/**
	 * Update URL parameters while preserving existing ones
	 * @param {Object} params - Parameters to update in URL
	 * @param {boolean} replaceState - Whether to replace current state instead of pushing new state
	 */
	updateURLParams(params = {}, replaceState = false) {
		console.log('🔗 [updateURLParams] 更新 URL 參數:', { params, replaceState });

		try {
			// Get current URL and search params
			const currentUrl = new URL(window.location.href);
			const searchParams = new URLSearchParams(currentUrl.search);

			// Update parameters
			Object.keys(params).forEach(key => {
				const value = params[key];
				if (value !== null && value !== undefined && value !== '') {
					searchParams.set(key, value);
					console.log(`✅ [updateURLParams] 設定參數 ${key} = ${value}`);
				} else {
					// Remove parameter if value is null, undefined, or empty
					searchParams.delete(key);
					console.log(`🗑️ [updateURLParams] 移除參數 ${key}`);
				}
			});

			// Construct new URL
			const newUrl = `${currentUrl.pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}${currentUrl.hash}`;

			// Update browser history
			if (replaceState) {
				window.history.replaceState(
					{ bibleReader: true, timestamp: Date.now() },
					document.title,
					newUrl
				);
				console.log('🔄 [updateURLParams] 替換瀏覽器歷史狀態:', newUrl);
			} else {
				window.history.pushState(
					{ bibleReader: true, timestamp: Date.now() },
					document.title,
					newUrl
				);
				console.log('➕ [updateURLParams] 新增瀏覽器歷史狀態:', newUrl);
			}

			// Dispatch custom event for other components to listen
			const urlUpdateEvent = new CustomEvent('bibleReaderUrlUpdate', {
				detail: {
					params: Object.fromEntries(searchParams),
					url: newUrl,
					replaceState
				}
			});
			window.dispatchEvent(urlUpdateEvent);

		} catch (error) {
			console.error('❌ [updateURLParams] 更新 URL 參數時發生錯誤:', error);
		}
	}

	/**
	 * Parse URL parameters and extract Bible reader related parameters
	 * @returns {Object} - Parsed parameters object
	 */
	parseURLParams() {
		console.log('🔍 [parseURLParams] 解析 URL 參數 urlParams:');
		try {
			const urlParams = new URLSearchParams(window.location.search);
			console.log(Object.fromEntries(urlParams));
			const params = {
				version1: urlParams.get('version1') || null,
				version2: urlParams.get('version2') || null,
				book: urlParams.get('book') ? parseInt(urlParams.get('book')) : null,
				chapter: urlParams.get('chapter') ? parseInt(urlParams.get('chapter')) : null,
				mode: urlParams.get('mode') || null,
				language1: urlParams.get('language1') || null,
				language2: urlParams.get('language2') || null
			};

			// Validate parsed parameters
			if (params.book && (params.book < 1 || params.book > 66)) {
				console.warn('⚠️ [parseURLParams] 無效的書卷編號:', params.book);
				params.book = null;
			}

			if (params.chapter && (params.chapter < 1 || params.chapter > 150)) {
				console.warn('⚠️ [parseURLParams] 無效的章節編號:', params.chapter);
				params.chapter = null;
			}

			if (params.mode && !['single', 'dual'].includes(params.mode)) {
				console.warn('⚠️ [parseURLParams] 無效的模式:', params.mode);
				params.mode = null;
			}

			// Filter out null values for cleaner result
			const cleanParams = {};
			Object.keys(params).forEach(key => {
				if (params[key] !== null) {
					cleanParams[key] = params[key];
				}
			});

			console.log('✅ [parseURLParams] 解析完成:', cleanParams);
			return cleanParams;

		} catch (error) {
			console.error('❌ [parseURLParams] 解析 URL 參數時發生錯誤:', error);
			return {};
		}
	}

	/**
	 * Handle browser back/forward navigation events
	 * @param {PopStateEvent} event - The popstate event
	 */
	handlePopState(event) {
		console.log('⬅️ [handlePopState] 處理瀏覽器導航事件:', event.state);

		try {
			// Parse current URL parameters
			const urlParams = this.parseURLParams();
			console.log('🔍 [handlePopState] 從 URL 解析的參數:', urlParams);

			// Check if URL has Bible reader related parameters
			const hasBibleParams = urlParams.version1 || urlParams.book || urlParams.chapter;
			
			if (hasBibleParams || (event.state && event.state.bibleReader)) {
				console.log('📖 [handlePopState] 檢測到聖經閱讀器相關的導航事件');
				// Apply URL parameters to reader state
				this.applyURLParamsToReader(urlParams);
			} else {
				console.log('ℹ️ [handlePopState] 非聖經閱讀器相關的導航事件，忽略');
			}

		} catch (error) {
			console.error('❌ [handlePopState] 處理導航事件時發生錯誤:', error);
		}
	}

	/**
	 * Ensure books data is loaded to cache for the current language
	 * @param {string} language - Language code to load books for
	 * @returns {Promise<Object|null>} - Cached books data or null if failed
	 */
	async ensureBooksInCache(language) {
		console.log('📚 [ensureBooksInCache] 確保書卷數據已載入緩存:', language);
		
		if (!this.cacheManager || !language) {
			console.warn('⚠️ [ensureBooksInCache] 缺少 cacheManager 或 language 參數');
			return null;
		}

		try {
			// First check if books are already cached
			let cachedBooks = await this.cacheManager.getCachedBooks(language);
			if (cachedBooks && Object.keys(cachedBooks).length > 0) {
				console.log('✅ [ensureBooksInCache] 書卷數據已存在於緩存中');
				return cachedBooks;
			}

			// If not cached, load from API
			console.log('🌐 [ensureBooksInCache] 從 API 載入書卷數據到緩存');
			const params = new URLSearchParams({
				action: 'bible_here_public_get_books',
				language: language,
			});

			const response = await fetch(`${bibleHereAjax.ajaxurl}?${params}`, {
				method: 'GET',
				headers: {
					"X-WP-Nonce": bibleHereAjax.nonce,
				},
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			if (data.success && data.data) {
				// Cache the books data
				await this.cacheManager.cacheBooks(language, data.data);
				console.log('✅ [ensureBooksInCache] 書卷數據已載入並存入緩存');
				
				// Return the cached books in the expected format
				return await this.cacheManager.getCachedBooks(language);
			} else {
				console.error('❌ [ensureBooksInCache] API 返回錯誤:', data);
				return null;
			}

		} catch (error) {
			console.error('❌ [ensureBooksInCache] 載入書卷數據時發生錯誤:', error);
			return null;
		}
	}

	/**
	 * Apply URL parameters to reader state and reload content if necessary
	 * @param {Object} urlParams - Parsed URL parameters
	 */
	async applyURLParamsToReader(urlParams) {
		console.log('🔄 [applyURLParamsToReader] 應用 URL 參數到閱讀器:', urlParams);

		try {
			let needsReload = false;

			// Check if version1 changed
			if (urlParams.version1 && urlParams.version1 !== this.currentVersion1) {
				const version1Valid = await this.validateVersionExists(urlParams.version1);
				if (version1Valid) {
					this.currentVersion1 = urlParams.version1;
					needsReload = true;
					console.log('✅ [applyURLParamsToReader] 更新 version1:', urlParams.version1);
				} else {
					console.warn('⚠️ [applyURLParamsToReader] 無效的 version1:', urlParams.version1);
				}
			}
			
			// Check if version2 changed
			if (urlParams.version2 && urlParams.version2 !== this.currentVersion2) {
				const version2Valid = await this.validateVersionExists(urlParams.version2);
				if (version2Valid) {
					this.currentVersion2 = urlParams.version2;
					needsReload = true;
					console.log('✅ [applyURLParamsToReader] 更新 version2:', urlParams.version2);
				} else {
					console.warn('⚠️ [applyURLParamsToReader] 無效的 version2:', urlParams.version2);
				}
			}
			
			// Check if book or chapter changed
			if (urlParams.book && urlParams.chapter) {
				if (urlParams.book !== this.currentBook || urlParams.chapter !== this.currentChapter) {
					const bookChapterValidation = await this.validateBookChapter(
						urlParams.book,
						urlParams.chapter,
						this.currentLanguage1
					);
					
					if (bookChapterValidation.isValid) {
						this.currentBook = urlParams.book;
						this.currentChapter = urlParams.chapter;
						needsReload = true;
						console.log('✅ [applyURLParamsToReader] 更新書卷章節:', {
							book: urlParams.book,
							chapter: urlParams.chapter
						});
					} else {
						console.warn('⚠️ [applyURLParamsToReader] 無效的書卷章節:', {
							book: urlParams.book,
							chapter: urlParams.chapter,
							reason: bookChapterValidation.reason
						});
					}
				}
			}

			// Check if mode changed
			if (urlParams.mode && urlParams.mode !== this.currentMode) {
				this.currentMode = urlParams.mode;
				needsReload = true;
				console.log('✅ [applyURLParamsToReader] 更新模式:', urlParams.mode);
			}

			if (urlParams.mode === 'dual' && !this.isDualMode) {
				this.isDualMode = true;

				// 更新版本按鈕文字
				const versionsButton = this.elements.versionsButton;
				if (versionsButton) {
					const versionsText = versionsButton.querySelector('.versions-text');
					if (versionsText) versionsText.textContent = '- version';
					versionsButton.style.display = 'none';
				}

				// 顯示第二版本選擇器
				if (this.elements.bookChapterSelector2) {
					this.elements.bookChapterSelector2.style.display = 'block';
				}

				// 設定 data-mode
				this.elements.reader.setAttribute('data-mode', 'dual');

				// 切換顯示容器
				if (this.elements.singleMode) this.elements.singleMode.style.display = 'none';
				if (this.elements.dualMode) this.elements.dualMode.style.display = 'block';

				// 初始化第二版本（如果還沒設定）
				if (!this.currentVersion2) {
					this.initializeSecondVersion();
				}
			} else if (urlParams.mode === 'single' && this.isDualMode) {
				this.isDualMode = false;
				this.elements.reader.setAttribute('data-mode', 'single');
				if (this.elements.singleMode) this.elements.singleMode.style.display = 'block';
				if (this.elements.dualMode) this.elements.dualMode.style.display = 'none';
				if (this.elements.bookChapterSelector2) {
					this.elements.bookChapterSelector2.style.display = 'none';
				}
				const versionsButton = this.elements.versionsButton;
				if (versionsButton) {
					const versionsText = versionsButton.querySelector('.versions-text');
					if (versionsText) versionsText.textContent = '+ version';
					versionsButton.style.display = 'inline-block';
				}
			}

			// Reload content if any parameter changed
			if (needsReload) {
				console.log('🔄 [applyURLParamsToReader] 參數已變更，重新載入內容');

				// Step 1: Ensure books data is loaded to cache first
				const cachedBooks = await this.ensureBooksInCache(this.currentLanguage1);

				// Step 2: Update UI elements
				this.updateVersionSelectors();
				this.updateContainerDataAttributes();

				// Step 3: Update book chapter button with correct book name
				if (this.currentBook && cachedBooks && cachedBooks[this.currentBook]) {
					try {
						const bookNameShort1 = cachedBooks[this.currentBook].title_short;

						// 先處理語言2，把正確書卷名寫入 dataset，防止後面 button1 的副作用覆蓋
						if (this.isDualMode && this.currentLanguage2) {
							const cachedBooks2 = await this.ensureBooksInCache(this.currentLanguage2);
							const bookNameShort2 = cachedBooks2 && cachedBooks2[this.currentBook]
								? cachedBooks2[this.currentBook].title_short
								: bookNameShort1;
							if (this.elements.bookChapterText2) {
								this.elements.bookChapterText2.dataset.bookNameShort = bookNameShort2; // 先寫入「太」
							}
							this.updateBookChapterButton(this.currentVersion2NameShort, bookNameShort2, '2');
						}

						// 語言1最後更新，此時 button2 的 dataset 已是正確值
						this.updateBookChapterButton(this.currentVersion1NameShort, bookNameShort1, '1');

					} catch (error) {
						console.warn('⚠️ [applyURLParamsToReader] 無法更新書卷名稱:', error);
					}
				} else if (this.currentBook) {
					console.warn('⚠️ [applyURLParamsToReader] 無法找到書卷數據:', {
						currentBook: this.currentBook,
						hasCachedBooks: !!cachedBooks,
						cachedBooksKeys: cachedBooks ? Object.keys(cachedBooks) : []
					});
				}

				// Step 4: Load chapter content (don't update URL since we're applying URL params)
				if (this.currentBook && this.currentChapter) {
					this.loadChapter(false);
				}
			} else {
				console.log('ℹ️ [applyURLParamsToReader] 無參數變更，不需重新載入');
			}

		} catch (error) {
			console.error('❌ [applyURLParamsToReader] 應用 URL 參數時發生錯誤:', error);
		}
	}

	/**
	 * Update page title to reflect current reading position
	 */
	updatePageTitleAndSearchBar() {
		const version = this.currentVersion1NameShort || '';
		const language = this.currentLanguage1 || '';
		const searchBar = document.querySelector('input#search-modal-input');
		const tagLine = this.container.dataset.tagLine;
		const bookShort = this.elements.bookChapterText1
			? this.elements.bookChapterText1.dataset.bookNameShort || ''
			: '';
		const chapter = this.currentChapter || '';

		if (bookShort && chapter) {
			document.title = `${tagLine} ${bookShort} ${chapter}`;
		}
		if (searchBar && version && language) {
			searchBar.placeholder = `Search ${version} in ${language} ...`;
		}
	}
}

/**
 * Initialize all Bible Here Readers on the page
 */
document.addEventListener('DOMContentLoaded', function() {
	console.log('🎬 [BibleHereReader3278] DOM loaded, initializing reader system...');
	const readers = document.querySelectorAll('.bible-here-reader');
	readers.forEach(function(element) {
		new BibleHereReader(element);
	});
});

// Cross Reference Modal functionality
class CrossReferenceModal {
	constructor(readerInstance) {
		this.modal = document.getElementById('cross-reference-modal');
		this.modalTitle = this.modal.querySelector('.modal-title');
		this.modalContent = this.modal.querySelector('.cross-references-list');
		this.closeBtn = this.modal.querySelector('.modal-close');
		this.overlay = this.modal.querySelector('.modal-overlay');
		this.readerInstance = readerInstance; // Store reference to BibleHereReader instance
		this.bindEvents();
	}
	
	bindEvents() {
		// Close modal events
		this.closeBtn.addEventListener('click', () => this.close());
		this.overlay.addEventListener('click', () => this.close());
		
		// ESC key to close
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && this.modal.style.display !== 'none') {
				this.close();
			}
		});
		
		// Delegate click events for cross-reference links
		document.addEventListener('click', (e) => {
			if (e.target.classList.contains('cross-reference-link')) {
				e.preventDefault();
				this.handleCrossReferenceClick(e.target);
			}
		});
	}
	
	async handleCrossReferenceClick(element) {
		const parentNodeP = element.parentNode;
		const verseId = parentNodeP.dataset.verse;
		const book = parseInt(verseId.slice(0, 2));
		const chapter = parseInt(verseId.slice(2, 5));
		const verse = parseInt(verseId.slice(5, 8));
		const verseText = element.nextElementSibling.textContent.trim();
		const version = element.closest("div.verses-container").dataset.tableName; // Get the version from the parent of the clicked element
		const languageNumber = element.closest("div.bible-version").dataset.languageNumber;
		const bookNameShort = this.readerInstance.elements['bookChapterText'+languageNumber].dataset.bookNameShort;
		console.log('📖 [handleCrossReferenceClick 33617] cliked cross reference by languageNumber: ', languageNumber, ' version: ', version, ' please check version: ', element.dataset);
		this.modalTitle.textContent = `Cross Refs: ${bookNameShort} ${chapter}:${verse} - ${verseText}`;
		// Show loading state
		this.modalContent.innerHTML = '<div class="loading-cross-refs">Loading cross references...</div>';
		this.show();

		try {  // Call API to get cross references with the specific version
			const crossRefs = await this.fetchCrossReferences(book, chapter, verse, version);
			console.log('📖 [handleCrossReferenceClick 3625] fetched cross references:', crossRefs);
			this.displayCrossReferences(crossRefs);
		} catch (error) {
			console.error('Error fetching cross references:', error);
			this.modalContent.innerHTML = '<div class="error-cross-refs">Error loading cross references. Please try again.</div>';
		}
	}
	
	async fetchCrossReferences(book, chapter, verse, version) {
		const verseId = `${book.toString().padStart(2, '0')}${chapter.toString().padStart(3, '0')}${verse.toString().padStart(3, '0')}`;
		
		// Use the provided version or fall back to current versions
		// const targetVersion = version || this.readerInstance.currentVersion1 || this.readerInstance.currentVersion2;
		
		// Check cache first if cacheManager is available
		if (this.readerInstance.cacheManager) {
			try {
				// Check if cross references are cached for this verse with the specific version
				const cachedVerses = await this.readerInstance.cacheManager.getVerses(
					null,
					[version],
					book,
					chapter,
					verse,
					verse
				);
				
				if (cachedVerses && cachedVerses.length > 0 && cachedVerses[0].reference) {
					console.log('📖 [CrossReferenceModal] Using cached cross references for verse:', verseId);
					return cachedVerses[0].reference;
				}
			} catch (error) {
				console.warn('⚠️ [CrossReferenceModal] Cache check failed, falling back to API:', error);
			}
		}
		
		// Fetch from API if not in cache
		const params = new URLSearchParams({
			action: 'bible_here_public_get_cross_references',
			table_name: version,
			verse_ids: [verseId],
		});
		
		const response = await fetch(`${bibleHereAjax.ajaxurl}?${params}`, {
			method: 'GET',
			headers: {
				"X-WP-Nonce": bibleHereAjax.nonce
			}
		});
		
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		
		const data = await response.json();
		if (data.success && data.data) {
			// Cache the result if cacheManager is available
			if (this.readerInstance.cacheManager) {
				try {
					// Update the verse cache with cross reference data
					await this.cacheCrossReference(verseId, data.data, version);
				} catch (error) {
					console.warn('⚠️ [CrossReferenceModal] Failed to cache cross references:', error);
				}
			}
			return data.data;
		} else {
			throw new Error(data.message || 'Failed to fetch cross references');
		}
	}
	
	/**
	 * Cache cross reference data for a verse
	 */
	async cacheCrossReference(verseId, crossRefData, version) {
		try {
			const targetVersion = version || this.readerInstance.currentVersion1 || this.readerInstance.currentVersion2;
			const book = parseInt(verseId.substring(0, 2));
			const chapter = parseInt(verseId.substring(2, 5));
			const verse = parseInt(verseId.substring(5, 8));
			
			// Get existing verse from cache
			const existingVerses = await this.readerInstance.cacheManager.getVerses(
				this.readerInstance.currentLanguage1,
				[targetVersion],
				book,
				chapter,
				verse,
				verse
			);
			
			if (existingVerses && existingVerses.length > 0) {
				// Update existing verse with cross reference data
				const updatedVerse = {
					...existingVerses[0],
					reference: crossRefData
				};
				
				// Cache the updated verse
				await this.readerInstance.cacheManager.cacheVerses([updatedVerse], targetVersion);
				console.log('💾 [CrossReferenceModal] Cached cross references for verse:', verseId);
			} else {
				console.warn('⚠️ [CrossReferenceModal] No existing verse found to update with cross references:', verseId);
			}
		} catch (error) {
			console.error('❌ [CrossReferenceModal] Error caching cross references:', error);
			throw error;
		}
	}
	
	displayCrossReferences(crossRefs) {
		if (!crossRefs || crossRefs.cross_references.length === 0) {
			this.modalContent.innerHTML = '<div class="no-cross-refs">No cross references found for this verse.</div>';
			return;
		}
		console.log("hi CrossReferenceModal.displayCrossReferences() here is crossRefs: ", crossRefs);
		let html = '<div class="cross-refs-container">';
		crossRefs.cross_references.forEach(ref => {
			const url = new URL(window.location.href);
			url.searchParams.set('book', ref.book_number);
			url.searchParams.set('chapter', ref.chapter_number);
			url.searchParams.set('verse', ref.verse_number);
			
			html += `<div class="cross-ref-item">`;
			html += `<a href="${url.href}" class="cross-ref-link">`;
			html += `<span class="cross-ref-reference">${ref.book_name_short} ${ref.chapter_number}:${ref.verse_number}</span>`;
			html += `<span class="cross-ref-text">${ref.verse_texts}</span>`;
			html += `</a>`;
			html += `</div>`;
		});
		html += '</div>';
		
		this.modalContent.innerHTML = html;
	}
	
	show() {
		this.modal.style.display = 'block';
		document.body.style.overflow = 'hidden';
	}
	
	close() {
		this.modal.style.display = 'none';
		document.body.style.overflow = '';
	}
}

// Note: CrossReferenceModal is now initialized by each BibleHereReader instance

// Search Modal functionality
class SearchModal {
	constructor(readerInstance) {
		this.modal = document.getElementById('search-modal');
		this.modalContent = this.modal.querySelector('.search-modal-results');
		this.closeBtn = this.modal.querySelector('.modal-close');
		this.overlay = this.modal.querySelector('.modal-overlay');
		this.searchInput = this.modal.querySelector('#search-modal-input');
		// this.exactMatchCheckbox = this.modal.querySelector('#exact-match-checkbox');
		this.searchBtn = this.modal.querySelector('.search-modal-btn');
		this.clearBtn = this.modal.querySelector('.search-clear-btn');
		this.readerInstance = readerInstance; // Store reference to BibleHereReader instance
		this.bindEvents();
	}
	
	bindEvents() {
		// Close modal events
		this.closeBtn.addEventListener('click', () => this.close());
		this.overlay.addEventListener('click', () => this.close());
		
		// ESC key to close
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && this.modal.style.display !== 'none') {
				this.close();
			}
		});
		
		// Search input Enter key
		this.searchInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				this.performSearch();
			}
		});

		// Toggle clear button visibility
		this.searchInput.addEventListener('input', () => {
			if (!this.clearBtn) return;
			const hasValue = this.searchInput.value.trim().length > 0;
			this.clearBtn.style.display = hasValue ? '' : 'none';
		});
		
		// Clear button click
		if (this.clearBtn) {
			this.clearBtn.addEventListener('click', () => {
				this.searchInput.value = '';
				this.clearBtn.style.display = 'none';
				this.searchInput.focus();
			});
		}
		
		// Search button click
		this.searchBtn.addEventListener('click', () => {
			this.performSearch();
		});
	}
	
	async performSearch() {
		const searchTerm = this.searchInput.value.trim();
		if (!searchTerm) {
			return;
		}
		
		// const exactMatch = this.exactMatchCheckbox.checked;
		
		// Show loading state
		this.modalContent.innerHTML = '<div class="loading-search-results">Searching...</div>';
		
		try {
			// Call the existing performSearch function with exact match option
			const results = await this.readerInstance.performSearch(searchTerm, null);
			this.displaySearchResults(results, searchTerm);
		} catch (error) {
			console.error('Error performing search:', error);
			this.modalContent.innerHTML = '<div class="error-search-results">Error performing search. Please try again.</div>';
		}
	}
	
	displaySearchResults(results, searchTerm) {
		if (!results || !results.verses || results.verses.length === 0) {
			this.modalContent.innerHTML = '<div class="no-search-results">No search results found.</div>';
			return;
		}
		
		const resultCounts = results.verses.length;
		
		// Generate results HTML
		let html = '<div class="search-results-container">';
		
		const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
		results.verses.forEach(verse => {
			// Highlight search term in verse text
			let highlightedText = verse.text;
			if (searchTerm && searchTerm.trim()) {
				highlightedText = verse.text.replace(regex, '<strong>$1</strong>');
			}
			
			// Generate dynamic URL with book and chapter parameters
			const currentUrl = new URL(window.location);
			currentUrl.searchParams.set('book', verse.book_number);
			currentUrl.searchParams.set('chapter', verse.chapter_number);
			if (verse.verse_number) {
				currentUrl.searchParams.set('verse', verse.verse_number);
			}
			const dynamicHref = currentUrl.toString();
			
			html += `<div class="search-result-item">`;
			html += `<a href="${dynamicHref}" class="search-result-link" data-book="${verse.book_number}" data-chapter="${verse.chapter_number}" data-verse="${verse.verse_number}">`;
			html += `<span class="search-result-reference">${verse.title_full} ${verse.chapter_number}:${verse.verse_number}</span>`;
			html += `<span class="search-result-text">${highlightedText}</span>`;
			html += `</a>`;
			html += `</div>`;
		});
		
		html += '</div>';
		
		this.modalContent.innerHTML = html;
		
		// Add click event listeners to search result links
		const searchResultLinks = this.modalContent.querySelectorAll('.search-result-link');
		searchResultLinks.forEach(link => {
			link.addEventListener('click', (e) => {
				// Close the search modal when clicking
				this.close();
				// Let the browser handle the navigation via the href URL
			});
		});
	}
	
	show() {
		this.modal.style.display = 'block';
		document.body.style.overflow = 'hidden';
		// Focus on search input
		setTimeout(() => {
			this.searchInput.focus();
		}, 100);
	}
	
	close() {
		this.modal.style.display = 'none';
		document.body.style.overflow = '';
		// Clear search input
		this.searchInput.value = '';
		this.modalContent.innerHTML = '';
		// Hide clear button when closing
		if (this.clearBtn) {
			this.clearBtn.style.display = 'none';
		}
	}
}

// Strong Number Modal functionality
class StrongNumberModal {
	constructor(readerInstance) {
		this.modal = document.getElementById('strong-number-modal');
		this.modalTitle = this.modal.querySelector('.modal-title');
		this.modalContent = this.modal.querySelector('.strong-numbers-list');
		this.closeBtn = this.modal.querySelector('.modal-close.close-button');
		this.overlay = this.modal.querySelector('.modal-overlay');
		this.history = []; // Will be converted to 2D array for navigation history
		this.historyIndex = -1; // Current position in history
		this.readerInstance = readerInstance; // Store reference to BibleHereReader instance
		this.bindEvents();
	}
	
	bindEvents() {
		// Close modal events
		this.closeBtn.addEventListener('click', () => this.close());
		this.overlay.addEventListener('click', () => this.close());
		
		// ESC key to close
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && this.modal.style.display !== 'none') {
				this.close();
			}
		});
		
		// Add event delegation for strong-number-reference and book icon clicks
		this.modalContent.addEventListener('click', (e) => {
			const bookIcon = e.target.closest('.strong-number-book-icon');
			if (bookIcon) {
				e.preventDefault();
				e.stopPropagation();
				this.handleStrongNumberBookIconClick(bookIcon);
				return;
			}
			const strongRef = e.target.closest('.strong-number-reference');
			if (strongRef) {
				e.preventDefault();
				this.handleStrongNumberReferenceClick(strongRef);
			}
		});
		
		// Add navigation button event listeners
		const backwardBtn = this.modal.querySelector('.modal-backward');
		const forwardBtn = this.modal.querySelector('.strong-forward');

		if (backwardBtn) {
			backwardBtn.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				if (!backwardBtn.disabled) {
					this.navigateHistory('back');
				}
			});
		}

		if (forwardBtn) {
			forwardBtn.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				if (!forwardBtn.disabled) {
					this.navigateHistory('forward');
				}
			});
		}
	}

	// History management methods
	addToHistory(strongNumbers) {
		// Remove any history after current position (when navigating back then forward to new item)
		if (this.historyIndex < this.history.length - 1) {
			this.history = this.history.slice(0, this.historyIndex + 1);
		}

		// Add new entry to history
		this.history.push(strongNumbers);
		this.historyIndex = this.history.length - 1;

		console.log('📚 [addToHistory] History updated:', this.history, 'Index:', this.historyIndex);
	}

	updateNavigationButtons() {
		const backwardBtn = this.modal.querySelector('.modal-backward');
		const forwardBtn = this.modal.querySelector('.strong-forward');

		if (backwardBtn) {
			backwardBtn.disabled = this.historyIndex <= 0;
			backwardBtn.style.opacity = this.historyIndex <= 0 ? '0.5' : '1';
		}

		if (forwardBtn) {
			forwardBtn.disabled = this.historyIndex >= this.history.length - 1;
			forwardBtn.style.opacity = this.historyIndex >= this.history.length - 1 ? '0.5' : '1';
		}
	}

	async navigateHistory(direction) {
		if (direction === 'back' && this.historyIndex > 0) {
			this.historyIndex--;
		} else if (direction === 'forward' && this.historyIndex < this.history.length - 1) {
			this.historyIndex++;
		} else {
			return; // No navigation possible
		}

		const strongNumbers = this.history[this.historyIndex];
		console.log('🔄 [navigateHistory] Navigating to:', strongNumbers, 'Index:', this.historyIndex);

		// Get current language
		const versionContainer = document.querySelector('div.bible-version');
		const language = versionContainer ? this.readerInstance['currentLanguage' + versionContainer.dataset.languageNumber] : 'en';

		// Update modal title
		this.modalTitle.innerHTML = `Strong Numbers: ${strongNumbers.join(', ')}`;

		// Show loading state
		this.modalContent.innerHTML = '<div class="loading-strong-numbers">Loading Strong Numbers...</div>';

		try {
			const strongData = await this.fetchStrongNumbers(strongNumbers, language);
			console.log('📖 [navigateHistory] Found Strong Numbers:', strongData);
			this.displayStrongNumbers(strongData.strong_dictionary, language);
			this.updateNavigationButtons();
		} catch (error) {
			console.error('Error fetching Strong Numbers during navigation:', error);
			this.modalContent.innerHTML = '<div class="error-strong-numbers">Error loading Strong Numbers. Please try again.</div>';
		}
	}

	async handleStrongNumberClick(element) {
		const strongNumbers = element.dataset.strongNumbers && element.dataset.strongNumbers.split(',');
		if (!strongNumbers) return;
		const verseText = element.closest('span.verse-text').textContent.trim();
		const strongNumberWord = element.textContent.trim();
		const versionContainer = element.closest('div.bible-version');
		const language = versionContainer ? this.readerInstance['currentLanguage' + versionContainer.dataset.languageNumber] : 'en';

		// Add to history before navigating
		this.addToHistory(strongNumbers);

		this.modalTitle.innerHTML = `${strongNumberWord}: ${strongNumbers} (${verseText ? ' from ' + verseText.replaceAll(strongNumberWord, `<b>${strongNumberWord}</b>`) : ''})`;
		// Show loading state
		this.modalContent.innerHTML = '<div class="loading-strong-numbers">Loading Strong Numbers...</div>';
		this.show();

		try {
			const strongData = await this.fetchStrongNumbers(strongNumbers, language);
			console.log('📖 [handleStrongNumberClick] Found Strong Numbers:', strongData);
			this.displayStrongNumbers(strongData.strong_dictionary, language);
			this.updateNavigationButtons();
		} catch (error) {
			console.error('Error fetching Strong Numbers:', error);
			this.modalContent.innerHTML = '<div class="error-strong-numbers">Error loading Strong Numbers. Please try again.</div>';
		}
	}

	async fetchStrongNumbers(strongNumbers, language) {		
		// First, try to get data from cache
		if (window.bibleHereCacheManager && window.bibleHereCacheManager.isInitialized) {
			try {
				const cachedData = await window.bibleHereCacheManager.getStrongs(strongNumbers);

				if (cachedData && cachedData.length > 0) {
					console.log('✅ [StrongNumberModal] Found cached Strong Numbers:', cachedData.length, 'items');
					return { strong_dictionary: cachedData };
				}
			} catch (cacheError) {
				console.warn('⚠️ [StrongNumberModal] Cache lookup failed:', cacheError);  // Continue to fetch from server if cache fails

			}
		}

		// If no cache data, fetch from server
		console.log('🌐 [StrongNumberModal] No cache data found, fetching from server...');

		const params = new URLSearchParams({
			action: 'bible_here_public_get_strong_dictionary',
			strong_numbers: strongNumbers,
			language: language
		});

		const response = await fetch(`${bibleHereAjax.ajaxurl}?${params}`, {
			method: 'GET',
			headers: {
				"X-WP-Nonce": bibleHereAjax.nonce
			}
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const data = await response.json();
		console.log("3596 data: ", data);
		if (data.success && data.data) {
			// Cache the fetched data
			if (window.bibleHereCacheManager && window.bibleHereCacheManager.isInitialized && data.data.strong_dictionary) {
				try {
					await window.bibleHereCacheManager.cacheStrongs(data.data.strong_dictionary);
					console.log('💾 [StrongNumberModal] Successfully cached Strong Numbers data');
				} catch (cacheError) {
					console.warn('⚠️ [StrongNumberModal] Failed to cache Strong Numbers:', cacheError);
					// Continue even if caching fails
				}
			}

			return data.data;
		} else {
			throw new Error(data.message || 'Failed to fetch Strong Numbers');
		}
	}

	processStrongNumberReferences(text) {
		// Regular expression to match G12345 or H12345 format
		const strongNumberRegex = /([GH]\d{1,5})/g;

		// Render reference and an adjacent book icon button
		return text.replace(strongNumberRegex, (match) => {
			return `<span class="strong-number-reference" data-strong-number="${match}">${match}</span>` +
				   ` <button type="button" class="strong-number-book-icon" data-strong-number="${match}" title="Show verses 📖" aria-label="Show verses">📖</button>`;
		});
	}

	async handleStrongNumberReferenceClick(element) {
		const strongNumber = element.dataset.strongNumber;
		if (!strongNumber) return;

		// Add to history before navigating
		this.addToHistory([strongNumber]);

		// Get current language from the modal context
		const versionContainer = document.querySelector('div.bible-version');
		const language = versionContainer ? this.readerInstance['currentLanguage' + versionContainer.dataset.languageNumber] : 'en';

		// Update modal title
		this.modalTitle.innerHTML = `Strong Number: ${strongNumber}`;

		// Show loading state
		this.modalContent.innerHTML = '<div class="loading-strong-numbers">Loading Strong Number...</div>';

		try {
			const strongData = await this.fetchStrongNumbers([strongNumber], language);
			console.log('📖 [handleStrongNumberReferenceClick] Found Strong Number:', strongData);
			this.displayStrongNumbers(strongData.strong_dictionary, language);
			this.updateNavigationButtons();
		} catch (error) {
			console.error('Error fetching Strong Number:', error);
			this.modalContent.innerHTML = '<div class="error-strong-numbers">Error loading Strong Number. Please try again.</div>';
		}
	}

	displayStrongNumbers(strongData, language) {
		if (!strongData || strongData.length === 0) {
			this.modalContent.innerHTML = '<div class="no-strong-numbers">No Strong Numbers found.</div>';
			return;
		}
		console.log("StrongNumberModal.displayStrongNumbers() here is strongData: ", strongData);

		// 使用類似 Cross Reference 的顯示格式
		let html = '<div class="strong-numbers-container">';
		strongData.forEach(item => {
			html += `<div class="strong-number-item">`;
			html += `<div class="strong-number-link">`;

			// Strong Number Reference with book icon
			html += `<span class="strong-number-reference">${item.strong_number}</span>`;
			html += `<button type="button" class="strong-number-book-icon" data-strong-number="${item.strong_number}" title="Show verses 📖" aria-label="Show verses">📖</button>`;

			// Original Text
			if (item.original) {
				html += `<span class="strong-number-original">${item.original}</span>`;
			}

			// Definition/Translation
			if (item.en || item[language]) {
				const translationText = (item[language] || item.en || 'Missing data...').replace(/\n/g, '<br>');
				html += `<div class="strong-number-text">${this.processStrongNumberReferences(translationText)}</div>`;
			}
			
			html += `</div>`;
			html += `</div>`;
		});
		html += '</div>';
		
		this.modalContent.innerHTML = html;
	}

	// Create / show / close popover for Strong number verses
	ensurePopoverElements() {
		// Overlay sits above modal content but below popover
		if (!this.popoverOverlay) {
			this.popoverOverlay = document.createElement('div');
			this.popoverOverlay.className = 'modal-overlay strong-popover-overlay';
			this.popoverOverlay.addEventListener('click', () => this.closePopover());
			// Append to body to ensure stacking context above modal
			document.body.appendChild(this.popoverOverlay);
			// Inline styles for proper positioning
			this.popoverOverlay.style.position = 'fixed';
			this.popoverOverlay.style.left = '0';
			this.popoverOverlay.style.top = '0';
			this.popoverOverlay.style.width = '100%';
			this.popoverOverlay.style.height = '100%';
			this.popoverOverlay.style.zIndex = '10000';
			this.popoverOverlay.style.background = 'transparent';
			// Allow closing by tapping outside while keeping scrollable experience
			this.popoverOverlay.style.pointerEvents = 'auto';
		}
		// Popover floats next to the clicked icon
		if (!this.popover) {
			this.popover = document.createElement('div');
			this.popover.className = 'strong-popover';
			this.popover.innerHTML = `
				<div class="strong-popover-header">
					<span class="strong-popover-title"></span>
					<button type="button" class="modal-close close-button strong-popover-close" aria-label="Close">×</button>
				</div>
				<div class="strong-popover-body cross-refs-container"></div>
			`;
			// Append to body to avoid affecting modal layout and use viewport positioning
            document.body.appendChild(this.popover);
            // Inline styles to ensure it overlays above modal and stays fixed on screen
			this.popover.style.position = 'fixed';
			this.popover.style.zIndex = '10001';
			this.popover.style.display = 'none';
            const closeBtn = this.popover.querySelector('.strong-popover-close');
            closeBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this.closePopover(); });
            // Make body scrollable for long result lists
            const body = this.popover.querySelector('.strong-popover-body');
            body.style.overflowY = 'auto';
		}
	}

	showPopover(title, triggerEl) {
		this.ensurePopoverElements();

		// 同步 dark theme class
		const isDark = this.readerInstance.container.classList.contains('theme-dark');
		this.popover.classList.toggle('theme-dark', isDark);
		this.popoverOverlay.classList.toggle('theme-dark', isDark);

		// Visual styles 根據主題設定
		this.popover.style.background = isDark ? '#1f2937' : '#fff';
		this.popover.style.boxShadow = isDark
			? '0 8px 24px rgba(0,0,0,0.4)'
			: '0 8px 24px rgba(0,0,0,0.18)';
		this.popover.style.borderRadius = '8px';
		this.popover.style.border = isDark
			? '1px solid #374151'
			: '1px solid rgba(0,0,0,0.08)';

		this.popover.querySelector('.strong-popover-title').textContent = title;
		this.currentPopoverTrigger = triggerEl;
		const margin = 8; // space between icon and popover

		// Responsive size: half of modal width on desktop, 90% viewport on mobile
        const modalRect = this.modal.getBoundingClientRect();
        const isMobile = window.innerWidth <= 768;
        const desiredWidth = Math.floor(modalRect.width * 0.5);
        const width = isMobile ? Math.min(Math.floor(window.innerWidth * 0.9), modalRect.width - 16) : Math.min(Math.max(desiredWidth, 380), 480);
        this.popover.style.width = `${width}px`;
        this.popover.style.maxWidth = `${width}px`;
        this.popover.style.minWidth = isMobile ? '240px' : '380px';
        // Height: allow comfortable reading with scroll
        const desiredBodyMaxHeight = isMobile ? Math.floor(window.innerHeight * 0.55) : Math.floor(modalRect.height * 0.6);
        const body = this.popover.querySelector('.strong-popover-body');
        body.style.maxHeight = `${Math.max(280, desiredBodyMaxHeight)}px`;
        body.style.overflowY = 'auto';
        body.style.padding = '12px 16px';
        body.style.lineHeight = '1.5';

		// Visual styles
		// this.popover.style.background = '#fff';  // controlled by css
		this.popover.style.boxShadow = '0 8px 24px rgba(0,0,0,0.18)';
		this.popover.style.borderRadius = '8px';
		this.popover.style.border = '1px solid rgba(0,0,0,0.08)';
		this.popover.style.padding = '8px 0';
		this.popover.style.display = 'block';
		this.popoverOverlay.style.display = 'block';

		// Reposition function to follow the icon while scrolling/resizing relative to viewport
		this.popoverRepositionHandler = () => {
			if (!this.currentPopoverTrigger || this.popover.style.display === 'none') { return; }
			const rect = this.currentPopoverTrigger.getBoundingClientRect();
			let left = rect.left + rect.width + margin;
			let top = rect.top;
			const popoverRect = this.popover.getBoundingClientRect();

			// Clamp within viewport horizontally
			const viewportWidth = window.innerWidth;
			if (left + popoverRect.width + margin > viewportWidth) {
				left = rect.left - popoverRect.width - margin;
			}
			if (left < margin) { left = margin; }

			// Clamp within viewport vertically
			const viewportHeight = window.innerHeight;
			if (top + popoverRect.height + margin > viewportHeight) {
				top = Math.max(rect.top - popoverRect.height - margin, margin);
			}
			if (top < margin) { top = margin; }

			this.popover.style.left = `${Math.round(left)}px`;
			this.popover.style.top = `${Math.round(top)}px`;
		};

		// Initial position
		this.popoverRepositionHandler();
		// Follow scrolls/resizes (capture to catch nested scroll containers)
		window.addEventListener('scroll', this.popoverRepositionHandler, true);
		window.addEventListener('resize', this.popoverRepositionHandler, true);
		if (this.modalContent) {
			this.modalContent.removeEventListener('scroll', this.popoverRepositionHandler, true);
		}
	}

	closePopover() {
		if (this.popover) { this.popover.style.display = 'none'; }
		if (this.popoverOverlay) { this.popoverOverlay.style.display = 'none'; }
		// Detach listeners
		if (this.popoverRepositionHandler) {
			window.removeEventListener('scroll', this.popoverRepositionHandler, true);
			window.removeEventListener('resize', this.popoverRepositionHandler, true);
			if (this.modalContent) {
				this.modalContent.removeEventListener('scroll', this.popoverRepositionHandler, true);
			}
			this.popoverRepositionHandler = null;
		}
		this.currentPopoverTrigger = null;
	}

	renderStrongPopover(verses, strongNumber) {
		this.ensurePopoverElements();
		const body = this.popover.querySelector('.strong-popover-body');

		// Normalize: some callers may pass the whole version object
		if (!Array.isArray(verses)) {
			if (verses && Array.isArray(verses.verses)) {
				verses = verses.verses;
			} else {
				body.innerHTML = '<div class="no-cross-refs">No verses found for this Strong number.</div>';
				return;
			}
		}

		if (!verses || verses.length === 0) {
			body.innerHTML = '<div class="no-cross-refs">No verses found for this Strong number.</div>';
			return;
		}

		const regex = strongNumber && strongNumber.trim() ? new RegExp(`(${strongNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi') : null;

		// Header with total count
		const isDark = this.readerInstance.container.classList.contains('theme-dark');
		const headerBorderColor = isDark ? '#374151' : 'rgba(0,0,0,0.06)';
		const headerBg = isDark ? '#1f2937' : '';
		const headerColor = isDark ? '#f9fafb' : '';

		let html = `<div
      class="cross-refs-header"
      style="padding:8px 12px;
          font-weight:600;
          border-bottom:1px solid ${headerBorderColor};
          background:${headerBg}; color:${headerColor};">
        Found ${verses.length} verses
      </div>`;

		verses.forEach(ref => {
			const highlightedText = regex ? (ref.strong_text || ref.text).replace(regex, '<strong>$1</strong>') : ref.strong_text || ref.text;
			const url = new URL(window.location.href);
			url.searchParams.set('book', ref.book_number);
			url.searchParams.set('chapter', ref.chapter_number);
			url.searchParams.set('verse', ref.verse_number);
			html += `<div class="cross-ref-item" style="padding:10px 12px; border-bottom:1px solid rgba(0,0,0,0.06);">`;
			html += `<a href="${url.href}" class="cross-ref-link">`;
			html += `<span class="cross-ref-reference" style="display:block; font-weight:600; margin-bottom:6px;">${ref.title_full} ${ref.chapter_number}:${ref.verse_number}</span>`;
			html += `<span class="cross-ref-text" style="display:block; white-space:normal;">${highlightedText}</span>`;
			html += `</a>`;
			html += `</div>`;
		});
		body.innerHTML = html;
		// Ensure body remains scrollable after content update
		body.style.overflowY = 'auto';
	}

	async handleStrongNumberBookIconClick(element) {
		try {
			const strongNumber = element.dataset.strongNumber;
console.log("hi 4392 here is strongNumber: ", strongNumber);
			if (!strongNumber) { return; }
			console.log('📖 [StrongNumberModal] Book icon clicked for:', strongNumber);
			this.showPopover(`Strong: ${strongNumber}`, element);
			this.popover.querySelector('.strong-popover-body').innerHTML = '<div class="loading-cross-refs">Loading verses...</div>';
			const version1 = this.readerInstance.currentVersion1;
			const params = new URLSearchParams({
				action: 'bible_here_public_get_verses',
				version1_bible: version1,
				strong_search: strongNumber,
				book_number_start: 1,
				book_number_end: 66,
				chapter_number_start: 1,
				chapter_number_end: 150
			});
			const response = await fetch(`${bibleHereAjax.ajaxurl}?${params}`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': bibleHereAjax.nonce }
			});
			if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
			const data = await response.json();
			const versesArray = (data && data.data && data.data.version1 && Array.isArray(data.data.version1.verses))
				? data.data.version1.verses
				: null;
			if (data.success && versesArray) {
				this.renderStrongPopover(versesArray, strongNumber);
			} else {
				console.error('❌ [StrongNumberModal] Invalid verses response:', data);
				this.popover.querySelector('.strong-popover-body').innerHTML = '<div class="error-cross-refs">Error loading verses. Please try again.</div>';
			}
		} catch (error) {
			console.error('❌ [StrongNumberModal] Error fetching verses for Strong number:', error);
			this.popover.querySelector('.strong-popover-body').innerHTML = '<div class="error-cross-refs">Error loading verses. Please try again.</div>';
		}
	}
	
	show() {
		this.modal.style.display = 'block';
		document.body.style.overflow = 'hidden';
	}
	
	close() {
		this.modal.style.display = 'none';
		document.body.style.overflow = '';
	}
}

// Expose BibleHereReader to global scope for external initialization
window.BibleHereReader = BibleHereReader;
