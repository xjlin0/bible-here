'use strict';

// Initialize and refresh abbreviations cache on page load
(function() {


    window.bibleHereRefState = window.bibleHereRefState || {
        versionTableByLang: {},
        openPopover: null,
        overlay: null,
        current: null
    };
    var refState = window.bibleHereRefState;

    async function ensureCacheInitialized() {
        try {
            if (!window.bibleHereCacheManager) {
                console.log('[bible-here-reference] no cache manager found');
                return false;
            }
            await window.bibleHereCacheManager.initialize();
            return true;
        } catch (e) {
            console.error('[bible-here-reference] Failed to initialize cache:', e);
            return false;
        }
    }

    async function needsAbbreviationsRefresh(db) {
        try {
            const count = await db.abbreviations.count();
            if (!count || count === 0) {
                return true;
            }
            const latest = await db.abbreviations.orderBy('updatedAt').last();
            if (!latest || !latest.updatedAt) {
                return true;
            }
            const ageMs = Date.now() - latest.updatedAt;
            const DAY_MS = 24 * 60 * 60 * 1000;
            return ageMs > DAY_MS;
        } catch (e) {
            console.warn('[bible-here-reference] Abbreviations check failed, will refresh:', e);
            return true;
        }
    }

    async function fetchAbbreviations() {
        const url = new URL(bibleHereAjax.ajaxurl);
        url.searchParams.set('action', 'bible_here_public_get_abbreviations');
        const resp = await fetch(url.toString(), {
            method: 'GET',
            headers: { 'X-WP-Nonce': bibleHereAjax.nonce }
        });
        if (!resp.ok) {
            throw new Error('HTTP ' + resp.status);
        }
        const data = await resp.json();
        if (!data || !data.success || !data.data || !Array.isArray(data.data.abbreviations)) {
            throw new Error('Invalid abbreviations payload');
        }
        return data.data.abbreviations;
    }

    async function cacheAbbreviations(db, items) {
        const now = Date.now();
        const records = items.map(function(item) {
            return {
                abbreviation: item.abbreviation,
                language: item.language,
                book_number: item.book_number,
                updatedAt: now
            };
        });
        if (records.length > 0) {
            await db.abbreviations.bulkPut(records);
        }
    }

    async function run() {
        if (shouldSkipByOption()) { return; }
        const ok = await ensureCacheInitialized();
        if (!ok) { return; }
        const db = window.bibleHereDB;
        await ensureAbbreviations(db);
        if (await needsVersionsRefresh()) {
            await prefetchVersions();
        }
        const items = await getAbbreviations(db);
        if (!items || items.length === 0) { return; }
        const ctx = buildRegexContext(items);
        wrapReferences(ctx);
        bindReferenceClicks(ctx);
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(run, 0);
    } else {
        document.addEventListener('DOMContentLoaded', run);
    }
})();

// Global helpers moved out for access by other functions
async function needsAbbreviationsRefresh(db) {
    try {
        const count = await db.abbreviations.count();
        if (!count || count === 0) { return true; }
        const latest = await db.abbreviations.orderBy('updatedAt').last();
        if (!latest || !latest.updatedAt) { return true; }
        const ageMs = Date.now() - latest.updatedAt;
        const DAY_MS = 24 * 60 * 60 * 1000;
        return ageMs > DAY_MS;
    } catch (e) {
        return true;
    }
}

async function fetchAbbreviations() {
    const url = new URL(bibleHereAjax.ajaxurl);
    url.searchParams.set('action', 'bible_here_public_get_abbreviations');
    const resp = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'X-WP-Nonce': bibleHereAjax.nonce }
    });
    if (!resp.ok) { throw new Error('HTTP ' + resp.status); }
    const data = await resp.json();
    if (!data || !data.success || !data.data || !Array.isArray(data.data.abbreviations)) {
        throw new Error('Invalid abbreviations payload');
    }
    return data.data.abbreviations;
}

async function cacheAbbreviations(db, items) {
    const now = Date.now();
    const records = items.map(function(item) {
        return {
            abbreviation: item.abbreviation,
            language: item.language,
            book_number: item.book_number,
            updatedAt: now
        };
    });
    if (records.length > 0) {
        await db.abbreviations.bulkPut(records);
    }
}

async function needsVersionsRefresh(){
    try {
        const count = await window.bibleHereDB.versions.count();
        if (!count || count === 0) { return true; }
        const latest = await window.bibleHereDB.versions.orderBy('updatedAt').last();
        if (!latest || !latest.updatedAt) { return true; }
        const ageMs = Date.now() - latest.updatedAt;
        const DAY_MS = 24 * 60 * 60 * 1000;
        return ageMs > DAY_MS;
    } catch (e) { return true; }
}

// Option checks
function shouldSkipByOption(){
    var cfg = typeof bibleHereAjax === 'object' ? bibleHereAjax : {};
    var disabled = cfg.labelDisabledPages;
    var currentId = parseInt(cfg.currentPostId || 0, 10);
    if (disabled === null) { return true; }
    if (Array.isArray(disabled) && disabled.indexOf(currentId) >= 0) { return true; }
    return false;
}

// Abbreviations helpers
async function ensureAbbreviations(db){
    const refresh = await needsAbbreviationsRefresh(db);
    if (!refresh) return;
    const abbr = await fetchAbbreviations();
    await cacheAbbreviations(db, abbr);
}

async function getAbbreviations(db){
    try { return await db.abbreviations.toArray(); } catch(e){ return []; }
}

function buildRegexContext(items){
    var list = [];
    var seen = {};
    var abbrMap = {};
    for (var k=0;k<items.length;k++) {
        var ab = (items[k].abbreviation||'').trim();
        if (!ab) continue;
        var key = ab.toLowerCase();
        if (!seen[key]) { seen[key] = true; list.push(ab); }
        if (!abbrMap[key]) abbrMap[key] = [];
        abbrMap[key].push(items[k]);
    }
    list.sort(function(a,b){ return b.length - a.length; });
    function esc(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
    var pattern = '(?:' + list.map(esc).join('|') + ')\\s*(\\d{1,3})\\s*[:：]\\s*(\\d{1,3})';
    var re = new RegExp(pattern,'gi');
    function findInfo(match){
        var m = match.match(new RegExp('^(' + list.map(esc).join('|') + ')','i'));
        if (!m) return null;
        var key = m[1].toLowerCase();
        var arr = abbrMap[key] || [];
        var chosen = arr.length ? arr[0] : null;
        return chosen ? { abbreviation: chosen.abbreviation, book_number: chosen.book_number, language: chosen.language } : null;
    }
    function getLanguagesForAbbreviation(abbr){
        var key = (abbr || '').toLowerCase();
        var arr = abbrMap[key] || [];
        var langs = [];
        for (var i=0;i<arr.length;i++) {
            if (arr[i].language && langs.indexOf(arr[i].language) < 0) langs.push(arr[i].language);
        }
        return langs;
    }
    function inRange(a,b){ a=+a; b=+b; return a>=1 && a<=150 && b>=1 && b<=176; }
    return { re: re, list: list, findInfo: findInfo, getLanguagesForAbbreviation: getLanguagesForAbbreviation, inRange: inRange };
}

function wrapReferences(ctx){
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: function(node){
            var p = node.parentNode;
            if (!p) return NodeFilter.FILTER_REJECT;
            var tag = p.tagName ? p.tagName.toLowerCase() : '';
            if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'textarea' || tag === 'input') return NodeFilter.FILTER_REJECT;
            var anc = p.closest('.bible-here-reader');
            if (anc) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        }
    });

    var nodes = [];
    while (walker.nextNode()) { nodes.push(walker.currentNode); }
    for (var n=0;n<nodes.length;n++) {
        var t = nodes[n].nodeValue;
        ctx.re.lastIndex = 0;
        var first = ctx.re.exec(t);
        if (!first) { continue; }
        ctx.re.lastIndex = 0;
        var frag = document.createDocumentFragment();
        var last = 0;
        var match;
        while ((match = ctx.re.exec(t)) !== null) {
            var full = match[0];
            var c = match[1];
            var v = match[2];
            if (match.index > last) {
                frag.appendChild(document.createTextNode(t.slice(last, match.index)));
            }
            if (ctx.inRange(c, v)) {
                var info = ctx.findInfo(full);
                if (info) {
                    var spanRef = document.createElement('span');
                    spanRef.className = 'bible-here-reference';
                    spanRef.dataset.bookNumber = String(info.book_number != null ? info.book_number : '');
                    spanRef.dataset.chapterNumber = String(c);
                    spanRef.dataset.verseNumber = String(v);
                    var langs = ctx.getLanguagesForAbbreviation(info.abbreviation);
                    spanRef.dataset.languages = langs.join(',');
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
        if (last < t.length) {
            frag.appendChild(document.createTextNode(t.slice(last)));
        }
        nodes[n].parentNode.replaceChild(frag, nodes[n]);
    }
}

function bindReferenceClicks(ctx){
    document.addEventListener('click', function(e){
        var el = e.target;
        if (!(el && el.classList && el.classList.contains('bible-here-reference'))) return;
        e.preventDefault();
        e.stopPropagation();
        showReferencePopover(el, ctx);
    });
}

function ensurePopover(){
    if (!refState.overlay) {
        const ov = document.createElement('div');
        ov.className = 'bh-ref-overlay';
        document.body.appendChild(ov);
        ov.addEventListener('click', closePopover);
        refState.overlay = ov;
    }
    if (!refState.openPopover) {
        const pop = document.createElement('div');
        pop.className = 'bh-ref-popover';
        pop.style.display = 'none';
        const header = document.createElement('div');
        header.className = 'bh-ref-header';
        const title = document.createElement('div');
        title.className = 'bh-ref-title';
        const controls = document.createElement('div');
        controls.className = 'bh-ref-controls';
        const btnPrev = document.createElement('button');
        btnPrev.textContent = '<';
        btnPrev.title = 'Previous Chapter';
        btnPrev.type = 'button';
        btnPrev.className = 'bh-ref-prev';
        const btnNext = document.createElement('button');
        btnNext.textContent = '>';
        btnNext.title = 'Next Chapter';
        btnNext.type = 'button';
        btnNext.className = 'bh-ref-next';
        const btnClose = document.createElement('button');
        btnClose.textContent = 'X';
        btnClose.title = 'Close';
        btnClose.type = 'button';
        btnClose.className = 'bh-ref-close';
        controls.appendChild(btnPrev); controls.appendChild(btnNext);
        controls.appendChild(btnClose);
        header.appendChild(title); header.appendChild(controls);
        const body = document.createElement('div');
        body.className = 'bh-ref-body';
        pop.appendChild(header); pop.appendChild(body);
        document.body.appendChild(pop);
        btnClose.addEventListener('click', closePopover);
        btnPrev.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); navigateChapter(-1); });
        btnNext.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); navigateChapter(1); });
        refState.openPopover = pop;
        refState.titleEl = title; refState.bodyEl = body;
    }
}

async function showReferencePopover(el, ctx){
    ensurePopover();
    const rect = el.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(Math.floor(window.innerWidth * 0.9), 520);
    refState.openPopover.style.width = width + 'px';
    let left = rect.left + window.scrollX + rect.width + margin;
    let top = rect.top + window.scrollY;
    const popRect = { width: width, height: 300 };
    if (left + popRect.width + margin > window.scrollX + document.documentElement.clientWidth) {
        left = rect.left + window.scrollX - popRect.width - margin;
    }
    if (left < window.scrollX + margin) left = window.scrollX + margin;
    if (top + popRect.height + margin > window.scrollY + document.documentElement.clientHeight) {
        top = Math.max(rect.top + window.scrollY - popRect.height - margin, window.scrollY + margin);
    }
    if (top < window.scrollY + margin) top = window.scrollY + margin;
    refState.openPopover.style.left = Math.round(left) + 'px';
    refState.openPopover.style.top = Math.round(top) + 'px';
    refState.overlay.style.display = 'block';
    refState.openPopover.style.display = 'block';

    const langs = [...(el.dataset.languages || '').split(',').map(function(s){ return s.trim(); }).filter(Boolean), ...navigator.languages];
    let lang = langs[0] || 'en';
    const book = parseInt(el.dataset.bookNumber, 10);
    const chapter = parseInt(el.dataset.chapterNumber, 10);
    const verse = parseInt(el.dataset.verseNumber, 10);
    const res = await getVersionTableForLanguages(langs);
    console.log("getVersionTableForLanguages 332 langs: ", langs);
    console.log("getVersionTableForLanguages 333 res: ", res);
    const table = res.table;
    lang = res.language || lang;
    const data = await fetchChapter(table, book, chapter);
    refState.current = { lang: lang, table: table, book: book, chapter: chapter, verse: verse, nav: data.navigation };

    const titleFull = await getBookTitleFull(lang, book);
    refState.titleEl.textContent = (titleFull || ('Book ' + book)) + ' ' + chapter;
    renderChapterBody(data.version1 && data.version1.verses ? data.version1.verses : [], verse);
}

function closePopover(){
    if (refState.openPopover) refState.openPopover.style.display = 'none';
    if (refState.overlay) refState.overlay.style.display = 'none';
    refState.current = null;
}

async function navigateChapter(dir){
    if (!refState.current) return;
    var navKey = dir < 0 ? 'prev_chapter' : 'next_chapter';
    var target = refState.current.nav && refState.current.nav[navKey];
    if (!target) return;
    var data = await fetchChapter(refState.current.table, target.book_number, target.chapter);
    refState.current.book = target.book_number; refState.current.chapter = target.chapter; refState.current.nav = data.navigation;
    var titleFull = await getBookTitleFull(refState.current.lang, refState.current.book);
    refState.titleEl.textContent = (titleFull || ('Book ' + refState.current.book)) + ' ' + refState.current.chapter;
    renderChapterBody(data.version1 && data.version1.verses ? data.version1.verses : [], null);
}

function renderChapterBody(verses, highlightVerse){
    refState.bodyEl.innerHTML = '';
    var container = document.createElement('div');
    verses.forEach(function(v){
        var line = document.createElement('div');
        line.style.padding = '6px 0';
        line.textContent = String(v.verse_number) + ' ' + (v.text || '').replace(/\{G\d{1,4}\}|\{H\d{1,5}\}/g, "");
        line.dataset.verseNumber = String(v.verse_number);
        if (highlightVerse && parseInt(v.verse_number,10) === highlightVerse) {
            line.style.background = 'rgba(0,124,186,0.08)';
        }
        container.appendChild(line);
    });
    refState.bodyEl.appendChild(container);
    if (highlightVerse) {
        var target = refState.bodyEl.querySelector('[data-verse-number="' + String(highlightVerse) + '"]');
        if (target) {
            var bodyRect = refState.bodyEl.getBoundingClientRect();
            var targetRect = target.getBoundingClientRect();
            var delta = targetRect.top - bodyRect.top;
            refState.bodyEl.scrollTop = refState.bodyEl.scrollTop + delta - 2;
        }
    }
}

async function getVersionTableFromCache(langs){
    try {
        if (window.bibleHereCacheManager) {
            const cachedVersions = await window.bibleHereCacheManager.getVersions(langs, ['Bible','Bible+Strong']);
            if (Array.isArray(cachedVersions) && cachedVersions.length > 0) {
                for (let ci=0; ci < langs.length; ci++) {
                    const language = langs[ci];
                    const chosenCached = cachedVersions.find(v => v.language_code === language);
                    if (chosenCached) return { table: chosenCached.table_name, language: language };
                } // in the order of language preference
            }
        }
    } catch (e) {
        console.log("getVersionTableFromCache 414 e: ", e);
    }
    return {};
}

async function getVersionTableForLanguages(langs){
    let results = {};
    if (!Array.isArray(langs) || langs.length < 1 ) {
        return results;
    }
    results = await getVersionTableFromCache(langs);
    if (results.table && results.language) {
        return results;
    } else {
        await prefetchVersions();
        return getVersionTableFromCache(langs);
    }
}

async function fetchChapter(tableName, book, chapter){
    let cachedVerses = null;
    if (!tableName || !book || !chapter) {
        return cachedVerses;
    }

    if (window.bibleHereCacheManager) {
        cachedVerses = await window.bibleHereCacheManager.getVerses(
            null,
            [tableName],
            book,
            chapter
        );

        if (Array.isArray(cachedVerses) && cachedVerses.length > 0) {
            return { version1: { verses: cachedVerses } };
        }
    }

    const url = new URL(bibleHereAjax.ajaxurl);
    url.searchParams.set('action', 'bible_here_public_get_verses');
    url.searchParams.set('version1_bible', tableName);
    url.searchParams.set('book_number_start', String(book));
    url.searchParams.set('book_number_end', String(book));
    url.searchParams.set('chapter_number_start', String(chapter));
    url.searchParams.set('chapter_number_end', String(chapter));
    url.searchParams.set('verse_number_start', '1');
    url.searchParams.set('verse_number_end', '176');
    const resp = await fetch(url.toString(), {
        method: 'GET',
        headers: { 
            'X-WP-Nonce': bibleHereAjax.nonce,
        }
    });
    if (!resp.ok) throw new Error('verses HTTP ' + resp.status);
    const data = await resp.json();
    if (window.bibleHereCacheManager) {
        const versesToCache = data.data.version1.verses.map(verse => ({
            verse_number: verse.verse_number,
            text: verse.strong_text || verse.text,
            reference: null,
            verse_id: verse.verse_id
        }));  // to match the cache in bible-here-reader for strong numbers

        window.bibleHereCacheManager.cacheVerses(versesToCache, tableName);
    }

    return data.data || {};
}

async function getBookTitleFull(lang, book){
    try {
        var rec = await window.bibleHereDB.books.get(lang);
        var books = rec && rec.value ? rec.value : {};
        var b = books[book];
        return b && b.title_full ? b.title_full : null;
    } catch(e){ return null; }
}

async function prefetchVersions(){
    try {
        const url = new URL(bibleHereAjax.ajaxurl);
        url.searchParams.set('action', 'bible_here_public_get_versions');
        const resp = await fetch(url.toString(), { method: 'GET', headers: { 'X-WP-Nonce': bibleHereAjax.nonce } });
        if (!resp.ok) return;
        const data = await resp.json();
        const versions = (data && data.data && data.data.versions) ? data.data.versions : [];
        if (window.bibleHereCacheManager && Array.isArray(versions) && versions.length > 0) {
            window.bibleHereCacheManager.cacheVersions(versions);
        }
    } catch(e) {}
}
const refState = window.bibleHereRefState || {};