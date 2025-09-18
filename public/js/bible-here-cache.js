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
            verses: '[table_name+verse_id], bookmark, updatedAt',
            
            // Books table: primary key language_code, value as object
            books: 'language_code&, updatedAt',
            
            // Versions table: primary key table_name, value as object with updatedAt
            versions: 'table_name&, updatedAt'
        });
        
        // // Version 2: Add bookmark field to verses table
        // this.version(2).stores({
        //     // Verses table: composite primary key [table_name+verse_id], with bookmark index
        //     verses: '[table_name+verse_id], updatedAt, bookmark',
            
        //     // Books table: primary key language_code, value as object
        //     books: 'language_code&, updatedAt',
            
        //     // Versions table: primary key table_name, value as object with updatedAt
        //     versions: 'table_name&, updatedAt'
        // });
        
        // Add hooks for console.log()
        this.verses.hook('creating', (primKey, obj, trans) => {
            // console.log('📝 [BibleHereDB] Creating verse cache:', { key: primKey, hasValue: !!obj.value });
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
        this.isInitialized = false; // Initialize as false to prevent undefined state
        this.isInitializing = false; // Track initialization status
        
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
        // Prevent multiple initialization attempts
        if (this.isInitializing || this.isInitialized) {
            console.log('🔄 [CacheManager] Initialization already in progress or completed');
            return this.isInitialized;
        }
        
        this.isInitializing = true;
        
        try {
            console.log('🚀 [CacheManager169] Starting cache system initialization...');
            
            // Initialize database
            await this.db.initialize();
            
            // Load seed data if cache is empty
            await this.loadSeedDataIfNeeded();
            
            // Mark as initialized
            this.isInitialized = true;
            this.isInitializing = false;
            
            console.log('✅ [CacheManager180] Cache system initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ [CacheManager183] Cache system initialization failed:', error);
            this.isInitializing = false;
            // Don't set isInitialized to false on error, keep it as false from constructor
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
            
            console.log('📊 [CacheManager199] Current cache counts:', { books: booksCount, verses: versesCount });
            
            // Load seed data if cache is empty
            if (booksCount === 0 || versesCount === 0) {
                console.log('📥 [CacheManager203] Cache is empty, loading seed data...');
                
                // Load books first - MUST succeed before proceeding
                await this.loadBooksFromSeedData();
                console.log('✅ [CacheManager207] Books seed data loaded successfully');
                
                // Load verses only after books loading succeeded
                await this.loadSeedVerses();
                console.log('✅ [CacheManager223] Verses seed data loaded successfully');
            } else {
                console.log('✅ [CacheManager225] Cache already contains data, skipping seed data loading');
            }
        } catch (error) {
            console.error('❌ [CacheManager228] Failed to check/load seed data:', error);
            // Don't continue execution if seed data loading fails
            throw error;
        }
    }
    
    /**
     * Load books from seed data based on user language
     * According to technical documentation: load 'en' by default, and 'zh-TW' if browser language includes it
     */
    async loadBooksFromSeedData() {
        console.log('📚 [BibleHereCacheManager239] 開始載入書卷 Seed Data');
        
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
            
            console.log('🔍 [Debug] About to call this.cacheBooks with:');
            console.log('  - this:', this);
            // console.log('  - this.cacheBooks:', typeof this.cacheBooks);
            console.log('  - booksData length:', window.BibleHereSeedData.openingBooks.length);
            console.log('  - languageCode: en');
            
            await this.cacheBooks({en: window.BibleHereSeedData.openingBooks});
            console.log(`✅ [BibleHereCacheManager261] 已載入英文書卷 Seed Data (${window.BibleHereSeedData.openingBooks.length} 本書卷)`); //  }],"thought":"移除 zh-TW 語言檢查和載入邏輯"}}}
            
        } catch (error) {
            console.error('❌ [BibleHereCacheManager264] 載入書卷 Seed Data 時發生錯誤:', error);
            throw error; // Re-throw error to stop execution
        }
    }
    
    /**
     * Load seed verses data
     */
    async loadSeedVerses() {
        console.log('📖 [BibleHereCacheManager273] 開始載入經文 Seed Data');
        
        try {
            if (typeof window.BibleHereSeedData === 'undefined') {
                console.warn('⚠️ [BibleHereCacheManager] Seed Data unavailable');
                return;
            }  // Check if seed data is available
            
            const seedVerses = window.BibleHereSeedData.openingVerses;
            if (!seedVerses) {
                console.warn('⚠️ [BibleHereCacheManager] Seed Data empty');
                return;
            }
            
            // Always load English verses (Psalm 117)
            for (const language in seedVerses) {
                const versesData = seedVerses[language].verses;
                await this.cacheVerses(versesData, seedVerses[language].table_name);
            }
            
        } catch (error) {
            console.error('❌ [BibleHereCacheManager294] 載入經文 Seed Data 時發生錯誤:', error);
            throw error; // Re-throw error to stop execution
        }
    }
    
    /**
     * Cache books data (no expiry for books according to technical document)
     */
    async cacheBooks(booksData) {
        try {
            const now = Date.now();
            const booksCacheEntry = [];
console.log('💾 [CacheManager306] Caching books for language: ', Object.keys(booksData));
            Object.keys(booksData).forEach(language => {
                booksCacheEntry.push({
                    language_code: language,
                    value: booksData[language],
                    updatedAt: now,
                })
            })

            await this.db.books.bulkPut(booksCacheEntry);
            console.log('✅ [CacheManager] Successfully cached many books in ', booksCacheEntry.length, ' languages');

            return Object.keys(booksData);
        } catch (error) {
            console.error('❌ [CacheManager] Failed to cache books:', error);
            throw error;
        }
    }

    /**
     * Get verses from cache
     * Books and verses do not auto-expire according to technical document
     */
    async getVerses(languageCode, versionTables, bookNumber, chapterNumber, verseStart = null, verseEnd = null) {
        try {
            console.log('🔍 [CacheManager331] Searching cached verses:', {
                versions: versionTables,
                book: bookNumber, chapter: chapterNumber,
                verseRange: verseStart && verseEnd ? `${verseStart}-${verseEnd}` : 'all'
            });
            console.log('📖 [CacheManager336] verseStart: '+verseStart+' verseEnd: '+verseEnd);
            // 構建章節的起始和結束 verse_id
            const chapterPrefix = `${String(bookNumber).padStart(2, '0')}${String(chapterNumber).padStart(3, '0')}`;
            const startVerseId = `${chapterPrefix}${verseStart ? String(verseStart).padStart(3, '0') : '000'}`; // 假設註釋在第一節前有整章概論
            const endVerseId = `${chapterPrefix}${verseEnd ? String(verseEnd).padStart(3, '0') : '176'}`;   // 最後一節（假設最多176節）

            // 為每個版本創建一個獨立的查詢
            const queryPromises = [...new Set(versionTables)].filter(table => typeof table === 'string' && table.length > 0).map(table => {
                return this.db.verses
                    .where('[table_name+verse_id]')
                    .between(
                        [table, startVerseId],
                        [table, endVerseId],
                        true, true
                    ).toArray();
            });

            // 平行執行所有查詢並等待結果
            const allResults = await Promise.all(queryPromises);

            // 將所有查詢結果合併成一個單一陣列
            const cachedVerses = allResults.flat();

            console.log('📖 [CacheManager359] Found', cachedVerses.length, 'cached verses');
            return cachedVerses;
        } catch (error) {
            console.error('❌ [CacheManager362] Failed to get cached verses:', error);
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
        return await this.getVerses(languageCode, [versionTable], bookNumber, chapterNumber, verseStart, verseEnd);
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
                const verseId = verse.verse_id || `${String(verse.book_number).padStart(2, '0')}${String(verse.chapter_number).padStart(3, '0')}${String(verse.verse_number).padStart(3, '0')}`;

                versesToCache.push({
                    table_name: versionTable,
                    verse_id: verseId,
                    // version_table: versionTable,
                    // book_number: verse.book_number,
                    // chapter_number: verse.chapter_number,
                    verse_number: verse.verse_number,
                    text: verse.text,
                    reference: verse.reference,
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
            console.log('🔍 [DEBUG] getCachedBooks 快取查詢結果:', cachedBooks);
            
            if (cachedBooks && cachedBooks.value) {
                console.log('🔍 [DEBUG] 快取查詢結果 cachedBooks.value:', cachedBooks.value);
                return cachedBooks.value;
            }
            
            console.log('📚 [CacheManager453] No cached books found for language:', language);
            return {}; // Return empty array for consistency
        } catch (error) {
            console.error('❌ [CacheManager] Failed to get cached books:', error);
            return {}; // Return empty array for consistency
        }
    }
    
    /**
     * Cache versions data with 1-hour expiry
     */
    async cacheVersions(versions) {
        try {
            console.log('💾 [CacheManager466] Caching versions::', versions);
            
            const now = Date.now();
            const versionsToCache = [];
            
            versions.forEach(version => {
                versionsToCache.push({
                    table_name: version.table_name,
                    value: version,
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
            console.log('🔍 [CacheManager] Searching cached versions:', { languages, types }, ' Todo:  query Indexed DB directly with filters instead of filtering in the memory.');
            
            const now = Date.now();
            const allVersions = await this.db.versions.toArray();
            const validVersions = [];
            console.log('📖 [CacheManager560] allVersions: ', allVersions);
            for (const versionCache of allVersions) {
                // Check if version has expired (1-hour expiry)
                // if (now - versionCache.updatedAt > this.versionsExpiry) {
                //     console.log('⏰ [CacheManager] Version expired:', versionCache.table_name);
                //     continue;
                // } // should do it after API or loading
                
                const version = versionCache.value;
                console.log('📖 [CacheManager569] version: ', version);
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
            
            console.log('📖 [CacheManager583] Found', validVersions.length, 'valid cached versions');
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
            
            console.log(`🔄 [CacheManager619] Found ${expiredVersions.length} expired versions, updating in background...`);
            
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

console.log('🌐 [BibleHereCache699] Global database and cache manager instances created');

// Auto-initialize cache system when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            console.log('🎬 [BibleHereCache705] DOM loaded, initializing cache system...');
            await window.bibleHereCacheManager.initialize();
        } catch (error) {
            console.error('❌ [BibleHereCache] Failed to auto-initialize cache system:', error);
        }
    });
} else {
    // DOM already loaded - initialize immediately without delay
    (async () => {
        try {
            console.log('🎬 [BibleHereCache715] DOM already loaded, initializing cache system immediately...');
            await window.bibleHereCacheManager.initialize();
        } catch (error) {
            console.error('❌ [BibleHereCache718] Failed to auto-initialize cache system:', error);
        }
    })();
}