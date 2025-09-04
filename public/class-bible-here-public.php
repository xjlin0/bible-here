<?php

/**
 * The public-facing functionality of the plugin.
 *
 * @link       https://github.com/xjlin0
 * @since      1.0.0
 *
 * @package    Bible_Here
 * @subpackage Bible_Here/public
 */

/**
 * The public-facing functionality of the plugin.
 *
 * Defines the plugin name, version, and two examples hooks for how to
 * enqueue the public-facing stylesheet and JavaScript.
 *
 * @package    Bible_Here
 * @subpackage Bible_Here/public
 * @author     Jack Lin <xjlin0@gmail.com>
 */
class Bible_Here_Public {

	/**
	 * The ID of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string    $plugin_name    The ID of this plugin.
	 */
	private $plugin_name;

	/**
	 * The version of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string    $version    The current version of this plugin.
	 */
	private $version;

	/**
	 * Initialize the class and set its properties.
	 *
	 * @since    1.0.0
	 * @param      string    $plugin_name       The name of the plugin.
	 * @param      string    $version    The version of this plugin.
	 */
	public function __construct( $plugin_name, $version ) {

		$this->plugin_name = $plugin_name;
		$this->version = $version;

	}

	/**
	 * Register the shortcodes for the public-facing side of the site.
	 *
	 * @since    1.0.0
	 */
	public function register_shortcodes() {
		add_shortcode( 'bible-here-reader', array( $this, 'bible_here_reader_shortcode' ) );
	}

	/**
	 * Handle the bible-here-reader shortcode.
	 *
	 * @since    1.0.0
	 * @param    array    $atts    Shortcode attributes.
	 * @return   string            The shortcode output.
	 */
	public function bible_here_reader_shortcode( $atts ) {
		// Parse shortcode attributes with new defaults
		$atts = shortcode_atts( array(
			'version' => 'bible_here_en_kjv',
			'book' => '1',
			'chapter' => '1',
			'language' => 'en'
		), $atts, 'bible-here-reader' );

		// Generate unique ID for this reader instance
		static $reader_count = 0;
		$reader_count++;
		$reader_id = 'bible-here-reader-' . $reader_count;

		// Enqueue scripts and styles for this shortcode
		$this->enqueue_reader_assets();

		// Start output buffering
		ob_start();
		
		// Include the reader template
		include plugin_dir_path( __FILE__ ) . 'partials/bible-here-reader-display.php';
		
		return ob_get_clean();
	}

	/**
	 * Enqueue assets specifically for the bible reader.
	 *
	 * @since    1.0.0
	 */
	private function enqueue_reader_assets() {
		// Enqueue reader-specific CSS
		wp_enqueue_style( 
			$this->plugin_name . '-reader', 
			plugin_dir_url( __FILE__ ) . 'css/bible-here-reader.css', 
			array(), 
			$this->version, 
			'all' 
		);

		// Enqueue reader-specific JavaScript (no jQuery dependency)
		wp_enqueue_script( 
			$this->plugin_name . '-reader', 
			plugin_dir_url( __FILE__ ) . 'js/bible-here-reader.js', 
			array(), 
			$this->version, 
			true 
		);

		// Localize script with AJAX URL and nonce
		wp_localize_script( 
			$this->plugin_name . '-reader', 
			'bibleHereAjax', 
			array(
				'ajaxurl' => admin_url( 'admin-ajax.php' ),
				'nonce' => wp_create_nonce( 'bible_here_nonce' )
			)
		);
	}

	/**
	 * Handle AJAX request for getting Bible versions.
	 *
	 * @since    1.0.0
	 */
	public function handle_ajax_get_versions() {
		global $wpdb;
		// Verify nonce
		if ( ! isset( $_SERVER['HTTP_X_WP_NONCE'] ) || ! wp_verify_nonce( $_SERVER['HTTP_X_WP_NONCE'], 'bible_here_nonce' ) ) {
			sleep(2);
			wp_send_json_error( array(
				'message' => 'Security check failed: Invalid nonce token for Bible_Here_Public::handle_ajax_get_versions() at line ' . __LINE__,
				'code' => 'invalid_nonce'
			), 401 );
		}

		// Get parameters from GET request
		$language = sanitize_text_field( $_GET['language'] ?? '' );
		$types = $_GET['types'] ?? array();
		
		// Handle types parameter - can be array or single string
		if ( ! is_array( $types ) ) {
			$types = ! empty( $types ) ? array( sanitize_text_field( $types ) ) : array();
		} else {
			$types = array_map( 'sanitize_text_field', $types );
		}
		
		// Check if user is logged in
		$is_logged_in = is_user_logged_in();
		
		// Get versions from database
		$versions_table = $wpdb->prefix . 'bible_here_versions';
		$languages_table = $wpdb->prefix . 'bible_here_languages';
		// Build WHERE conditions
		$where_conditions = array();
		$query_params = array();
		
		// Add language filter if provided
		if ( ! empty( $language ) ) {
			$where_conditions[] = 'language = %s';
			$query_params[] = $language;
		}
		
		// Add types filter if provided
		if ( ! empty( $types ) ) {
			$type_placeholders = implode( ',', array_fill( 0, count( $types ), '%s' ) );
			$where_conditions[] = "type IN ($type_placeholders)";
			$query_params = array_merge( $query_params, $types );
		}

		// Always filter out records with null rank
		$where_conditions[] = 'rank IS NOT NULL';

		// Handle for_login restriction
		if ( ! $is_logged_in ) {
			// Only show versions that don't require login
			$where_conditions[] = '(for_login = 0 OR for_login IS NULL)';
		}

		$where_clause = '';
		if ( ! empty( $where_conditions ) ) {
			$where_clause = 'WHERE ' . implode( ' AND ', $where_conditions );
		}

		$sql = "SELECT 
				table_name,
				l.code AS language_code,
				l.name AS language_name,
				l.original AS language_original,
				type,
				v.name AS name,
				publisher,
				info_url,
				rank
			FROM $versions_table v
			  JOIN $languages_table l ON v.language = l.code
			$where_clause
			ORDER BY l.name, rank, name";
		
		if ( ! empty( $query_params ) ) {
			$results = $wpdb->get_results( $wpdb->prepare( $sql, $query_params ), ARRAY_A );
		} else {
			$results = $wpdb->get_results( $sql, ARRAY_A );
		}
		
		// Handle database errors
		if ( $wpdb->last_error ) {
			wp_send_json_error( array( 'message' => 'Database error: ' . $wpdb->last_error ) );
		}
		
		// Transform results to match expected format
		$versions = array();
		if ( $results ) {
			foreach ( $results as $version ) {
				$versions[] = array(
					'table_name' => $version['table_name'],
					'language_code' => $version['language_code'],
					'language_name' => $version['language_name'],
					'language_original' => $version['language_original'],
					'type' => $version['type'],
					'name' => $version['name'],
					'publisher' => $version['publisher'] ?: null,
					'info_url' => $version['info_url'] ?: null,
					'rank' => intval( $version['rank'] )
				);
			}
		}
		
		$response_data = array(
			'versions' => $versions
		);
		
		wp_send_json_success( $response_data );
	}

	/**
	 * Handle AJAX request for getting Bible verses.
	 *
	 * @since    1.0.0
	 */
	public function handle_ajax_get_verses() {
		global $wpdb;
		// Verify nonce
		if ( ! isset( $_SERVER['HTTP_X_WP_NONCE'] ) || ! wp_verify_nonce( $_SERVER['HTTP_X_WP_NONCE'], 'bible_here_nonce' ) ) {
			sleep(2);
			wp_send_json_error( array(
				'message' => 'Security check failed: Invalid nonce token for Bible_Here_Public::handle_ajax_get_verses() at line ' . __LINE__,
				'code' => 'invalid_nonce'
			), 401 );
		}

		// Get parameters from GET request
		$version1_bible_raw = sanitize_text_field( $_GET['version1_bible'] ?? '' );
		$version1_commentary_raw = sanitize_text_field( $_GET['version1_commentary'] ?? '' );
		$version2_bible_raw = sanitize_text_field( $_GET['version2_bible'] ?? '' );
		$version2_commentary_raw = sanitize_text_field( $_GET['version2_commentary'] ?? '' );
		$book_number_start = intval( $_GET['book_number_start'] ?? 1 );
		$book_number_end = intval( $_GET['book_number_end'] ?? $book_number_start );
		$chapter_number_start = intval( $_GET['chapter_number_start'] ?? 1 );
		$chapter_number_end = intval( $_GET['chapter_number_end'] ?? $chapter_number_start );
		$verse_number_start = intval( $_GET['verse_number_start'] ?? 0 );
		$verse_number_end = intval( $_GET['verse_number_end'] ?? 0 );

		// Validate required parameters
		if ( empty( $version1_bible_raw ) ) {
			wp_send_json_error( array( 'message' => 'Missing required parameter: version1_bible' ), 400 );
		}

		// Add wp_prefix to table names
		$version1_bible = $wpdb->prefix . $version1_bible_raw;
		$version1_commentary = ! empty( $version1_commentary_raw ) ? $wpdb->prefix . $version1_commentary_raw : '';
		$version2_bible = ! empty( $version2_bible_raw ) ? $wpdb->prefix . $version2_bible_raw : '';
		$version2_commentary = ! empty( $version2_commentary_raw ) ? $wpdb->prefix . $version2_commentary_raw : '';

		$response_data = array();

		// Process version1
		$version1_data = $this->get_version_verses( $version1_bible, $version1_commentary, $book_number_start, $book_number_end, $chapter_number_start, $chapter_number_end, $verse_number_start, $verse_number_end );
		if ( is_wp_error( $version1_data ) ) {
			wp_send_json_error( array( 'message' => $version1_data->get_error_message() ) );
		}
		$response_data['version1'] = $version1_data;

		// Process version2 if provided
		if ( ! empty( $version2_bible ) ) {
			$version2_data = $this->get_version_verses( $version2_bible, $version2_commentary, $book_number_start, $book_number_end, $chapter_number_start, $chapter_number_end, $verse_number_start, $verse_number_end );
			if ( is_wp_error( $version2_data ) ) {
				wp_send_json_error( array( 'message' => $version2_data->get_error_message() ) );
			}
			$response_data['version2'] = $version2_data;
		} else {
			$response_data['version2'] = null;
		}

		// Get language from version1_bible for navigation
		$versions_table = $wpdb->prefix . 'bible_here_versions';
		$version1_language = $wpdb->get_var( $wpdb->prepare(
			"SELECT language FROM $versions_table WHERE table_name = %s",
			$version1_bible
		) );
		
		// Add navigation
		$response_data['navigation'] = $this->get_chapter_navigation( $book_number_start, $chapter_number_start, $version1_language ?: 'en' );

		wp_send_json_success( $response_data );
	}

	/**
	 * Get verses for a specific version
	 *
	 * @since    1.0.0
	 */
	private function get_version_verses( $bible_table, $commentary_table, $book_number_start, $book_number_end, $chapter_number_start, $chapter_number_end, $verse_number_start, $verse_number_end ) {
		global $wpdb;

		// Check if bible table exists
		$table_exists = $wpdb->get_var( $wpdb->prepare( 
			"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = %s",
			$bible_table
		) );
		
		if ( ! $table_exists ) {
			return new WP_Error( 'table_not_found', 'Bible table not found: ' . $bible_table );
		}

		// Get version info
		$versions_table = $wpdb->prefix . 'bible_here_versions';

		// Remove wp_ prefix from $bible_table to query versions table
		$table_name_for_query = str_replace($wpdb->prefix, '', $bible_table);		
		$version_info = $wpdb->get_row( $wpdb->prepare(
			"SELECT name, language FROM $versions_table WHERE table_name = %s",
			$table_name_for_query
		), ARRAY_A );
		
		if ( $version_info === null ) {
			error_log("WARNING: No version found for table_name: " . $table_name_for_query);
		}
		// Get book info
		$books_table = $wpdb->prefix . 'bible_here_books';
		$book_info = $wpdb->get_row( $wpdb->prepare(
			"SELECT title_full FROM $books_table WHERE language = %s AND book_number = %d",
			$version_info['language'] ?? 'en',
			$book_number_start
		), ARRAY_A );

		// Build WHERE conditions
		$where_conditions = array();
		$query_params = array();

		// Book range
		if ( $book_number_start === $book_number_end ) {
			$where_conditions[] = 'book_number = %d';
			$query_params[] = $book_number_start;
		} else {
			$where_conditions[] = 'book_number BETWEEN %d AND %d';
			$query_params[] = $book_number_start;
			$query_params[] = $book_number_end;
		}

		// Chapter range
		if ( $chapter_number_start === $chapter_number_end ) {
			$where_conditions[] = 'chapter_number = %d';
			$query_params[] = $chapter_number_start;
		} else {
			$where_conditions[] = 'chapter_number BETWEEN %d AND %d';
			$query_params[] = $chapter_number_start;
			$query_params[] = $chapter_number_end;
		}

		// Verse range (optional)
		if ( $verse_number_start > 0 && $verse_number_end > 0 ) {
			if ( $verse_number_start === $verse_number_end ) {
				$where_conditions[] = 'verse_number = %d';
				$query_params[] = $verse_number_start;
			} else {
				$where_conditions[] = 'verse_number BETWEEN %d AND %d';
				$query_params[] = $verse_number_start;
				$query_params[] = $verse_number_end;
			}
		}

		$where_clause = implode( ' AND ', $where_conditions );

		// Build main query
		$sql = "SELECT 
				CAST(verse_number AS UNSIGNED) as verse,
				verse_text as text,
				verse_id
			FROM $bible_table
			WHERE $where_clause
			ORDER BY book_number, chapter_number, verse_number";

		$prepared_sql = $wpdb->prepare( $sql, $query_params );
		$verses = $wpdb->get_results( $prepared_sql, ARRAY_A );

		// Handle database errors
		if ( $wpdb->last_error ) {
			return new WP_Error( 'database_error', 'Database error: ' . $wpdb->last_error );
		}

		// Add commentary if provided
		if ( ! empty( $commentary_table ) && $verses ) {
			$commentary_exists = $wpdb->get_var( $wpdb->prepare( 
				"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = %s",
				$commentary_table
			) );
			
			if ( $commentary_exists ) {
				foreach ( $verses as &$verse ) {
					$commentary = $wpdb->get_var( $wpdb->prepare(
						"SELECT verse_text FROM $commentary_table WHERE verse_id = %s",
						$verse['verse_id']
					) );
					$verse['commentary'] = $commentary ?: null;
				}
			}
		}

		return array(
			'table_name' => $table_name_for_query,
			'book_number' => $book_number_start,
			'book_name' => $book_info['title_full'] ?? 'Unknown',
			'chapter' => $chapter_number_start,
			'version_name' => $version_info['name'] ?? 'Unknown Version',
			'verses' => $verses ?: array()
		);
	}

	/**
	 * Get chapter navigation
	 *
	 * @since    1.0.0
	 */
	private function get_chapter_navigation( $book_number, $chapter_number, $language = 'en' ) {
		global $wpdb;

		$books_table = $wpdb->prefix . 'bible_here_books';
		
		// Get current book info
		$current_book = $wpdb->get_row( $wpdb->prepare(
			"SELECT book_number, chapters FROM $books_table WHERE book_number = %d AND language = %s LIMIT 1",
			$book_number,
			$language
		), ARRAY_A );

		if ( ! $current_book ) {
			return array(
				'prev_chapter' => null,
				'next_chapter' => null
			);
		}

		$navigation = array(
			'prev_chapter' => null,
			'next_chapter' => null
		);

		// Previous chapter
		if ( $chapter_number > 1 ) {
			$navigation['prev_chapter'] = array(
				'book_number' => $book_number,
				'chapter' => $chapter_number - 1
			);
		} else {
			// Previous book's last chapter
			$prev_book = $wpdb->get_row( $wpdb->prepare(
				"SELECT book_number, chapters FROM $books_table WHERE book_number = %d AND language = %s LIMIT 1",
				$book_number - 1,
				$language
			), ARRAY_A );
			
			if ( $prev_book ) {
				$navigation['prev_chapter'] = array(
					'book_number' => $prev_book['book_number'],
					'chapter' => intval( $prev_book['chapters'] )
				);
			}
		}

		// Next chapter
		if ( $chapter_number < intval( $current_book['chapters'] ) ) {
			$navigation['next_chapter'] = array(
				'book_number' => $book_number,
				'chapter' => $chapter_number + 1
			);
		} else {
			// Next book's first chapter
			$next_book = $wpdb->get_row( $wpdb->prepare(
				"SELECT book_number FROM $books_table WHERE book_number = %d AND language = %s LIMIT 1",
				$book_number + 1,
				$language
			), ARRAY_A );
			
			if ( $next_book ) {
				$navigation['next_chapter'] = array(
					'book_number' => $next_book['book_number'],
					'chapter' => 1
				);
			}
		}

		return $navigation;
	}

	/**
	 * Handle AJAX request for getting Bible books.
	 *
	 * @since    1.0.0
	 */
	public function handle_ajax_get_books() {
		global $wpdb;
		
		// Verify nonce
		if ( ! isset( $_SERVER['HTTP_X_WP_NONCE'] ) || ! wp_verify_nonce( $_SERVER['HTTP_X_WP_NONCE'], 'bible_here_nonce' ) ) {
			sleep(2);
			wp_send_json_error( array(
				'message' => 'Security check failed: Invalid nonce token for Bible_Here_Public::handle_ajax_get_books() at line ' . __LINE__,
				'code' => 'invalid_nonce'
			), 401 );
		}

		// Get parameters from GET request
		$language = sanitize_text_field( $_GET['language'] ?? 'en' );  // default to English
		$genre_type = sanitize_text_field( $_GET['genre_type'] ?? '' );
		
		// Get books from database
		$books_table = $wpdb->prefix . 'bible_here_books';
		$genres_table = $wpdb->prefix . 'bible_here_genres';
		// Build WHERE conditions
		$where_conditions = array( 'b.language = %s' );
		$query_params = array( $language );
		
		// Add genre_type filter if provided
		if ( ! empty( $genre_type ) ) {
			$where_conditions[] = 'b.genre_type = %s';
			$query_params[] = $genre_type;
		}
		
		$where_clause = implode( ' AND ', $where_conditions );
		
		$sql = "SELECT 
				book_number,
				title_full,
				title_short,
				g.name AS genre_name,
				g.type AS genre_type,
				chapters
			FROM $books_table b
			  JOIN $genres_table g
			    ON g.language=b.language
			      AND g.genre_number = b.genre_number
			WHERE $where_clause
			ORDER BY book_number ASC";
		
		$results = $wpdb->get_results( $wpdb->prepare( $sql, $query_params ), ARRAY_A );
		
		// Handle database errors
		if ( $wpdb->last_error ) {
			wp_send_json_error( array( 'message' => 'Database error: ' . $wpdb->last_error ) );
		}
		
		// Transform results to match expected format
		$books = array();
		if ( $results ) {
			foreach ( $results as $book ) {
				$books[] = array(
					'book_number' => intval( $book['book_number'] ),
					'title_full' => $book['title_full'],
					'title_short' => $book['title_short'],
					'genre_name' => $book['genre_name'],
					'genre_type' => $book['genre_type'],
					'chapters' =>  intval( $book['chapters'] )
				);
			}
		}
		
		$response_data = array(
			'books' => $books
		);
		
		wp_send_json_success( $response_data );
	}

	/**
	 * Handle AJAX request for getting Strong's Dictionary entries.
	 *
	 * @since    1.0.0
	 */
	public function handle_ajax_get_strong_dictionary() {
		global $wpdb;
		
		if ( ! isset( $_SERVER['HTTP_X_WP_NONCE'] ) || ! wp_verify_nonce( $_SERVER['HTTP_X_WP_NONCE'], 'bible_here_nonce' ) ) {
			sleep(2);
			wp_send_json_error( array(
				'message' => 'Security check failed: Invalid nonce token for Bible_Here_Public::handle_ajax_get_strong_dictionary() at line ' . __LINE__,
				'code' => 'invalid_nonce'
			), 401 );
		}

		// Get parameters from GET request
		$strong_numbers = isset( $_GET['strong_numbers'] ) ? array_map( 'sanitize_text_field', (array) $_GET['strong_numbers'] ) : array();
		$strong_number = sanitize_text_field( $_GET['strong_number'] ?? '' );
		
		// Handle single strong_number parameter for backward compatibility
		if ( ! empty( $strong_number ) && empty( $strong_numbers ) ) {
			$strong_numbers = array( $strong_number );
		}
		
		// Validate required parameters
		if ( empty( $strong_numbers ) ) {
			wp_send_json_error( array( 'message' => 'Missing required parameter: strong_numbers or strong_number' ) );
		}
		
		// Get Strong's Dictionary data
		$strong_table = $wpdb->prefix . 'bible_here_strong_dictionary';
		
		// Build IN clause for multiple strong numbers
		$placeholders = implode( ',', array_fill( 0, count( $strong_numbers ), '%s' ) );
		
		$sql = "SELECT 
				strong_number,
				original,
				en,
				`zh-TW`,
				`zh-CN`
			FROM $strong_table
			WHERE strong_number IN ($placeholders)
			ORDER BY strong_number";
		
		$results = $wpdb->get_results( $wpdb->prepare( $sql, $strong_numbers ), ARRAY_A );
		
		// Handle database errors
		if ( $wpdb->last_error ) {
			wp_send_json_error( array( 'message' => 'Database error: ' . $wpdb->last_error ) );
		}
		
		// Transform results to match expected format
		$strong_dictionary = array();
		if ( $results ) {
			foreach ( $results as $entry ) {
				$languages = array();
				
				// Add available language translations
				if ( ! empty( $entry['en'] ) ) {
					$languages['en'] = $entry['en'];
				}
				if ( ! empty( $entry['zh-TW'] ) ) {
					$languages['zh-TW'] = $entry['zh-TW'];
				}
				if ( ! empty( $entry['zh-CN'] ) ) {
					$languages['zh-CN'] = $entry['zh-CN'];
				}
				
				$strong_dictionary[] = array(
					'strong_number' => $entry['strong_number'],
					'original' => $entry['original'],
					'languages' => $languages
				);
			}
		}
		
		$response_data = array(
			'strong_dictionary' => $strong_dictionary
		);
		
		wp_send_json_success( $response_data );
	}

	/**
	 * Handle AJAX request for getting cross references.
	 *
	 * @since    1.0.0
	 */
	public function handle_ajax_get_cross_references() {
		global $wpdb;
		
		// Verify nonce
		if ( ! isset( $_SERVER['HTTP_X_WP_NONCE'] ) || ! wp_verify_nonce( $_SERVER['HTTP_X_WP_NONCE'], 'bible_here_nonce' ) ) {
			sleep(2);
			wp_send_json_error( array(
				'message' => 'Security check failed: Invalid nonce token for Bible_Here_Public::handle_ajax_get_cross_references() at line ' . __LINE__,
				'code' => 'invalid_nonce'
			), 401 );
		}

		// Get parameters from GET request
		$verse_ids = isset( $_GET['verse_ids'] ) ? array_map( 'intval', (array) $_GET['verse_ids'] ) : array();
		$verse_id = intval( $_GET['verse_id'] ?? 0 );
		
		// Handle single verse_id parameter for backward compatibility
		if ( ! empty( $verse_id ) && empty( $verse_ids ) ) {
			$verse_ids = array( $verse_id );
		}
		
		// Validate required parameters
		if ( empty( $verse_ids ) ) {
			wp_send_json_error( array( 'message' => 'Missing required parameter: verse_ids or verse_id' ) );
		}
		
		// Get cross references data
		$cross_ref_table = $wpdb->prefix . 'bible_here_cross_references';
		
		// Build IN clause for multiple verse IDs
		$placeholders = implode( ',', array_fill( 0, count( $verse_ids ), '%d' ) );
		
		$sql = "SELECT 
				verse_id,
				rank,
				start,
				finish
			FROM $cross_ref_table
			WHERE verse_id IN ($placeholders)
			ORDER BY rank ASC, start ASC";
		
		$results = $wpdb->get_results( $wpdb->prepare( $sql, $verse_ids ), ARRAY_A );
		
		// Handle database errors
		if ( $wpdb->last_error ) {
			wp_send_json_error( array( 'message' => 'Database error: ' . $wpdb->last_error ) );
		}
		
		// Format the response
		$cross_references = array();
		if ( $results ) {
			foreach ( $results as $result ) {
				$cross_references[] = array(
					'verse_id' => intval( $result['verse_id'] ),
					'rank' => intval( $result['rank'] ),
					'start' => intval( $result['start'] ),
					'finish' => intval( $result['finish'] )
				);
			}
		}
		
		$response_data = array(
			'cross_references' => $cross_references
		);
		
		wp_send_json_success( $response_data );
	}

	/**
	 * Register the stylesheets for the public-facing side of the site.
	 *
	 * @since    1.0.0
	 */
	public function enqueue_styles() {

		/**
		 * This function is provided for demonstration purposes only.
		 *
		 * An instance of this class should be passed to the run() function
		 * defined in Bible_Here_Loader as all of the hooks are defined
		 * in that particular class.
		 *
		 * The Bible_Here_Loader will then create the relationship
		 * between the defined hooks and the functions defined in this
		 * class.
		 */

		wp_enqueue_style( $this->plugin_name, plugin_dir_url( __FILE__ ) . 'css/bible-here-public.css', array(), $this->version, 'all' );

	}

	/**
	 * Register the JavaScript for the public-facing side of the site.
	 *
	 * @since    1.0.0
	 */
	public function enqueue_scripts() {

		/**
		 * This function is provided for demonstration purposes only.
		 *
		 * An instance of this class should be passed to the run() function
		 * defined in Bible_Here_Loader as all of the hooks are defined
		 * in that particular class.
		 *
		 * The Bible_Here_Loader will then create the relationship
		 * between the defined hooks and the functions defined in this
		 * class.
		 */

		wp_enqueue_script( $this->plugin_name, plugin_dir_url( __FILE__ ) . 'js/bible-here-public.js', array( 'jquery' ), $this->version, false );

	}

}
