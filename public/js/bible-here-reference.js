'use strict';
class BibleHereReference {
    constructor() {
        this.state = {
            openPopover: null,
            overlay: null,
            titleEl: null,
            bodyEl: null,
            current: null
        };
        this.allLanguagesSet = new Set(["en"]);
        this.db = typeof window.bibleHereDB !== "undefined" ? window.bibleHereDB : null;
        this.cacheManager = typeof window.bibleHereCacheManager !== "undefined" ? window.bibleHereCacheManager : null;
        this.regexContext = null;
        this.onDocumentClick = this.onDocumentClick.bind(this);
        this.onOverlayClick = this.onOverlayClick.bind(this);
        this.onPrevClick = this.onPrevClick.bind(this);
        this.onNextClick = this.onNextClick.bind(this);
        this.onCloseClick = this.onCloseClick.bind(this);
    }

    async run() {
        if (this.shouldSkipByOption()) return;
        const ok = await this.ensureCacheInitialized();
        if (!ok || !this.db) return;
        await this.ensureAbbreviations(this.db);
        const needVersions = await this.needsVersionsRefresh();
        if (needVersions) await this.prefetchVersions();
        const items = await this.getAbbreviations(this.db);
        if (!items || items.length === 0) return;
        this.regexContext = this.buildRegexContext(items);
        this.wrapReferences(this.regexContext);
        document.addEventListener("click", this.onDocumentClick);
    }

    async ensureCacheInitialized() {
        try {
            if (!this.cacheManager || typeof this.cacheManager.initialize !== "function") return false;
            await this.cacheManager.initialize();
            return true;
        } catch (e) {
            return false;
        }
    }

    shouldSkipByOption() {
        const cfg = typeof window.bibleHereAjax === "object" ? window.bibleHereAjax : {};
        const disabled = cfg.labelDisabledPages;
        const currentId = parseInt(cfg.currentPostId || 0, 10);
        if (disabled === null) return true;
        if (Array.isArray(disabled) && disabled.indexOf(currentId) >= 0) return true;
        return false;
    }

    async needsDatabaseRefresh(db, table, expireInMs = 24 * 60 * 60 * 1000) {
        try {
            const count = await db[table].count();
            if (!count || count === 0) return true;
            const latest = await db[table].orderBy("updatedAt").last();
            if (!latest || !latest.updatedAt) return true;
            const ageMs = Date.now() - latest.updatedAt;
            return ageMs > expireInMs;
        } catch (e) {
            return true;
        }
    }

    async fetchAbbreviations() {
        const url = new URL(window.bibleHereAjax.ajaxurl);
        url.searchParams.set("action", "bible_here_public_get_abbreviations");
        const resp = await fetch(url.toString(), {
            method: "GET",
            headers: { "X-WP-Nonce": window.bibleHereAjax.nonce }
        });
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        const data = await resp.json();
        if (!data || !data.success || !data.data || !Array.isArray(data.data.abbreviations)) throw new Error("Invalid abbreviations payload");
        return data.data.abbreviations;
    }

    async cacheAbbreviations(db, items) {
        const now = Date.now();
        const records = items.map(function(item) {
            return {
                abbreviation: item.abbreviation,
                language: item.language,
                book_number: item.book_number,
                updatedAt: now
            };
        });
        if (records.length > 0) await db.abbreviations.bulkPut(records);
    }

    async ensureAbbreviations(db) {
        const refresh = await this.needsDatabaseRefresh(db, "abbreviations");
        if (!refresh) return;
        const abbr = await this.fetchAbbreviations();
        await this.cacheAbbreviations(db, abbr);
    }

    async getAbbreviations(db) {
        try {
            return await db.abbreviations.toArray();
        } catch (e) {
            return [];
        }
    }

    buildRegexContext(items) {
        const list = [];
        const seen = {};
        const abbrMap = {};
        for (let k = 0; k < items.length; k++) {
            const ab = (items[k].abbreviation || "").trim();
            if (!ab) continue;
            const key = ab.toLowerCase();
            if (!seen[key]) { seen[key] = true; list.push(ab); }
            if (!abbrMap[key]) abbrMap[key] = [];
            abbrMap[key].push(items[k]);
        }
        list.sort(function(a, b) { return b.length - a.length; });
        const pattern = this.buildRegexPattern(list);
        const re = new RegExp(pattern, "gi");
        return { re: re, list: list, abbrMap: abbrMap };
    }

    escapeRegex(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    buildRegexPattern(list) {
        return "(?:" + list.map(this.escapeRegex.bind(this)).join("|") + ")\\s*(\\d{1,3})\\s*[:：章]\\s*(\\d{1,3})";
    }

    findAbbreviationInfo(match, list, abbrMap) {
        const headRe = new RegExp("^(" + list.map(this.escapeRegex.bind(this)).join("|") + ")", "i");
        const m = match.match(headRe);
        if (!m) return null;
        const key = m[1].toLowerCase();
        const arr = abbrMap[key] || [];
        const chosen = arr.length ? arr[0] : null;
        return chosen ? { abbreviation: chosen.abbreviation, book_number: chosen.book_number, language: chosen.language } : null;
    }

    getLanguagesForAbbreviation(abbr, abbrMap) {
        const key = (abbr || "").toLowerCase();
        const arr = abbrMap[key] || [];
        const langs = [];
        for (let i = 0; i < arr.length; i++) {
            const lang = arr[i].language;
            if (lang && langs.indexOf(lang) < 0) {
                langs.push(lang);
                this.allLanguagesSet.add(lang);
            }
        }
        return langs;
    }

    inRange(a, b) {
        a = +a; b = +b; return a >= 1 && a <= 150 && b >= 1 && b <= 176;
    }

    wrapReferences(ctx) {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode: function(node) {
                const p = node.parentNode;
                if (!p) return NodeFilter.FILTER_REJECT;
                const tag = p.tagName ? p.tagName.toLowerCase() : "";
                if (tag === "script" || tag === "style" || tag === "noscript" || tag === "textarea" || tag === "input") return NodeFilter.FILTER_REJECT;
                const anc = p.closest(".bible-here-reader");
                if (anc) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        for (let n = 0; n < nodes.length; n++) {
            const t = nodes[n].nodeValue;
            ctx.re.lastIndex = 0;
            const first = ctx.re.exec(t);
            if (!first) continue;
            ctx.re.lastIndex = 0;
            const frag = document.createDocumentFragment();
            let last = 0;
            let match;
            while ((match = ctx.re.exec(t)) !== null) {
                const full = match[0];
                const c = match[1];
                const v = match[2];
                if (match.index > last) frag.appendChild(document.createTextNode(t.slice(last, match.index)));
                if (this.inRange(c, v)) {
                    const info = this.findAbbreviationInfo(full, ctx.list, ctx.abbrMap);
                    if (info) {
                        const spanRef = document.createElement("span");
                        spanRef.className = "bible-here-reference";
                        spanRef.dataset.bookNumber = String(info.book_number != null ? info.book_number : "");
                        spanRef.dataset.chapterNumber = String(c);
                        spanRef.dataset.verseNumber = String(v);
                        const langs = this.getLanguagesForAbbreviation(info.abbreviation, ctx.abbrMap);
                        spanRef.dataset.languages = langs.join(",");
                        spanRef.textContent = full;
                        frag.appendChild(spanRef);
                    } else {
                        frag.appendChild(document.createTextNode(full));
                    }
                } else {
                    frag.appendChild(document.createTextNode(full));
                }
                last = match.index + full.length;
            }
            if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
            nodes[n].parentNode.replaceChild(frag, nodes[n]);
        }
        this.fetchBooksForLanguages();
    }

    async fetchBooksForLanguages() {
        console.log("starting fetchBooksForLanguages here is this.allLanguagesSet: ", this.allLanguagesSet);
        if (this.cacheManager && await this.needsDatabaseRefresh(window.bibleHereDB, "books")) {
            console.log('🌐 Fetching book data from API');
            const params = new URLSearchParams({
                action: 'bible_here_public_get_books',
                languages: Array.from(this.allLanguagesSet),
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

            if (data.data && Object.keys(data.data).length > 0) {
                console.log('💾 [fetchBooksForLanguages247] cache fetched book data');
                try {
                    this.cacheManager.cacheBooks(data.data);
                    console.log('✅ [BibleHereReader] book data cached successfully');
                } catch (cacheError) {
                    console.error('❌ [BibleHereReader] cache book data error:', cacheError);
                }
                // })
            }
        }
    }

    onDocumentClick(e) {
        const el = e.target;
        if (!(el && el.classList && el.classList.contains("bible-here-reference"))) return;
        e.preventDefault();
        e.stopPropagation();
        this.showReferencePopover(el, this.regexContext);
    }

    ensurePopover() {
        if (!this.state.overlay) {
            const ov = document.createElement("div");
            ov.className = "bh-ref-overlay";
            document.body.appendChild(ov);
            ov.addEventListener("click", this.onOverlayClick);
            this.state.overlay = ov;
        }
        if (!this.state.openPopover) {
            const pop = document.createElement("div");
            pop.className = "bh-ref-popover";
            pop.style.display = "none";
            const header = document.createElement("div");
            header.className = "bh-ref-header";
            const title = document.createElement("div");
            title.className = "bh-ref-title";
            const controls = document.createElement("div");
            controls.className = "bh-ref-controls";
            const btnPrev = document.createElement("button");
            btnPrev.textContent = "<";
            btnPrev.title = "Previous Chapter";
            btnPrev.type = "button";
            btnPrev.className = "bh-ref-prev";
            const btnNext = document.createElement("button");
            btnNext.textContent = ">";
            btnNext.title = "Next Chapter";
            btnNext.type = "button";
            btnNext.className = "bh-ref-next";
            const btnClose = document.createElement("button");
            btnClose.textContent = "X";
            btnClose.title = "Close";
            btnClose.type = "button";
            btnClose.className = "bh-ref-close";
            controls.appendChild(btnPrev);
            controls.appendChild(btnNext);
            controls.appendChild(btnClose);
            header.appendChild(title);
            header.appendChild(controls);
            const body = document.createElement("div");
            body.className = "bh-ref-body";
            pop.appendChild(header);
            pop.appendChild(body);
            document.body.appendChild(pop);
            btnClose.addEventListener("click", this.onCloseClick);
            btnPrev.addEventListener("click", this.onPrevClick);
            btnNext.addEventListener("click", this.onNextClick);
            this.state.openPopover = pop;
            this.state.titleEl = title;
            this.state.bodyEl = body;
        }
    }

    async showReferencePopover(el, ctx) {
        this.ensurePopover();
        const rect = el.getBoundingClientRect();
        const margin = 8;
        const width = Math.min(Math.floor(window.innerWidth * 0.9), 520);
        this.state.openPopover.style.width = width + "px";
        let left = rect.left + window.scrollX + rect.width + margin;
        let top = rect.top + window.scrollY;
        const popRect = { width: width, height: 300 };
        if (left + popRect.width + margin > window.scrollX + document.documentElement.clientWidth) left = rect.left + window.scrollX - popRect.width - margin;
        if (left < window.scrollX + margin) left = window.scrollX + margin;
        if (top + popRect.height + margin > window.scrollY + document.documentElement.clientHeight) top = Math.max(rect.top + window.scrollY - popRect.height - margin, window.scrollY + margin);
        if (top < window.scrollY + margin) top = window.scrollY + margin;
        this.state.openPopover.style.left = Math.round(left) + "px";
        this.state.openPopover.style.top = Math.round(top) + "px";
        this.state.overlay.style.display = "block";
        this.state.openPopover.style.display = "block";
        const langs = [
            ...(el.dataset.languages || "").split(",").map(function(s) { return s.trim(); }).filter(Boolean),
            ...navigator.languages
        ];
        let lang = langs[0] || "en";
        const book = parseInt(el.dataset.bookNumber, 10);
        const chapter = parseInt(el.dataset.chapterNumber, 10);
        const verse = parseInt(el.dataset.verseNumber, 10);
        const res = await this.getVersionTableForLanguages(langs);
        const table = res.table;
        lang = res.language || lang;
        const data = await this.fetchChapter(table, book, chapter, lang);
        const nav = (data && data.navigation) ? data.navigation : await this.computeNavigation(lang, book, chapter);
        this.state.current = { lang: lang, table: table, book: book, chapter: chapter, verse: verse, nav: nav };
        const titleFull = await this.getBookTitleFull(lang, book);
        this.state.titleEl.textContent = (titleFull || ("Book " + book)) + " " + chapter;
        this.renderChapterBody(data.version1 && data.version1.verses ? data.version1.verses : [], verse);
    }

    closePopover() {
        if (this.state.openPopover) this.state.openPopover.style.display = "none";
        if (this.state.overlay) this.state.overlay.style.display = "none";
        this.state.current = null;
    }

    async navigateChapter(dir) {
        if (!this.state.current) return;
        if (!this.state.current.nav) {
            this.state.current.nav = await this.computeNavigation(this.state.current.lang, this.state.current.book, this.state.current.chapter);
        }
        const navKey = dir < 0 ? "prev_chapter" : "next_chapter";
        const target = this.state.current.nav && this.state.current.nav[navKey];
        if (!target) return;
        const data = await this.fetchChapter(this.state.current.table, target.book_number, target.chapter, this.state.current.lang);
        this.state.current.book = target.book_number;
        this.state.current.chapter = target.chapter;
        this.state.current.nav = data.navigation;
        const titleFull = await this.getBookTitleFull(this.state.current.lang, this.state.current.book);
        this.state.titleEl.textContent = (titleFull || ("Book " + this.state.current.book)) + " " + this.state.current.chapter;
        this.renderChapterBody(data.version1 && data.version1.verses ? data.version1.verses : [], null);
    }

    renderChapterBody(verses, highlightVerse) {
        this.state.bodyEl.innerHTML = "";
        const container = document.createElement("div");
        verses.forEach(function(v) {
            const line = document.createElement("div");
            line.style.padding = "6px 0";
            line.textContent = String(v.verse_number) + " " + (v.text || "").replace(/\{G\d{1,4}\}|\{H\d{1,5}\}/g, "");
            line.dataset.verseNumber = String(v.verse_number);
            if (highlightVerse && parseInt(v.verse_number, 10) === highlightVerse) line.style.background = "rgba(0,124,186,0.08)";
            container.appendChild(line);
        });
        this.state.bodyEl.appendChild(container);
        if (highlightVerse) {
            const target = this.state.bodyEl.querySelector('[data-verse-number="' + String(highlightVerse) + '"]');
            if (target) {
                const bodyRect = this.state.bodyEl.getBoundingClientRect();
                const targetRect = target.getBoundingClientRect();
                const delta = targetRect.top - bodyRect.top;
                this.state.bodyEl.scrollTop = this.state.bodyEl.scrollTop + delta - 2;
            }
        }
    }

    async getVersionTableFromCache(langs) {
        try {
            if (this.cacheManager) {
                const cachedVersions = await this.cacheManager.getVersions(langs, ["Bible", "Bible+Strong"]);
                if (Array.isArray(cachedVersions) && cachedVersions.length > 0) {
                    for (let ci = 0; ci < langs.length; ci++) {
                        const language = langs[ci];
                        const chosenCached = cachedVersions.find(v => v.language_code === language);
                        if (chosenCached) return { table: chosenCached.table_name, language: language };
                    }
                }
            }
        } catch (e) {
            return {};
        }
        return {};
    }

    async getVersionTableForLanguages(langs) {
        if (!Array.isArray(langs) || langs.length < 1) return {};
        let results = await this.getVersionTableFromCache(langs);
        if (results.table && results.language) return results;
        await this.prefetchVersions();
        return this.getVersionTableFromCache(langs);
    }

    async fetchChapter(tableName, book, chapter, language) {
        let cachedVerses = null;
        if (!tableName || !book || !chapter) return cachedVerses;
        if (this.cacheManager) {
            cachedVerses = await this.cacheManager.getVerses(null, [tableName], book, chapter);
            if (Array.isArray(cachedVerses) && cachedVerses.length > 0) {
                const navigation = await this.computeNavigation(language, book, chapter);
                return { version1: { verses: cachedVerses }, navigation: navigation };
            }
        }
        const url = new URL(window.bibleHereAjax.ajaxurl);
        url.searchParams.set("action", "bible_here_public_get_verses");
        url.searchParams.set("version1_bible", tableName);
        url.searchParams.set("book_number_start", String(book));
        url.searchParams.set("book_number_end", String(book));
        url.searchParams.set("chapter_number_start", String(chapter));
        url.searchParams.set("chapter_number_end", String(chapter));
        url.searchParams.set("verse_number_start", "1");
        url.searchParams.set("verse_number_end", "176");
        const resp = await fetch(url.toString(), { method: "GET", headers: { "X-WP-Nonce": window.bibleHereAjax.nonce } });
        if (!resp.ok) throw new Error("verses HTTP " + resp.status);
        const data = await resp.json();
        if (this.cacheManager) {
            const versesToCache = data.data.version1.verses.map(function(verse) {
                return {
                    verse_number: verse.verse_number,
                    text: verse.strong_text || verse.text,
                    reference: null,
                    verse_id: verse.verse_id
                };
            });
            this.cacheManager.cacheVerses(versesToCache, tableName);
        }
        return data.data || {};
    }

    async computeNavigation(language, bookNumber, chapterNumber) {
        try {
            const lang = language || (this.state.current && this.state.current.lang) || null;
            if (!lang || !this.db) return { prev_chapter: null, next_chapter: null };
            const rec = await this.db.books.get(lang);
            const books = rec && rec.value ? rec.value : {};
            const current = books[bookNumber];
            const total = current && (current.total_chapters || current.chapters) ? (current.total_chapters || current.chapters) : null;
            if (!total) return { prev_chapter: null, next_chapter: null };
            const prev_chapter = (chapterNumber > 1)
                ? { book_number: bookNumber, chapter: chapterNumber - 1 }
                : (books[bookNumber - 1]
                    ? { book_number: bookNumber - 1, chapter: (books[bookNumber - 1].total_chapters || books[bookNumber - 1].chapters || 1) }
                    : null);
            const next_chapter = (chapterNumber < total)
                ? { book_number: bookNumber, chapter: chapterNumber + 1 }
                : (books[bookNumber + 1]
                    ? { book_number: bookNumber + 1, chapter: 1 }
                    : null);
            return { prev_chapter: prev_chapter, next_chapter: next_chapter };
        } catch (e) {
            return { prev_chapter: null, next_chapter: null };
        }
    }

    async getBookTitleFull(lang, book) {
        try {
            const cached = await this.cacheManager.getCachedBooks(lang) || {};
            const bookData = cached[book];
            return bookData && bookData.title_full ? bookData.title_full : null;
        } catch (e) {
            return null;
        }
    }

    async prefetchVersions() {
        try {
            const url = new URL(window.bibleHereAjax.ajaxurl);
            url.searchParams.set("action", "bible_here_public_get_versions");
            const resp = await fetch(url.toString(), { method: "GET", headers: { "X-WP-Nonce": window.bibleHereAjax.nonce } });
            if (!resp.ok) return;
            const data = await resp.json();
            const versions = data && data.data && Array.isArray(data.data.versions) ? data.data.versions : [];
            if (this.cacheManager && versions.length > 0) this.cacheManager.cacheVersions(versions);
        } catch (e) {
        }
    }

    async needsVersionsRefresh() {
        try {
            const count = await this.db.versions.count();
            if (!count || count === 0) return true;
            const latest = await this.db.versions.orderBy("updatedAt").last();
            if (!latest || !latest.updatedAt) return true;
            const ageMs = Date.now() - latest.updatedAt;
            const DAY_MS = 24 * 60 * 60 * 1000;
            return ageMs > DAY_MS;
        } catch (e) {
            return true;
        }
    }

    onOverlayClick(e) {
        e.preventDefault();
        e.stopPropagation();
        this.closePopover();
    }

    onPrevClick(e) {
        e.preventDefault();
        e.stopPropagation();
        this.navigateChapter(-1);
    }

    onNextClick(e) {
        e.preventDefault();
        e.stopPropagation();
        this.navigateChapter(1);
    }

    onCloseClick(e) {
        e.preventDefault();
        e.stopPropagation();
        this.closePopover();
    }
    static start() {
        function start() {
            window.BibleHereReference = new BibleHereReference();
            window.BibleHereReference.run();
        }
        if (document.readyState === "complete" || document.readyState === "interactive") {
            setTimeout(start, 0);
        } else {
            document.addEventListener("DOMContentLoaded", start);
        }
    }
}

BibleHereReference.start();