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
		$start_time = microtime(true);
		self::create_database_tables();
		self::insert_initial_data();
		$total_time = microtime(true) - $start_time;
		error_log('[Bible Here] Plugin activation completed in ' . round($total_time, 3) . ' seconds');
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

		// Genres table
		$table_name = $wpdb->prefix . 'bible_here_genres';
		$sql = "CREATE TABLE IF NOT EXISTS  $table_name (
			id INT AUTO_INCREMENT PRIMARY KEY,
			genre_number TINYINT(1) unsigned NOT NULL,
			type VARCHAR(20) NOT NULL COMMENT 'new/old',
			language VARCHAR(10) NOT NULL,
			name VARCHAR(50) NOT NULL,
			UNIQUE KEY unique_genre_for_language (language, genre_number)
		) $charset_collate;";
		dbDelta( $sql );

		// Books table
		$table_name = $wpdb->prefix . 'bible_here_books';
		$sql = "CREATE TABLE IF NOT EXISTS  $table_name (
			id INT AUTO_INCREMENT PRIMARY KEY,
			genre_number TINYINT(1) unsigned NOT NULL,
			chapters TINYINT(1) unsigned NOT NULL,
			book_number TINYINT(2) unsigned NOT NULL,
			language VARCHAR(10) NOT NULL,
			title_short VARCHAR(20) NOT NULL,
			title_full VARCHAR(100) NOT NULL,
			UNIQUE KEY unique_book (language, book_number),
			INDEX idx_book_number (book_number)
		) $charset_collate;";
		dbDelta( $sql );

		// Bible versions table
		$table_name = $wpdb->prefix . 'bible_here_versions';
		$sql = "CREATE TABLE IF NOT EXISTS  $table_name (
			id INT AUTO_INCREMENT PRIMARY KEY,
			trim BOOLEAN DEFAULT FALSE COMMENT 'if trimming space from verses during importing required',
			for_login BOOLEAN DEFAULT FALSE COMMENT 'only for logged in users',
			seed BOOLEAN DEFAULT FALSE COMMENT 'seed data cannot be deleted',
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			rank TINYINT(1) unsigned NULL,
			language VARCHAR(10) NOT NULL,
			abbreviation VARCHAR(10) NOT NULL COMMENT 'ascii English only for database table names',
			name_short VARCHAR(12),
			type VARCHAR(20) NOT NULL DEFAULT 'Bible' COMMENT 'Bible/Bible+Strong/Commentary',
			table_name VARCHAR(50) NOT NULL COMMENT 'ascii English only for database table names',
			format VARCHAR(20) NOT NULL DEFAULT 'Zefania' COMMENT 'for choosing import processor',
			name VARCHAR(100) NOT NULL,
			publisher VARCHAR(100),
			copyright VARCHAR(100),
			info_url VARCHAR(255),
			download_url VARCHAR(512),
			UNIQUE KEY uniq_table_name (table_name),
			UNIQUE KEY uniq_language_abbreviation (language, abbreviation)
		) $charset_collate COMMENT='For Bible or Commentary versions';";
		dbDelta( $sql );

		// Cross references table
		$table_name = $wpdb->prefix . 'bible_here_cross_references';
		$sql = "CREATE TABLE IF NOT EXISTS  $table_name (
			verse_id INT(8) unsigned zerofill NOT NULL,
			rank TINYINT(1) unsigned NOT NULL DEFAULT 0,
			start INT(8) unsigned zerofill NOT NULL,
			finish INT(8) unsigned zerofill,
			KEY reference_verse_id (verse_id)
		) $charset_collate COMMENT='from https://github.com/scrollmapper/bible_databases';";
		dbDelta( $sql );

		// Abbreviations table
		$table_name = $wpdb->prefix . 'bible_here_abbreviations';
		$sql = "CREATE TABLE IF NOT EXISTS  $table_name (
			id INT AUTO_INCREMENT PRIMARY KEY,
			is_primary BOOLEAN DEFAULT FALSE,
			book_number TINYINT(1) unsigned NOT NULL,
			language VARCHAR(10) NOT NULL,
			abbreviation VARCHAR(20) NOT NULL,
			UNIQUE KEY unique_abbr (language, abbreviation)
		) $charset_collate COMMENT='store all possible abbreviations for scripture';";
		dbDelta( $sql );

		// Strong Dictionary table
		$table_name = $wpdb->prefix . 'bible_here_strong_dictionary';
		$sql = "CREATE TABLE IF NOT EXISTS  $table_name (
			`strong_number` VARCHAR(6) NOT NULL,
			`en` TEXT COMMENT 'Müller from https://christthetruth.net/2013/07/15/strongs-goes-excel',
			`zh-TW` TEXT COMMENT 'FHL from https://www.theword.net/index.php?downloads.modules&group_id=5',
			`zh-CN` TEXT COMMENT 'FHL from https://www.theword.net/index.php?downloads.modules&group_id=5',
			`original` VARCHAR(150) DEFAULT NULL,
			PRIMARY KEY (`strong_number`)
		) $charset_collate COMMENT='dictionaries of Strong number';";
		dbDelta( $sql );

		// Languages table
		$table_name = $wpdb->prefix . 'bible_here_languages';
		$sql = "CREATE TABLE IF NOT EXISTS  $table_name (
			`code` varchar(7) NOT NULL,
			`name` varchar(70) DEFAULT NULL COMMENT 'in English',
			`original` varchar(70) DEFAULT NULL COMMENT 'in native language',
			PRIMARY KEY (`code`)
		) $charset_collate COMMENT='Language codes and names for Bible versions';";
		dbDelta( $sql );
	}

	/**
	 * Create version-specific content table with unified schema
	 *
	 * @since    1.0.0
	 * @param    string    $table_name    Full table name (with prefix)
	 * @return   bool      True on success, false on failure
	 */
	public static function create_version_content_table($table_name, $table_comment) {
		global $wpdb;

		// Drop existing table if exists
		$wpdb->query("DROP TABLE IF EXISTS `{$table_name}`");
		$charset_collate = $wpdb->get_charset_collate();
		$index_name = 'uniq_' . str_replace($wpdb->prefix, '', $table_name);
		$comment = $table_comment ? " COMMENT='{$table_comment}'" : '';

		$sql = "CREATE TABLE IF NOT EXISTS {$table_name} (
			verse_id int(8) unsigned zerofill NOT NULL AUTO_INCREMENT COMMENT 'verse ID: 2-digit book_number + 3-digit chapter_number + 3-digit verse_number',
			book_number tinyint(1) unsigned NOT NULL,
			chapter_number tinyint(1) unsigned NOT NULL,
			verse_number tinyint(1) unsigned NOT NULL,
			verse_text_strong VARCHAR(1000) COMMENT 'optional, for verse with strong numbers',
			verse_text VARCHAR(500) COMMENT 'some verse are empty due to translation syntax',
			PRIMARY KEY (verse_id),
			UNIQUE KEY {$index_name} (book_number, chapter_number, verse_number)
		) {$charset_collate} {$comment};";

		require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
		dbDelta($sql);

		if ($wpdb->last_error) {
			return false;
		}

		// Verify table creation
		if ($wpdb->get_var("SHOW TABLES LIKE '{$table_name}'") != $table_name) {
			return false;
		}

		return true;
	}

	/**
	 * Download a file from remote URL and save it locally.
	 *
	 * @since    1.0.0
	 * @param    string    $url         Remote URL to download from
	 * @param    string    $local_path  Local path to save the file
	 * @return   bool      True on success, false on failure
	 */
	private static function download_remote_file($url, $local_path) {
		// Create directory if it doesn't exist
		$dir = dirname($local_path);
		if (!file_exists($dir)) {
			if (!wp_mkdir_p($dir)) {
				error_log('[Bible Here] ERROR: Failed to create directory: ' . $dir);
				return false;
			}
		}

		// Check if file already exists
		if (file_exists($local_path)) {
			error_log('[Bible Here] INFO: File already exists, skipping download: ' . $local_path);
			return true;
		}

		// Download file using WordPress HTTP API
		$response = wp_remote_get($url, array(
			'timeout' => 300, // 5 minutes timeout for large files
			'stream' => true,
			'filename' => $local_path
		));

		if (is_wp_error($response)) {
			error_log('[Bible Here] ERROR: Failed to download file from ' . $url . ': ' . $response->get_error_message());
			return false;
		}

		$response_code = wp_remote_retrieve_response_code($response);
		if ($response_code !== 200) {
			error_log('[Bible Here] ERROR: HTTP error ' . $response_code . ' when downloading from ' . $url);
			return false;
		}

		if (!file_exists($local_path)) {
			error_log('[Bible Here] ERROR: Downloaded file not found at expected location: ' . $local_path);
			return false;
		}

		error_log('[Bible Here] INFO: Successfully downloaded file from ' . $url . ' to ' . $local_path);
		return true;
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
        $start_time = microtime(true);
		error_log('[Bible Here] CSV data loading started at ' . date('Y-m-d H:i:s') . ($force_reload ? ' (force reload)' : ''));

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
					// Use batch insert for better performance
					$batch_size = 1000;
					$total_entries = count($books_data);
					$inserted_count = 0;
					$batch_count = 0;
					
					// Process data in batches
					for ($i = 0; $i < $total_entries; $i += $batch_size) {
						$batch_count++;
						$batch_data = array_slice($books_data, $i, $batch_size);
						
						$values_array = [];
						$sql_values = [];
						
						foreach ($batch_data as $book) {
							$values_array[] = '(%s, %d, %d, %s, %s, %d)';
							$sql_values[] = $book['language'] ?? '';
							$sql_values[] = intval($book['genre_number'] ?? 0);
							$sql_values[] = intval($book['book_number'] ?? 0);
							$sql_values[] = $book['title_short'] ?? '';
							$sql_values[] = $book['title_full'] ?? '';
							$sql_values[] = intval($book['chapters'] ?? 0);
						}
						
						if (!empty($values_array)) {
							$values_string = implode(', ', $values_array);
							
							$sql = "INSERT INTO $books_table (language, genre_number, book_number, title_short, title_full, chapters) 
									VALUES $values_string 
									ON DUPLICATE KEY UPDATE 
									genre_number = VALUES(genre_number), 
									title_short = VALUES(title_short), 
									title_full = VALUES(title_full), 
									chapters = VALUES(chapters)";
							
							$sql = $wpdb->prepare($sql, $sql_values);
							$result = $wpdb->query($sql);
							if ($result === false) {
								error_log('[Bible Here] ERROR: Failed to insert books batch ' . $batch_count . ': ' . $wpdb->last_error);
								$success = false;
								break;
							} else {
								$batch_inserted = count($batch_data);
								$inserted_count += $batch_inserted;
							}
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
					// Use batch insert for better performance
					$batch_size = 1000;
					$total_entries = count($genres_data);
					$inserted_count = 0;
					$batch_count = 0;
					
					// Process data in batches
					for ($i = 0; $i < $total_entries; $i += $batch_size) {
						$batch_count++;
						$batch_data = array_slice($genres_data, $i, $batch_size);
						
						$values_array = [];
						$sql_values = [];
						
						foreach ($batch_data as $genre) {
							$values_array[] = '(%s, %s, %d, %s)';
							$sql_values[] = $genre['language'] ?? '';
							$sql_values[] = $genre['type'] ?? '';
							$sql_values[] = intval($genre['genre_number'] ?? 0);
							$sql_values[] = $genre['name'] ?? '';
						}
						
						if (!empty($values_array)) {
							$values_string = implode(', ', $values_array);
							
							$sql = "INSERT INTO $genres_table (language, type, genre_number, name) 
									VALUES $values_string 
									ON DUPLICATE KEY UPDATE 
									type = VALUES(type), 
									name = VALUES(name)";
							
							$sql = $wpdb->prepare($sql, $sql_values);
							$result = $wpdb->query($sql);
							if ($result === false) {
								error_log('[Bible Here] ERROR: Failed to insert genres batch ' . $batch_count . ': ' . $wpdb->last_error);
								$success = false;
								break;
							} else {
								$batch_inserted = count($batch_data);
								$inserted_count += $batch_inserted;
							}
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
				
				// Save existing rank values before force reload to preserve installed Bible content status
				$saved_ranks = array();
				if ($force_reload && $existing_versions > 0) {
					$existing_rank_data = $wpdb->get_results(
						"SELECT table_name, rank FROM $versions_table WHERE rank IS NOT NULL",
						ARRAY_A
					);
					if (!empty($existing_rank_data)) {
						foreach ($existing_rank_data as $row) {
							$saved_ranks[$row['table_name']] = $row['rank'];
						}
					}
				}
				
				if ($existing_versions == 0 || $force_reload) {
					foreach ($versions_data as $version) {
						// Use INSERT ... ON DUPLICATE KEY UPDATE to preserve primary IDs and rank
						$rank = !empty($version['rank']) ? intval($version['rank']) : null;
						$name_short = isset($version['name_short']) && trim($version['name_short']) !== '' ? trim($version['name_short']) : null;
						$info_url = isset($version['info_url']) && trim($version['info_url']) !== '' ? trim($version['info_url']) : null;
						$publisher = isset($version['publisher']) && trim($version['publisher']) !== '' ? trim($version['publisher']) : null;
						// Convert boolean values: support 'true'/'false', 1/0, '1'/'0'
						$trim = isset($version['trim']) ? self::convert_to_boolean($version['trim']) : 0;
						$for_login = isset($version['for_login']) ? self::convert_to_boolean($version['for_login']) : 0;
						$seed = isset($version['seed']) ? self::convert_to_boolean($version['seed']) : 0;
						
						// Build SQL dynamically to handle NULL values properly
						$sql_parts = [];
						$sql_values = [];
						$update_parts = [];
						
						// Required fields (never null)
						$sql_parts[] = '%s'; // table_name
						$sql_values[] = $version['table_name'] ?? '';
						$sql_parts[] = '%s'; // language
						$sql_values[] = $version['language'] ?? '';
						$sql_parts[] = '%s'; // abbreviation
						$sql_values[] = $version['abbreviation'] ?? '';
						$sql_parts[] = '%s'; // name
						$sql_values[] = $version['name'] ?? '';
						$sql_parts[] = '%s'; // type
						$sql_values[] = $version['type'] ?? 'Bible';
						
						// Optional fields (can be null)
						if ($name_short === null) {
							$sql_parts[] = 'NULL';
						} else {
							$sql_parts[] = '%s';
							$sql_values[] = $name_short;
						}
						
						if ($info_url === null) {
							$sql_parts[] = 'NULL';
						} else {
							$sql_parts[] = '%s';
							$sql_values[] = $info_url;
						}
						
						if ($publisher === null) {
							$sql_parts[] = 'NULL';
						} else {
							$sql_parts[] = '%s';
							$sql_values[] = $publisher;
						}
						
						// Copyright field (can be null)
						$copyright = isset($version['copyright']) && trim($version['copyright']) !== '' ? trim($version['copyright']) : null;
						if ($copyright === null) {
							$sql_parts[] = 'NULL';
						} else {
							$sql_parts[] = '%s';
							$sql_values[] = $copyright;
						}
						
						// Required fields (never null)
						$sql_parts[] = '%s'; // download_url
						$sql_values[] = $version['download_url'] ?? '';
						
						// Rank field
						if ($rank === null) {
							$sql_parts[] = 'NULL';
						} else {
							$sql_parts[] = '%d';
							$sql_values[] = $rank;
						}
						
						// Trim field
						$sql_parts[] = '%d';
						$sql_values[] = $trim;
						
						// For login field
						$sql_parts[] = '%d';
						$sql_values[] = $for_login;
						
						// Seed field
						$sql_parts[] = '%d';
						$sql_values[] = $seed;

						// Format field
						$sql_parts[] = '%s';
						$sql_values[] = $version['format'] ?? 'Zefania';
						
						$sql_placeholders = implode(', ', $sql_parts);
						
						$sql = "INSERT INTO $versions_table (table_name, language, abbreviation, name, type, name_short, info_url, publisher, copyright, download_url, rank, trim, for_login, seed, format) 
								VALUES ($sql_placeholders) 
								ON DUPLICATE KEY UPDATE 
									table_name = VALUES(table_name), 
									name = VALUES(name), 
									type = VALUES(type), 
									name_short = VALUES(name_short), 
									info_url = VALUES(info_url), 
									publisher = VALUES(publisher), 
									copyright = VALUES(copyright), 
									download_url = VALUES(download_url), 
									rank = COALESCE(rank, VALUES(rank)), 
									trim = VALUES(trim), 
									for_login = VALUES(for_login), 
									seed = VALUES(seed),
									format = VALUES(format)";

						if (!empty($sql_values)) {
							$sql = $wpdb->prepare($sql, $sql_values);
						}
						$result = $wpdb->query($sql);
						if ($result === false) {
							$success = false;
						}
					}
				}

				// Restore saved rank values after force reload to preserve installed Bible content status
				if ($force_reload && !empty($saved_ranks)) {
					foreach ($saved_ranks as $table_name => $rank_value) {
						$restore_sql = $wpdb->prepare(
							"UPDATE $versions_table SET rank = %d WHERE table_name = %s",
							$rank_value,
							$table_name
						);
						$wpdb->query($restore_sql);
					}
				}
			}
		} else {
			$success = false;
		}

		// Load abbreviations data from CSV
		$abbreviations_table = $wpdb->prefix . 'bible_here_abbreviations';
		$abbreviations_csv = $data_dir . 'abbreviations.csv';
		if (file_exists($abbreviations_csv)) {
			$abbreviations_data = self::parse_csv($abbreviations_csv);
			if (!empty($abbreviations_data)) {
				// Check if abbreviations data already exists
				$existing_abbreviations = $wpdb->get_var("SELECT COUNT(*) FROM $abbreviations_table");
				if ($existing_abbreviations == 0 || $force_reload) {
					// Use batch insert for better performance
					$batch_size = 1000;
					$total_entries = count($abbreviations_data);
					$inserted_count = 0;
					$batch_count = 0;
					
					// Process data in batches
					for ($i = 0; $i < $total_entries; $i += $batch_size) {
						$batch_count++;
						$batch_data = array_slice($abbreviations_data, $i, $batch_size);
						
						$values_array = [];
						$sql_values = [];
						
						foreach ($batch_data as $abbreviation) {
							$values_array[] = '(%s, %d, %s, %d)';
							$sql_values[] = $abbreviation['language'] ?? '';
							$sql_values[] = intval($abbreviation['book_number'] ?? 0);
							$sql_values[] = $abbreviation['abbreviation'] ?? '';
							$sql_values[] = self::convert_to_boolean($abbreviation['is_primary'] ?? 0);
						}
						
						if (!empty($values_array)) {
							$values_string = implode(', ', $values_array);
							
							$sql = "INSERT INTO $abbreviations_table (language, book_number, abbreviation, is_primary)
									VALUES $values_string 
									ON DUPLICATE KEY UPDATE 
									abbreviation = VALUES(abbreviation)";
							
							$sql = $wpdb->prepare($sql, $sql_values);
							$result = $wpdb->query($sql);
							if ($result === false) {
								error_log('[Bible Here] ERROR: Failed to insert abbreviations batch ' . $batch_count . ': ' . $wpdb->last_error);
								$success = false;
								break;
							} else {
								$batch_inserted = count($batch_data);
								$inserted_count += $batch_inserted;
							}
						}
					}
				}
			}
		} else {
			$success = false;
		}

		// Load Strong Dictionary data from remote ZIP file
		$strong_dictionary_table = $wpdb->prefix . 'bible_here_strong_dictionary';
		$strong_dictionary_zip = $data_dir . 'wp_bible_here_strong_dictionary.zip';
		$strong_dictionary_csv = $data_dir . 'wp_bible_here_strong_dictionary.csv';
		$remote_url = 'https://github.com/xjlin0/bible-here.data/raw/refs/heads/main/dictionary/wp_bible_here_strong_dictionary.zip';
		
		$csv_file_to_process = null;
		$temp_dir = null;
		
		// Download Strong Dictionary ZIP file from remote URL
		if (self::download_remote_file($remote_url, $strong_dictionary_zip)) {
			// Create temporary directory for extraction
			$temp_dir = $data_dir . 'temp_strong_' . time() . '/';
			if (!wp_mkdir_p($temp_dir)) {
				$success = false;
			} else {
				// Extract ZIP file
				$zip = new ZipArchive();
				$zip_result = $zip->open($strong_dictionary_zip);
				if ($zip_result === TRUE) {
					$zip->extractTo($temp_dir);
					$zip->close();
					
					// Look for CSV file in extracted contents
					$extracted_files = glob($temp_dir . '*.csv');
					if (!empty($extracted_files)) {
						$csv_file_to_process = $extracted_files[0]; // Use first CSV file found
					} else {
						error_log('[Bible Here] ERROR: No CSV files found in extracted ZIP');
					}
				} else {
					error_log('[Bible Here] ERROR: Failed to open ZIP file. Error code: ' . $zip_result);
					$success = false;
				}
			}
		} else {
			error_log('[Bible Here] ERROR: Failed to download Strong Dictionary from remote source');
			$success = false;
		}
		
		// Process CSV file if found
		if ($csv_file_to_process && file_exists($csv_file_to_process)) {
			$strong_dictionary_data = self::parse_csv($csv_file_to_process);
			if (!empty($strong_dictionary_data)) {
				// Check if Strong Dictionary data already exists
				$existing_strong_dictionary = $wpdb->get_var("SELECT COUNT(*) FROM $strong_dictionary_table");
				if ($existing_strong_dictionary == 0 || $force_reload) {
					if ($force_reload) {
						$wpdb->query("TRUNCATE TABLE $strong_dictionary_table");
					}
					
					// Use batch insert for better performance
				$batch_size = 1000;
				$total_entries = count($strong_dictionary_data);
				$inserted_count = 0;
				$batch_count = 0;
				
				// Process data in batches
				for ($i = 0; $i < $total_entries; $i += $batch_size) {
					$batch_count++;
					$batch_data = array_slice($strong_dictionary_data, $i, $batch_size);
					
					$values_array = [];
					$sql_values = [];
					
					foreach ($batch_data as $entry) {
						// Skip entries without strong_number (primary key)
						$strong_number = $entry['strong_number'] ?? '';
						if (empty($strong_number) || trim($strong_number) === '') {
							continue;
						}

						// Process each field to handle NULL values properly
						$en_value = isset($entry['en']) && trim($entry['en']) !== '' ? trim($entry['en']) : null;
						$zh_tw_value = isset($entry['zh-TW']) && trim($entry['zh-TW']) !== '' ? trim($entry['zh-TW']) : null;
						$zh_cn_value = isset($entry['zh-CN']) && trim($entry['zh-CN']) !== '' ? trim($entry['zh-CN']) : null;
						$original_value = isset($entry['original']) && trim($entry['original']) !== '' ? trim($entry['original']) : null;

						// Add strong_number first (matches SQL column order)
						$sql_values[] = $strong_number;

						// Build SQL with proper NULL handling
						if ($en_value === null) {
							$en_placeholder = 'NULL';
						} else {
							$en_placeholder = '%s';
							$sql_values[] = $en_value;
						}

						if ($zh_tw_value === null) {
							$zh_tw_placeholder = 'NULL';
						} else {
							$zh_tw_placeholder = '%s';
							$sql_values[] = $zh_tw_value;
						}

						if ($zh_cn_value === null) {
							$zh_cn_placeholder = 'NULL';
						} else {
							$zh_cn_placeholder = '%s';
							$sql_values[] = $zh_cn_value;
						}

						if ($original_value === null) {
							$original_placeholder = 'NULL';
						} else {
							$original_placeholder = '%s';
							$sql_values[] = $original_value;
						}

						$values_array[] = "(%s, $en_placeholder, $zh_tw_placeholder, $zh_cn_placeholder, $original_placeholder)";
					}

					if (!empty($values_array)) {
						$values_string = implode(', ', $values_array);
						
						$sql = "INSERT INTO $strong_dictionary_table (strong_number, en, `zh-TW`, `zh-CN`, original) 
								VALUES $values_string 
								ON DUPLICATE KEY UPDATE 
								  en = VALUES(en), 
								  `zh-TW` = VALUES(`zh-TW`), 
								  `zh-CN` = VALUES(`zh-CN`), 
								  original = VALUES(original)";
						
						// Only use prepare if we have values to prepare
						if (!empty($sql_values)) {
							$sql = $wpdb->prepare($sql, $sql_values);
						}
						$result = $wpdb->query($sql);
						if ($result === false) {
							error_log('[Bible Here] ERROR: Failed to insert Strong Dictionary batch ' . $batch_count . ': ' . $wpdb->last_error);
							$success = false;
							break;
						} else {
							$batch_inserted = count($batch_data);
							$inserted_count += $batch_inserted;
						}
					}
				}
				}
			}
		} else {
			// Strong Dictionary download failed, but this is not a critical error
			// since it's optional data
			error_log('[Bible Here] INFO: Strong Dictionary not loaded - download failed or file not available');
		}

		// Clean up temporary directory and downloaded ZIP file if created
		if ($temp_dir && is_dir($temp_dir)) {
			self::recursive_rmdir($temp_dir);
		}
		// Clean up downloaded ZIP file
		if (file_exists($strong_dictionary_zip)) {
			unlink($strong_dictionary_zip);
			error_log('[Bible Here] INFO: Cleaned up downloaded Strong Dictionary ZIP file');
		}

		// Load languages data from CSV
		$languages_table = $wpdb->prefix . 'bible_here_languages';
		$languages_csv = $data_dir . 'languages.csv';
		if (file_exists($languages_csv)) {
			$languages_data = self::parse_csv($languages_csv);
			if (!empty($languages_data)) {
				// Check if languages data already exists
				$existing_languages = $wpdb->get_var("SELECT COUNT(*) FROM $languages_table");
				if ($existing_languages == 0 || $force_reload) {
					// Use batch insert for better performance
					$batch_size = 1000;
					$total_entries = count($languages_data);
					$inserted_count = 0;
					$batch_count = 0;
					
					// Process data in batches
					for ($i = 0; $i < $total_entries; $i += $batch_size) {
						$batch_count++;
						$batch_data = array_slice($languages_data, $i, $batch_size);
						
						$values_array = [];
						$sql_values = [];
						
						foreach ($batch_data as $language) {
							// Skip entries without code (primary key)
							$code = $language['code'] ?? '';
							if (empty($code) || trim($code) === '') {
								continue;
							}

							// Process each field to handle NULL values properly
							$name_value = isset($language['name']) && trim($language['name']) !== '' ? trim($language['name']) : null;
							$original_value = isset($language['original']) && trim($language['original']) !== '' ? trim($language['original']) : null;

							// Add code first (matches SQL column order)
							$sql_values[] = $code;

							// Build SQL with proper NULL handling
							if ($name_value === null) {
								$name_placeholder = 'NULL';
							} else {
								$name_placeholder = '%s';
								$sql_values[] = $name_value;
							}

							if ($original_value === null) {
								$original_placeholder = 'NULL';
							} else {
								$original_placeholder = '%s';
								$sql_values[] = $original_value;
							}

							$values_array[] = "(%s, $name_placeholder, $original_placeholder)";
						}

						if (!empty($values_array)) {
							$values_string = implode(', ', $values_array);
							
							$sql = "INSERT INTO $languages_table (code, name, original) 
									VALUES $values_string 
									ON DUPLICATE KEY UPDATE 
									  name = VALUES(name), 
									  original = VALUES(original)";
							
							// Only use prepare if we have values to prepare
							if (!empty($sql_values)) {
								$sql = $wpdb->prepare($sql, $sql_values);
							}
							$result = $wpdb->query($sql);
							if ($result === false) {
								error_log('[Bible Here] ERROR: Failed to insert languages batch ' . $batch_count . ': ' . $wpdb->last_error);
								$success = false;
								break;
							} else {
								$batch_inserted = count($batch_data);
								$inserted_count += $batch_inserted;
							}
						}
					}
				}
			}
		} else {
			// Languages file not found, but this is not a critical error
			// since it's optional data
		}

		$total_time = microtime(true) - $start_time;
		error_log('[Bible Here] CSV data loading completed in ' . round($total_time, 3) . ' seconds ' . ($force_reload ? ' (force reload)' : '') . ' - Success: ' . ($success ? 'true' : 'false'));

		return $success;
	}

	/**
	 * Recursively remove directory and all its contents
	 *
	 * @param string $dir Directory path to remove
	 * @return bool True on success, false on failure
	 */
	private static function recursive_rmdir($dir) {
		if (!is_dir($dir)) {
			return false;
		}

		$files = array_diff(scandir($dir), array('.', '..'));
		foreach ($files as $file) {
			$path = $dir . DIRECTORY_SEPARATOR . $file;
			if (is_dir($path)) {
				self::recursive_rmdir($path);
			} else {
				unlink($path);
			}
		}

		return rmdir($dir);
	}

	/**
	 * Convert various boolean representations to integer (1 or 0)
	 *
	 * @since    1.0.0
	 * @param    mixed    $value    Value to convert (supports 'true'/'false', 1/0, '1'/'0')
	 * @return   int                1 for true values, 0 for false values
	 */
	private static function convert_to_boolean($value) {
		// Handle string representations
		if (is_string($value)) {
			$value = trim(strtolower($value));
			return ($value === 'true' || $value === '1') ? 1 : 0;
		}
		
		// Handle numeric values
		if (is_numeric($value)) {
			return (int)$value ? 1 : 0;
		}
		
		// Handle boolean values
		if (is_bool($value)) {
			return $value ? 1 : 0;
		}
		
		// Default to false for any other type
		return 0;
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
