/**
 * Bible Here Cache Manager
 * 
 * Manages client-side caching using IndexedDB with Dexie.js
 * Implements caching for verses, books, and versions data
 *
 * @package    Bible_Here
 * @subpackage Bible_Here/public/js
 * @since      1.0.0
 */

'use strict';

/**
 * Bible Here Database Class
 * Extends Dexie for IndexedDB operations
 */
class BibleHereDB extends Dexie {
    constructor() {
        super('BibleHereDB');
        
        console.log('🗄️ [BibleHereDB] Initializing IndexedDB database...');
        
        // Define database schema according to technical document
        this.version(1).stores({
            // Verses table: composite primary key [table_name+verse_id], value as object
            verses: '[table_name+verse_id], value, updatedAt',
            
            // Books table: primary key language_code, value as object
            books: 'language_code&, value, updatedAt',
            
            // Versions table: primary key table_name, value as object with updatedAt
            versions: 'table_name&, value, updatedAt'
        });
        
        // Version 2: Add bookmark field to verses table
        this.version(2).stores({
            // Verses table: composite primary key [table_name+verse_id], with bookmark index
            verses: '[table_name+verse_id], value, updatedAt, bookmark',
            
            // Books table: primary key language_code, value as object
            books: 'language_code&, value, updatedAt',
            
            // Versions table: primary key table_name, value as object with updatedAt
            versions: 'table_name&, value, updatedAt'
        });
        
        // Add hooks for console.log()
        this.verses.hook('creating', (primKey, obj, trans) => {
            console.log('📝 [BibleHereDB] Creating verse cache:', { key: primKey, hasValue: !!obj.value });
        });
        
        this.books.hook('creating', (primKey, obj, trans) => {
            console.log('📚 [BibleHereDB] Creating book cache:', { key: primKey, hasValue: !!obj.value });
        });
        
        this.versions.hook('creating', (primKey, obj, trans) => {
            console.log('📖 [BibleHereDB] Creating version cache:', { key: primKey, hasValue: !!obj.value });
        });
        
        console.log('✅ [BibleHereDB] Database schema defined successfully');
    }
    
    /**
     * Initialize database and perform any necessary setup
     */
    async initialize() {
        try {
            console.log('🚀 [BibleHereDB] Starting database initialization...');
            
            // Open the database
            await this.open();
            console.log('✅ [BibleHereDB] Database opened successfully');
            
            // Check current data counts
            const versesCount = await this.verses.count();
            const booksCount = await this.books.count();
            const versionsCount = await this.versions.count();
            
            console.log('📊 [BibleHereDB] Current data counts:', {
                verses: versesCount,
                books: booksCount,
                versions: versionsCount
            });
            
            return true;
        } catch (error) {
            console.error('❌ [BibleHereDB] Database initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Get database statistics
     */
    async getStats() {
        try {
            const stats = {
                verses: await this.verses.count(),
                books: await this.books.count(),
                versions: await this.versions.count(),
                dbSize: await this.getDatabaseSize()
            };
            
            console.log('📈 [BibleHereDB] Database statistics:', stats);
            return stats;
        } catch (error) {
            console.error('❌ [BibleHereDB] Failed to get database statistics:', error);
            throw error;
        }
    }
    
    /**
     * Estimate database size (approximate)
     */
    async getDatabaseSize() {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                return {
                    used: estimate.usage,
                    available: estimate.quota,
                    usedMB: Math.round(estimate.usage / 1024 / 1024 * 100) / 100,
                    availableMB: Math.round(estimate.quota / 1024 / 1024 * 100) / 100
                };
            }
            return { message: 'Storage estimation not supported' };
        } catch (error) {
            console.warn('⚠️ [BibleHereDB] Could not estimate storage size:', error);
            return { error: error.message };
        }
    }
}

/**
 * BibleHereCacheManager - Cache Management and Operations
 * 
 * Handles caching operations, seed data loading, and cache strategies
 * according to technical architecture document
 */
class BibleHereCacheManager {
    constructor(db) {
        this.db = db;
        this.versionsExpiry = 60 * 60 * 1000; // 1 hour in milliseconds for versions only
        
        // Bind all methods to this instance to prevent context loss in async operations
        this.initialize = this.initialize.bind(this);
        this.loadSeedDataIfNeeded = this.loadSeedDataIfNeeded.bind(this);
        this.loadBooksFromSeedData = this.loadBooksFromSeedData.bind(this);
        this.loadSeedVerses = this.loadSeedVerses.bind(this);
        this.cacheBooks = this.cacheBooks.bind(this);
        this.cacheVerses = this.cacheVerses.bind(this);
        this.getCachedBooks = this.getCachedBooks.bind(this);
        this.getVerses = this.getVerses.bind(this);
        this.cacheVersions = this.cacheVersions.bind(this);
        this.getVersions = this.getVersions.bind(this);
        this.updateExpiredVersions = this.updateExpiredVersions.bind(this);
        this.getCacheStats = this.getCacheStats.bind(this);
        
        console.log('🎯 [CacheManager] Cache manager initialized with 1-hour expiry for versions and method binding');
    }
    
    /**
     * Initialize cache system and load seed data if needed
     */
    async initialize() {
        try {
            console.log('🚀 [CacheManager] Starting cache system initialization...');
            
            // Initialize database
            await this.db.initialize();
            
            // Load seed data if cache is empty
            await this.loadSeedDataIfNeeded();
            
            console.log('✅ [CacheManager] Cache system initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ [CacheManager] Cache system initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Load seed data if cache is empty
     * According to technical document: load 'en' by default, and 'zh-TW' if browser language includes it
     */
    async loadSeedDataIfNeeded() {
        try {
            console.log('🌱 [CacheManager] Checking if seed data loading is needed...');
            
            const booksCount = await this.db.books.count();
            const versesCount = await this.db.verses.count();
            
            console.log('📊 [CacheManager] Current cache counts:', { books: booksCount, verses: versesCount });
            
            // Load seed data if cache is empty
            if (booksCount === 0 || versesCount === 0) {
                console.log('📥 [CacheManager] Cache is empty, loading seed data...');
                
                // Load books first - MUST succeed before proceeding
                await this.loadBooksFromSeedData();
                console.log('✅ [CacheManager] Books seed data loaded successfully');
                
                // Load verses only after books loading succeeded
                await this.loadSeedVerses();
                console.log('✅ [CacheManager] Verses seed data loaded successfully');
            } else {
                console.log('✅ [CacheManager] Cache already contains data, skipping seed data loading');
            }
        } catch (error) {
            console.error('❌ [CacheManager] Failed to check/load seed data:', error);
            // Don't continue execution if seed data loading fails
            throw error;
        }
    }
    
    /**
     * Load books from seed data based on user language
     * According to technical documentation: load 'en' by default, and 'zh-TW' if browser language includes it
     */
    async loadBooksFromSeedData() {
        console.log('📚 [BibleHereCacheManager] 開始載入書卷 Seed Data');
        
        try {
            // Check if seed data is available
            if (typeof window.BibleHereSeedData === 'undefined') {
                console.warn('⚠️ [BibleHereCacheManager] Seed Data 不可用');
                return;
            }
            
            const seedBooks = window.BibleHereSeedData.openingBooks;
            if (!seedBooks || seedBooks.length === 0) {
                console.warn('⚠️ [BibleHereCacheManager] 書卷 Seed Data 為空');
                return;
            }
            
            // Transform seed data to match API format
            const booksData = seedBooks.map(book => ({
                book_number: book.book_number,
                book_name: book.title_full,
                book_key: book.title_full.toLowerCase().replace(/\s+/g, ''),
                book_abbreviation: book.title_short,
                testament: book.genre_type === 'Old Testament' ? 'old' : 'new',
                chapters: book.chapters
            }));
            
            // Always load English books first (default)
            console.log('🔍 [Debug] About to call this.cacheBooks with:');
            console.log('  - this:', this);
            console.log('  - this.cacheBooks:', typeof this.cacheBooks);
            console.log('  - booksData length:', booksData.length);
            console.log('  - languageCode: en');
            
            await this.cacheBooks(booksData, 'en');
            console.log(`✅ [BibleHereCacheManager256] 已載入英文書卷 Seed Data (${booksData.length} 本書卷)`);
            
            // Check if browser languages include zh-TW and load if available
            const browserLanguages = navigator.languages || [navigator.language || 'en'];
            console.log('🌐 [BibleHereCacheManager260] 瀏覽器語言列表:', browserLanguages);
            
            const hasChineseTraditional = browserLanguages.some(lang => 
                lang.toLowerCase().includes('zh-tw') || 
                lang.toLowerCase().includes('zh-hant')
            );
            
            if (hasChineseTraditional) {
                // For now, we use the same books data but with Chinese language code
                // In the future, this could load actual Chinese book names from seed data
                await this.cacheBooks(booksData, 'zh-TW');
                console.log(`✅ [BibleHereCacheManager271] 已載入繁體中文書卷 Seed Data (${booksData.length} 本書卷)`);
            }
            
        } catch (error) {
            console.error('❌ [BibleHereCacheManager] 載入書卷 Seed Data 時發生錯誤:', error);
            throw error; // Re-throw error to stop execution
        }
    }
    
    /**
     * Load seed verses data
     */
    async loadSeedVerses() {
        console.log('📖 [BibleHereCacheManager] 開始載入經文 Seed Data');
        
        try {
            // Check if seed data is available
            if (typeof window.BibleHereSeedData === 'undefined') {
                console.warn('⚠️ [BibleHereCacheManager] Seed Data 不可用');
                return;
            }
            
            const seedVerses = window.BibleHereSeedData.openingVerses;
            if (!seedVerses) {
                console.warn('⚠️ [BibleHereCacheManager] 經文 Seed Data 為空');
                return;
            }
            
            // Always load English verses (Psalm 117)
            if (seedVerses.en) {
                const enData = seedVerses.en;
                console.log('🔍 [Debug] enData:', enData);
                console.log('🔍 [Debug] enData.verses:', enData.verses);
                console.log('🔍 [Debug] enData.verses type:', typeof enData.verses, Array.isArray(enData.verses));
                
                const versesData = enData.verses.map(v => ({
                    book_number: enData.book_number,
                    chapter_number: enData.chapter_number,
                    verse_number: v.verse,
                    text: v.text,
                    verse_id: v.verse_id
                }));
                console.log('🔍 [Debug] versesData:', versesData);
                console.log('🔍 [Debug] versesData type:', typeof versesData, Array.isArray(versesData));
                console.log('🔍 [Debug] About to call cacheVerses with:');
                console.log('  - versesData:', versesData);
                console.log('  - enData.table_name:', enData.table_name);
                console.log('  - enData.book_name:', enData.book_name);
                
                await this.cacheVerses(versesData, enData.table_name);
                console.log(`✅ [BibleHereCacheManager321] 已載入英文經文 Seed Data (${enData.book_name} ${enData.chapter_number}, ${versesData.length} verses)`);
            }
            
            // Check browser languages for Chinese Traditional
            const browserLanguages = navigator.languages || [navigator.language || 'en'];
            const hasChineseTraditional = browserLanguages.some(lang => 
                lang.toLowerCase().includes('zh-tw') || 
                lang.toLowerCase().includes('zh-hant')
            );
            
            // Load Chinese verses if browser language includes zh-TW
            if (hasChineseTraditional && seedVerses.zh) {
                const zhData = seedVerses.zh;
                const versesData = zhData.verses.map(v => ({
                    book_number: zhData.book_number,
                    chapter_number: zhData.chapter_number,
                    verse_number: v.verse,
                    text: v.text,
                    verse_id: v.verse_id
                }));
                await this.cacheVerses(versesData, zhData.table_name);
                console.log(`✅ [BibleHereCacheManager342] 已載入中文經文 Seed Data (${zhData.book_name} ${zhData.chapter_number}, ${versesData.length} verses)`);
            }
            
        } catch (error) {
            console.error('❌ [BibleHereCacheManager346] 載入經文 Seed Data 時發生錯誤:', error);
            throw error; // Re-throw error to stop execution
        }
    }
    
    /**
     * Cache books data (no expiry for books according to technical document)
     */
    async cacheBooks(booksData, languageCode) {
        try {
            console.log('💾 [CacheManager] Caching books for language:', languageCode, 'Count:', Array.isArray(booksData) ? booksData.length : Object.keys(booksData).length);
            
            // Convert array to object with book_number as key if needed
            let booksObject;
            if (Array.isArray(booksData)) {
                booksObject = {};
                booksData.forEach(book => {
                    booksObject[book.book_number] = book;
                });
            } else {
                booksObject = booksData; // Already an object
            }
            
            const now = Date.now();
            const booksCacheEntry = {
                language_code: languageCode,
                value: {
                    language_code: languageCode,
                    books: booksObject
                },
                updatedAt: now
            };
            
            await this.db.books.put(booksCacheEntry);
            console.log('✅ [CacheManager] Successfully cached', Object.keys(booksObject).length, 'books for language:', languageCode);
            
            return Object.keys(booksObject).length;
        } catch (error) {
            console.error('❌ [CacheManager] Failed to cache books:', error);
            throw error;
        }
    }

    /**
     * Get verses from cache
     * Books and verses do not auto-expire according to technical document
     */
    async getVerses(languageCode, versionTable, bookNumber, chapterNumber, verseStart = null, verseEnd = null) {
        try {
            console.log('🔍 [CacheManager395] Searching cached verses:', {
                version: versionTable,
                book: bookNumber,
                chapter: chapterNumber,
                verseRange: verseStart && verseEnd ? `${verseStart}-${verseEnd}` : 'all'
            });
            console.log('📖 [CacheManager401] versionTable: '+versionTable);
            const cachedVerses = [];
            console.log('📖 [CacheManager403] verseEnd: '+verseEnd);
            if (verseStart && verseEnd) {
                // Get specific verse range
                for (let verseNum = verseStart; verseNum <= verseEnd; verseNum++) {
                    const verseId = `${String(bookNumber).padStart(2, '0')}${String(chapterNumber).padStart(3, '0')}${String(verseNum).padStart(3, '0')}`;;
                    const compositeKey = [versionTable, verseId];  // Use array format for composite key

                    const cachedVerse = await this.db.verses.get(compositeKey);
                    if (cachedVerse) {
                        cachedVerses.push(cachedVerse);
                    }
                }
            } else {
                for (let verseNum = 1; verseNum <= 176; verseNum++) { // Assume max 176 verses max
                    const verseId = `${String(bookNumber).padStart(2, '0')}${String(chapterNumber).padStart(3, '0')}${String(verseNum).padStart(3, '0')}`;;
                    const compositeKey = [versionTable, verseId];  // Use array format for composite key

                    const cachedVerse = await this.db.verses.get(compositeKey);
                    if (cachedVerse) {
                        cachedVerses.push(cachedVerse);
                    }
                }
            }
            
            console.log('📖 [CacheManager427] Found', cachedVerses.length, 'cached verses');
            return cachedVerses;
        } catch (error) {
            console.error('❌ [CacheManager430] Failed to get cached verses:', error);
            return [];
        }
    }

    /**
     * Get cached verses - alias for getVerses method to match BibleHereReader expectations
     * @param {string} languageCode - The version table name
     * @param {string} versionTable - The version table name
     * @param {number|string} bookNumber - The book number
     * @param {number|string} chapterNumber - The chapter number
     * @param {number} verseStart - Optional start verse number
     * @param {number} verseEnd - Optional end verse number
     * @returns {Promise<Array>} Array of cached verses
     */
    async getCachedVerses(languageCode, versionTable, bookNumber, chapterNumber, verseStart = null, verseEnd = null) {
        console.log('🔍 [CacheManager] getCachedVerses called - delegating to getVerses');
        return await this.getVerses(languageCode, versionTable, bookNumber, chapterNumber, verseStart, verseEnd);
    }
    
    /**
     * Cache verses data (no expiry for verses according to technical document)
     */
    async cacheVerses(verses, versionTable) {
        try {
            // Enhanced debugging for the "psalms Count: 17" issue
            console.log('🔍 [DEBUG] cacheVerses called with:');
            console.log('  - verses type:', typeof verses, 'isArray:', Array.isArray(verses));
            console.log('  - verses length:', verses ? verses.length : 'N/A');
            console.log('  - versionTable:', versionTable);
            console.log('  - verses content (first 3 items):', verses ? verses.slice(0, 3) : 'N/A');
            
            // Validate input parameters
            if (!Array.isArray(verses)) {
                console.error('❌ [CacheManager] verses parameter must be an array, received:', typeof verses, verses);
                throw new Error('verses parameter must be an array');
            }
            
            if (!versionTable) {
                console.error('❌ [CacheManager] versionTable parameter is required');
                throw new Error('versionTable parameter is required');
            }
            
            console.log('💾 [CacheManager] Caching verses for version:', versionTable, 'Count:', verses.length);
            
            const now = Date.now();
            const versesToCache = [];
            
            verses.forEach(verse => {
                // Use verse_id from seed data if available, otherwise construct it
                const verseId = verse.verse_id || `${verse.book_number}_${verse.chapter_number}_${verse.verse_number}`;
                
                versesToCache.push({
                    table_name: versionTable,
                    verse_id: verseId,
                    version_table: versionTable,
                    book_number: verse.book_number,
                    chapter_number: verse.chapter_number,
                    verse_number: verse.verse_number,
                    text: verse.text,
                    commentary_text: verse.commentary_text || null,
                    bookmark: null,  // Add default bookmark value
                    updatedAt: now
                });
            });
            
            await this.db.verses.bulkPut(versesToCache);
            console.log('✅ [CacheManager] Successfully cached', versesToCache.length, 'verses');
            
            return versesToCache.length;
        } catch (error) {
            console.error('❌ [CacheManager] Failed to cache verses:', error);
            throw error;
        }
    }
    
    /**
     * Get cached books (no expiry for books according to technical document)
     */
    async getCachedBooks(language = 'en') {
        try {
            console.log('🔍 [CacheManager] Searching cached books for language:', language);
            
            const cachedBooks = await this.db.books.get(language);
            
            if (cachedBooks && cachedBooks.value) {
                const booksCount = Array.isArray(cachedBooks.value.books) ? cachedBooks.value.books.length : Object.keys(cachedBooks.value.books).length;
                console.log('📚 [CacheManager506] Found cached books:', booksCount);
                return cachedBooks.value.books;
            }
            
            console.log('📚 [CacheManager] No cached books found for language:', language);
            return {}; // Return empty object instead of empty array
        } catch (error) {
            console.error('❌ [CacheManager] Failed to get cached books:', error);
            return {}; // Return empty object instead of empty array
        }
    }
    
    /**
     * Cache versions data with 1-hour expiry
     */
    async cacheVersions(versions) {
        try {
            console.log('💾 [CacheManager] Caching versions, Count:', versions.length);
            
            const now = Date.now();
            const versionsToCache = [];
            
            versions.forEach(version => {
                versionsToCache.push({
                    table_name: version.table_name,
                    value: {
                        table_name: version.table_name,
                        language_code: version.language_code,
                        language_name: version.language_name,
                        type: version.type,
                        name: version.name,
                        publisher: version.publisher,
                        info_url: version.info_url,
                        rank: version.rank
                    },
                    updatedAt: now
                });
            });
            
            await this.db.versions.bulkPut(versionsToCache);
            console.log('✅ [CacheManager] Successfully cached', versionsToCache.length, 'versions');
            
            return versionsToCache.length;
        } catch (error) {
            console.error('❌ [CacheManager] Failed to cache versions:', error);
            throw error;
        }
    }
    
    /**
     * Get cached versions with expiry check (1-hour expiry)
     */
    async getVersions(languages = [], types = []) {
        try {
            console.log('🔍 [CacheManager] Searching cached versions:', { languages, types });
            
            const now = Date.now();
            const allVersions = await this.db.versions.toArray();
            const validVersions = [];
            console.log('📖 [CacheManager576] allVersions: ', allVersions);
            for (const versionCache of allVersions) {
                // Check if version has expired (1-hour expiry)
                // if (now - versionCache.updatedAt > this.versionsExpiry) {
                //     console.log('⏰ [CacheManager] Version expired:', versionCache.table_name);
                //     continue;
                // } // should do it after API or loading
                
                const version = versionCache.value;
                console.log('📖 [CacheManager585] version: ', version);
                // Apply language filter
                if (languages && !languages.includes(version.language_code)) {
                    continue;
                }
                
                // Apply types filter
                if (types && Array.isArray(types) && types.length > 0 && !types.includes(version.type)) {
                    continue;
                }
                
                validVersions.push(version);
            }
            
            console.log('📖 [CacheManager588] Found', validVersions.length, 'valid cached versions');
            return validVersions;
        } catch (error) {
            console.error('❌ [CacheManager] Failed to get cached versions:', error);
            return [];
        }
    }
    
    /**
     * Update expired versions in background
     */
    async updateExpiredVersions() {
        console.log('🔄 [CacheManager] Checking for expired versions to update...');
        
        try {
            const allVersions = await this.db.versions.toArray();
            const now = Date.now();
            const expiredVersions = allVersions.filter(version => {
                const age = now - version.updatedAt;
                return age > this.versionsExpiry;
            });
            
            if (expiredVersions.length === 0) {
                console.log('✅ [CacheManager] No expired versions found');
                return;
            }
            
            console.log(`🔄 [CacheManager615] Found ${expiredVersions.length} expired versions, updating in background...`);
            
            // Update expired versions in background
            for (const expiredVersion of expiredVersions) {
                try {
                    const response = await fetch(`/wp-json/bible-here/v1/versions/${expiredVersion.table_name}`);
                    if (response.ok) {
                        const versionData = await response.json();
                        await this.cacheVersions(expiredVersion.table_name, versionData);
                        console.log(`✅ [CacheManager] Updated expired version: ${expiredVersion.table_name}`);
                    }
                } catch (error) {
                    console.error(`❌ [CacheManager] Failed to update expired version ${expiredVersion.table_name}:`, error);
                }
            }
        } catch (error) {
            console.error('❌ [CacheManager] Error updating expired versions:', error);
        }
    }

    /**
     * Get cache statistics
     * @returns {Promise<Object>} Cache statistics including counts and database size
     */
    async getCacheStats() {
        console.log('📊 [CacheManager] Getting cache statistics...');
        
        try {
            const stats = {
                isInitialized: this.isInitialized,
                cacheExpiry: this.versionsExpiry,
                counts: {
                    verses: 0,
                    books: 0,
                    versions: 0
                },
                databaseSize: 0,
                lastUpdated: new Date().toISOString()
            };
            
            // Get counts for each table
            if (this.db) {
                stats.counts.verses = await this.db.verses.count();
                stats.counts.books = await this.db.books.count();
                stats.counts.versions = await this.db.versions.count();
                
                // Calculate approximate database size
                const allVerses = await this.db.verses.toArray();
                const allBooks = await this.db.books.toArray();
                const allVersions = await this.db.versions.toArray();
                
                const versesSize = JSON.stringify(allVerses).length;
                const booksSize = JSON.stringify(allBooks).length;
                const versionsSize = JSON.stringify(allVersions).length;
                
                stats.databaseSize = versesSize + booksSize + versionsSize;
            }
            
            console.log('📊 [CacheManager] Cache statistics:', stats);
            return stats;
            
        } catch (error) {
            console.error('❌ [CacheManager] Error getting cache statistics:', error);
            return {
                isInitialized: false,
                cacheExpiry: this.versionsExpiry,
                counts: { verses: 0, books: 0, versions: 0 },
                databaseSize: 0,
                error: error.message,
                lastUpdated: new Date().toISOString()
            };
        }
    }
}

// Create global database and cache manager instances
window.bibleHereDB = new BibleHereDB();
window.bibleHereCacheManager = new BibleHereCacheManager(window.bibleHereDB);

console.log('🌐 [BibleHereCache] Global database and cache manager instances created');

// Auto-initialize cache system when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            console.log('🎬 [BibleHereCache] DOM loaded, initializing cache system...');
            await window.bibleHereCacheManager.initialize();
        } catch (error) {
            console.error('❌ [BibleHereCache] Failed to auto-initialize cache system:', error);
        }
    });
} else {
    // DOM already loaded
    setTimeout(async () => {
        try {
            console.log('🎬 [BibleHereCache] DOM already loaded, initializing cache system...');
            await window.bibleHereCacheManager.initialize();
        } catch (error) {
            console.error('❌ [BibleHereCache] Failed to auto-initialize cache system:', error);
        }
    }, 100);
}