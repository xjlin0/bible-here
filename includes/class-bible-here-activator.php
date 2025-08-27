<?php

/**
 * Fired during plugin activation
 *
 * @link       https://github.com/xjlin0
 * @since      1.0.0
 *
 * @package    Bible_Here
 * @subpackage Bible_Here/includes
 */

/**
 * Fired during plugin activation.
 *
 * This class defines all code necessary to run during the plugin's activation.
 *
 * @since      1.0.0
 * @package    Bible_Here
 * @subpackage Bible_Here/includes
 * @author     Jack Lin <xjlin0@gmail.com>
 */
class Bible_Here_Activator {

	/**
	 * Plugin activation handler.
	 *
	 * Creates all necessary database tables and inserts initial data.
	 *
	 * @since    1.0.0
	 */
	public static function activate() {
		self::create_database_tables();
		self::insert_initial_data();
	}

	/**
	 * Create all database tables for the Bible Here plugin.
	 *
	 * @since    1.0.0
	 */
	private static function create_database_tables() {
		global $wpdb;

		// Include WordPress database upgrade functions
		require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );

		// Set charset and collation
		$charset_collate = $wpdb->get_charset_collate();

		// Books table
		$table_name = $wpdb->prefix . 'bible_here_books';
		$sql = "CREATE TABLE IF NOT EXISTS  $table_name (
			id INT AUTO_INCREMENT PRIMARY KEY,
			language VARCHAR(10) NOT NULL,
			genre_number TINYINT NOT NULL,
			book_number TINYINT NOT NULL CHECK (book_number BETWEEN 1 AND 66),
			title_short VARCHAR(20) NOT NULL,
			title_full VARCHAR(100) NOT NULL,
			chapters TINYINT NOT NULL CHECK (chapters BETWEEN 1 AND 150),
			UNIQUE KEY unique_book (language, book_number),
			INDEX idx_book_number (book_number),
			INDEX idx_language (language)
		) $charset_collate;";
		dbDelta( $sql );

		// Genres table
		$table_name = $wpdb->prefix . 'bible_here_genres';
		$sql = "CREATE TABLE IF NOT EXISTS  $table_name (
			id INT AUTO_INCREMENT PRIMARY KEY,
			language VARCHAR(10) NOT NULL,
			type VARCHAR(20) NOT NULL,
			genre_number TINYINT NOT NULL CHECK (genre_number BETWEEN 1 AND 10),
			name VARCHAR(50) NOT NULL,
			UNIQUE KEY unique_genre (language, genre_number),
			INDEX idx_language (language)
		) $charset_collate;";
		dbDelta( $sql );

		// Bible versions table
		$table_name = $wpdb->prefix . 'bible_here_versions';
		$sql = "CREATE TABLE IF NOT EXISTS  $table_name (
			id INT AUTO_INCREMENT PRIMARY KEY,
			table_name VARCHAR(50) NOT NULL COMMENT 'ascii English only for database table names',
			language VARCHAR(10) NOT NULL,
			abbreviation VARCHAR(20) NOT NULL COMMENT 'ascii English only for database table names',
			name VARCHAR(100) NOT NULL,
			info_text TEXT,
			info_url VARCHAR(255),
			publisher VARCHAR(100),
			copyright TEXT,
			download_url VARCHAR(255),
			rank TINYINT NULL,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			UNIQUE KEY unique_version (language, abbreviation)
		) $charset_collate;";
		dbDelta( $sql );

		// Cross references table
		$table_name = $wpdb->prefix . 'bible_here_cross_references';
		$sql = "CREATE TABLE IF NOT EXISTS  $table_name (
			verse_id INT(8) NOT NULL,
			rank TINYINT NOT NULL,
			start INT(8) NOT NULL,
			finish INT(8) NOT NULL,
			PRIMARY KEY (verse_id, rank),
			INDEX idx_verse_id (verse_id),
			INDEX idx_start (start)
		) $charset_collate;";
		dbDelta( $sql );

		// Abbreviations table
		$table_name = $wpdb->prefix . 'bible_here_abbreviations';
		$sql = "CREATE TABLE IF NOT EXISTS  $table_name (
			id INT AUTO_INCREMENT PRIMARY KEY,
			language VARCHAR(10) NOT NULL,
			abbreviation VARCHAR(20) NOT NULL,
			book_number TINYINT NOT NULL CHECK (book_number BETWEEN 1 AND 66),
			primary_abbr BOOLEAN DEFAULT FALSE,
			UNIQUE KEY unique_abbr (language, abbreviation),
			INDEX idx_book_number (book_number),
			INDEX idx_language (language)
		) $charset_collate;";
		dbDelta( $sql );



		// Bible commentaries table
		$table_name = $wpdb->prefix . 'bible_here_commentaries';
		$sql = "CREATE TABLE IF NOT EXISTS  $table_name (
			id INT AUTO_INCREMENT PRIMARY KEY,
			installed BOOLEAN DEFAULT FALSE,
			table_name VARCHAR(50) NOT NULL,
			language VARCHAR(10) NOT NULL,
			name VARCHAR(100) NOT NULL,
			info_text TEXT,
			info_url VARCHAR(255),
			publisher VARCHAR(100),
			copyright TEXT,
			download_url VARCHAR(255),
			INDEX idx_installed (installed),
			INDEX idx_language (language)
		) $charset_collate;";
		dbDelta( $sql );
	}

	/**
	 * Insert initial data into database tables.
	 *
	 * @since    1.0.0
	 */
	private static function insert_initial_data() {
		global $wpdb;

		// Insert all 66 Bible books
		$books_table = $wpdb->prefix . 'bible_here_books';
		$books_data = [
			// Old Testament - Law (Torah)
			['en', 1, 1, 'Gen', 'Genesis', 50],
			['en', 1, 2, 'Exod', 'Exodus', 40],
			['en', 1, 3, 'Lev', 'Leviticus', 27],
			['en', 1, 4, 'Num', 'Numbers', 36],
			['en', 1, 5, 'Deut', 'Deuteronomy', 34],
			// Old Testament - History
			['en', 2, 6, 'Josh', 'Joshua', 24],
			['en', 2, 7, 'Judg', 'Judges', 21],
			['en', 2, 8, 'Ruth', 'Ruth', 4],
			['en', 2, 9, '1Sam', '1 Samuel', 31],
			['en', 2, 10, '2Sam', '2 Samuel', 24],
			['en', 2, 11, '1Kgs', '1 Kings', 22],
			['en', 2, 12, '2Kgs', '2 Kings', 25],
			['en', 2, 13, '1Chr', '1 Chronicles', 29],
			['en', 2, 14, '2Chr', '2 Chronicles', 36],
			['en', 2, 15, 'Ezra', 'Ezra', 10],
			['en', 2, 16, 'Neh', 'Nehemiah', 13],
			['en', 2, 17, 'Esth', 'Esther', 10],
			// Old Testament - Wisdom
			['en', 3, 18, 'Job', 'Job', 42],
			['en', 3, 19, 'Ps', 'Psalms', 150],
			['en', 3, 20, 'Prov', 'Proverbs', 31],
			['en', 3, 21, 'Eccl', 'Ecclesiastes', 12],
			['en', 3, 22, 'Song', 'Song of Solomon', 8],
			// Old Testament - Prophets
			['en', 4, 23, 'Isa', 'Isaiah', 66],
			['en', 4, 24, 'Jer', 'Jeremiah', 52],
			['en', 4, 25, 'Lam', 'Lamentations', 5],
			['en', 4, 26, 'Ezek', 'Ezekiel', 48],
			['en', 4, 27, 'Dan', 'Daniel', 12],
			['en', 4, 28, 'Hos', 'Hosea', 14],
			['en', 4, 29, 'Joel', 'Joel', 3],
			['en', 4, 30, 'Amos', 'Amos', 9],
			['en', 4, 31, 'Obad', 'Obadiah', 1],
			['en', 4, 32, 'Jonah', 'Jonah', 4],
			['en', 4, 33, 'Mic', 'Micah', 7],
			['en', 4, 34, 'Nah', 'Nahum', 3],
			['en', 4, 35, 'Hab', 'Habakkuk', 3],
			['en', 4, 36, 'Zeph', 'Zephaniah', 3],
			['en', 4, 37, 'Hag', 'Haggai', 2],
			['en', 4, 38, 'Zech', 'Zechariah', 14],
			['en', 4, 39, 'Mal', 'Malachi', 4],
			// New Testament - Gospels
			['en', 5, 40, 'Matt', 'Matthew', 28],
			['en', 5, 41, 'Mark', 'Mark', 16],
			['en', 5, 42, 'Luke', 'Luke', 24],
			['en', 5, 43, 'John', 'John', 21],
			// New Testament - Acts
			['en', 6, 44, 'Acts', 'Acts', 28],
			// New Testament - Epistles
			['en', 7, 45, 'Rom', 'Romans', 16],
			['en', 7, 46, '1Cor', '1 Corinthians', 16],
			['en', 7, 47, '2Cor', '2 Corinthians', 13],
			['en', 7, 48, 'Gal', 'Galatians', 6],
			['en', 7, 49, 'Eph', 'Ephesians', 6],
			['en', 7, 50, 'Phil', 'Philippians', 4],
			['en', 7, 51, 'Col', 'Colossians', 4],
			['en', 7, 52, '1Thess', '1 Thessalonians', 5],
			['en', 7, 53, '2Thess', '2 Thessalonians', 3],
			['en', 7, 54, '1Tim', '1 Timothy', 6],
			['en', 7, 55, '2Tim', '2 Timothy', 4],
			['en', 7, 56, 'Titus', 'Titus', 3],
			['en', 7, 57, 'Phlm', 'Philemon', 1],
			['en', 7, 58, 'Heb', 'Hebrews', 13],
			['en', 7, 59, 'Jas', 'James', 5],
			['en', 7, 60, '1Pet', '1 Peter', 5],
			['en', 7, 61, '2Pet', '2 Peter', 3],
			['en', 7, 62, '1John', '1 John', 5],
			['en', 7, 63, '2John', '2 John', 1],
			['en', 7, 64, '3John', '3 John', 1],
			['en', 7, 65, 'Jude', 'Jude', 1],
			// New Testament - Apocalyptic
			['en', 8, 66, 'Rev', 'Revelation', 22]
		];

		// Check if books data already exists
		$existing_books = $wpdb->get_var("SELECT COUNT(*) FROM $books_table");
		if ($existing_books == 0) {
			foreach ($books_data as $book) {
				$wpdb->insert(
					$books_table,
					[
						'language' => $book[0],
						'genre_number' => $book[1],
						'book_number' => $book[2],
						'title_short' => $book[3],
						'title_full' => $book[4],
						'chapters' => $book[5]
					],
					['%s', '%d', '%d', '%s', '%s', '%d']
				);
			}
		}

		// Insert genres data
		$genres_table = $wpdb->prefix . 'bible_here_genres';
		$genres_data = [
			[1, 'en', 'ot', 1, 'Law'],
			[2, 'en', 'ot', 2, 'History'],
			[3, 'en', 'ot', 3, 'Wisdom'],
			[4, 'en', 'ot', 4, 'Prophets'],
			[5, 'en', 'nt', 5, 'Gospels'],
			[6, 'en', 'nt', 6, 'Acts'],
			[7, 'en', 'nt', 7, 'Epistles'],
			[8, 'en', 'nt', 8, 'Apocalyptic']
		];

		// Check if genres data already exists
		$existing_genres = $wpdb->get_var("SELECT COUNT(*) FROM $genres_table");
		if ($existing_genres == 0) {
			foreach ($genres_data as $genre) {
				$wpdb->insert(
					$genres_table,
					[
						'id' => $genre[0],
						'language' => $genre[1],
						'type' => $genre[2],
						'genre_number' => $genre[3],
						'name' => $genre[4]
					],
					['%d', '%s', '%s', '%d', '%s']
				);
			}
		}

		// Insert default KJV version
		$versions_table = $wpdb->prefix . 'bible_here_versions';
		$existing_kjv = $wpdb->get_var($wpdb->prepare(
			"SELECT COUNT(*) FROM $versions_table WHERE abbreviation = %s AND language = %s",
			'kjv', 'en'
		));
		if ($existing_kjv == 0) {
			$wpdb->insert(
				$versions_table,
				[
					'name' => 'King James Version',
					'abbreviation' => 'kjv',
					'language' => 'en',
					'table_name' => 'bible_here_en_kjv',
					'download_url' => 'https://github.com/biblenerd/Zefania-XML-Preservation/raw/refs/heads/main/zefania-sharp-sourceforge-backup/Bibles/ENG/King%20James/King%20James%20Version/SF_2009-01-23_ENG_KJV_(KING%20JAMES%20VERSION).zip',
					'rank' => null
				],
				['%s', '%s', '%s', '%s', '%s', '%d']
			);
		}
	}

}
