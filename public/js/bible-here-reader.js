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
				this.container = document.getElementById(container);
			} else {
				this.container = container;
			}
			
			if (!this.container) {
				throw new Error('Bible Here Reader container not found');
			}
			
			this.readerId = this.container.getAttribute('id');
			this.currentMode = this.container.dataset.mode || 'single';
			this.currentLanguage = this.container.dataset.language || 'en';
			this.currentVersion = this.container.dataset.version || 'bible_here_en_kjv';
			this.currentBook = this.container.dataset.book || 'genesis';
			this.currentChapter = parseInt(this.container.dataset.chapter) || 1;
			
			// Initialize dual mode state
			this.isDualMode = false;
			
			// Cache DOM elements
			this.elements = {
				reader: this.container,
				bookSelect: this.container.querySelector('.book-select'),
				chapterSelect: this.container.querySelector('.chapter-select'),
				bookChapterButton: this.container.querySelector('.btn-book-chapter'),
				bookChapterText: this.container.querySelector('.book-chapter-text'),
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
			this.fontSizePreference = localStorage.getItem('bible-here-font-size') || 'md';
			this.applyFontSize(this.fontSizePreference);
			this.initializeFontSizeSlider();
			
			this.init();
		}

		/**
		 * Initialize the reader
		 */
		init() {
			this.bindEvents();
			this.initializeSelectors();
			
			// Load default KJV Genesis Chapter 1
			if (this.currentMode === 'single') {
				this.loadChapter();
			}
		}

		/**
		 * Bind event handlers
		 */
		bindEvents() {
			// Book and Chapter button click
			if (this.elements.bookChapterButton) {
				this.elements.bookChapterButton.addEventListener('click', () => {
					// TODO: Implement book and chapter selection interface
					console.log('Book and chapter selection to be implemented');
				});
			}

			// Book selection change (hidden)
			if (this.elements.bookSelect) {
				this.elements.bookSelect.addEventListener('change', (e) => {
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
				this.elements.prevButton.addEventListener('click', () => {
					this.navigatePrevious();
				});
			}

			// Next button
			if (this.elements.nextButton) {
				this.elements.nextButton.addEventListener('click', () => {
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
		}

		/**
		 * Initialize selectors based on current state
		 */
		initializeSelectors() {
			if (this.currentLanguage && this.elements.languageSelect) {
				this.elements.languageSelect.val(this.currentLanguage);
				this.loadVersions();
			}
		}

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
			if (!this.currentVersion) {
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
				action: 'bible_here_get_versions',
				language: this.currentLanguage
			});

			fetch(`${bibleHereAjax.ajaxurl}?${params}`, {
				method: 'GET',
				headers: {
					'X-WP-Nonce': bibleHereAjax.nonce
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
				action: 'bible_here_get_books',
				language: this.currentLanguage
			});

			fetch(`${bibleHereAjax.ajaxurl}?${params}`, {
				method: 'GET',
				headers: {
					'X-WP-Nonce': bibleHereAjax.nonce
				}
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
		loadChapters() {
			// For now, we'll use a simple chapter count based on book
			// This should be replaced with actual API call in phase 2
			const chapterCounts = {
				'genesis': 50, 'exodus': 40, 'leviticus': 27, 'numbers': 36, 'deuteronomy': 34,
				'joshua': 24, 'judges': 21, 'ruth': 4, '1samuel': 31, '2samuel': 24,
				'1kings': 22, '2kings': 25, '1chronicles': 29, '2chronicles': 36, 'ezra': 10,
				'nehemiah': 13, 'esther': 10, 'job': 42, 'psalms': 150, 'proverbs': 31,
				'ecclesiastes': 12, 'songofsolomon': 8, 'isaiah': 66, 'jeremiah': 52, 'lamentations': 5,
				'ezekiel': 48, 'daniel': 12, 'hosea': 14, 'joel': 3, 'amos': 9,
				'obadiah': 1, 'jonah': 4, 'micah': 7, 'nahum': 3, 'habakkuk': 3,
				'zephaniah': 3, 'haggai': 2, 'zechariah': 14, 'malachi': 4,
				'matthew': 28, 'mark': 16, 'luke': 24, 'john': 21, 'acts': 28,
				'romans': 16, '1corinthians': 16, '2corinthians': 13, 'galatians': 6, 'ephesians': 6,
				'philippians': 4, 'colossians': 4, '1thessalonians': 5, '2thessalonians': 3, '1timothy': 6,
				'2timothy': 4, 'titus': 3, 'philemon': 1, 'hebrews': 13, 'james': 5,
				'1peter': 5, '2peter': 3, '1john': 5, '2john': 1, '3john': 1,
				'jude': 1, 'revelation': 22
			};

			const chapterCount = chapterCounts[this.currentBook] || 1;
			this.populateChapterSelect(chapterCount);
		}

		/**
		 * Load chapter content
		 */
		loadChapter() {
			if (!this.currentVersion || !this.currentBook || !this.currentChapter) {
				this.showError('Please select version, book, and chapter');
				return;
			}

			this.showLoading();
			
			// Switch to single version mode if in zero mode
			if (this.currentMode === 'zero') {
				this.switchMode('single');
			}

			// Mock chapter loading for phase 1
			// This will be replaced with actual API call in phase 2
			setTimeout(() => {
				this.hideLoading();
				this.displayMockChapter();
			}, 1000);
		}

		/**
		 * Display chapter content for single version mode
		 */
		displayChapterContent(chapterData, versionKey) {
			const versionContainer = this.elements.singleMode.querySelector('.bible-version');
			let container = versionContainer.querySelector('.chapter-content');
			
			// Create .chapter-content if it doesn't exist
			if (!container) {
				container = document.createElement('div');
				container.className = 'chapter-content';
				versionContainer.appendChild(container);
			}

			if (!chapterData || !chapterData.verses || chapterData.verses.length === 0) {
				container.innerHTML = '<p class="no-content">No content available for this chapter.</p>';
				return;
			}

			let html = '';
			chapterData.verses.forEach(verse => {
				html += `<p class="verse" data-verse="${verse.verse_number}">`;
				html += `<span class="verse-number">${verse.verse_number}</span>`;
				html += `<span class="verse-text">${verse.verse_text}</span>`;
				html += `</p>`;
			});

			container.innerHTML = html;
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
		updateBookChapterButton() {
			if (this.elements.bookChapterText) {
				// Get display name for current book
				let bookDisplayName = this.currentBook;
				if (this.elements.bookSelect) {
					const selectedOption = this.elements.bookSelect.querySelector(`option[value="${this.currentBook}"]`);
					if (selectedOption) {
						bookDisplayName = selectedOption.textContent;
					}
				}
				this.elements.bookChapterText.textContent = `${bookDisplayName} ${this.currentChapter}`;
			}
		}

		/**
		 * Display dual versions content (for testing)
		 */
		displayDualVersions() {
			const dualMode = this.elements.dualMode;
			if (!dualMode) return;
			
			const version1 = dualMode.querySelector('.version-1');
			const version2 = dualMode.querySelector('.version-2');
			
			if (version1) {
				this.populateVersionContainer(version1, 'King James Version', 'KJV');
			}
			
			if (version2) {
				this.populateVersionContainer(version2, 'New International Version', 'NIV');
			}
		}
		
		/**
		 * Populate a version container with mock content
		 */
		populateVersionContainer(container, versionName, versionAbbr) {
			const titleElement = container.querySelector('.version-title');
			const versesContainer = container.querySelector('.verses-container');
			
			if (titleElement) {
				titleElement.textContent = versionName;
			}
			
			if (versesContainer) {
				// Generate mock verses with slight variation for different versions
				let versesHtml = '';
				for (let i = 1; i <= 50; i++) {
					const versionSuffix = versionAbbr === 'KJV' ? ' (traditional text)' : ' (modern translation)';
					versesHtml += `
						<div class="verse" data-verse-id="${this.formatVerseId(this.currentBook, this.currentChapter, i)}">
							<span class="verse-number">${i}</span>
							<span class="verse-text">This is a sample verse ${i} from ${this.currentBook} chapter ${this.currentChapter}${versionSuffix}. This content will be replaced with actual Bible text in phase 2 when the API is implemented. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</span>
						</div>
					`;
				}
				versesContainer.innerHTML = versesHtml;
			}
		}
		
		/**
		 * Display mock chapter content (for phase 1 testing)
		 */
		displayMockChapter() {
			const versionContainer = this.elements.singleMode.querySelector('.bible-version');
			const titleElement = versionContainer.querySelector('.version-title');
			let chapterContent = versionContainer.querySelector('.chapter-content');

			// Create .chapter-content if it doesn't exist
			if (!chapterContent) {
				chapterContent = document.createElement('div');
				chapterContent.className = 'chapter-content';
				versionContainer.appendChild(chapterContent);
			}

			// Update header
			titleElement.textContent = this.currentVersion.toUpperCase();

			// Generate mock verses
		let versesHtml = '';
		for (let i = 1; i <= 50; i++) {
			versesHtml += `
				<div class="verse" data-verse-id="${this.formatVerseId(this.currentBook, this.currentChapter, i)}">
					<span class="verse-number">${i}</span>
					<span class="verse-text">This is a sample verse ${i} from ${this.currentBook} chapter ${this.currentChapter}. This content will be replaced with actual Bible text in phase 2 when the API is implemented. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. </span>
				</div>
			`;
		}
			// console.log("hi 318 here is versionContainer: ", versionContainer); debugger;
			chapterContent.innerHTML = versesHtml;
			
			// Show add version button
			// this.elements.versionsButton.show();
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
			if (this.currentVersion) {
				select.value = this.currentVersion;
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
						this.currentVersion = '';
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
			const canLoad = this.currentVersion && this.currentBook && this.currentChapter;
			this.elements.loadButton.prop('disabled', !canLoad);
		}

		/**
		 * Navigate to previous chapter
		 */
		navigatePrevious() {
			if (this.currentChapter > 1) {
				this.currentChapter--;
				this.updateChapterSelect();
				this.loadChapter();
			} else {
				// Go to previous book's last chapter
				const currentBookIndex = this.books.findIndex(book => book.book_number === this.currentBook);
				if (currentBookIndex > 0) {
					this.currentBook = this.books[currentBookIndex - 1].book_number;
					this.updateBookSelect();
					this.loadChapters(this.currentBook).then(() => {
						this.currentChapter = this.chapters.length;
						this.updateChapterSelect();
						this.loadChapter();
					});
				}
			}
		}

		/**
		 * Navigate to next chapter
		 */
		navigateNext() {
			if (this.currentChapter < this.chapters.length) {
				this.currentChapter++;
				this.updateChapterSelect();
				this.loadChapter();
			} else {
				// Go to next book's first chapter
				const currentBookIndex = this.books.findIndex(book => book.book_number === this.currentBook);
				if (currentBookIndex < this.books.length - 1) {
					this.currentBook = this.books[currentBookIndex + 1].book_number;
					this.updateBookSelect();
					this.loadChapters(this.currentBook).then(() => {
						this.currentChapter = 1;
						this.updateChapterSelect();
						this.loadChapter();
					});
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
	 * Toggle between single and dual version modes
	 */
	toggleVersions() {
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
		
		// Show/hide appropriate containers
		if (this.elements.singleMode) {
			this.elements.singleMode.style.display = this.isDualMode ? 'none' : 'block';
		}
		
		if (this.elements.dualMode) {
			this.elements.dualMode.style.display = this.isDualMode ? 'block' : 'none';
		}
		
		// Load content for the current mode
		if (this.isDualMode) {
			this.displayDualVersions();
		} else {
			this.displayMockChapter();
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
			console.log('Loading version data for:', this.currentVersion);
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
			
			const fontSizes = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
			const fontSizePixels = ['12px', '14px', '16px', '18px', '20px', '24px'];
			
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
			console.log('🎨 Applying font size:', size);
			console.log('🔍 Container element:', this.container);
			
			// Remove existing font size classes
			const existingClasses = ['font-size-xs', 'font-size-sm', 'font-size-md', 'font-size-lg', 'font-size-xl', 'font-size-xxl'];
			existingClasses.forEach(className => {
				if (this.container.classList.contains(className)) {
					console.log('🗑️ Removing existing class:', className);
					this.container.classList.remove(className);
				}
			});
			
			// Apply new font size class
			const newClassName = `font-size-${size}`;
			this.container.classList.add(newClassName);
			console.log('✅ Added new font size class:', newClassName);
			
			// Force a style recalculation
			this.container.offsetHeight;
			
			// Verify the class was applied
			if (this.container.classList.contains(newClassName)) {
				console.log('✅ Font size class successfully applied');
			} else {
				console.error('❌ Failed to apply font size class');
			}
			
			// Log current classes for debugging
			console.log('📋 Current container classes:', Array.from(this.container.classList));
			
			// Check if verse elements exist and log their computed styles
			const verseTexts = this.container.querySelectorAll('.verse-text');
			const verseNumbers = this.container.querySelectorAll('.verse_number');
			
			console.log('📝 Found verse texts:', verseTexts.length);
			console.log('🔢 Found verse numbers:', verseNumbers.length);
			
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
			const fontSizes = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
			const fontSizePixels = ['12px', '14px', '16px', '18px', '20px', '24px'];
			
			const slider = this.container.querySelector('.font-size-slider');
			const valueDisplay = this.container.querySelector('.font-size-value');
			
			if (slider && valueDisplay) {
				// Set current value
				const currentIndex = fontSizes.indexOf(this.fontSizePreference);
				slider.value = currentIndex;
				valueDisplay.textContent = fontSizePixels[currentIndex];
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
	}

	/**
	 * Initialize all Bible Here Readers on the page
	 */
	document.addEventListener('DOMContentLoaded', function() {
		const readers = document.querySelectorAll('.bible-here-reader');
		readers.forEach(function(element) {
			new BibleHereReader(element);
		});
	});

	// Expose BibleHereReader to global scope for external initialization
	window.BibleHereReader = BibleHereReader;