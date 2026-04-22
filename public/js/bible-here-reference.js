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
        this.onPrevClick = this.onPrevClick.bind(this);
        this.onNextClick = this.onNextClick.bind(this);
        this.onCloseClick = this.onCloseClick.bind(this);
    }

    async run() {
        if (this.shouldSkipByOption()) return;
        const ok = await this.ensureCacheInitialized();
        if (!ok || !this.db) return;
        await this.ensureAbbreviations(this.db);
        const needVersions = await this.cacheManager.needsVersionsRefresh();
        if (needVersions) await this.prefetchVersions();
        const items = await this.getAbbreviations(this.db);
        if (!items || items.length === 0) return;
        this.regexContext = this.buildRegexContext(items);
        this.wrapReferences(this.regexContext);
        document.addEventListener("click", this.onDocumentClick);
        this.initializeFontResizerIntegration();
    }

    initializeFontResizerIntegration() {
        const resizerEl = document.querySelector('.font_resizer_plus');
        if (!resizerEl) return;

        const increaseBtn = document.querySelector('#btn-increase_wp_font_rp');
        const decreaseBtn = document.querySelector('#btn-decrease_wp_font_rp');
        const origBtn = document.querySelector('#btn-orig_wp_font_rp');

        const fontSizes = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'];
        const fontSizePixels = [8, 12, 16, 20, 24, 28, 30, 32];

        const changeAndSave = (delta) => {
            const current = this._currentFontSizePx || this.getStoredFontSize();
            const currentIndex = fontSizePixels.indexOf(current);
            const newIndex = Math.max(0, Math.min(7, currentIndex + delta));
            const newPx = fontSizePixels[newIndex];
            const newSize = fontSizes[newIndex];
            this.applyFontSizeToPx(newPx);
            localStorage.setItem('bible-here-font-size', newSize); // ← 寫入 localStorage
        };

        if (increaseBtn) increaseBtn.addEventListener('click', () => changeAndSave(1));
        if (decreaseBtn) decreaseBtn.addEventListener('click', () => changeAndSave(-1));
        if (origBtn) origBtn.addEventListener('click', () => {
            const defaultIndex = 2; // 'base' = 16px
            this.applyFontSizeToPx(fontSizePixels[defaultIndex]);
            localStorage.setItem('bible-here-font-size', fontSizes[defaultIndex]);
        });
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

    async ensureAbbreviations() {
        const refresh = await this.cacheManager.needsDatabaseRefresh("abbreviations");
        if (!refresh) return;
        const abbr = await this.fetchAbbreviations();
        await this.cacheManager.cacheAbbreviations(abbr);
    }

    async getAbbreviations(db) {
        try {
            return db.abbreviations.orderBy('[language+rank+abbreviation]').reverse().toArray();  // 詩篇 要在 詩 之前以免誤判 詩2篇
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
        const pattern = this.buildRegexPattern(list);
        const re = new RegExp(pattern, "gi");
        return { re: re, list: list, abbrMap: abbrMap };
    }

    escapeRegex(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    buildRegexPattern(list) {
        const books = "(?:" + list.map(this.escapeRegex.bind(this)).join("|") + ")";

        const patterns = [
            // 太3:5 / 太3：5 / Matt 3:5
            "(?:" + books + "\\s*(?<c1>\\d{1,3})\\s*[:：]\\s*(?<v1>\\d{1,3}))",

            // 馬太福音第3章5節 / 尼希米記第1章 / 詩篇第43篇
            "(?:" + books + "\\s*(?:第)?\\s*(?<c2>\\d{1,3})\\s*[章篇](?:\\s*(?:第)?\\s*(?<v2>\\d{1,3})\\s*節?)?)",

            // Matthew Chapter 3 Verse 5 / Matthew Chapter 3:5
            "(?:" + books + "\\s*[Cc]hapter\\s*(?<c3>\\d{1,3})(?:\\s*[Vv]erse\\s*(?<v3>\\d{1,3})|\\s*[:：]\\s*(?<v4>\\d{1,3}))?)",
        ];

        return patterns.join("|");
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

    inRange(c, v) {
        c = +c;  // convert string to number
        if (!(c >= 1 && c <= 150)) return false;  // no chapter number bigger than 150
        if (v !== null && v !== undefined && v !== "") {  // allows null as verse number for the whole chapter
            v = +v;
            if (!(v >= 1 && v <= 176)) return false;  // no verse number bigger than 176
        }
        return true;
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
                const g = match.groups || {};
                const c = g.c1 ?? g.c2 ?? g.c3 ?? "";
                const v = g.v1 ?? g.v2 ?? g.v3 ?? g.v4 ?? null;
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
        if (this.cacheManager && await this.cacheManager.needsDatabaseRefresh("books", this.allLanguagesSet)) {
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
        } else {
            console.log("skipping fetch books data since it's in the cache");
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
        if (!this.state.openPopover) {
            const pop = document.createElement("div");
            pop.className = "bh-ref-popover";
            pop.style.display = "none";

            // 設定初始樣式，確保可以縮放
            pop.style.position = "absolute";
            pop.style.boxSizing = "border-box";
            pop.style.overflow = "hidden"; // 防止內容溢出
            pop.style.minWidth = "200px";
            pop.style.minHeight = "100px";
            pop.style.resize = "both";
            pop.style.overflow = "hidden";

            const header = document.createElement("div");
            header.className = "bh-ref-header";
            header.style.cursor = "move"; // 提示可拖動
            header.style.userSelect = "none"; // 防止拖動時選中文字

            const title = document.createElement("div");
            title.className = "bh-ref-title";

            const controls = document.createElement("div");
            controls.className = "bh-ref-controls";

            // 按鈕
            const btnIncrease = document.createElement("button");
            btnIncrease.textContent = "A+"; btnIncrease.className = "bh-ref-increase-fontsize";
            const btnDecrease = document.createElement("button");
            btnDecrease.textContent = "A-"; btnDecrease.className = "bh-ref-decrease-fontsize";
            const btnPrev = document.createElement("button");
            btnPrev.textContent = "<"; btnPrev.className = "bh-ref-prev";
            const btnNext = document.createElement("button");
            btnNext.textContent = ">"; btnNext.className = "bh-ref-next";
            const btnClose = document.createElement("button");
            btnClose.textContent = "X"; btnClose.className = "bh-ref-close";

            controls.appendChild(btnIncrease);
            controls.appendChild(btnDecrease);
            controls.appendChild(btnPrev);
            controls.appendChild(btnNext);
            controls.appendChild(btnClose);
            header.appendChild(title);
            header.appendChild(controls);
            const body = document.createElement("div");
            body.className = "bh-ref-body";
            // body.style.flex = "1"; // 讓 body 填滿剩餘空間，方便縮放
            body.style.height = "calc(100% - 45px)"; // 確保 body 填滿，45px 為 header 高度
            body.style.overflow = "auto";
            pop.appendChild(header);
            pop.appendChild(body);
            document.body.appendChild(pop);

            // --- 拖動邏輯 (Dragging) ---
            let isDragging = false;
            let offsetX, offsetY, startX, startY, startLeft, startTop, startWidth, startHeight;


            header.addEventListener("mousedown", (e) => {
                if (e.target.tagName === "BUTTON") return; // 按到按鈕不觸發拖拽
                isDragging = true;
                // 使用 pageX/pageY，這會自動包含捲動距離
                // 這樣 startX/startY 就是相對於整個 Document 的座標
                startX = e.pageX;
                startY = e.pageY;
                startLeft = pop.offsetLeft;
                startTop = pop.offsetTop;
                header.style.cursor = "grabbing";
                e.preventDefault();
            });

            // 全域監聽移動與放開
            window.addEventListener("mousemove", (e) => {
                if (isDragging) {
                    // 同樣使用 pageX/pageY 進行計算
                    let newLeft = startLeft + (e.pageX - startX);
                    let newTop = startTop + (e.pageY - startY);

                    // 限制邊界 (不超出螢幕可見範圍)
                    // 注意：邊界計算也要考慮捲動
                    const minTop = window.scrollY;
                    const maxTop = window.scrollY + window.innerHeight - pop.offsetHeight;
                    const minLeft = window.scrollX;
                    const maxLeft = window.scrollX + window.innerWidth - pop.offsetWidth;

                    newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
                    newTop = Math.max(minTop, Math.min(newTop, maxTop));

                    pop.style.left = `${newLeft}px`;
                    pop.style.top = `${newTop}px`;
                }
            });

            window.addEventListener("mouseup", () => {
                isDragging = false;
                // isResizing = false;
                header.style.cursor = "move";
            });

            // --- 全方位縮放解決方案 ---
            // 雖然 CSS 'resize: both' 很方便，但若要「四個邊都能拉」，建議使用 CSS 的特定屬性：
            pop.style.resize = "both";

            // --- 原有事件綁定 ---
            btnIncrease.addEventListener("click", (e) => {
                e.preventDefault(); e.stopPropagation();
                this.changeFontSize(2);
            });
            btnDecrease.addEventListener("click", (e) => {
                e.preventDefault(); e.stopPropagation();
                this.changeFontSize(-2);
            });
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
        // this.state.overlay.style.display = "block";
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
        await this.applyStoredFontSize();
    }

    closePopover() {
        if (this.state.openPopover) this.state.openPopover.style.display = "none";
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

    /**
     * 讀取並套用儲存的字型大小
     */
    getStoredFontSize() {
        const fontSizes = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'];
        const fontSizePixels = [8, 12, 16, 20, 24, 28, 30, 32];
        const stored = localStorage.getItem('bible-here-font-size') || 'base';
        const index = fontSizes.indexOf(stored);
        return fontSizePixels[index !== -1 ? index : 2];
    }

    applyStoredFontSize() {
        const px = this.getStoredFontSize();
        this.applyFontSizeToPx(px);
    }

    applyFontSizeToPx(px) {
        if (!this.state.bodyEl) return;
        this.state.bodyEl.style.fontSize = px + 'px';
        this._currentFontSizePx = px;
    }

    changeFontSize(delta) {
        const fontSizePixels = [8, 12, 16, 20, 24, 28, 30, 32];
        const fontSizes = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'];
        const current = this._currentFontSizePx || this.getStoredFontSize();
        const currentIndex = fontSizePixels.indexOf(current);
        const newIndex = Math.max(0, Math.min(7, currentIndex + delta));
        const newPx = fontSizePixels[newIndex];
        const newSize = fontSizes[newIndex];

        this.applyFontSizeToPx(newPx);
        localStorage.setItem('bible-here-font-size', newSize); // ← 寫入 localStorage
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
