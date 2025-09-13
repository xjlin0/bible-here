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
		this.currentVersion1 = this.container.dataset.version1 || 'bible_here_en_kjv';
		console.log(`📖 [BibleHereReader32] this.container.dataset.book: ${this.container.dataset.book}, this.container.dataset.chapter: ${this.container.dataset.chapter}`);
		this.currentBook = parseInt(this.container.dataset.book) || 19;
		this.currentChapter = parseInt(this.container.dataset.chapter) || 117;
		this.currentVersion1NameShort = this.container.dataset.version1NameShort || 'KJV';
		// Initialize dual mode state
		this.isDualMode = false;
		
		// 初始化快取管理器
		this.cacheManager = null;
		console.log('📖 [BibleHereReader41] 初始化開始，Reader ID:', this.readerId);
		console.log('📊 初始狀態:', {
			mode: this.currentMode,
			language: this.currentLanguage,
			version1: this.currentVersion1,
			currentVersion1NameShort: this.currentVersion1NameShort,
			book: this.currentBook,
			chapter: this.currentChapter
		});
		
		// Cache DOM elements
		this.elements = {
			reader: this.container,
			bookSelect: this.container.querySelector('.book-select'),
			chapterSelect: this.container.querySelector('.chapter-select'),
			bookChapterButton: this.container.querySelector('.btn-book-chapter'),
			bookChapterText: this.container.querySelector('.book-chapter-text'),
			bookChapterMenu: this.container.querySelector('.book-chapter-menu'),
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

		this.bindEvents();
		// this.initializeSelectors();

		// 初始化快取管理器
		await this.initializeCacheManager();
		
		// Load default KJV Genesis Chapter 1
		if (this.currentMode === 'single') {
			this.loadChapter();
		}
		
		console.log('✅ BibleHereReader 104 init() 完成');
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
		// Book and Chapter button click
		if (this.elements.bookChapterButton) {
			// console.log('綁定書卷章節按鈕點擊事件');
			this.elements.bookChapterButton.addEventListener('click', () => {
				console.log('書卷章節按鈕被點擊');
				this.toggleBookChapterMenu();
			});
		} else {
			console.log('找不到書卷章節按鈕元素');
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
				!this.elements.bookChapterButton.contains(e.target)) {
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
		if (!this.currentLanguage) {
			this.resetSelectors(['version', 'book', 'chapter']);
			return;
		}
		
		this.loadVersions();
	}

	/**
	 * Handle version change
	 */
	onVersionChange() {
		if (!this.currentVersion1) {
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

		const params = new URLSearchParams({
			action: 'bible_here_public_get_versions',
			language: this.currentLanguage,
		});

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
		const params = new URLSearchParams({
			action: 'bible_here_public_get_books',
			language: this.currentLanguage,
			_wpnonce: bibleHereAjax.nonce
		});

		fetch(`${bibleHereAjax.ajaxurl}?${params}`, {
			method: 'GET'
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
		 */
	async loadChapter() {
		console.log('📖 [BibleHereReader477] async loadChapter() 開始載入章節:', {
			version: this.currentVersion1,
			book: this.currentBook,
			chapter: this.currentChapter
		});
		
		if (!this.currentVersion1 || !this.currentBook || !this.currentChapter) {
			console.warn('⚠️ 缺少必要參數');
			this.showError('Please select version, book, and chapter');
			return;
		}

		this.showLoading();
		
		// Switch to single version mode if in zero mode
		if (this.currentMode === 'zero') {
			this.switchMode('single');
		}

		try {
			let chapterContent = null;

			// 獲取當前書卷的 book_number
			let bookNumber = this.currentBook;
			const currentBookData = await this.getCurrentBookData();
			if (currentBookData && currentBookData.book_number) {
				bookNumber = currentBookData.book_number;
				console.log('📚 從快取獲取到 book_number:', bookNumber);
			}

			// 嘗試從快取獲取 - 使用 table_name (currentVersion), book_number, chapter_number
		if (this.cacheManager) {
			console.log('🗄️ [BibleHereReader509] async loadChapter() 嘗試從快取獲取章節內容:', {
				table_name: this.currentVersion1,
				book_number: bookNumber,
				chapter_number: this.currentChapter
			});
			chapterContent = await this.cacheManager.getCachedVerses(
				this.currentLanguage,
				this.currentVersion1,
				bookNumber,
				this.currentChapter
			);
			console.log('🗄️ [BibleHereReader520] async loadChapter() chapterContent: ', chapterContent);
			if (chapterContent && chapterContent.length > 0) {
				console.log('✅ [BibleHereReader522] async loadChapter() 從快取獲取到章節內容，經文數量:', chapterContent.length);
				console.log('📖 [BibleHereReader523] async loadChapter() 快取經文資料預覽:', chapterContent.slice(0, 3));
				this.hideLoading();
				this.displayChapterContent({version1: { verses: chapterContent, table_name: this.currentVersion1 }});
				this.displayDualVersionContent({version1: { verses: chapterContent, table_name: this.currentVersion1}});  // load single and dual data for faster switching
				return;
			} else {
				console.log('⚠️ [BibleHereReader525] async loadChapter() 快取中沒有找到章節內容，將從 API 獲取');
			}
		}
			
			// 從 API 獲取
		console.log('🌐 447 async loadChapter() 從 API 獲取章節內容');
		
		// 構建 URL 參數
		const url = new URL(bibleHereAjax.ajaxurl);
		url.searchParams.set('action', 'bible_here_public_get_verses');
		url.searchParams.set('book_number_start', this.currentBook);
		url.searchParams.set('book_number_end', this.currentBook);
		url.searchParams.set('chapter_number_start', this.currentChapter);
		url.searchParams.set('chapter_number_end', this.currentChapter);  // Todo: preload the next chapter but that need change of get_verses API shape change (move book&chapter number to verse Array)
		url.searchParams.set('version1_bible', this.currentVersion1);
		
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
			console.log('📋 [BibleHereReader556] async loadChapter() API 完整回應:', {
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
							book_number: this.currentBook,
							chapter_number: this.currentChapter,
							verse_number: verse.verse_number,
							text: verse.text,
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
							book_number: this.currentBook,
							chapter_number: this.currentChapter,
							verse_number: verse.verse,
							text: verse.text,
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
				console.log("632 data.data:", data.data);
				this.hideLoading();
				// it's necessary to load data for both single- and dual-version-mode so toggling mode will work?
				this.displayChapterContent(data.data);
				this.displayDualVersionContent(data.data);
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
		// 顯示 version1 內容
		if (data.version1 && data.version1.verses) {
			console.log('📖 顯示 version1 內容，經文數量:', data.version1.verses.length);
			let html1 = '';
			data.version1.verses.forEach(verse => {
				html1 += `<p class="verse" data-verse="${verse.verse_id}">`;
				html1 += `<span class="verse-number">${verse.verse_number}</span>`;
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
				html2 += `<span class="verse-number">${verse.verse_number}</span>`;
				html2 += `<span class="verse-text">${verse.text}</span>`;
				html2 += `</p>`;
			});
			version2Container.innerHTML = html2;
			if (data.version2.table_name){
				version2Container.dataset.tableName = data.version2.table_name;
			}
			console.log('✅ version2 內容已處理');
		} else {
			console.log('⚠️ 712 沒有 version2 資料，使用 version1 內容');
			// 如果沒有 version2，顯示相同的 version1 內容
			if (data.version1 && data.version1.verses) {
				let html1 = '';
				data.version1.verses.forEach(verse => {
					html1 += `<p class="verse" data-verse="${verse.verse_id}">`;
					html1 += `<span class="verse-number">${verse.verse_number}</span>`;
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
		
		console.log('🎉 雙版本內容處理完成');
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
			html += `<span class="verse-number">${verse.verse_number}</span>`;
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
		console.log('📚 [BibleHereReader780] 經文顯示完成，開始載入版本資料.  Todo: check cache data time before AJAX');
		
		try {
			// 構建 AJAX URL
			const url = new URL(bibleHereAjax.ajaxurl);
			url.searchParams.set('action', 'bible_here_public_get_versions');
			
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
			console.log('📚 [BibleHereReader799] 版本資料 API 回應:', data);
			
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
		console.log('🔄 [BibleHereReader839] 按語言分組版本:', versionsByLanguage);
		// 生成 HTML
		let html = '';
		Object.keys(versionsByLanguage).forEach(language => {
			html += `<div class="language-group">`;
			html += `<h4 class="language-title">${language}</h4>`;
			html += `<div class="versions-grid">`;
			
			versionsByLanguage[language].forEach(version => {
				html += `<div class="version-item" data-version="${version.table_name}" data-version-name-short="${version.name_short}">`;
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
				console.log("🔄 [BibleHereReader] addEventListener at 864");
				this.selectVersion(e.currentTarget.dataset);
			});
		});
		
		console.log('✅ [BibleHereReader] 版本列表顯示已更新');
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
	updateBookChapterButton(versionLabel) {
		if (this.elements.bookChapterText) {
			const bookDisplayName = this.currentBook;
			if (versionLabel) {
				this.elements.bookChapterText.dataset.versionNameShort = versionLabel;
			} else {
				versionLabel = this.elements.bookChapterText.dataset.versionNameShort;
			}
			// console.log("🔄 [BibleHereReader] updateBookChapterButton() 905,versionLabel:",versionLabel);
			this.elements.bookChapterText.textContent = `${versionLabel ? versionLabel + ' ' : ''}${bookDisplayName} ${this.currentChapter}`;
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
	async navigatePrevious() {
		console.log("navigatePrevious() 1039, this.currentLanguage:", this.currentLanguage);
		if (this.currentChapter > 1) {
			this.currentChapter--;
			this.updateBookChapterButton();
			this.loadChapter();
		} else {
			const books = await this.getCachedBooks(this.currentLanguage);
			if (books) {
				const currentBookIndex = books.findIndex(book => book.book_number == this.currentBook);
				if (currentBookIndex > 0) {
					const previousBook = books[currentBookIndex - 1];
					this.currentBook = previousBook.book_number;
					this.currentChapter = previousBook.chapters; // 使用書卷的章節數作為最後一章
					this.updateBookChapterButton();
					this.loadChapter();
				}
			}
		}
	}

	/**
	 * Navigate to next chapter
	 */
	async navigateNext(versionNameShort) {
		console.log("navigateNext() 1063, versionNameShort:", versionNameShort);
		const currentBookData = await this.getCurrentBookData(this.currentLanguage);
		const maxChapters = currentBookData ? currentBookData.chapters : 1;
		
		if (this.currentChapter < maxChapters) {
			this.currentChapter++;
			this.updateBookChapterButton();
			this.loadChapter();
		} else {
			// Go to next book's first chapter
			const books = await this.getCachedBooks();
			if (books) {
				const currentBookIndex = books.findIndex(book => book.book_number == this.currentBook);
				if (currentBookIndex >= 0 && currentBookIndex < books.length - 1) {
					this.currentBook = books[currentBookIndex + 1].book_number;
					this.currentChapter = 1;
					this.updateBookChapterButton();
					this.loadChapter();
				}
			}
		}
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
	async getCurrentBookData() {
		if (!this.cacheManager) return null;
		
		try {
			const books = await this.cacheManager.getCachedBooks(this.currentLanguage);
			if (books && books.length > 0) {
				return books.find(book => book.book_number == this.currentBook);  // Todo: check ===
			}
		} catch (error) {
			console.error('❌ 獲取當前書卷資料失敗:', error);
		}
		
		return null;
	}

	/**
	 * Get cached books
	 */
	async getCachedBooks() {
		if (!this.cacheManager) return null;
		
		try {
			return await this.cacheManager.getCachedBooks(this.currentLanguage);
		} catch (error) {
			console.error('❌ [BibleHereReader984] 獲取書卷快取失敗:', error);
			return null;
		}
	}

	/**
	 * Toggle between single and dual version modes
	 */
	async toggleVersions() {
		console.log('Version toggle clicked - switching modes');
		
		// Toggle between single and dual version modes
		this.isDualMode = !this.isDualMode;
		
		// Update button text
		const versionsButton = this.elements.versionsButton;
		if (versionsButton) {
			const versionsText = versionsButton.querySelector('.versions-text');
			if (versionsText) {
				versionsText.textContent = this.isDualMode ? '- version' : '+ version';
			}
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
		// Flag to prevent infinite scroll loops
		this.isScrollSyncing = false;
		
		// Get dual version containers
		const dualMode = this.container.querySelector('.dual-version-mode');
		if (!dualMode) return;
		
		const version1Container = dualMode.querySelector('.version-1 .verses-container');
		const version2Container = dualMode.querySelector('.version-2 .verses-container');
		
		if (!version1Container || !version2Container) return;
		
		// Add scroll event listeners
		version1Container.addEventListener('scroll', () => {
			if (this.isScrollSyncing) return;
			this.isScrollSyncing = true;
			
			// Sync scroll position
			version2Container.scrollTop = version1Container.scrollTop;
			
			// Reset flag after a short delay
			setTimeout(() => {
				this.isScrollSyncing = false;
			}, 10);
		});
		
		version2Container.addEventListener('scroll', () => {
			if (this.isScrollSyncing) return;
			this.isScrollSyncing = true;
			
			// Sync scroll position
			version1Container.scrollTop = version2Container.scrollTop;
			
			// Reset flag after a short delay
			setTimeout(() => {
				this.isScrollSyncing = false;
			}, 10);
		});
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
				console.log('1314 Tab clicked:', tab.dataset.tab);
				this.switchBookChapterTab(tab.dataset.tab);
			});
		});

		// Version selection
		const versionItems = this.elements.bookChapterMenu.querySelectorAll('.version-item');
		versionItems.forEach(item => {
			item.addEventListener('click', () => {
				console.log("🔄 [BibleHereReader] addEventListener at 1696");
				this.selectVersion(item.dataset);
			});
		});

		// Book selection
		const bookItems = this.elements.bookChapterMenu.querySelectorAll('.book-item');
		bookItems.forEach(item => {
			item.addEventListener('click', () => {
				console.log("1693 book-item 被點擊, here is item:", item);
				this.selectBook(item.dataset.book, item.textContent);
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
				this.loadBooksTab();
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
				html += `<div class="version-item ${isActive ? 'active' : ''}" data-version="${version.table_name}" data-version-name-short="${version.name_short}">`;
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
				console.log("🔄 [BibleHereReader] addEventListener at 1944 here is item.dataset: ", item.dataset);
				this.selectVersion(item.dataset);
			});
		});
	}

	/**
	 * Load books tab content using cache manager or API
	 */
	async loadBooksTab() {
		console.log('📚 開始載入書卷列表');
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

		try {
			let books = null;
			
			// 嘗試從快取獲取書卷列表
			if (this.cacheManager) {
				console.log('🗄️ [BibleHereReader 1932] 嘗試從快取獲取書卷列表');
				console.log('🌐 [DEBUG] 當前語言參數:', this.currentLanguage);
				books = await this.cacheManager.getCachedBooks(this.currentLanguage);
				
				if (books && books.length > 0) {
					console.log('✅ [BibleHereReader] 從快取獲取到書卷列表，書卷數量:', books.length);
					console.log('📚 [BibleHereReader] 快取書卷資料預覽:', books.slice(0, 3));
					console.log('🔍 [DEBUG] 書卷名稱語言檢查:', {
						firstBookName: books[0]?.book_name,
						secondBookName: books[1]?.book_name,
						thirdBookName: books[2]?.book_name
					});
					this.renderBooksList(books, booksContent);
					return;
				} else {
					console.log('⚠️ [BibleHereReader] 快取中沒有找到書卷列表，將從 API 獲取');
				}
			}

			// 從 API 獲取書卷列表
			console.log('🌐 從 API 獲取書卷列表');
			const params = new URLSearchParams({
				action: 'bible_here_public_get_books',
				_wpnonce: bibleHereAjax.nonce
			});

			console.log('📡 發送 AJAX 請求到:', `${bibleHereAjax.ajaxurl}?${params}`);

			const response = await fetch(`${bibleHereAjax.ajaxurl}?${params}`, {
				method: 'GET'
			});

			const data = await response.json();
			console.log('📊 API 回應資料:', data);
			
			if (!data.success) {
				throw new Error(data.data || 'Failed to load books');
			}

			books = data.data.books;
			console.log('📚 從 API 獲取到書卷資料，書卷數量:', Object.keys(books).length);

			// 將書卷資料存入快取 - 轉換物件為陣列格式
			const booksArray = Object.values(books);
			if (this.cacheManager && books && Object.keys(books).length > 0) {
				console.log('💾 [BibleHereReader] 將書卷資料存入快取');
				console.log('📊 [BibleHereReader] 準備快取的書卷資料:', {
					language: this.currentLanguage,   // hi books may be in difference languages
					count: booksArray.length,
					sample: booksArray.slice(0, 2)
				});
				try {
					await this.cacheManager.cacheBooks(booksArray, this.currentLanguage);
					console.log('✅ [BibleHereReader] 書卷資料已成功存入快取');
				} catch (cacheError) {
					console.error('❌ [BibleHereReader] 存入快取時發生錯誤:', cacheError);
				}
			}

			// 渲染書卷列表 - 傳入陣列格式
			this.renderBooksList(booksArray, booksContent);
		} catch (error) {
			console.error('❌ 載入書卷列表時發生錯誤:', error);
			// 顯示錯誤訊息給用戶
			booksContent.innerHTML = '<div class="error-message">載入書卷列表時發生錯誤，請稍後再試。</div>';
		}
	}

	/**
	 * Render books list from data
	 */
	renderBooksList(books, booksContent) {
		console.log('🎨 開始渲染書卷列表，書卷數量:', books.length);
		console.log('🌐 [DEBUG] 當前語言參數 (renderBooksList):', this.currentLanguage);
		
		// 分離舊約和新約書卷
		const oldTestament = books.filter(book => {
			// 如果有 testament 字段，使用它；否則根據 book_number 判斷
			if (book.testament) {
				return book.testament === 'old' || book.testament === 'OT';
			}
			// 假設舊約書卷編號 1-39
			return book.book_number && book.book_number <= 39;
		});
		
		const newTestament = books.filter(book => {
			// 如果有 testament 字段，使用它；否則根據 book_number 判斷
			if (book.testament) {
				return book.testament === 'new' || book.testament === 'NT';
			}
			// 假設新約書卷編號 40-66
			return book.book_number && book.book_number >= 40;
		});

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
			const bookKey = book.book_key || book.book_name.toLowerCase().replace(/\s+/g, '');
			const isActive = bookKey === this.currentBook;
			
			// 使用英文書卷名稱
			const bookDisplayName = book.book_abbreviation || book.book_name;
			const bookFullName = book.book_name;
			
			oldTestamentHtml += `<div class="book-item ${isActive ? 'active' : ''}" data-book-number=${book.book_number} data-book="${bookKey}" title="${bookFullName}">`;
			oldTestamentHtml += `<span class="book-name">${bookDisplayName}</span>`;
			oldTestamentHtml += `<span class="book-full-name">${bookFullName}</span>`;
			oldTestamentHtml += `</div>`;
		});
		
		// 渲染新約書卷
		let newTestamentHtml = '';
		newTestament.forEach(book => {
			// 使用 book_name 作為 key，如果沒有則使用 book_key
			const bookKey = book.book_key || book.book_name.toLowerCase().replace(/\s+/g, '');
			const isActive = bookKey === this.currentBook;
			
			// 使用英文書卷名稱
			const bookDisplayName = book.book_abbreviation || book.book_name;
			const bookFullName = book.book_name;
			
			newTestamentHtml += `<div class="book-item ${isActive ? 'active' : ''}" data-book-number=${book.book_number} data-book="${bookKey}" title="${bookFullName}">`;
			newTestamentHtml += `<span class="book-name">${bookDisplayName}</span>`;
			newTestamentHtml += `<span class="book-full-name">${bookFullName}</span>`;
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
				console.log('📚 2109 書卷被點擊:', { bookKey: item.dataset.book, item: item, item_dataset_bookNumber: item.dataset.bookNumber});
				this.selectBook(item.dataset.book, parseInt(item.dataset.bookNumber));
			});
		});
		console.log('🔗 2113 書卷點擊事件已綁定，共', bookItems.length, '個書卷');
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
	selectVersion(versionDataset) {
		console.log("📚 2200 selectVersion(), versionDataset:", versionDataset);
		this.currentVersion1 = versionDataset.version;
		this.updateBookChapterButton(versionDataset.versionNameShort);
		this.hideBookChapterMenu();
		this.loadChapter();
	}

	/**
	 * Select book
	 */
	async selectBook(bookKey, bookNumber) {
		this.currentBook = bookNumber;
		this.currentChapter = 1; // Reset to chapter 1
		console.log('📚 2200 selectBook: bookKey & bookNumber', { bookKey, bookNumber });
		// Update chapters tab with new book's chapter count
		await this.loadChaptersTab();
		
		this.updateBookChapterButton();
		this.hideBookChapterMenu();
		// Load first chapter of selected book
		this.loadChapter();
	}

	/**
	 * Select chapter
	 */
	selectChapter(chapterNumber) {
		this.currentChapter = chapterNumber;
		this.updateBookChapterButton();
		this.hideBookChapterMenu();
		console.log('📚 2217 selectChapter: chapterNumber', chapterNumber);
		this.loadChapter();
	}
}

/**
 * Initialize all Bible Here Readers on the page
 */
document.addEventListener('DOMContentLoaded', function() {
	console.log('🎬 [BibleHereReader2075] DOM loaded, initializing reader system...');
	const readers = document.querySelectorAll('.bible-here-reader');
	readers.forEach(function(element) {
		new BibleHereReader(element);
	});
});

// Expose BibleHereReader to global scope for external initialization
window.BibleHereReader = BibleHereReader;