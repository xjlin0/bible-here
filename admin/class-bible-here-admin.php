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

		add_submenu_page(
			'bible-here',
			'Cross References',
			'Cross References',
			'manage_options',
			'bible-here-cross-references',
			array($this, 'display_cross_references_page')
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

        $disabled_pages_option = get_option('bible_here_label_disabled_pages');

        if (isset($_POST['bible_here_action'])) {
            $action = sanitize_text_field($_POST['bible_here_action']);
            if ($action === 'save_disabled_pages') {
                check_admin_referer('bible_here_label_settings_nonce');
                $ids = isset($_POST['disabled_pages']) && is_array($_POST['disabled_pages']) ? array_map('intval', $_POST['disabled_pages']) : array();
                update_option('bible_here_label_disabled_pages', $ids);
                $disabled_pages_option = $ids;
                echo '<div class="notice notice-success is-dismissible"><p>Settings saved.</p></div>';
            } elseif ($action === 'disable_all') {
                check_admin_referer('bible_here_label_settings_nonce');
                update_option('bible_here_label_disabled_pages', null);  // it will become empty string
                $disabled_pages_option = null;
                echo '<div class="notice notice-success is-dismissible"><p>Disabled scripture reference linking across all pages.</p></div>';
            } elseif ($action === 'enable_all') {
                check_admin_referer('bible_here_label_settings_nonce');
                update_option('bible_here_label_disabled_pages', array());
                $disabled_pages_option = array();
                echo '<div class="notice notice-success is-dismissible"><p>Enabled scripture reference linking across all pages.</p></div>';
            }
        }

        $dynamic_post_types = get_post_types(
            array(
                'public' => true,
                'show_ui' => true,
            ),  // publicly_queryable of page is false
            'names'
        );
        $dynamic_post_types = array_values(array_diff($dynamic_post_types, array('attachment')));

		$posts = get_posts(array(
            'post_type' => $dynamic_post_types,
            'post_status' => 'any',
            'numberposts' => -1,
            'orderby' => array(
				'post_title' => 'ASC',
				'post_date'  => 'ASC'
			),
            'order' => 'ASC'
        ));

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

		// Get all language mappings for efficient lookup
		$language_mappings = [];
		$languages = $wpdb->get_results("SELECT code, name, original FROM {$wpdb->prefix}bible_here_languages");
		foreach ($languages as $lang) {
			$language_mappings[$lang->code] = [
				'name' => $lang->name,
				'original' => $lang->original
			];
		}

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
		

		
		// Button row with flexbox layout
		echo '<div class="bible-here-button-row">';
		echo '<button id="reload-csv-btn" class="button bible-here-reload-btn" title="Click to reload books, genres, and versions data from CSV files">🔄 Reload default seed data</button>';
		echo '<button id="add-version-btn" class="button bible-here-add-btn" title="Click to add a new version (no content)">+ Add New Version</button>';
		echo '</div>';
		
		echo '<div class="bible-versions-list">';

		if ($versions) {
			echo '<h2>Versions</h2>';
			echo '<table id="versions-table" class="versions-table">';
			echo '<thead><tr>';
			// Hide ID column
			echo '<th class="bible-here-hidden">ID</th>';
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
				echo '<td class="bible-here-hidden">' . esc_html($version->id) . '</td>';
				// Display language with intelligent lookup
				$language_display = $version->language; // Default fallback
				if (isset($language_mappings[$version->language])) {
					$lang_data = $language_mappings[$version->language];
					// Priority: original > name > language code
					if (!empty($lang_data['original'])) {
						$language_display = $lang_data['original'];
					} elseif (!empty($lang_data['name'])) {
						$language_display = $lang_data['name'];
					}
				}
				echo '<td>' . esc_html($language_display) . '</td>';
				echo '<td>' . esc_html($version->abbreviation) . '</td>';
				echo '<td><div class="truncate">' . esc_html($version->name) . '</div></td>';
				echo '<td>' . esc_html($version->type ?? 'Bible') . '</td>';
				echo '<td><div class="truncate">' . esc_html($version->publisher ?? '') . '</div></td>';
				if ($status['imported'] && $version->rank !== null) {
					echo '<td class="status-imported">✓ Imported (' . number_format($status['verse_count']) . ')</td>';
					echo '<td>';
					echo '<button class="btn-edit edit-version-btn" data-action="edit" data-version-id="' . esc_attr($version->id) . '">Edit</button>';
					echo '<button class="btn-download" data-action="delete" data-version="' . esc_attr($version->abbreviation) . '">Delete content</button>';
					echo '</td>';
				} else {
					echo '<td class="status-not-imported">Not imported</td>';
					echo '<td>';
					echo '<button class="btn-edit edit-version-btn" data-action="edit" data-version-id="' . esc_attr($version->id) . '">Edit</button>';
					
					// Check if this version needs upload button (no download_url and rank is null, but has table_name/language/abbreviation)
					if (empty($version->download_url) && $version->rank === null && 
						!empty($version->table_name) && !empty($version->language) && !empty($version->abbreviation)) {
						echo '<button class="btn-upload upload-csv-btn" data-version-id="' . esc_attr($version->id) . '" data-language="' . esc_attr($version->language) . '" data-table-name="' . esc_attr($version->table_name) . '" data-action="upload">Upload</button>';
					} else {
						echo '<button class="btn-download bible-download-btn" data-version="' . esc_attr($version->abbreviation) . '" data-language="' . esc_attr($version->language) . '" data-action="import">Install</button>';
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
		echo '<div class="bible-import-section">';
		echo '<h2>Import Progress</h2>';
		echo '<div id="import-status" class="bible-here-import-status">';
		echo '<div class="import-controls">';
		echo '<button id="cancel-import-btn" class="button bible-here-hidden" type="button">Cancel Import</button>';
		echo '</div>';
		echo '<div id="import-progress" class="bible-here-import-progress">';
		echo '<div class="progress-bar-container">';
		echo '<div id="progress-bar"></div>';
		echo '</div>';
		echo '<div id="progress-text">Ready to start...</div>';
		echo '<div id="import-log" class="bible-here-import-log"></div>';
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
		echo '<label for="language">Language code: <span class="bible-here-required">*</span></label>';
		echo '<input type="text" id="language" name="language" placeholder="e.g. en, fr, it, etc" required>';
		echo '</div>';
		
		echo '<div>';
		echo '<label for="abbreviation">Abbreviation: <span class="bible-here-required">*</span></label>';
		echo '<input type="text" id="abbreviation" name="abbreviation" placeholder="The abbreviation of the version. (lower case)" required>';
		echo '</div>';
		
		echo '<div>';
		echo '<label for="name">Name: <span class="bible-here-required">*</span></label>';
		echo '<input type="text" id="name" name="name" placeholder="The name of the version" required>';
		echo '</div>';
		
		echo '<div>';
		echo '<label for="table-name">Table Name: <span class="bible-here-required">*</span></label>';
		echo '<input type="text" id="table-name" name="table_name" pattern="^bible_here.*" placeholder="uniq and start with bible_here..." required>';
		echo '</div>';
		
		echo '<div class="type-for-login-row">';
		echo '<div>';
		echo '<label for="type">Type: <span class="bible-here-required">*</span></label>';
		echo '<select id="type" name="type" required>';
		echo '<option value="Bible">Bible</option>';
		echo '<option value="Commentary">Commentary</option>';
		echo '<option value="Bible+Strong">Bible+Strong</option>';
		echo '</select>';
		echo '</div>';
		echo '<div>';
		echo '<label for="for-login">Only viewable for logged-in users:</label>';
		echo '<select id="for-login" name="for_login">';
		echo '<option value="0">False</option>';
		echo '<option value="1">True</option>';
		echo '</select>';
		echo '</div>';
		echo '</div>';
		
		echo '<div class="full-width">';
		echo '<label for="name-short">Name Short:</label>';
		echo '<textarea id="name-short" name="name_short" placeholder="Optional"></textarea>';
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
		echo '<input type="text" id="copyright" name="copyright" placeholder="Optional">';
		echo '</div>';
		
		echo '<div class="full-width">';
		echo '<label for="download-url">Download URL:</label>';
		echo '<textarea id="download-url" name="download_url" rows="5" placeholder="Leave blank will activate CSV upload function after save" required></textarea>';
		echo '</div>';
		
		echo '<div>';
		echo '<label for="rank">Display order:</label>';
		echo '<input type="number" id="rank" name="rank" min="0" placeholder="Optional">';
		echo '</div>';
		
		echo '<div>';
		echo '<label for="trim">Trim extra spaces between words:</label>';
		echo '<select id="trim" name="trim">';
		echo '<option value="0">No</option>';
		echo '<option value="1">Yes</option>';
		echo '</select>';
		echo '</div>';
		

		
		echo '</form>';
		echo '<div class="modal-actions bible-here-modal-actions">';
		echo '<div>';
		echo '<button type="button" id="save-version" class="btn-save">Save</button>';
		echo '<button type="button" id="delete-version" class="btn-delete bible-here-hidden">Delete version</button>';
		echo '<button type="button" id="cancel-modal" class="btn-cancel">Cancel</button>';
		echo '</div>';
		echo '<div id="duplicate-warning" class="duplicate-warning">';
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
		echo '<p>Please select a CSV file to upload. The quoted CSV should have headers in the following format:</p>';
		echo '<p><strong>Required fields:</strong> book_number, chapter_number, verse_number, verse_text</p>';
		echo '<p><strong>Optional fields:</strong> label</p>';
		echo '<table class="csv-format">';
		echo '    <caption><em>Note: label column is optional and can be omitted</em></caption>';
		echo '    <thead>';
		echo '        <tr>';
		echo '            <th>book_number,</th>';
		echo '            <th>chapter_number,</th>';
		echo '            <th>verse_number,</th>';
		echo '            <th>verse_text,</th>';
		
		echo '            <th>label</th>';
		echo '        </tr>';
		echo '    </thead>';
		echo '    <tbody>';
		echo '        <tr>';
		echo '            <td>1,</td>';
		echo '            <td>1,</td>';
		echo '            <td>1,</td>';
		echo '            <td>"In the beginning God created the heaven and the earth.",</td>';
		
		echo '            <td>"Creation"</td>';
		echo '        </tr>';
		echo '    </tbody>';
		echo '</table>';
		echo '<form id="upload-form" enctype="multipart/form-data">';
		echo '<input type="hidden" id="csv-version-id" name="version">';
		echo '<input type="hidden" id="csv-language" name="language">';
		echo '<input type="hidden" id="csv-table-name" name="table_name">';
		echo '<div class="bible-here-csv-section">';
		echo '<label for="csv-file">Upload CSV file:</label>';
		echo '<input type="file" id="csv-file" name="csv_file" accept=".csv" required class="bible-here-csv-file">';
		echo '</div>';
		echo '<div id="csv-progress" class="bible-here-csv-progress">';
		echo '<div class="progress-bar-container">';
		echo '<div class="progress-bar"></div>';
		echo '</div>';
		echo '<div id="csv-progress-text">Uploading...</div>';
		echo '</div>';
		echo '<div id="csv-result" class="bible-here-csv-result"></div>';
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
			wp_die('Security check failed in Bible_Here_Admin::handle_ajax_import()');
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
			wp_send_json(array('success' => false, 'message' => 'Security check failed in Bible_Here_Admin::handle_ajax_delete_version()'));
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
			
			// Drop the content table completely
			$content_table = $wpdb->prefix . $version_info->table_name;
			error_log('Bible_Here_Admin: Preparing to drop content table: ' . $content_table);
			
			// Check if table exists before dropping
			$table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$content_table}'");
			if ($table_exists) {
				$drop_result = $wpdb->query("DROP TABLE IF EXISTS `{$content_table}`");
				if ($drop_result === false) {
					error_log('Bible_Here_Admin: ❌ Failed to drop content table: ' . $wpdb->last_error);
					wp_send_json(array('success' => false, 'message' => 'Failed to drop content table'));
					return;
				}
				error_log('Bible_Here_Admin: ✅ Content table dropped successfully');
			} else {
				error_log('Bible_Here_Admin: ⚠️ Content table does not exist, skipping drop');
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
				'message' => 'Version data deleted successfully (table dropped, version record preserved)'
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
			wp_send_json_error('Security check failed in Bible_Here_Admin::handle_ajax_reload_csv()');
			return;
		}

		// Check user permissions
		if (!current_user_can('manage_options')) {
			error_log('Bible_Here_Admin: ❌ Insufficient user permissions');
			wp_send_json_error('Insufficient permissions for the user');
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
			wp_send_json_error(array('message' => 'Security check failed in Bible_Here_Admin::handle_ajax_save_version()'));
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
			wp_send_json_error(array('message' => 'Version not found'));
			return;
		}

		if (isset($_POST['table_name']) && ($_POST['table_name'] != $existing_data->table_name)){
			wp_send_json_error(array('message' => 'Table name cannot be changed for installed or uploaded versions'));
			return;
		}

		// Get form data and merge with existing data
		$table_name_value = sanitize_text_field($_POST['table_name'] ?? $existing_data->table_name);
		$language = sanitize_text_field($_POST['language'] ?? $existing_data->language);
		$abbreviation = sanitize_text_field($_POST['abbreviation'] ?? $existing_data->abbreviation);
		$name = sanitize_text_field($_POST['name'] ?? $existing_data->name);
		$name_short = sanitize_textarea_field($_POST['name_short'] ?? $existing_data->name_short);
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
			wp_send_json_error('Required fields are missing: table_name, language, abbreviation and name');
			return;
		}

		// Validate table name security - must start with 'bible_here'
		if (strpos($table_name_value, 'bible_here') !== 0) {
			wp_send_json_error('Table name must start with "bible_here" for security reasons');
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
				'name_short' => $name_short,
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
			
			// Send error with proper message format for frontend
			wp_send_json_error(array(
				'message' => $error_message ?: 'Failed to update version'
			));
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
			wp_send_json_error('Security check failed in Bible_Here_Admin::handle_ajax_add_version()');
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
		$name_short = sanitize_textarea_field($_POST['name_short'] ?? '');
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

		// Validate table name security - must start with 'bible_here'
		if (strpos($table_name_value, 'bible_here') !== 0) {
			wp_send_json_error('Table name must start with "bible_here" for security reasons');
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
				'name_short' => $name_short,
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
			
			// Send error with proper message format for frontend
			wp_send_json_error(array(
				'message' => $error_message ?: 'Failed to add version'
			));
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
			wp_send_json_error('Security check failed in Bible_Here_Admin::handle_ajax_delete_version_row()');
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
			wp_send_json_error('Security check failed in Bible_Here_Admin::handle_ajax_get_versions()');
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
			wp_send_json_error('Security check failed in Bible_Here_Admin::handle_ajax_get_version_data()');
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
			'name_short' => $version_data->name_short,
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
			wp_send_json_error('Security check failed in Bible_Here_Admin::handle_ajax_upload_csv()');
			return;
		}
		
		// Check user permissions
		if (!current_user_can('manage_options')) {
			wp_send_json_error('Insufficient permissions');
			return;
		}
		
		$version_id = intval($_POST['version_id'] ?? 0);
		$csv_data = $_POST['csv_data'] ?? '';
		$file_name = $_POST['file_name'] ?? '';
		
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
		
		// Create content table using unified method
		$content_table = $wpdb->prefix . $version_info->table_name;
		
		// Prepare table comment
		$table_comment = (!empty($file_name) ? 'From CSV: ' . $file_name : 'From CSV upload').' at '.date('c');
		
		// Use unified table creation method from Activator
		require_once plugin_dir_path(dirname(__FILE__)) . 'includes/class-bible-here-activator.php';
		$result = Bible_Here_Activator::create_version_content_table($content_table, $table_comment);
		if (!$result) {
			wp_send_json_error('Failed to create content table: ' . $wpdb->last_error);
			return;
		}
		
		// Insert CSV data using batch processing
		$inserted_count = 0;
		$error_count = 0;
		$errors = array();
		$batch_size = 1000;
		$valid_rows = array();
		
		// First pass: validate and prepare data
		foreach ($csv_rows as $index => $row) {
			// Handle both array format [0,1,2,3,4,5] and object format {book_number:1, chapter_number:1, verse_number:1, verse_text:"...", verse_strong:"...", label:"..."}
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
				$label = (count($row) > 4 && !empty($row[4])) ? sanitize_text_field($row[4]) : null;
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
				$label = !empty($row['label']) ? sanitize_text_field($row['label']) : null;
			}
			
			if ($book_number <= 0 || $chapter_number <= 0 || $verse_number <= 0) {
				$error_count++;
				$errors[] = "Row " . ($index + 1) . ": book_number, chapter_number, verse_number must be positive numbers";
				continue;
			}
			
			$valid_rows[] = array(
				'book_number' => $book_number,
				'chapter_number' => $chapter_number,
				'verse_number' => $verse_number,
				'verse_text' => $verse_text,
				'label' => $label
			);
		}
		
		// Second pass: batch insert valid data
		if (!empty($valid_rows)) {
			$batches = array_chunk($valid_rows, $batch_size);
			
			foreach ($batches as $batch_index => $batch) {
				$values = array();
				$placeholders = array();
				
				foreach ($batch as $row) {
					// Generate custom verse_id: 2-digit book + 3-digit chapter + 3-digit verse
					$custom_id = sprintf('%02d%03d%03d', $row['book_number'], $row['chapter_number'], $row['verse_number']);
					$values[] = $custom_id;
					$values[] = $row['book_number'];
					$values[] = $row['chapter_number'];
					$values[] = $row['verse_number'];
					$values[] = $row['verse_text'];
					$values[] = $row['label'];
					$placeholders[] = '(%s, %d, %d, %d, %s, %s)';
				}
				
				$sql = "REPLACE INTO `{$content_table}` (verse_id, book_number, chapter_number, verse_number, verse_text, label) VALUES " . implode(', ', $placeholders);
				$prepared_sql = $wpdb->prepare($sql, $values);
				
				$batch_result = $wpdb->query($prepared_sql);
				
				if ($batch_result !== false) {
					$inserted_count += count($batch);
				} else {
					$error_count += count($batch);
					$errors[] = "Batch " . ($batch_index + 1) . ": Database batch insert failed - " . $wpdb->last_error;
				}
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

	/**
	 * Display the cross references management page.
	 *
	 * @since    1.0.0
	 */
	public function display_cross_references_page() {
		// Check user permissions
		if (!current_user_can('manage_options')) {
			wp_die(__('You do not have sufficient permissions to access this page.'));
		}
		
		global $wpdb;
		$cross_ref_table = $wpdb->prefix . 'bible_here_cross_references';
		
		// Handle uninstall request
		if (isset($_POST['uninstall_cross_references']) && wp_verify_nonce($_POST['_wpnonce'], 'uninstall_cross_references')) {
			try {
				$wpdb->query("TRUNCATE TABLE {$cross_ref_table}");
				echo '<div class="notice notice-success"><p>Cross references data has been successfully removed.</p></div>';
			} catch (Exception $e) {
				echo '<div class="notice notice-error"><p>Failed to remove cross references data: ' . esc_html($e->getMessage()) . '</p></div>';
			}
		}
		
		// Handle import request
		if (isset($_POST['import_cross_references']) && wp_verify_nonce($_POST['_wpnonce'], 'import_cross_references')) {
			// Load the importer class
			require_once plugin_dir_path(dirname(__FILE__)) . 'includes/class-bible-here-xml-importer.php';
			
			$importer = new Bible_Here_XML_Importer('bible-here', '1.0.0');
			
			// Set time and memory limits
			set_time_limit(0);
			ini_set('memory_limit', '512M');
			
			// Start output buffering for progress display
			ob_start();

			echo '<div class="notice notice-info"><p>Starting cross references import from remote source...</p></div>';
			ob_flush();
			flush();

			try {
				$start_time = microtime(true);
				$result = $importer->import_cross_references();
				$time_taken = microtime(true) - $start_time;

				if ($result['success']) {
					echo '<div class="notice notice-success"><p>Cross references imported successfully from remote source! ' . number_format($result['imported_count']) . ' records imported in ' . number_format($time_taken, 2) . ' seconds.</p></div>';
				} else {
					echo '<div class="notice notice-error"><p>Import failed: ' . esc_html($result['message']) . '</p></div>';
				}
			} catch (Exception $e) {
				echo '<div class="notice notice-error"><p>Import failed in Bible_Here_Admin::display_cross_references_page() with exception: ' . esc_html($e->getMessage()) . '</p></div>';
			}
			
			ob_end_flush();
		}
		
		// Get current statistics
		$cross_ref_count = $wpdb->get_var("SELECT COUNT(*) FROM {$cross_ref_table}");
		$sample_records = $wpdb->get_results("SELECT verse_id, rank, start, finish FROM {$cross_ref_table} LIMIT 5");
		
		echo '<div class="wrap">';
		echo '<h1>Cross References Management</h1>';
		
		echo '<div class="cross-references-stats">';
		echo '<h2>Current Status</h2>';
		echo '<p><strong>Total Cross References:</strong> ' . number_format($cross_ref_count) . '</p>';
		
		if ($cross_ref_count > 0) {
			echo '<h3>Sample Records:</h3>';
			echo '<table class="wp-list-table widefat fixed striped">';
			echo '<thead><tr><th>Verse ID</th><th>Rank</th><th>Start</th><th>Finish</th></tr></thead>';
			echo '<tbody>';
			foreach ($sample_records as $record) {
				echo '<tr>';
				echo '<td>' . esc_html($record->verse_id) . '</td>';
				echo '<td>' . esc_html($record->rank) . '</td>';
				echo '<td>' . esc_html($record->start) . '</td>';
				echo '<td>' . esc_html($record->finish) . '</td>';
				echo '</tr>';
			}
			echo '</tbody></table>';
		}
		echo '</div>';
		
		echo '<div class="cross-references-import">';
		echo '<h2>Cross References Management</h2>';
		echo '<p>Manage cross reference data from remote source.</p>';
		
		// Check current database status
		if ($cross_ref_count > 0) {
			echo '<p><strong>Status:</strong> <span style="color: green;">✓ Installed ' . number_format($cross_ref_count) . ' 筆交叉引用記錄</span></p>';
			
			// Show uninstall form
			echo '<form method="post" action="" style="display: inline-block; margin-right: 10px;">';
			wp_nonce_field('uninstall_cross_references');
			echo '<input type="submit" name="uninstall_cross_references" class="button" value="Uninstall Cross References" onclick="return confirm(\'This will remove all cross reference data. Are you sure?\');" />';
			echo '</form>';

			// Show reinstall form
			// echo '<form method="post" action="" style="display: inline-block;">';
			// wp_nonce_field('import_cross_references');
			// echo '<input type="submit" name="import_cross_references" class="button-primary" value="Reinstall Cross References" onclick="return confirm(\'This will replace all existing cross reference data. Are you sure?\');" />';
			// echo '</form>';
		} else {
			echo '<p><strong>Status:</strong> <span style="color: red;">✗ No cross reference data installed yet</span></p>';
			
			// Show install form
			echo '<form method="post" action="">';
			wp_nonce_field('import_cross_references');
			echo '<p class="submit">';
			echo '<input type="submit" name="import_cross_references" class="button-primary" value="Install Cross References" />';
			echo '</p>';
			echo '</form>';
		}
		echo '</div>';
		
		echo '</div>';
	}

	/**
	 * Auto-check and import cross references on admin init
	 *
	 * @since    1.0.0
	 */
	public function auto_import_cross_references() {
		// Only run this check once per session to avoid repeated checks
		if (get_transient('bible_here_cross_ref_check_done')) {
			return;
		}
		
		// Set transient to prevent repeated checks (expires in 1 hour)
		set_transient('bible_here_cross_ref_check_done', true, HOUR_IN_SECONDS);
		
		global $wpdb;
		$cross_ref_table = $wpdb->prefix . 'bible_here_cross_references';
		
		// Check if cross references table exists and has data
		$table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$cross_ref_table}'") === $cross_ref_table;
		
		if (!$table_exists) {
			// Table doesn't exist, let the normal activation process handle it
			return;
		}
		
		$cross_ref_count = $wpdb->get_var("SELECT COUNT(*) FROM {$cross_ref_table}");
		
		// If no cross references exist, check if zip file is available and import
		if ($cross_ref_count == 0) {
			$zip_path = plugin_dir_path(dirname(__FILE__)) . 'data/cross_references.zip';
			
			if (file_exists($zip_path)) {
				// Load the importer class
				require_once plugin_dir_path(dirname(__FILE__)) . 'includes/class-bible-here-xml-importer.php';
				
				try {
					$importer = new Bible_Here_XML_Importer('bible-here', '1.0.0');
					$result = $importer->import_cross_references();
					
					if ($result['success']) {
						// Log successful auto-import
						error_log('Bible Here: Auto-imported ' . number_format($result['imported_count']) . ' cross references successfully.');
						
						// Show admin notice for successful import
						add_action('admin_notices', function() use ($result) {
							echo '<div class="notice notice-success is-dismissible">';
							echo '<p><strong>Bible Here:</strong> Cross references data has been automatically imported (' . number_format($result['imported_count']) . ' records).</p>';
							echo '</div>';
						});
					} else {
						// Log import failure
						error_log('Bible Here: Auto-import of cross references failed: ' . $result['error']);
					}
				} catch (Exception $e) {
					// Log exception
					error_log('Bible Here: Auto-import of cross references failed with exception: ' . $e->getMessage());
				}
			}
		}
	}

}
