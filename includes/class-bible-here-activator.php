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
			id INT AUTO_INCREMENT PRIMARY KEY ,
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
			verse_id INT(8) unsigned zerofill NOT NULL PRIMARY KEY AUTO_INCREMENT,
			rank TINYINT(1) unsigned NOT NULL DEFAULT 0,
			start INT(8) unsigned zerofill NOT NULL,
			finish INT(8) unsigned zerofill NOT NULL DEFAULT 0,
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
			INDEX idx_book_number (book_number)
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
		self::load_csv_data();
	}

	/**
	 * Load data from CSV files and insert into database.
	 *
	 * @since    1.0.0
	 * @param    bool    $force_reload    Whether to force reload data even if it exists
	 * @return   bool                     True on success, false on failure
	 */
	public static function load_csv_data($force_reload = false) {
		global $wpdb;

		// Get plugin directory path
		$plugin_dir = plugin_dir_path(dirname(__FILE__));
		$data_dir = $plugin_dir . 'data/';
		$success = true;

		// Load books data from CSV
		$books_table = $wpdb->prefix . 'bible_here_books';
		$books_csv = $data_dir . 'books.csv';
		if (file_exists($books_csv)) {
			$books_data = self::parse_csv($books_csv);
			if (!empty($books_data)) {
				// Check if books data already exists
				$existing_books = $wpdb->get_var("SELECT COUNT(*) FROM $books_table");
				if ($existing_books == 0 || $force_reload) {
					foreach ($books_data as $book) {
						// Use INSERT ... ON DUPLICATE KEY UPDATE to preserve primary IDs
						$sql = $wpdb->prepare(
							"INSERT INTO $books_table (language, genre_number, book_number, title_short, title_full, chapters) 
							VALUES (%s, %d, %d, %s, %s, %d) 
							ON DUPLICATE KEY UPDATE 
							genre_number = VALUES(genre_number), 
							title_short = VALUES(title_short), 
							title_full = VALUES(title_full), 
							chapters = VALUES(chapters)",
							$book['language'] ?? '',
							intval($book['genre_number'] ?? 0),
							intval($book['book_number'] ?? 0),
							$book['title_short'] ?? '',
							$book['title_full'] ?? '',
							intval($book['chapters'] ?? 0)
						);
						$result = $wpdb->query($sql);
						if ($result === false) {
							$success = false;
						}
					}
				}
			}
		} else {
			$success = false;
		}

		// Load genres data from CSV
		$genres_table = $wpdb->prefix . 'bible_here_genres';
		$genres_csv = $data_dir . 'genres.csv';
		if (file_exists($genres_csv)) {
			$genres_data = self::parse_csv($genres_csv);
			if (!empty($genres_data)) {
				// Check if genres data already exists
				$existing_genres = $wpdb->get_var("SELECT COUNT(*) FROM $genres_table");
				if ($existing_genres == 0 || $force_reload) {
					foreach ($genres_data as $genre) {
						// Use INSERT ... ON DUPLICATE KEY UPDATE to preserve primary IDs
						$sql = $wpdb->prepare(
							"INSERT INTO $genres_table (language, type, genre_number, name) 
							VALUES (%s, %s, %d, %s) 
							ON DUPLICATE KEY UPDATE 
							type = VALUES(type), 
							name = VALUES(name)",
							$genre['language'] ?? '',
							$genre['type'] ?? '',
							intval($genre['genre_number'] ?? 0),
							$genre['name'] ?? ''
						);
						$result = $wpdb->query($sql);
						if ($result === false) {
							$success = false;
						}
					}
				}
			}
		} else {
			$success = false;
		}

		// Load versions data from CSV
		$versions_table = $wpdb->prefix . 'bible_here_versions';
		$versions_csv = $data_dir . 'versions.csv';
		if (file_exists($versions_csv)) {
			$versions_data = self::parse_csv($versions_csv);
			if (!empty($versions_data)) {
				// Check if versions data already exists
				$existing_versions = $wpdb->get_var("SELECT COUNT(*) FROM $versions_table");
				if ($existing_versions == 0 || $force_reload) {
					foreach ($versions_data as $version) {
						// Use INSERT ... ON DUPLICATE KEY UPDATE to preserve primary IDs and rank
						$rank = !empty($version['rank']) ? intval($version['rank']) : null;
						
						$sql = $wpdb->prepare(
							"INSERT INTO $versions_table (table_name, language, abbreviation, name, info_text, info_url, publisher, copyright, download_url, rank) 
							VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %d) 
							ON DUPLICATE KEY UPDATE 
							table_name = VALUES(table_name), 
							name = VALUES(name), 
							info_text = VALUES(info_text), 
							info_url = VALUES(info_url), 
							publisher = VALUES(publisher), 
							copyright = VALUES(copyright), 
							download_url = VALUES(download_url), 
							rank = COALESCE(rank, VALUES(rank))",
							$version['table_name'] ?? '',
							$version['language'] ?? '',
							$version['abbreviation'] ?? '',
							$version['name'] ?? '',
							$version['info_text'] ?? '',
							$version['info_url'] ?? '',
							$version['publisher'] ?? '',
							$version['copyright'] ?? '',
							$version['download_url'] ?? '',
							$rank
						);
						$result = $wpdb->query($sql);
						if ($result === false) {
							$success = false;
						}
					}
				}
			}
		} else {
			$success = false;
		}

		return $success;
	}

	/**
	 * Parse CSV file and return associative array.
	 *
	 * @since    1.0.0
	 * @param    string    $file_path    Path to CSV file
	 * @return   array                   Parsed CSV data
	 */
	private static function parse_csv($file_path) {
		$data = [];
		if (($handle = fopen($file_path, 'r')) !== FALSE) {
			$header = fgetcsv($handle, 1000, ',');
			if ($header !== FALSE && !empty($header)) {
				while (($row = fgetcsv($handle, 1000, ',')) !== FALSE) {
					if (count($header) === count($row) && !empty($row)) {
						$combined = array_combine($header, $row);
						if ($combined !== FALSE) {
							$data[] = $combined;
						}
					}
				}
			}
			fclose($handle);
		}
		return $data;
	}

}
