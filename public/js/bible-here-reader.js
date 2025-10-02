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
		// Handle both string ID and DOM element
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
		this.currentLanguage = this.container.dataset.language || 'en';
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
		console.log('📖 [BibleHereReader41] 初始化開始，Reader ID:', this.readerId);
		console.log('📊 初始狀態:', {
			mode: this.currentMode,
			language: this.currentLanguage, language1: this.currentLanguage1, language2: this.currentLanguage2,
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
	console.log('🚀 BibleHereReader init() just triggered.');

	// Set initial data-mode attribute based on isDualMode
	this.elements.reader.setAttribute('data-mode', this.isDualMode ? 'dual' : 'single');

	// Parse shortcode attributes from container
	const shortcodeAttributes = this.parseShortcodeAttributes();
	if (shortcodeAttributes && Object.keys(shortcodeAttributes).length > 0) {
		console.log('🔧 [init] 發現 shortcode 屬性，開始初始化:', shortcodeAttributes);
		const initResult = await this.initializeFromShortcode(shortcodeAttributes);
		if (initResult.success) {
			console.log('✅ [init] Shortcode 初始化成功');
		} else {
			console.warn('⚠️ [init] Shortcode 初始化失敗，使用預設值:', initResult.errors);
		}
	}

	// Parse URL parameters and apply if present
	const urlParams = this.parseURLParams();
	if (urlParams && Object.keys(urlParams).length > 0) {
		console.log('🔗 [init] 發現 URL 參數，應用設定:', urlParams);
		await this.applyURLParamsToReader(urlParams);
	} else {
		// Set initial URL parameters to establish proper history baseline
		console.log('🔗 [init] 設置初始 URL 參數');
		this.updateURLParams({
			version1: this.currentVersion1,
			version2: this.isDualMode ? this.currentVersion2 : undefined,
			book: this.currentBook,
			chapter: this.currentChapter,
			mode: this.currentMode,
			language: this.currentLanguage1
		}, true); // Use replaceState for initial setup
	}

	this.bindEvents();
	// this.initializeSelectors();

	// Set up popstate event listener for browser navigation
	window.addEventListener('popstate', (event) => {
		console.log('🔄 [init] Popstate 事件觸發');
		this.handlePopState(event);
	});

	// 初始化快取管理器
	await this.initializeCacheManager();

	// Load default KJV Genesis Chapter 1 (unless already loaded from shortcode/URL)
	if (this.currentMode === 'single') {
		this.loadChapter();
	}

	console.log('✅ BibleHereReader init() 完成');
}

		/**
	 * Initialize cache manager
	 */
	async initializeCacheManager() {
		console.log('🗄️ [BibleHereReader111] 初始化快取管理器開始');
		
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
			if (!this.cacheManager.isInitialized) {
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
					console.log('✅ [BibleHereReader181] 快取管理器初始化完成');
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
				console.warn('⚠️ [BibleHereReader203] 等待快取管理器初始化超時');
				clearInterval(checkIntervalId);  // 清除檢查狀態的計時器
				resolve();
			}, 15000);  // Timeout after 15 seconds
		});
	}

	/**
	 * Bind event handlers
	 */
	bindEvents() {
		// Book and Chapter button click  // 設置當前活動的選擇器為第一個
		if (this.elements.bookChapterButton1) {
			// console.log('綁定書卷章節按鈕點擊事件');
			this.elements.bookChapterButton1.addEventListener('click', (e) => {
				console.log('第一個書卷章節按鈕被點擊, e.currentTarget.value: ',e.currentTarget.value, typeof e.currentTarget.value);
				// 設置當前活動的選擇器為第一個
				this.activeSelector = e.currentTarget.value;
				this.toggleBookChapterMenu();
			});
		} else {
			console.log('找不到書卷章節按鈕元素');
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

		// Search button
		if (this.elements.searchButton) {
			this.elements.searchButton.addEventListener('click', () => {
				this.openSearch();
			});
		}

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
			if (e.target.classList.contains('btn-close-version') || e.target.classList.contains('close-icon')) {
				e.preventDefault();
				e.stopPropagation();
				console.log('🔄 關閉雙版本模式');
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
	}

		/**
		 * Initialize selectors based on current state
		 */
		// initializeSelectors() {
		// 	// 不在初始化時載入版本，避免重設 currentBook 和 currentChapter
		// 	// 這些值已經在 constructor 中正確設定
		// 	console.log('🔧 [BibleHereReader] initializeSelectors 跳過版本載入，保持現有設定');
		// }

	/**
	 * Handle language change
	 */
	onLanguageChange() {
		if (!this.currentLanguage || !this.currentLanguage1	|| !this.currentLanguage1) {
			this.resetSelectors(['version', 'book', 'chapter']);
			return;
		}
		
		this.loadVersions();
	}

	/**
	 * Handle version change
	 */
	onVersionChange() {
		if (!this.currentVersion1 || !this.currentVersion2) {
			this.resetSelectors(['book', 'chapter']);
			return;
		}
		
		this.loadBooks();
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
	 * Load available versions for selected language
	 */
	loadVersions() {
		this.showLoading();
		console.log("loadVersions 428", this.currentLanguage, this.currentLanguage1, this.currentLanguage2)
		const params = new URLSearchParams({
			action: 'bible_here_public_get_versions',
			language: this.currentLanguage,
		});
console.log("loadVersions 433, params: ", this.params)
		fetch(`${bibleHereAjax.ajaxurl}?${params}`, {
			method: 'GET',
			headers: {
				"X-WP-Nonce": bibleHereAjax.nonce
			}
		})
		.then(response => response.json())
		.then(data => {
			this.hideLoading();
			
			if (data.success) {
				this.populateVersionSelect(data.data);
			} else {
				this.showError(data.data || 'Failed to load versions');
			}
		})
		.catch(error => {
			this.hideLoading();
			this.showError('Network error: ' + error.message);
		});
	}

	/**
	 * Load available books for selected language
	 */
	loadBooks() {
		console.log("loadBooks 460", this.currentLanguage, this.currentLanguage1, this.currentLanguage2)
		const params = new URLSearchParams({
			action: 'bible_here_public_get_books',
			language: this.currentLanguage,
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
		 * Load chapters for selected book (mock implementation)
		 */
		// loadChapters() {
		// 	// For now, we'll use a simple chapter count based on book
		// 	// This should be replaced with actual API call in phase 2
		// 	const chapterCounts = {
		// 		'genesis': 50, 'exodus': 40, 'leviticus': 27, 'numbers': 36, 'deuteronomy': 34,
		// 		'joshua': 24, 'judges': 21, 'ruth': 4, '1samuel': 31, '2samuel': 24,
		// 		'1kings': 22, '2kings': 25, '1chronicles': 29, '2chronicles': 36, 'ezra': 10,
		// 		'nehemiah': 13, 'esther': 10, 'job': 42, 'psalms': 150, 'proverbs': 31,
		// 		'ecclesiastes': 12, 'songofsolomon': 8, 'isaiah': 66, 'jeremiah': 52, 'lamentations': 5,
		// 		'ezekiel': 48, 'daniel': 12, 'hosea': 14, 'joel': 3, 'amos': 9,
		// 		'obadiah': 1, 'jonah': 4, 'micah': 7, 'nahum': 3, 'habakkuk': 3,
		// 		'zephaniah': 3, 'haggai': 2, 'zechariah': 14, 'malachi': 4,
		// 		'matthew': 28, 'mark': 16, 'luke': 24, 'john': 21, 'acts': 28,
		// 		'romans': 16, '1corinthians': 16, '2corinthians': 13, 'galatians': 6, 'ephesians': 6,
		// 		'philippians': 4, 'colossians': 4, '1thessalonians': 5, '2thessalonians': 3, '1timothy': 6,
		// 		'2timothy': 4, 'titus': 3, 'philemon': 1, 'hebrews': 13, 'james': 5,
		// 		'1peter': 5, '2peter': 3, '1john': 5, '2john': 1, '3john': 1,
		// 		'jude': 1, 'revelation': 22
		// 	};

		// 	const chapterCount = chapterCounts[this.currentBook] || 1;
		// 	this.populateChapterSelect(chapterCount);
		// }

		/**
	 * Load chapter content using cache manager or API
	 * @param {boolean} updateURL - Whether to update URL parameters (default: true)
	 */
	async loadChapter(updateURL = true) {
		console.log('📖 [BibleHereReader523] async loadChapter() 開始載入章節:', {
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
				language: this.currentLanguage1
			});
		}

		this.showLoading();
		
		// Switch to single version mode if in zero mode
		if (this.currentMode === 'zero') {
			this.switchMode('single');
		}

		try {
			let chapterContent = null;

			// 獲取當前書卷的 book_number 以取得verse數目
			// let bookNumber = this.currentBook;
			// const currentBookData = await this.getCurrentBookData();
			// if (currentBookData && currentBookData.book_number) {
			// 	bookNumber = currentBookData.book_number;
			// 	console.log('📚 543 從快取獲取到 currentBookData:', currentBookData, );
			// }

			// 嘗試從快取獲取 - 使用 table_name (currentVersion), book_number, chapter_number
			if (this.cacheManager) {
				console.log('🗄️ [BibleHereReader556] async loadChapter() 嘗試從快取獲取章節內容:', {
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
				console.log('🗄️ [BibleHereReader567] async loadChapter() chapterContent: ', chapterContent);
				if (chapterContent && chapterContent.length > 0) {
					console.log('✅ [BibleHereReader569] async loadChapter() 從快取獲取到章節內容，經文數量:', chapterContent.length);
					console.log('📖 [BibleHereReader570] async loadChapter() 快取經文資料預覽:', chapterContent.slice(0, 3));
					const displayContent = {version1: { verses: chapterContent.filter(item => item.table_name === this.currentVersion1), table_name: this.currentVersion1 }};
					if (this.isDualMode && this.currentVersion2 && this.currentVersion2 !== this.currentVersion1) {
						const verse2Content = chapterContent.filter(item => item.table_name === this.currentVersion2);
						if (verse2Content && verse2Content.length > 0) {
							this.hideLoading();
							this.displayChapterContent(displayContent);
							displayContent.version2 = { verses: verse2Content, table_name: this.currentVersion2 };
							this.displayDualVersionContent(displayContent);  // load single and dual data for faster switching
							return;
						}  // If there's no cached version2 content in dual mode, proceed to API fetch without return
					} else {
						this.hideLoading();
						this.displayChapterContent(displayContent);
						this.displayDualVersionContent(displayContent);  // load single and dual data for faster switching
						return;
					}
				} else {
					console.log('⚠️ [BibleHereReader588] async loadChapter() 快取中沒有找到足夠章節內容，將從 API 獲取');
				}
			}
				
				// 從 API 獲取
			console.log('🌐 585 async loadChapter() 從 API 獲取章節內容');
			
			// 構建 URL 參數
			const url = new URL(bibleHereAjax.ajaxurl);
			url.searchParams.set('action', 'bible_here_public_get_verses');
			url.searchParams.set('book_number_start', this.currentBook);
			url.searchParams.set('book_number_end', this.currentBook);
			url.searchParams.set('chapter_number_start', this.currentChapter);
			url.searchParams.set('chapter_number_end', this.currentChapter);  // Todo: preload the next chapter but that need change of get_verses API shape change (move book&chapter number to verse Array)
			url.searchParams.set('version1_bible', this.currentVersion1);
			console.log(`🌐 595 async loadChapter() this.isDualMode: ${this.isDualMode}, this.currentVersion1: ${this.currentVersion1} , this.currentVersion2: ${this.currentVersion2}`);
			// 如果是雙版本模式且有第二個版本，添加第二個版本參數
			if (this.isDualMode && this.currentVersion2 && this.currentVersion2 !== this.currentVersion1) {
				url.searchParams.set('version2_bible', this.currentVersion2);
				console.log('🔄 雙版本模式，載入第二個版本:', this.currentVersion2);
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
			console.log('📋 [BibleHereReader616] async loadChapter() API 完整回應:', {
				success: data.success,
				data: data.data,
				message: data.message,
				fullResponse: data
			});
			
			// 檢查回應條件並添加日誌
			console.log('🔍 [BibleHereReader] async loadChapter() 檢查回應條件:', {
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
							text: verse.text,
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
							text: verse.text,
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
		
		if (!version1Container || !version2Container) {
			console.error('❌ 找不到雙版本容器:', {
				version1Container: !!version1Container,
				version2Container: !!version2Container,
				dualMode: !!this.elements.dualMode
			});
			return;
		}
		console.log('✅ 找到雙版本容器，開始處理內容');
		console.log(`hi 746 this.currentVersion1NameShort: ${this.currentVersion1NameShort}, this.currentVersion2NameShort: ${this.currentVersion2NameShort}`);
		// 顯示 version1 內容
		if (data.version1 && data.version1.verses) {
			console.log('📖 顯示 version1 內容，經文數量:', data.version1.verses.length);
			let html1 = '';
			data.version1.verses.forEach(verse => {
				html1 += `<p class="verse" data-verse="${verse.verse_id}">`;
				html1 += `<span class="verse-number unselectable-list">${verse.verse_number}</span>`;
				html1 += `<span class="verse-text">${verse.text}</span>`;
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
				html2 += `<span class="verse-number unselectable-list">${verse.verse_number}</span>`;
				html2 += `<span class="verse-text">${verse.text}</span>`;
				html2 += `</p>`;
			});
			version2Container.innerHTML = html2;
			if (data.version2.table_name){
				version2Container.dataset.tableName = data.version2.table_name;
			}
			console.log('✅ version2 內容已處理');
		} else {
			console.log('⚠️ 760 沒有 version2 資料，使用 version1 內容');
			// 如果沒有 version2，顯示相同的 version1 內容
			if (data.version1 && data.version1.verses) {
				let html1 = '';
				data.version1.verses.forEach(verse => {
					html1 += `<p class="verse" data-verse="${verse.verse_id}">`;
					html1 += `<span class="verse-number unselectable-list">${verse.verse_number}</span>`;
					html1 += `<span class="verse-text">${verse.text}</span>`;
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

		if (!chapterData || !chapterData.verses || chapterData.verses.length === 0) {
			container.innerHTML = '<p class="no-content">No content available for this chapter.</p>';
			return;
		}

		let html = '';
		Object.values(chapterData.verses).forEach(verse => {
			html += `<p class="verse" data-verse="${verse.verse_id}">`;
			html += `<span class="verse-number unselectable-list">${verse.verse_number}</span>`;
			html += `<span class="verse-text">${verse.text}</span>`;
			html += `</p>`;
		});

		container.innerHTML = html;
		
		// 經文顯示完成後，載入版本資料
		this.loadVersionsAfterChapter();
	}

	/**
	 * Load versions after chapter content is displayed
	 */
	async loadVersionsAfterChapter() {
		console.log('📚 [BibleHereReader848] 經文顯示完成，開始載入版本資料.  Todo: check cache data time before AJAX');
		// const cachedVersions = await this.cacheManager.getVersions(navigator.languages);
		// if (cachedVersions != null && Array.isArray(cachedVersions) && cachedVersions.length > 0) {
		// 	console.log('✅ [BibleHereReader851]  loadVersionsAfterChapter found previous cache, skipping loading');
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
			console.log('📚 [BibleHereReader871] 版本資料 API 回應:', data);
			
			if (data.success && data.data) {
				// 將版本資料載入到快取
				if (this.cacheManager) {
					await this.cacheManager.cacheVersions(data.data.versions);
					console.log('✅ [BibleHereReader] 版本資料已載入快取');
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
		console.log('🔄 [BibleHereReader886] 按語言分組版本:', versionsByLanguage);
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
		
		// 綁定點擊事件
		const versionItems = versionsList.querySelectorAll('.version-item');
		versionItems.forEach(item => {
			item.addEventListener('click', (e) => {
				console.log("🔄 [BibleHereReader] addEventListener at 916");
				this.selectVersionAndLoadBooksTab(e.currentTarget.dataset);
			});
		});
		
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
		console.log(`hi updateBookChapterButton() 1020, versionLabel: ${versionLabel} this.activeSelector: ${this.activeSelector}, 'bookChapterText' + this.activeSelector: ${'bookChapterText' + this.activeSelector}, selector: ${selector}`);
		console.log(`hi updateBookChapterButton() 1021, targetElement: ${targetElement}, this.currentVersion1NameShort: ${this.currentVersion1NameShort}, this.currentVersion2NameShort: ${this.currentVersion2NameShort}`);
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
			console.log(`hi updateBookChapterButton() 1040, triggered by button1 updating button2`);
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
		const bookNumber = 1; // Placeholder
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
			version2: this.isDualMode ? this.currentVersion2 : undefined,
			book: this.currentBook,
			chapter: this.currentChapter,
			mode: this.currentMode,
			language: this.currentLanguage1
		});
	}

	/**
	 * Navigate to next chapter
	 */
	async navigateNext(versionNameShort) {
		console.log("navigateNext() 1134, versionNameShort, this.currentLanguage and this.currentChapter:", versionNameShort, this.currentLanguage, this.currentChapter);
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
				if (this.isDualMode) {
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
			version2: this.isDualMode ? this.currentVersion2 : undefined,
			book: this.currentBook,
			chapter: this.currentChapter,
			mode: this.currentMode,
			language: this.currentLanguage1
		});
	}

	/**
	 * Open search interface
	 */
	openSearch() {
		// TODO: Implement search functionality
		console.log('Search functionality to be implemented');
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
		console.log(`1208 Version toggle clicked - switching modes here is this.currentVersion2NameShort: ${this.currentVersion2NameShort}, this.currentVersion1NameShort: ${this.currentVersion1NameShort}`);
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
		
		// Load content for the current mode - 載入真實 API 資料
		if (this.isDualMode) {
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
	showAddVersionInterface() {
		alert('Add Version functionality will be implemented in Phase 4: Dual Version Mode');
	}

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
		// Set default second version (same as first version)
		this.currentVersion2 = this.currentVersion1;
		this.currentVersion2NameShort = this.currentVersion1NameShort;
		
		// Update second version selector text
		this.updateBookChapterText2();
		
		console.log(`1371 第二個版本初始化為: ${this.currentVersion2}, this.currentVersion2NameShort : ${this.currentVersion2NameShort}`);
	}





	/**
	 * Select version for second reader
	 */
	async selectVersion2(versionElement) {
		const version = versionElement.dataset.version;
		const versionNameShort = versionElement.dataset.versionNameShort;
		
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
			await this.loadChapter(this.currentBook, this.currentChapter);
			
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
		
		// Check if verse elements exist and log their computed styles
		const verseTexts = this.container.querySelectorAll('.verse-text');
		const verseNumbers = this.container.querySelectorAll('.verse_number');
		
		console.log('📝 [BibleHereReader1293] Found verse texts:', verseTexts.length);
		console.log('🔢 [BibleHereReader1294] Found verse numbers:', verseNumbers.length);
		
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

		// Version selection
		const versionItems = this.elements.bookChapterMenu.querySelectorAll('.version-item');
		versionItems.forEach(item => {
			item.addEventListener('click', () => {
				console.log("🔄 [BibleHereReader1813] addEventListener");
				this.selectVersionAndLoadBooksTab(item.dataset);
			});
		});

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
		console.log('toggleBookChapterMenu() 被調用');
		console.log('bookChapterMenu 元素:', this.elements.bookChapterMenu);
		if (!this.elements.bookChapterMenu) {
			console.log('找不到 bookChapterMenu 元素');
			return;
		}

		if (this.elements.bookChapterMenu.classList.contains('book-chapter-menu-visible')) {
			console.log('隱藏 book chapter menu');
			this.hideBookChapterMenu();
		} else {
			console.log('顯示 book chapter menu');
			this.showBookChapterMenu();
		}
	}

	/**
	 * Show book chapter menu
	 */
	showBookChapterMenu() {
		console.log('showBookChapterMenu() 被調用');
		if (!this.elements.bookChapterMenu) {
			console.log('找不到 bookChapterMenu 元素');
			return;
		}

		// Hide theme menu if open
		this.hideThemeMenu();

		// Show menu
		this.elements.bookChapterMenu.classList.add('book-chapter-menu-visible');
		console.log('已添加 book-chapter-menu-visible class');

		// Initialize with books tab if not already set
		const activeTab = this.elements.bookChapterMenu.querySelector('.menu-tab.active');
		console.log('當前 active tab:', activeTab);
		if (!activeTab) {
			console.log('沒有 active tab，切換到 books tab');
			this.switchBookChapterTab('books');
		} else {
			console.log('已有 active tab:', activeTab.dataset.tab);
			// 調用 switchBookChapterTab 來確保對應的 load 函數被執行
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
		console.log('switchBookChapterTab 被調用，tabName:', tabName);
		console.log('bookChapterMenu 元素:', this.elements.bookChapterMenu);
		if (!this.elements.bookChapterMenu) {
			console.log('找不到 bookChapterMenu 元素');
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
		console.log('準備載入 tab 內容，tabName:', tabName);
		switch (tabName) {
			case 'versions':
				console.log('載入 versions tab');
				this.loadVersionsTab();
				break;
			case 'books':
				console.log('載入 books tab');
				this.loadBooksTabAndUpdateBookChapterButton();
				break;
			case 'chapters':
				console.log('載入 chapters tab');
				this.loadChaptersTab();
				break;
			default:
				console.log('未知的 tab 名稱:', tabName);
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
					language: this.currentLanguage,
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

		// Bind events for new version items
		const versionItems = container.querySelectorAll('.version-item');
		versionItems.forEach(item => {
			item.addEventListener('click', () => {
				console.log("🔄 [BibleHereReader] addEventListener at 2186 here is item.dataset: ", item.dataset);
				this[`currentVersion${this.activeSelector}NameShort`] = item.dataset.versionNameShort;  // this.currentVersion1NameShort = item.dataset.versionNameShort;
				console.log(`2188 this.currentVersion1NameShort: ${this.currentVersion1NameShort}, this.currentVersion2NameShort: ${this.currentVersion2NameShort}`);
				this.selectVersionAndLoadBooksTab(item.dataset);
			});
		});
	}

	/**
	 * Load books tab content using cache manager or API
	 */
	async loadBooksTabAndUpdateBookChapterButton(versionNameShort) {
		console.log('📚 2198 開始載入書卷列表: versionNameShort and this.currentBook: ', versionNameShort, this.currentBook);
		const booksContent = this.elements.bookChapterMenu.querySelector('.tab-content[data-content="books"]');
		if (!booksContent) {
			console.log('❌ 找不到書卷內容容器');
			return;
		}

		// Check if content already exists (has books sections)
		// const existingSections = booksContent.querySelectorAll('.books-section');
		// if (existingSections.length > 0) {
		// 	console.log('📖 書卷內容已存在，只更新 active 狀態');
		// 	// Content already exists, just update active states
		// 	this.updateBookActiveStates();
		// 	return;
		// }
		const currentLanguageVariable = 'currentLanguage' + this.activeSelector;
		const currentLanguage = this[currentLanguageVariable];
		try {
			let books = null;
			// 嘗試從快取獲取書卷列表
			if (this.cacheManager) {
				console.log('🗄️ [BibleHereReader 2224] 嘗試從快取獲取書卷列表, currentLanguage: ', currentLanguage);
				console.log('🌐 [DEBUG] 當前語言參數 this[currentLanguageVariable]:', this[currentLanguageVariable]);
				books = await this.cacheManager.getCachedBooks(this['currentLanguage' + this.activeSelector]);
				if (books && Object.keys(books).length > 0) {
					console.log('✅ [BibleHereReader2228] 從快取獲取到書卷列表，書卷數量:', Object.keys(books).length);
					console.log('📚 [BibleHereReader2229] 快取書卷資料預覽, books:', books[1]);
					console.log('🔍 [DEBUG] 書卷名稱語言檢查:', {
						firstBookName: books[40]?.title_full,
						secondBookName: books[41]?.title_full,
						thirdBookName: books[42]?.title_full
					});
					this.renderBooksList(Object.values(books), booksContent);
					this.updateBookChapterButton(versionNameShort, books[this.currentBook].title_short);
					return;
				} else {
					console.log('⚠️ [BibleHereReader] 快取中沒有找到書卷列表，將從 API 獲取');
				}
			}

			// 從 API 獲取書卷列表
			console.log('🌐 從 API 獲取書卷列表');
			const params = new URLSearchParams({
				action: 'bible_here_public_get_books',
				languages: [...navigator.languages, currentLanguage],
			});

			console.log('📡 發送 AJAX 請求到:', `${bibleHereAjax.ajaxurl}?${params}`);

			const response = await fetch(`${bibleHereAjax.ajaxurl}?${params}`, {
				method: 'GET',
				headers: {
					"X-WP-Nonce": bibleHereAjax.nonce,
				},
			});

			const data = await response.json();
			console.log('📊 API 回應資料:', data);
			
			if (!data.success) {
				throw new Error(data.data || 'Failed to load books');
			}

			// books = data.data.books;
			console.log('📚 2267 從 API 獲取到書卷資料，當前語言書卷數量:', Object.keys(data.data[currentLanguage]).length);

			// 渲染書卷列表 - 傳入陣列格式
			this.renderBooksList(Object.values(data.data[currentLanguage]), booksContent);
			this.updateBookChapterButton(versionNameShort, data.data[currentLanguage][this.currentBook].title_short);
			// 將書卷資料存入快取 - 轉換物件為陣列格式
			// const booksArray = Object.values(books);
			if (this.cacheManager && data.data && Object.keys(data.data).length > 0) {
				console.log('💾 [BibleHereReader2196] 將書卷資料存入快取');
				// data.data.forEach(language => {
				// 	console.log('📊 [BibleHereReader] 準備快取的書卷資料:', {
				// 		language: language,   // hi books may be in difference languages
				// 		count: booksArray.length,
				// 		sample: booksArray.slice(0, 2)
				// 	});
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
		console.log('🎨 開始渲染書卷列表，書卷數量:', books.length);
		console.log('🌐 [DEBUG] 當前語言參數 (renderBooksList):', this.currentLanguage);

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
		this.hideBookChapterMenu();
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
		this.hideBookChapterMenu();
		this.loadChapter();
	}

	/**
	 * Select chapter
	 */
	selectChapter(chapterNumber) {
		this.currentChapter = chapterNumber;
		this.updateBookChapterButton();
		this.hideBookChapterMenu();
		console.log('📚 2504 selectChapter: chapterNumber', chapterNumber);
		this.loadChapter();
	}

	swapVersions() {
    	console.log('🔄 2509 swapVersions() 開始版本切換');
		const version1BookNameShort = this.elements.bookChapterText1.dataset.bookNameShort;
		const version2BookNameShort = this.elements.bookChapterText2.dataset.bookNameShort;

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
				const cachedVersions = await this.cacheManager.getVersions();
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
		console.log('🔍 [parseURLParams] 解析 URL 參數');

		try {
			const urlParams = new URLSearchParams(window.location.search);
			const params = {
				version1: urlParams.get('version1') || null,
				version2: urlParams.get('version2') || null,
				book: urlParams.get('book') ? parseInt(urlParams.get('book')) : null,
				chapter: urlParams.get('chapter') ? parseInt(urlParams.get('chapter')) : null,
				mode: urlParams.get('mode') || null,
				language: urlParams.get('language') || null
			};

			// Validate parsed parameters
			if (params.book && (params.book < 1 || params.book > 66)) {
				console.warn('⚠️ [parseURLParams] 無效的書卷編號:', params.book);
				params.book = null;
			}

			if (params.chapter && params.chapter < 1) {
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
						const bookNameShort = cachedBooks[this.currentBook].title_short;
						console.log('📖 [applyURLParamsToReader] 更新書卷名稱按鈕:', {
							book: this.currentBook,
							bookNameShort: bookNameShort,
							version1: this.currentVersion1NameShort
						});
						
						this.updateBookChapterButton(this.currentVersion1NameShort, bookNameShort, '1');
						if (this.currentMode === 'dual' && this.currentVersion2NameShort) {
							this.updateBookChapterButton(this.currentVersion2NameShort, bookNameShort, '2');
						}
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
					if (this.currentMode === 'dual' && this.currentVersion2) {
						this.loadDualVersionChapter();
					} else {
						this.loadChapter(false); // Don't update URL to avoid duplicate updates
					}
				}
			} else {
				console.log('ℹ️ [applyURLParamsToReader] 無參數變更，不需重新載入');
			}

		} catch (error) {
			console.error('❌ [applyURLParamsToReader] 應用 URL 參數時發生錯誤:', error);
		}
	}

// loadDualVersionChapter() {  // 確保這個方法使用最新的 this.currentVersion1 和 this.currentVersion2
	// 	// 載入第一版本
	// 	this.loadChapterForVersion(this.currentVersion1, '.version-1');
	// 	// 載入第二版本  
	// 	this.loadChapterForVersion(this.currentVersion2, '.version-2');
	// }
}

/**
 * Initialize all Bible Here Readers on the page
 */
document.addEventListener('DOMContentLoaded', function() {
	console.log('🎬 [BibleHereReader2505] DOM loaded, initializing reader system...');
	const readers = document.querySelectorAll('.bible-here-reader');
	readers.forEach(function(element) {
		new BibleHereReader(element);
	});
});

// Expose BibleHereReader to global scope for external initialization
window.BibleHereReader = BibleHereReader;