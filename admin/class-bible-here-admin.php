<?php

/**
 * The admin-specific functionality of the plugin.
 *
 * @link       https://github.com/xjlin0
 * @since      1.0.0
 *
 * @package    Bible_Here
 * @subpackage Bible_Here/admin
 */

/**
 * The admin-specific functionality of the plugin.
 *
 * Defines the plugin name, version, and admin functionality including
 * menu creation and page management.
 *
 * @package    Bible_Here
 * @subpackage Bible_Here/admin
 * @author     Jack Lin <xjlin0@gmail.com>
 */
class Bible_Here_Admin {

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
	 * @param      string    $plugin_name       The name of this plugin.
	 * @param      string    $version    The version of this plugin.
	 */
	public function __construct( $plugin_name, $version ) {

		$this->plugin_name = $plugin_name;
		$this->version = $version;

		// Register AJAX handlers for version management
		add_action('wp_ajax_bible_here_save_version', array($this, 'handle_ajax_save_version'));
		add_action('wp_ajax_bible_here_add_version', array($this, 'handle_ajax_add_version'));
		add_action('wp_ajax_bible_here_delete_version_row', array($this, 'handle_ajax_delete_version_row'));
		add_action('wp_ajax_bible_here_get_version_data', array($this, 'handle_ajax_get_version_data'));
		add_action('wp_ajax_bible_here_upload_csv', array($this, 'handle_ajax_upload_csv'));

	}

	/**
	 * Register the stylesheets for the admin area.
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

		wp_enqueue_style( $this->plugin_name, plugin_dir_url( __FILE__ ) . 'css/bible-here-admin.css', array(), $this->version, 'all' );

	}

	/**
	 * Register the JavaScript for the admin area.
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

		wp_enqueue_script( $this->plugin_name, plugin_dir_url( __FILE__ ) . 'js/bible-here-admin.js', array( 'jquery' ), $this->version, false );
		
		// Localize script for AJAX
		wp_localize_script( $this->plugin_name, 'bible_here_ajax', array(
			'ajax_url' => admin_url( 'admin-ajax.php' ),
			'nonce' => wp_create_nonce( 'bible_here_ajax_nonce' ),
			'importing_text' => __( 'Downloading...', 'bible-here' ),
			'import_success' => __( 'Import Complete', 'bible-here' ),
			'import_error' => __( 'Import Failed', 'bible-here' )
		));

	}

	/**
	 * Add menu pages for the plugin.
	 *
	 * @since    1.0.0
	 */
	public function add_plugin_admin_menu() {
		add_menu_page(
			'Bible Here',
			'Bible Here',
			'manage_options',
			'bible-here',
			array($this, 'display_admin_page'),
			'dashicons-book-alt',
			30
		);

		add_submenu_page(
			'bible-here',
			'Settings',
			'Settings',
			'manage_options',
			'bible-here',
			array($this, 'display_admin_page')
		);

		add_submenu_page(
			'bible-here',
			'Versions',
			'Versions',
			'manage_options',
			'bible-here-versions',
			array($this, 'display_versions_page')
		);

	
	}

	/**
	 * Display the main admin page.
	 *
	 * @since    1.0.0
	 */
	public function display_admin_page() {
		// Check user permissions
		if (!current_user_can('manage_options')) {
			wp_die(__('You do not have sufficient permissions to access this page.'));
		}
		
		global $wpdb;

		// Handle settings form submission
		if (isset($_POST['submit']) && isset($_POST['bible_here_default_version'])) {
			check_admin_referer('bible_here_settings_nonce');
			update_option('bible_here_default_version', sanitize_text_field($_POST['bible_here_default_version']));
			echo '<div class="notice notice-success is-dismissible"><p>Settings saved successfully!</p></div>';
		}

		// Get statistics
		$books_count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}bible_here_books");
		$genres_count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}bible_here_genres");
		$versions_count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}bible_here_versions");

		// Get all Bible versions for settings
		$versions = $wpdb->get_results(
			"SELECT * FROM {$wpdb->prefix}bible_here_versions WHERE rank IS NOT NULL ORDER BY rank ASC"
		);
		
		// Get current default version setting
		$current_default = get_option('bible_here_default_version');
		if (empty($current_default) && !empty($versions)) {
			$current_default = $versions[0]->abbreviation;
		}

		include_once 'partials/bible-here-admin-display.php';
	}

	/**
	 * Display the Bible versions page.
	 *
	 * @since    1.0.0
	 */
	public function display_versions_page() {
		// Check user permissions
		if (!current_user_can('manage_options')) {
			wp_die(__('You do not have sufficient permissions to access this page.'));
		}
		
		global $wpdb;

		// Get all Bible versions
		$versions = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}bible_here_versions ORDER BY language, name");

		// Check import status for each version
		$import_status = [];
		foreach ($versions as $version) {
			// Use the table_name field from database instead of constructing it
			$table_name = $wpdb->prefix . $version->table_name;
			$table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$table_name}'") == $table_name;
			$verse_count = 0;
			if ($table_exists) {
				$verse_count = $wpdb->get_var("SELECT COUNT(*) FROM {$table_name}");
			}
			$import_status[$version->abbreviation] = [
				'imported' => $table_exists && $verse_count > 0,
				'verse_count' => $verse_count
			];
		}

		echo '<div class="wrap">';
		echo '<h1>Bible Versions Management</h1>';
		
		// Add styles for table and modal
		echo '<style>
			.versions-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
			.versions-table th, .versions-table td { padding: 8px; border: 1px solid #ddd; text-align: left; }
			.versions-table th { background-color: #f0f0f0; color: #000; font-weight: bold; }
			.versions-table tbody tr:nth-child(even) { background-color: #f9f9f9; }
			.versions-table tbody tr:nth-child(odd) { background-color: #ffffff; }
			.btn-add { background: #00a32a; color: white; border: none; padding: 8px 16px; cursor: pointer; margin-bottom: 10px; }
			.btn-edit { background: #0073aa; color: white; border: none; padding: 4px 8px; cursor: pointer; font-size: 12px; }
			.btn-download { background: #0073aa; color: white; border: none; padding: 4px 8px; cursor: pointer; font-size: 12px; margin-left: 4px; }
			.status-imported { color: #00a32a; font-weight: bold; }
			.status-not-imported { color: #666; }
			.truncate { max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
			
			/* Modal styles */
			.modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); }
			.modal-content { background-color: #fefefe; margin: 5% auto; padding: 20px; border: 1px solid #888; width: 80%; max-width: 800px; max-height: 70vh; border-radius: 5px; overflow-y: auto; }
			.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
			.modal-header h2 { margin: 0; }
			.close { color: #aaa; font-size: 28px; font-weight: bold; cursor: pointer; }
			.close:hover { color: black; }
			.modal-form { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
			.modal-form .full-width { grid-column: 1 / -1; }
			.modal-form .type-for-login-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; grid-column: 1 / -1; }
			.modal-form label { font-weight: bold; margin-bottom: 5px; display: block; }
			.modal-form input, .modal-form select, .modal-form textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px; }
			.modal-form textarea { height: 80px; resize: vertical; }
			.modal-actions { margin-top: 20px; text-align: right; }
			.modal-actions button { margin-left: 10px; padding: 8px 16px; border: none; border-radius: 3px; cursor: pointer; }
			.btn-save { background: #00a32a; color: white; }
			.btn-delete { background: #d63638; color: white; }
			.btn-cancel { background: #666; color: white; }
		</style>';
		
		// Button row with flexbox layout
		echo '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">';
		echo '<button id="reload-csv-btn" class="button" style="background-color: #00a32a; color: white; font-size: 16px; padding: 10px 20px; height: auto; border: none; border-radius: 3px; cursor: pointer; min-width: 200px;" title="Click to reload books, genres, and versions data from CSV files">🔄 Reload default seed data</button>';
		echo '<button id="add-version-btn" class="button" style="background-color: #00a32a; color: white; font-size: 16px; padding: 10px 20px; height: auto; border: none; border-radius: 3px; cursor: pointer; min-width: 200px;" title="Click to add a new version (no content)">+ Add New Version</button>';
		echo '</div>';
		
		echo '<div class="bible-versions-list">';

		if ($versions) {
			echo '<h2>Versions</h2>';
			echo '<table id="versions-table" class="versions-table">';
			echo '<thead><tr>';
			// Hide ID column
			echo '<th style="display: none;">ID</th>';
			echo '<th>Language</th>';
			echo '<th>Abbreviation</th>';
			echo '<th>Name</th>';
			echo '<th>Type</th>';
			echo '<th>Publisher</th>';
			echo '<th>Status</th>';
			echo '<th>Actions</th>';
			echo '</tr></thead>';
			echo '<tbody>';
			foreach ($versions as $version) {
				$status = $import_status[$version->abbreviation];
				echo '<tr data-id="' . esc_attr($version->id) . '">';
				// Hide ID column
				echo '<td style="display: none;">' . esc_html($version->id) . '</td>';
				echo '<td>' . esc_html($version->language) . '</td>';
				echo '<td>' . esc_html($version->abbreviation) . '</td>';
				echo '<td><div class="truncate">' . esc_html($version->name) . '</div></td>';
				echo '<td>' . esc_html($version->type ?? 'Bible') . '</td>';
				echo '<td><div class="truncate">' . esc_html($version->publisher ?? '') . '</div></td>';
				if ($status['imported'] && $version->rank !== null) {
					echo '<td class="status-imported">✓ Imported (' . number_format($status['verse_count']) . ')</td>';
					echo '<td>';
					echo '<button class="btn-edit edit-version-btn" data-action="edit" data-version-id="' . esc_attr($version->id) . '">Edit</button>';
					echo '<button class="btn-download" data-action="delete" data-version="' . esc_attr($version->abbreviation) . '" style="background: #d63638; margin-left: 4px;">Delete content</button>';
					echo '</td>';
				} else {
					echo '<td class="status-not-imported">Not imported</td>';
					echo '<td>';
					echo '<button class="btn-edit edit-version-btn" data-action="edit" data-version-id="' . esc_attr($version->id) . '">Edit</button>';
					
					// Check if this version needs upload button (no download_url and rank is null, but has table_name/language/abbreviation)
					if (empty($version->download_url) && $version->rank === null && 
						!empty($version->table_name) && !empty($version->language) && !empty($version->abbreviation)) {
						echo '<button class="btn-upload upload-csv-btn" data-version-id="' . esc_attr($version->id) . '" data-language="' . esc_attr($version->language) . '" data-table-name="' . esc_attr($version->table_name) . '" data-action="upload" style="background: #00a32a; margin-left: 4px;">Upload</button>';
					} else {
						echo '<button class="btn-download bible-download-btn" data-version="' . esc_attr($version->abbreviation) . '" data-language="' . esc_attr($version->language) . '" data-action="import" style="margin-left: 4px;">Install</button>';
					}
					echo '</td>';
				}
				echo '</tr>';
			}
			echo '</tbody></table>';
		} else {
			echo '<p>No Bible versions found.</p>';
		}

		// Import functionality section
		echo '<div class="bible-import-section" style="margin-top: 30px;">';
		echo '<h2>Import Progress</h2>';
		echo '<div id="import-status" style="display: none;">';
		echo '<div class="import-controls">';
		echo '<button id="cancel-import-btn" class="button" type="button" style="display:none;">Cancel Import</button>';
		echo '</div>';
		echo '<div id="import-progress" style="margin-top: 15px;">';
		echo '<div class="progress-bar-container" style="width:100%; height:20px; background:#f0f0f0; border:1px solid #ccc; margin:10px 0;">';
		echo '<div id="progress-bar" style="width:0%; height:100%; background:#0073aa; transition:width 0.3s;"></div>';
		echo '</div>';
		echo '<div id="progress-text">Ready to start...</div>';
		echo '<div id="import-log" style="background:#f9f9f9; border:1px solid #ddd; padding:10px; height:200px; overflow-y:scroll; font-family:monospace; font-size:12px; margin-top:10px;"></div>';
		echo '</div>';
		echo '</div>';
		echo '</div>';

		echo '</div>';
		
		// Add Modal HTML
		echo '<div id="version-modal" class="modal">';
		echo '<div class="modal-content">';
		echo '<div class="modal-header">';
		echo '<h2 id="modal-title">Edit Version</h2>';
		echo '<span class="close">&times;</span>';
		echo '</div>';
		echo '<form id="version-form" class="modal-form">';
		echo '<input type="hidden" id="version-id" name="version_id">';
		
		// Required fields in specified order: language/abbreviation/name/table_name
		echo '<div>';
		echo '<label for="language">Language: <span style="color:red;">*</span></label>';
		echo '<input type="text" id="language" name="language" required>';
		echo '</div>';
		
		echo '<div>';
		echo '<label for="abbreviation">Abbreviation: <span style="color:red;">*</span></label>';
		echo '<input type="text" id="abbreviation" name="abbreviation" required>';
		echo '</div>';
		
		echo '<div>';
		echo '<label for="name">Name: <span style="color:red;">*</span></label>';
		echo '<input type="text" id="name" name="name" required>';
		echo '</div>';
		
		echo '<div>';
		echo '<label for="table-name">Table Name: <span style="color:red;">*</span></label>';
		echo '<input type="text" id="table-name" name="table_name" required>';
		echo '</div>';
		
		echo '<div class="type-for-login-row">';
		echo '<div>';
		echo '<label for="type">Type: <span style="color:red;">*</span></label>';
		echo '<select id="type" name="type" required>';
		echo '<option value="Bible">Bible</option>';
		echo '<option value="Commentary">Commentary</option>';
		echo '</select>';
		echo '</div>';
		echo '<div>';
		echo '<label for="for-login">For Login:</label>';
		echo '<select id="for-login" name="for_login">';
		echo '<option value="0">No</option>';
		echo '<option value="1">Yes</option>';
		echo '</select>';
		echo '</div>';
		echo '</div>';
		
		echo '<div class="full-width">';
		echo '<label for="info-text">Info Text:</label>';
		echo '<textarea id="info-text" name="info_text" placeholder="Optional"></textarea>';
		echo '</div>';
		
		echo '<div class="full-width">';
		echo '<label for="info-url">Info URL:</label>';
		echo '<input type="url" id="info-url" name="info_url" placeholder="Optional">';
		echo '</div>';
		
		echo '<div>';
		echo '<label for="publisher">Publisher:</label>';
		echo '<input type="text" id="publisher" name="publisher" placeholder="Optional">';
		echo '</div>';
		
		echo '<div>';
		echo '<label for="copyright">Copyright:</label>';
		echo '<input type="text" id="copyright" name="copyright" required>';
		echo '</div>';
		
		echo '<div class="full-width">';
		echo '<label for="download-url">Download URL:</label>';
		echo '<textarea id="download-url" name="download_url" rows="5" required></textarea>';
		echo '</div>';
		
		echo '<div>';
		echo '<label for="rank">Rank:</label>';
		echo '<input type="number" id="rank" name="rank" min="0" placeholder="Optional">';
		echo '</div>';
		
		echo '<div>';
		echo '<label for="trim">Trim:</label>';
		echo '<select id="trim" name="trim">';
		echo '<option value="0">No</option>';
		echo '<option value="1">Yes</option>';
		echo '</select>';
		echo '</div>';
		

		
		echo '</form>';
		echo '<div class="modal-actions" style="display: flex; justify-content: space-between; align-items: center;">';
		echo '<div>';
		echo '<button type="button" id="save-version" class="btn-save">Save</button>';
		echo '<button type="button" id="delete-version" class="btn-delete" style="display:none;">Delete version</button>';
		echo '<button type="button" id="cancel-modal" class="btn-cancel">Cancel</button>';
		echo '</div>';
		echo '<div id="duplicate-warning" class="duplicate-warning" style="display:none; color:#c62828; font-size:14px; margin-left:10px;">';
		echo '<span id="duplicate-message"></span>';
		echo '</div>';
		echo '</div>';
		echo '</div>';
		echo '</div>';
		
		echo '</div>';
		
		// Add CSV Upload Modal HTML
		echo '<div id="csv-upload-modal" class="modal">';
		echo '<div class="modal-content">';
		echo '<div class="modal-header">';
		echo '<h2 id="upload-modal-title">Upload CSV File</h2>';
		echo '<span class="close upload-close">&times;</span>';
		echo '</div>';
		echo '<div class="modal-body">';
		echo '<p>Please select a CSV file to upload. The CSV should have the following format:</p>';
		echo '<code>book_number,chapter_number,verse_number,verse_text</code>';
		echo '<p>Example:</p>';
		echo '<code>1,1,1,起初，　神創造天地。</code>';
		echo '<form id="upload-form" enctype="multipart/form-data">';
		echo '<input type="hidden" id="csv-version-id" name="version">';
		echo '<input type="hidden" id="csv-language" name="language">';
		echo '<input type="hidden" id="csv-table-name" name="table_name">';
		echo '<div style="margin: 20px 0;">';
		echo '<label for="csv-file">Select CSV File:</label>';
		echo '<input type="file" id="csv-file" name="csv_file" accept=".csv" required style="margin-left: 10px;">';
		echo '</div>';
		echo '<div id="csv-progress" style="display: none; margin: 20px 0;">';
		echo '<div class="progress-bar-container" style="width:100%; height:20px; background:#f0f0f0; border:1px solid #ccc;">';
		echo '<div class="progress-bar" style="width:0%; height:100%; background:#0073aa; transition:width 0.3s;"></div>';
		echo '</div>';
		echo '<div id="csv-progress-text">Preparing upload...</div>';
		echo '</div>';
		echo '<div id="csv-result" style="display: none; margin: 20px 0; padding: 10px; border-radius: 4px;"></div>';
		echo '</form>';
		echo '</div>';
		echo '<div class="modal-actions">';
		echo '<button type="button" id="upload-csv-btn" class="btn-save">Upload</button>';
		echo '<button type="button" id="cancel-csv-upload" class="btn-cancel">Cancel</button>';
		echo '</div>';
		echo '</div>';
		echo '</div>';
	}


	
	/**
	 * Handle AJAX import request
	 *
	 * @since    1.0.0
	 */
	public function handle_ajax_import() {
		error_log('Bible_Here_Admin: ========== AJAX Import Request Started ==========');
		error_log('Bible_Here_Admin: Received AJAX import request, timestamp: ' . date('Y-m-d H:i:s'));
		error_log('Bible_Here_Admin: Request source IP: ' . $_SERVER['REMOTE_ADDR']);
		error_log('Bible_Here_Admin: User agent: ' . $_SERVER['HTTP_USER_AGENT']);
		
		// Log all POST data for debugging
		error_log('Bible_Here_Admin: POST data: ' . print_r($_POST, true));
		
		// Get language and version from POST parameters
		$language = sanitize_text_field($_POST['language'] ?? 'en');
		$version = sanitize_text_field($_POST['version'] ?? 'kjv');
		
		error_log('Bible_Here_Admin: Retrieved from POST parameters -> Language: ' . $language . ', Version: ' . $version);
		
		// Verify nonce
		error_log('Bible_Here_Admin: Starting nonce verification...');
		if (!wp_verify_nonce($_POST['nonce'], 'bible_here_ajax_nonce')) {
			error_log('Bible_Here_Admin: ❌ Nonce verification failed');
			error_log('Bible_Here_Admin: Provided nonce: ' . $_POST['nonce']);
			wp_die('Security check failed');
		}
		error_log('Bible_Here_Admin: ✅ Nonce verification successful');
		
		// Check user permissions
		error_log('Bible_Here_Admin: Starting user permission check...');
		if (!current_user_can('manage_options')) {
			error_log('Bible_Here_Admin: ❌ Insufficient user permissions, current user ID: ' . get_current_user_id());
			wp_die('Insufficient permissions');
		}
		error_log('Bible_Here_Admin: ✅ User permission check passed, user ID: ' . get_current_user_id());
		
		// Initialize XML importer
		$xml_importer_file = plugin_dir_path(dirname(__FILE__)) . 'includes/class-bible-here-xml-importer.php';
		error_log('Bible_Here_Admin: XML importer file path: ' . $xml_importer_file);
		error_log('Bible_Here_Admin: Checking if file exists...');
		
		if (!file_exists($xml_importer_file)) {
			error_log('Bible_Here_Admin: ❌ XML importer file does not exist');
			error_log('Bible_Here_Admin: Current working directory: ' . getcwd());
			error_log('Bible_Here_Admin: Plugin directory: ' . plugin_dir_path(dirname(__FILE__)));
			wp_send_json_error('XML importer file not found');
			return;
		}
		
		error_log('Bible_Here_Admin: ✅ XML importer file exists, starting to load...');
		require_once $xml_importer_file;
		
		try {
			$xml_importer = new Bible_Here_XML_Importer($this->plugin_name, $this->version);
			error_log('Bible_Here_Admin: ✅ XML importer initialization successful');
		} catch (Exception $e) {
			error_log('Bible_Here_Admin: ❌ XML importer initialization failed: ' . $e->getMessage());
			error_log('Bible_Here_Admin: Error stack trace: ' . $e->getTraceAsString());
			wp_send_json_error('XML importer initialization failed: ' . $e->getMessage());
			return;
		}
		
		// Import based on language and version
		error_log('Bible_Here_Admin: Starting version import, language: ' . $language . ', version: ' . $version);
		$import_start_time = microtime(true);
		
		// Use dynamic import method
		error_log('Bible_Here_Admin: Executing dynamic Bible import for ' . strtoupper($language) . '/' . strtoupper($version) . '...');
		try {
			$result = $xml_importer->import_bible($language, $version);
			error_log('Bible_Here_Admin: Dynamic import method execution completed');
		} catch (Exception $e) {
			error_log('Bible_Here_Admin: ❌ Exception occurred during ' . strtoupper($language) . '/' . strtoupper($version) . ' import process: ' . $e->getMessage());
			error_log('Bible_Here_Admin: Exception stack trace: ' . $e->getTraceAsString());
			$result = [
				'success' => false,
				'message' => 'Import failed with exception: ' . $e->getMessage()
			];
		}
		
		$import_duration = microtime(true) - $import_start_time;
		error_log('Bible_Here_Admin: Import process completed, duration: ' . round($import_duration, 2) . ' seconds');
		error_log('Bible_Here_Admin: Import result: ' . ($result['success'] ? '✅ Success' : '❌ Failed'));
		
		if (!$result['success']) {
			if (isset($result['data'])) {
				error_log('Bible_Here_Admin: Error data: ' . print_r($result['data'], true));
			}
			if (isset($result['message'])) {
				error_log('Bible_Here_Admin: Error message: ' . $result['message']);
			}
		} else {
			if (isset($result['message'])) {
				error_log('Bible_Here_Admin: Success message: ' . $result['message']);
			}
			if (isset($result['imported_count'])) {
				error_log('Bible_Here_Admin: Import count: ' . $result['imported_count'] . ' verses');
			}
		}
		
		error_log('Bible_Here_Admin: ========== AJAX Import Request Ended ==========');
		
		// Send JSON response
		if ($result['success']) {
			// Include imported_count in the response data
			$response_data = array(
				'message' => $result['message'],
				'imported_count' => isset($result['imported_count']) ? $result['imported_count'] : 0,
				'execution_time' => isset($result['execution_time']) ? $result['execution_time'] : null
			);
			wp_send_json_success($response_data);
		} else {
			wp_send_json_error($result['message']);
		}
	}
	
	/**
	 * Handle AJAX delete version request
	 *
	 * @since    1.0.0
	 */
	public function handle_ajax_delete_version() {
		error_log('Bible_Here_Admin: ========== AJAX Delete Version Request Started ==========');
		error_log('Bible_Here_Admin: Received AJAX delete version request, timestamp: ' . date('Y-m-d H:i:s'));
		
		// Verify nonce for security
		if (!wp_verify_nonce($_POST['nonce'], 'bible_here_ajax_nonce')) {
			error_log('Bible_Here_Admin: ❌ Nonce verification failed');
			wp_send_json(array('success' => false, 'message' => 'Security check failed'));
			return;
		}
		
		// Check user permissions
		if (!current_user_can('manage_options')) {
			error_log('Bible_Here_Admin: ❌ Insufficient user permissions');
			wp_send_json(array('success' => false, 'message' => 'Insufficient permissions'));
			return;
		}
		
		$version = sanitize_text_field($_POST['version']);
		error_log('Bible_Here_Admin: Version to delete: ' . $version);
		
		global $wpdb;
		
		try {
			// Get version info from database
			$version_table = $wpdb->prefix . 'bible_here_versions';
			$version_info = $wpdb->get_row($wpdb->prepare(
				"SELECT * FROM {$version_table} WHERE abbreviation = %s",
				$version
			));
			
			if (!$version_info) {
				error_log('Bible_Here_Admin: ❌ Cannot find version: ' . $version);
				wp_send_json(array('success' => false, 'message' => 'Version not found'));
				return;
			}
			
			// Check if version is imported (rank is not null)
			if (is_null($version_info->rank)) {
				error_log('Bible_Here_Admin: ❌ Version not imported, no need to delete: ' . $version);
				wp_send_json(array('success' => false, 'message' => 'Version is not imported'));
				return;
			}
			
			// Clear the content table (TRUNCATE instead of DROP)
			$content_table = $wpdb->prefix . $version_info->table_name;
			error_log('Bible_Here_Admin: Preparing to clear content table: ' . $content_table);
			
			// Check if table exists before truncating
			$table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$content_table}'");
			if ($table_exists) {
				$truncate_result = $wpdb->query("TRUNCATE TABLE `{$content_table}`");
				if ($truncate_result === false) {
					error_log('Bible_Here_Admin: ❌ Failed to clear content table: ' . $wpdb->last_error);
					wp_send_json(array('success' => false, 'message' => 'Failed to clear content table'));
					return;
				}
				error_log('Bible_Here_Admin: ✅ Content table cleared successfully');
			} else {
				error_log('Bible_Here_Admin: ⚠️ Content table does not exist, skipping truncate');
			}
			
			// Reset rank to null in versions table
			$update_result = $wpdb->update(
				$version_table,
				array('rank' => null),
				array('abbreviation' => $version),
				array('%s'),
				array('%s')
			);
			
			if ($update_result === false) {
				error_log('Bible_Here_Admin: ❌ Failed to reset rank: ' . $wpdb->last_error);
				wp_send_json(array('success' => false, 'message' => 'Failed to reset version status'));
				return;
			}
			error_log('Bible_Here_Admin: ✅ Version rank reset successfully');
			
			$result = array(
				'success' => true,
				'message' => 'Version data cleared successfully (table content removed, version record preserved)'
			);
			
		} catch (Exception $e) {
			error_log('Bible_Here_Admin: ❌ Exception occurred during version deletion: ' . $e->getMessage());
			$result = array(
				'success' => false,
				'message' => 'Delete failed with exception: ' . $e->getMessage()
			);
		}
		
		error_log('Bible_Here_Admin: Delete version result: ' . print_r($result, true));
		error_log('Bible_Here_Admin: ========== AJAX Delete Version Request Ended ==========');
		
		// Send JSON response
		wp_send_json($result);
	}
	


	/**
	 * Handle AJAX reload CSV data request
	 *
	 * @since    1.0.0
	 */
	public function handle_ajax_reload_csv() {
		error_log('Bible_Here_Admin: ========== AJAX Reload CSV Request Started ==========');
		error_log('Bible_Here_Admin: Received AJAX reload CSV request, timestamp: ' . date('Y-m-d H:i:s'));
		
		// Verify nonce for security
		if (!wp_verify_nonce($_POST['nonce'], 'bible_here_ajax_nonce')) {
			error_log('Bible_Here_Admin: ❌ Nonce verification failed');
			wp_send_json_error('Security check failed');
			return;
		}
		
		// Check user permissions
		if (!current_user_can('manage_options')) {
			error_log('Bible_Here_Admin: ❌ Insufficient user permissions');
			wp_send_json_error('Insufficient permissions');
			return;
		}
		
		try {
			// Load the activator class to use its CSV loading functionality
			$activator_file = plugin_dir_path(dirname(__FILE__)) . 'includes/class-bible-here-activator.php';
			if (!file_exists($activator_file)) {
				error_log('Bible_Here_Admin: ❌ Activator file does not exist');
				wp_send_json_error('Activator file not found');
				return;
			}
			
			require_once $activator_file;
			
			// Call the CSV loading method with force reload
			error_log('Bible_Here_Admin: Starting to reload CSV data...');
			$result = Bible_Here_Activator::load_csv_data(true);
			
			if ($result) {
				error_log('Bible_Here_Admin: ✅ CSV data reload successful');
				wp_send_json_success('CSV data reloaded successfully! Books, genres, and versions have been updated from CSV files.');
			} else {
				error_log('Bible_Here_Admin: ❌ CSV data reload failed');
				wp_send_json_error('Failed to reload CSV data');
			}
			
		} catch (Exception $e) {
			error_log('Bible_Here_Admin: ❌ Exception occurred during CSV reload: ' . $e->getMessage());
			error_log('Bible_Here_Admin: Exception stack trace: ' . $e->getTraceAsString());
			wp_send_json_error('CSV reload failed with exception: ' . $e->getMessage());
		}
		
		error_log('Bible_Here_Admin: ========== AJAX Reload CSV Request Ended ==========');
	}

	/**
	 * Handle AJAX save version request
	 *
	 * @since    1.0.0
	 */
	public function handle_ajax_save_version() {
		// Verify nonce for security
		if (!wp_verify_nonce($_POST['nonce'], 'bible_here_ajax_nonce')) {
			wp_send_json_error('Security check failed');
			return;
		}
		
		// Check user permissions
		if (!current_user_can('manage_options')) {
			wp_send_json_error('Insufficient permissions');
			return;
		}
		
		global $wpdb;
		$table_name = $wpdb->prefix . 'bible_here_versions';
		
		// Get version ID
		$version_id = intval($_POST['version_id']);
		
		// First, get existing data from database
		$existing_data = $wpdb->get_row($wpdb->prepare(
			"SELECT * FROM {$table_name} WHERE id = %d",
			$version_id
		));
		
		if (!$existing_data) {
			wp_send_json_error('Version not found');
			return;
		}
		
		// Get form data and merge with existing data
		$table_name_value = sanitize_text_field($_POST['table_name'] ?? $existing_data->table_name);
		$language = sanitize_text_field($_POST['language'] ?? $existing_data->language);
		$abbreviation = sanitize_text_field($_POST['abbreviation'] ?? $existing_data->abbreviation);
		$name = sanitize_text_field($_POST['name'] ?? $existing_data->name);
		$info_text = sanitize_textarea_field($_POST['info_text'] ?? $existing_data->info_text);
		$info_url = esc_url_raw($_POST['info_url'] ?? $existing_data->info_url);
		$publisher = sanitize_text_field($_POST['publisher'] ?? $existing_data->publisher);
		$copyright = sanitize_text_field($_POST['copyright'] ?? $existing_data->copyright);
		// Keep existing download_url if not provided in form
		$download_url = !empty($_POST['download_url']) ? esc_url_raw($_POST['download_url']) : $existing_data->download_url;
		$rank = isset($_POST['rank']) && $_POST['rank'] !== '' ? intval($_POST['rank']) : $existing_data->rank;
		$trim = isset($_POST['trim']) ? intval($_POST['trim']) : $existing_data->trim;
		$for_login = isset($_POST['for_login']) ? intval($_POST['for_login']) : $existing_data->for_login;
		$type = sanitize_text_field($_POST['type'] ?? $existing_data->type);
		
		// Validate required fields
		if (empty($table_name_value) || empty($language) || empty($abbreviation) || empty($name)) {
			wp_send_json_error('Required fields are missing');
			return;
		}
		
		// Update the database
		$result = $wpdb->update(
			$table_name,
			array(
				'table_name' => $table_name_value,
				'language' => $language,
				'abbreviation' => $abbreviation,
				'name' => $name,
				'info_text' => $info_text,
				'info_url' => $info_url,
				'publisher' => $publisher,
				'copyright' => $copyright,
				'download_url' => $download_url,
				'rank' => $rank,
				'trim' => $trim,
				'for_login' => $for_login,
				'type' => $type
			),
			array('id' => $version_id),
			array('%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', $rank === null ? null : '%d', '%d', '%d', '%s'),
			array('%d')
		);
		
		if ($result !== false) {
			wp_send_json_success('Version updated successfully');
		} else {
			// Get detailed error message
			$error_message = $wpdb->last_error;
			
			// Log the full error for debugging
			error_log('Bible_Here_Admin: Database error in save_version: ' . $error_message);
			
			wp_send_json_error($error_message ?: 'Failed to update version');
		}
	}
	
	/**
	 * Handle AJAX add version request
	 *
	 * @since    1.0.0
	 */
	public function handle_ajax_add_version() {
		// Verify nonce for security
		if (!wp_verify_nonce($_POST['nonce'], 'bible_here_ajax_nonce')) {
			wp_send_json_error('Security check failed');
			return;
		}
		
		// Check user permissions
		if (!current_user_can('manage_options')) {
			wp_send_json_error('Insufficient permissions');
			return;
		}
		
		global $wpdb;
		$table_name = $wpdb->prefix . 'bible_here_versions';
		
		// Get form data
		$table_name_value = sanitize_text_field($_POST['table_name'] ?? '');
		$language = sanitize_text_field($_POST['language'] ?? '');
		$abbreviation = sanitize_text_field($_POST['abbreviation'] ?? '');
		$name = sanitize_text_field($_POST['name'] ?? '');
		$info_text = sanitize_textarea_field($_POST['info_text'] ?? '');
		$type = sanitize_text_field($_POST['type'] ?? '');
		$info_url = esc_url_raw($_POST['info_url'] ?? '');
		$publisher = sanitize_text_field($_POST['publisher'] ?? '');
		$copyright = sanitize_text_field($_POST['copyright'] ?? '');
		$download_url = esc_url_raw($_POST['download_url'] ?? '');
		$rank = $_POST['rank'] !== '' ? intval($_POST['rank']) : null;
		$trim = intval($_POST['trim'] ?? 0);
		$for_login = intval($_POST['for_login'] ?? 0);
		
		// Validate required fields
		if (empty($table_name_value) || empty($language) || empty($abbreviation) || empty($name)) {
			wp_send_json_error('Required fields are missing');
			return;
		}
		
		// Insert new version
		$result = $wpdb->insert(
			$table_name,
			array(
				'table_name' => $table_name_value,
				'language' => $language,
				'abbreviation' => $abbreviation,
				'name' => $name,
				'info_text' => $info_text,
				'info_url' => $info_url,
				'publisher' => $publisher,
				'copyright' => $copyright,
				'download_url' => $download_url,
				'rank' => $rank,
				'trim' => $trim,
				'type' => $type,
				'for_login' => $for_login,
				'seed' => 0
			),
			array('%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', $rank === null ? null : '%d', '%d', '%s', '%d', '%d')
		);
		
		if ($result !== false) {
			$new_id = $wpdb->insert_id;
			wp_send_json_success(array(
				'message' => 'Version added successfully',
				'version_id' => $new_id
			));
		} else {
			// Get detailed error message
			$error_message = $wpdb->last_error;
			
			// Log the full error for debugging
			error_log('Bible_Here_Admin: Database error in add_version: ' . $error_message);
			
			wp_send_json_error($error_message ?: 'Failed to add version');
		}
	}
	
	/**
	 * Handle AJAX delete version row request
	 *
	 * @since    1.0.0
	 */
	public function handle_ajax_delete_version_row() {
		// Verify nonce for security
		if (!wp_verify_nonce($_POST['nonce'], 'bible_here_ajax_nonce')) {
			wp_send_json_error('Security check failed');
			return;
		}
		
		// Check user permissions
		if (!current_user_can('manage_options')) {
			wp_send_json_error('Insufficient permissions');
			return;
		}
		
		$version_id = intval($_POST['version_id']);
		
		global $wpdb;
		$table_name = $wpdb->prefix . 'bible_here_versions';
		
		// Get version info before deletion
		$version_info = $wpdb->get_row($wpdb->prepare(
			"SELECT * FROM {$table_name} WHERE id = %d",
			$version_id
		));
		
		if (!$version_info) {
			wp_send_json_error('Version not found');
			return;
		}
		
		// If version is imported (has rank), also drop the content table
		if (!is_null($version_info->rank)) {
			$content_table = $wpdb->prefix . $version_info->table_name;
			$wpdb->query("DROP TABLE IF EXISTS `{$content_table}`");
		}
		
		// Delete the version record
		$result = $wpdb->delete(
			$table_name,
			array('id' => $version_id),
			array('%d')
		);
		
		if ($result !== false) {
			wp_send_json_success('Version deleted successfully');
		} else {
			wp_send_json_error('Failed to delete version: ' . $wpdb->last_error);
		}
	}
	
	/**
	 * Handle AJAX get versions request (for duplicate checking)
	 *
	 * @since    1.0.0
	 */
	public function handle_ajax_get_versions() {
		// Verify nonce for security
		if (!wp_verify_nonce($_POST['nonce'], 'bible_here_ajax_nonce')) {
			wp_send_json_error('Security check failed');
			return;
		}
		
		// Check user permissions
		if (!current_user_can('manage_options')) {
			wp_send_json_error('Insufficient permissions');
			return;
		}
		
		$language = sanitize_text_field($_POST['language'] ?? '');
		$abbreviation = sanitize_text_field($_POST['abbreviation'] ?? '');
		$exclude_id = intval($_POST['exclude_id'] ?? 0); // For edit mode, exclude current record
		
		if (empty($language) || empty($abbreviation)) {
			wp_send_json_error('Language and abbreviation are required');
			return;
		}
		
		global $wpdb;
		$table_name = $wpdb->prefix . 'bible_here_versions';
		
		// Check if language/abbreviation combination exists
		$query = $wpdb->prepare(
			"SELECT id, name FROM {$table_name} WHERE language = %s AND abbreviation = %s",
			$language,
			$abbreviation
		);
		
		// Exclude current record if editing
		if ($exclude_id > 0) {
			$query = $wpdb->prepare(
				"SELECT id, name FROM {$table_name} WHERE language = %s AND abbreviation = %s AND id != %d",
				$language,
				$abbreviation,
				$exclude_id
			);
		}
		
		$existing_version = $wpdb->get_row($query);
		
		if ($existing_version) {
			wp_send_json_success(array(
				'exists' => true,
				'message' => "Language '{$language}' already has abbreviation '{$abbreviation}'!",
				'existing_id' => $existing_version->id,
				'existing_name' => $existing_version->name
			));
		} else {
			wp_send_json_success(array(
				'exists' => false,
				'message' => 'Language/abbreviation combination is available'
			));
		}
	}

	/**
	 * Handle AJAX get version data request (for loading complete version data into modal)
	 *
	 * @since    1.0.0
	 */
	public function handle_ajax_get_version_data() {
		// Verify nonce for security
		if (!wp_verify_nonce($_POST['nonce'], 'bible_here_ajax_nonce')) {
			wp_send_json_error('Security check failed');
			return;
		}
		
		// Check user permissions
		if (!current_user_can('manage_options')) {
			wp_send_json_error('Insufficient permissions');
			return;
		}
		
		$version_id = intval($_POST['version_id'] ?? 0);
		
		if ($version_id <= 0) {
			wp_send_json_error('Invalid version ID');
			return;
		}
		
		global $wpdb;
		$table_name = $wpdb->prefix . 'bible_here_versions';
		
		// Get complete version data from database
		$version_data = $wpdb->get_row($wpdb->prepare(
			"SELECT * FROM {$table_name} WHERE id = %d",
			$version_id
		));
		
		if (!$version_data) {
			wp_send_json_error('Version not found');
			return;
		}
		
		// Return complete version data
		wp_send_json_success(array(
			'id' => $version_data->id,
			'table_name' => $version_data->table_name,
			'language' => $version_data->language,
			'abbreviation' => $version_data->abbreviation,
			'name' => $version_data->name,
			'info_text' => $version_data->info_text,
			'info_url' => $version_data->info_url,
			'publisher' => $version_data->publisher,
			'copyright' => $version_data->copyright,
			'download_url' => $version_data->download_url,
			'rank' => $version_data->rank,
			'trim' => $version_data->trim,
			'for_login' => $version_data->for_login,
			'type' => $version_data->type,
			'seed' => $version_data->seed
		));
	}

	/**
	 * Handle AJAX CSV upload request
	 *
	 * @since    1.0.0
	 */
	public function handle_ajax_upload_csv() {
		// Verify nonce for security
		if (!wp_verify_nonce($_POST['nonce'], 'bible_here_ajax_nonce')) {
			wp_send_json_error('Security check failed');
			return;
		}
		
		// Check user permissions
		if (!current_user_can('manage_options')) {
			wp_send_json_error('Insufficient permissions');
			return;
		}
		
		$version_id = intval($_POST['version_id'] ?? 0);
		$csv_data = $_POST['csv_data'] ?? '';
		
		if ($version_id <= 0) {
			wp_send_json_error('Invalid version ID');
			return;
		}
		
		if (empty($csv_data)) {
			wp_send_json_error('No CSV data provided');
			return;
		}
		
		global $wpdb;
		$versions_table = $wpdb->prefix . 'bible_here_versions';
		
		// Get version info
		$version_info = $wpdb->get_row($wpdb->prepare(
			"SELECT * FROM {$versions_table} WHERE id = %d",
			$version_id
		));
		
		if (!$version_info) {
			wp_send_json_error('Version not found');
			return;
		}
		
		// Check if version is eligible for upload (no download_url and rank is null)
		if (!empty($version_info->download_url) || !is_null($version_info->rank)) {
			wp_send_json_error('This version is not eligible for CSV upload');
			return;
		}
		
		// Check required fields
		if (empty($version_info->table_name) || empty($version_info->language) || empty($version_info->abbreviation)) {
			wp_send_json_error('Version missing required information');
			return;
		}
		
		// Parse CSV data
		$csv_rows = json_decode(stripslashes($csv_data), true);
		if (!is_array($csv_rows) || empty($csv_rows)) {
			wp_send_json_error('Invalid CSV data format');
			return;
		}
		
		// Create content table
		$content_table = $wpdb->prefix . $version_info->table_name;
		
		// Drop existing table if exists
		$wpdb->query("DROP TABLE IF EXISTS `{$content_table}`");
		
		// Create new table
		$create_table_sql = "
			CREATE TABLE `{$content_table}` (
				`id` int(11) NOT NULL AUTO_INCREMENT,
				`book_number` int(11) NOT NULL,
				`chapter_number` int(11) NOT NULL,
				`verse_number` int(11) NOT NULL,
				`verse_text` text NULL,
				PRIMARY KEY (`id`),
				KEY `book_chapter_verse` (`book_number`, `chapter_number`, `verse_number`)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
		";
		
		$result = $wpdb->query($create_table_sql);
		if ($result === false) {
			wp_send_json_error('Failed to create content table: ' . $wpdb->last_error);
			return;
		}
		
		// Insert CSV data
		$inserted_count = 0;
		$error_count = 0;
		$errors = array();
		
		foreach ($csv_rows as $index => $row) {
			// Handle both array format [0,1,2,3] and object format {book_number:1, chapter_number:1, verse_number:1, verse_text:"..."}
			if (is_array($row) && isset($row[0])) {
				// Array format (legacy support)
				if (count($row) < 4) {
					$error_count++;
					$errors[] = "Row " . ($index + 1) . ": Invalid format";
					continue;
				}
				$book_number = intval($row[0]);
				$chapter_number = intval($row[1]);
				$verse_number = intval($row[2]);
				$verse_text = !empty($row[3]) ? sanitize_text_field($row[3]) : null;
			} else {
				// Object format (current frontend format)
				if (!isset($row['book_number']) || !isset($row['chapter_number']) || !isset($row['verse_number'])) {
					$error_count++;
					$errors[] = "Row " . ($index + 1) . ": Missing required fields";
					continue;
				}
				$book_number = intval($row['book_number']);
				$chapter_number = intval($row['chapter_number']);
				$verse_number = intval($row['verse_number']);
				$verse_text = !empty($row['verse_text']) ? sanitize_text_field($row['verse_text']) : null;
			}
			
			if ($book_number <= 0 || $chapter_number <= 0 || $verse_number <= 0) {
				$error_count++;
				$errors[] = "Row " . ($index + 1) . ": book_number, chapter_number, verse_number must be positive numbers";
				continue;
			}
			
			$insert_result = $wpdb->insert(
				$content_table,
				array(
					'book_number' => $book_number,
					'chapter_number' => $chapter_number,
					'verse_number' => $verse_number,
					'verse_text' => $verse_text
				),
				array('%d', '%d', '%d', '%s')
			);
			
			if ($insert_result !== false) {
				$inserted_count++;
			} else {
				$error_count++;
				$errors[] = "Row " . ($index + 1) . ": Database insert failed";
			}
		}
		
		// Update version rank to 1 if any data was inserted
		if ($inserted_count > 0) {
			$update_result = $wpdb->update(
				$versions_table,
				array('rank' => 1),
				array('id' => $version_id),
				array('%d'),
				array('%d')
			);
			
			if ($update_result === false) {
				wp_send_json_error('Data imported but failed to update version rank: ' . $wpdb->last_error);
				return;
			}
		}
		
		// Return results
		$response = array(
			'inserted_count' => $inserted_count,
			'error_count' => $error_count,
			'total_rows' => count($csv_rows)
		);
		
		if (!empty($errors)) {
			$response['errors'] = array_slice($errors, 0, 10); // Limit to first 10 errors
		}
		
		if ($inserted_count > 0) {
			$response['message'] = "Successfully imported {$inserted_count} verses";
			if ($error_count > 0) {
				$response['message'] .= " with {$error_count} errors";
			}
			wp_send_json_success($response);
		} else {
			wp_send_json_error('No data was imported. Please check your CSV format.');
		}
	}

}
