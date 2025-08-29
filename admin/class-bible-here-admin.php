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
		$versions = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}bible_here_versions ORDER BY rank");

		// Check import status for each version
		$import_status = [];
		foreach ($versions as $version) {
			$table_name = $wpdb->prefix . 'bible_here_' . strtolower($version->language) . '_' . strtolower($version->abbreviation);
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
		echo '<h1>Download versions</h1>';
		
		// Reload CSV data button
		echo '<div style="margin-bottom: 20px;">';
		echo '<button id="reload-csv-btn" class="button" style="background-color: #00a32a; color: white; font-size: 16px; padding: 10px 20px; height: auto; border: none; border-radius: 3px; cursor: pointer;">🔄 Reload All CSV Data</button>';
		echo '<p style="margin-top: 5px; color: #666; font-style: italic;">Click to reload books, genres, and versions data from CSV files</p>';
		echo '</div>';
		
		echo '<div class="bible-versions-list">';

		if ($versions) {
			echo '<h2>Bible</h2>';
			echo '<table class="wp-list-table widefat fixed striped">';
			echo '<thead><tr><th>Language</th><th>Name</th><th>Abbreviation</th><th>Display order</th><th>Updated At</th><th>Status</th><th>Actions</th></tr></thead>';
			echo '<tbody>';
			foreach ($versions as $version) {
				$status = $import_status[$version->abbreviation];
				echo '<tr>';
				echo '<td>' . esc_html($version->language) . '</td>';
				echo '<td>' . esc_html($version->name) . '</td>';
				echo '<td>' . esc_html($version->abbreviation) . '</td>';
				echo '<td>' . esc_html($version->rank) . '</td>';
				echo '<td>' . esc_html($version->updated_at) . '</td>';
				if ($status['imported'] && $version->rank !== null) {
				echo '<td><span class="dashicons dashicons-yes-alt" style="color: green;"></span> Imported (' . number_format($status['verse_count']) . ' verses)</td>';
				echo '<td>';
				echo '<button class="button" style="background-color: #d63638; color: white; margin-right: 5px;" data-version="' . esc_attr($version->abbreviation) . '" data-action="delete">Delete</button>';
				echo '<button class="button" style="background-color: #00a32a; color: white;" data-version="' . esc_attr($version->abbreviation) . '" data-action="strong" disabled>Strong</button>';
				echo '</td>';
			} else {
				echo '<td><span class="dashicons dashicons-minus" style="color: #ccc;"></span> Not imported</td>';
				echo '<td><button class="button button-primary bible-download-btn" data-version="' . esc_attr($version->abbreviation) . '" data-language="' . esc_attr($version->language) . '" data-action="import">Download</button></td>';
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

		echo '</div></div>';
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
			wp_send_json_success($result['message']);
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
			
			// Drop the content table
			$content_table = $wpdb->prefix . $version_info->table_name;
			error_log('Bible_Here_Admin: Preparing to delete content table: ' . $content_table);
			
			$drop_result = $wpdb->query("DROP TABLE IF EXISTS `{$content_table}`");
			if ($drop_result === false) {
				error_log('Bible_Here_Admin: ❌ Failed to delete content table: ' . $wpdb->last_error);
				wp_send_json(array('success' => false, 'message' => 'Failed to delete content table'));
				return;
			}
			error_log('Bible_Here_Admin: ✅ Content table deleted successfully');
			
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
				'message' => 'Version deleted successfully'
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

}
