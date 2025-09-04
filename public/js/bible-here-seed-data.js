/**
 * Bible Here Seed Data
 * 
 * Contains default opening verses and books data for Bible Here Reader
 *
 * @package    Bible_Here
 * @subpackage Bible_Here/public/js
 * @since      1.0.0
 */

'use strict';

/**
 * Default opening verses data for different languages
 * Contains Psalm 117 in English (KJV) and Chinese (CUVT)
 */
const openingVerses = {
	en: {
		"table_name": "bible_here_en_kjv",
		"book_number": 19,
		"book_name": "Psalms",
		"chapter_number": 117,
		"version_name": "King James Version",
		"verses": [
			{
				"verse": 1,
				"text": "O praise the LORD, all ye nations: praise him, all ye people.",
				"verse_id": "19117001"
			},
			{
				"verse": 2,
				"text": "For his merciful kindness is great toward us: and the truth of the LORD endureth for ever. Praise ye the LORD.",
				"verse_id": "19117002"
			}]
	},
	zh: {
		"table_name": "bible_here_zh_tw_cuvt",
		"book_number": 19,
		"book_name": "詩篇",
		"chapter_number": 117,
		"version_name": "和合本(繁)Chinese Union Version Traditional",
		"verses": [
			{
				"verse": 1,
				"text": "萬國阿、你們都當讚美耶和華．萬民哪、你們都當頌讚他。",
				"verse_id": "19117001"
			},
			{
				"verse": 2,
				"text": "因為他向我們大施慈愛．耶和華的誠實、存到永遠。你們要讚美耶和華。",
				"verse_id": "19117002"
			}]
	},
};

/**
 * Complete list of Bible books with metadata
 * Contains all 66 books of the Bible with book numbers, titles, genres, and chapter counts
 */
const openingBooks = [
	{
		"book_number": 1,
		"title_full": "Genesis",
		"title_short": "Gen",
		"genre_name": "Law",
		"genre_type": "Old Testament",
		"chapters": 50
	},
	{
		"book_number": 2,
		"title_full": "Exodus",
		"title_short": "Exod",
		"genre_name": "Law",
		"genre_type": "Old Testament",
		"chapters": 40
	},
	{
		"book_number": 3,
		"title_full": "Leviticus",
		"title_short": "Lev",
		"genre_name": "Law",
		"genre_type": "Old Testament",
		"chapters": 27
	},
	{
		"book_number": 4,
		"title_full": "Numbers",
		"title_short": "Num",
		"genre_name": "Law",
		"genre_type": "Old Testament",
		"chapters": 36
	},
	{
		"book_number": 5,
		"title_full": "Deuteronomy",
		"title_short": "Deut",
		"genre_name": "Law",
		"genre_type": "Old Testament",
		"chapters": 34
	},
	{
		"book_number": 6,
		"title_full": "Joshua",
		"title_short": "Josh",
		"genre_name": "History",
		"genre_type": "Old Testament",
		"chapters": 24
	},
	{
		"book_number": 7,
		"title_full": "Judges",
		"title_short": "Judg",
		"genre_name": "History",
		"genre_type": "Old Testament",
		"chapters": 21
	},
	{
		"book_number": 8,
		"title_full": "Ruth",
		"title_short": "Ruth",
		"genre_name": "History",
		"genre_type": "Old Testament",
		"chapters": 4
	},
	{
		"book_number": 9,
		"title_full": "1 Samuel",
		"title_short": "1Sam",
		"genre_name": "History",
		"genre_type": "Old Testament",
		"chapters": 31
	},
	{
		"book_number": 10,
		"title_full": "2 Samuel",
		"title_short": "2Sam",
		"genre_name": "History",
		"genre_type": "Old Testament",
		"chapters": 24
	},
	{
		"book_number": 11,
		"title_full": "1 Kings",
		"title_short": "1Kgs",
		"genre_name": "History",
		"genre_type": "Old Testament",
		"chapters": 22
	},
	{
		"book_number": 12,
		"title_full": "2 Kings",
		"title_short": "2Kgs",
		"genre_name": "History",
		"genre_type": "Old Testament",
		"chapters": 25
	},
	{
		"book_number": 13,
		"title_full": "1 Chronicles",
		"title_short": "1Chr",
		"genre_name": "History",
		"genre_type": "Old Testament",
		"chapters": 29
	},
	{
		"book_number": 14,
		"title_full": "2 Chronicles",
		"title_short": "2Chr",
		"genre_name": "History",
		"genre_type": "Old Testament",
		"chapters": 36
	},
	{
		"book_number": 15,
		"title_full": "Ezra",
		"title_short": "Ezra",
		"genre_name": "History",
		"genre_type": "Old Testament",
		"chapters": 10
	},
	{
		"book_number": 16,
		"title_full": "Nehemiah",
		"title_short": "Neh",
		"genre_name": "History",
		"genre_type": "Old Testament",
		"chapters": 13
	},
	{
		"book_number": 17,
		"title_full": "Esther",
		"title_short": "Esth",
		"genre_name": "History",
		"genre_type": "Old Testament",
		"chapters": 10
	},
	{
		"book_number": 18,
		"title_full": "Job",
		"title_short": "Job",
		"genre_name": "Wisdom",
		"genre_type": "Old Testament",
		"chapters": 42
	},
	{
		"book_number": 19,
		"title_full": "Psalms",
		"title_short": "Ps",
		"genre_name": "Wisdom",
		"genre_type": "Old Testament",
		"chapters": 150
	},
	{
		"book_number": 20,
		"title_full": "Proverbs",
		"title_short": "Prov",
		"genre_name": "Wisdom",
		"genre_type": "Old Testament",
		"chapters": 31
	},
	{
		"book_number": 21,
		"title_full": "Ecclesiastes",
		"title_short": "Eccl",
		"genre_name": "Wisdom",
		"genre_type": "Old Testament",
		"chapters": 12
	},
	{
		"book_number": 22,
		"title_full": "Song of Solomon",
		"title_short": "Song",
		"genre_name": "Wisdom",
		"genre_type": "Old Testament",
		"chapters": 8
	},
	{
		"book_number": 23,
		"title_full": "Isaiah",
		"title_short": "Isa",
		"genre_name": "Prophets",
		"genre_type": "Old Testament",
		"chapters": 66
	},
	{
		"book_number": 24,
		"title_full": "Jeremiah",
		"title_short": "Jer",
		"genre_name": "Prophets",
		"genre_type": "Old Testament",
		"chapters": 52
	},
	{
		"book_number": 25,
		"title_full": "Lamentations",
		"title_short": "Lam",
		"genre_name": "Prophets",
		"genre_type": "Old Testament",
		"chapters": 5
	},
	{
		"book_number": 26,
		"title_full": "Ezekiel",
		"title_short": "Ezek",
		"genre_name": "Prophets",
		"genre_type": "Old Testament",
		"chapters": 48
	},
	{
		"book_number": 27,
		"title_full": "Daniel",
		"title_short": "Dan",
		"genre_name": "Prophets",
		"genre_type": "Old Testament",
		"chapters": 12
	},
	{
		"book_number": 28,
		"title_full": "Hosea",
		"title_short": "Hos",
		"genre_name": "Prophets",
		"genre_type": "Old Testament",
		"chapters": 14
	},
	{
		"book_number": 29,
		"title_full": "Joel",
		"title_short": "Joel",
		"genre_name": "Prophets",
		"genre_type": "Old Testament",
		"chapters": 3
	},
	{
		"book_number": 30,
		"title_full": "Amos",
		"title_short": "Amos",
		"genre_name": "Prophets",
		"genre_type": "Old Testament",
		"chapters": 9
	},
	{
		"book_number": 31,
		"title_full": "Obadiah",
		"title_short": "Obad",
		"genre_name": "Prophets",
		"genre_type": "Old Testament",
		"chapters": 1
	},
	{
		"book_number": 32,
		"title_full": "Jonah",
		"title_short": "Jonah",
		"genre_name": "Prophets",
		"genre_type": "Old Testament",
		"chapters": 4
	},
	{
		"book_number": 33,
		"title_full": "Micah",
		"title_short": "Mic",
		"genre_name": "Prophets",
		"genre_type": "Old Testament",
		"chapters": 7
	},
	{
		"book_number": 34,
		"title_full": "Nahum",
		"title_short": "Nah",
		"genre_name": "Prophets",
		"genre_type": "Old Testament",
		"chapters": 3
	},
	{
		"book_number": 35,
		"title_full": "Habakkuk",
		"title_short": "Hab",
		"genre_name": "Prophets",
		"genre_type": "Old Testament",
		"chapters": 3
	},
	{
		"book_number": 36,
		"title_full": "Zephaniah",
		"title_short": "Zeph",
		"genre_name": "Prophets",
		"genre_type": "Old Testament",
		"chapters": 3
	},
	{
		"book_number": 37,
		"title_full": "Haggai",
		"title_short": "Hag",
		"genre_name": "Prophets",
		"genre_type": "Old Testament",
		"chapters": 2
	},
	{
		"book_number": 38,
		"title_full": "Zechariah",
		"title_short": "Zech",
		"genre_name": "Prophets",
		"genre_type": "Old Testament",
		"chapters": 14
	},
	{
		"book_number": 39,
		"title_full": "Malachi",
		"title_short": "Mal",
		"genre_name": "Prophets",
		"genre_type": "Old Testament",
		"chapters": 4
	},
	{
		"book_number": 40,
		"title_full": "Matthew",
		"title_short": "Matt",
		"genre_name": "Gospels",
		"genre_type": "New Testament",
		"chapters": 28
	},
	{
		"book_number": 41,
		"title_full": "Mark",
		"title_short": "Mark",
		"genre_name": "Gospels",
		"genre_type": "New Testament",
		"chapters": 16
	},
	{
		"book_number": 42,
		"title_full": "Luke",
		"title_short": "Luke",
		"genre_name": "Gospels",
		"genre_type": "New Testament",
		"chapters": 24
	},
	{
		"book_number": 43,
		"title_full": "John",
		"title_short": "John",
		"genre_name": "Gospels",
		"genre_type": "New Testament",
		"chapters": 21
	},
	{
		"book_number": 44,
		"title_full": "Acts",
		"title_short": "Acts",
		"genre_name": "Acts",
		"genre_type": "New Testament",
		"chapters": 28
	},
	{
		"book_number": 45,
		"title_full": "Romans",
		"title_short": "Rom",
		"genre_name": "Epistles",
		"genre_type": "New Testament",
		"chapters": 16
	},
	{
		"book_number": 46,
		"title_full": "1 Corinthians",
		"title_short": "1Cor",
		"genre_name": "Epistles",
		"genre_type": "New Testament",
		"chapters": 16
	},
	{
		"book_number": 47,
		"title_full": "2 Corinthians",
		"title_short": "2Cor",
		"genre_name": "Epistles",
		"genre_type": "New Testament",
		"chapters": 13
	},
	{
		"book_number": 48,
		"title_full": "Galatians",
		"title_short": "Gal",
		"genre_name": "Epistles",
		"genre_type": "New Testament",
		"chapters": 6
	},
	{
		"book_number": 49,
		"title_full": "Ephesians",
		"title_short": "Eph",
		"genre_name": "Epistles",
		"genre_type": "New Testament",
		"chapters": 6
	},
	{
		"book_number": 50,
		"title_full": "Philippians",
		"title_short": "Phil",
		"genre_name": "Epistles",
		"genre_type": "New Testament",
		"chapters": 4
	},
	{
		"book_number": 51,
		"title_full": "Colossians",
		"title_short": "Col",
		"genre_name": "Epistles",
		"genre_type": "New Testament",
		"chapters": 4
	},
	{
		"book_number": 52,
		"title_full": "1 Thessalonians",
		"title_short": "1Thess",
		"genre_name": "Epistles",
		"genre_type": "New Testament",
		"chapters": 5
	},
	{
		"book_number": 53,
		"title_full": "2 Thessalonians",
		"title_short": "2Thess",
		"genre_name": "Epistles",
		"genre_type": "New Testament",
		"chapters": 3
	},
	{
		"book_number": 54,
		"title_full": "1 Timothy",
		"title_short": "1Tim",
		"genre_name": "Epistles",
		"genre_type": "New Testament",
		"chapters": 6
	},
	{
		"book_number": 55,
		"title_full": "2 Timothy",
		"title_short": "2Tim",
		"genre_name": "Epistles",
		"genre_type": "New Testament",
		"chapters": 4
	},
	{
		"book_number": 56,
		"title_full": "Titus",
		"title_short": "Titus",
		"genre_name": "Epistles",
		"genre_type": "New Testament",
		"chapters": 3
	},
	{
		"book_number": 57,
		"title_full": "Philemon",
		"title_short": "Phlm",
		"genre_name": "Epistles",
		"genre_type": "New Testament",
		"chapters": 1
	},
	{
		"book_number": 58,
		"title_full": "Hebrews",
		"title_short": "Heb",
		"genre_name": "Epistles",
		"genre_type": "New Testament",
		"chapters": 13
	},
	{
		"book_number": 59,
		"title_full": "James",
		"title_short": "Jas",
		"genre_name": "Epistles",
		"genre_type": "New Testament",
		"chapters": 5
	},
	{
		"book_number": 60,
		"title_full": "1 Peter",
		"title_short": "1Pet",
		"genre_name": "Epistles",
		"genre_type": "New Testament",
		"chapters": 5
	},
	{
		"book_number": 61,
		"title_full": "2 Peter",
		"title_short": "2Pet",
		"genre_name": "Epistles",
		"genre_type": "New Testament",
		"chapters": 3
	},
	{
		"book_number": 62,
		"title_full": "1 John",
		"title_short": "1John",
		"genre_name": "Epistles",
		"genre_type": "New Testament",
		"chapters": 5
	},
	{
		"book_number": 63,
		"title_full": "2 John",
		"title_short": "2John",
		"genre_name": "Epistles",
		"genre_type": "New Testament",
		"chapters": 1
	},
	{
		"book_number": 64,
		"title_full": "3 John",
		"title_short": "3John",
		"genre_name": "Epistles",
		"genre_type": "New Testament",
		"chapters": 1
	},
	{
		"book_number": 65,
		"title_full": "Jude",
		"title_short": "Jude",
		"genre_name": "Epistles",
		"genre_type": "New Testament",
		"chapters": 1
	},
	{
		"book_number": 66,
		"title_full": "Revelation",
		"title_short": "Rev",
		"genre_name": "Apocalyptic",
		"genre_type": "New Testament",
		"chapters": 22
	}
];

// Export objects for potential future use
if (typeof module !== 'undefined' && module.exports) {
	// Node.js environment
	module.exports = {
		openingVerses,
		openingBooks
	};
} else if (typeof window !== 'undefined') {
	// Browser environment - attach to window object
	window.BibleHereSeedData = {
		openingVerses,
		openingBooks
	};
}