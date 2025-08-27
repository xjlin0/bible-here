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
			'Versions',
			'Versions',
			'manage_options',
			'bible-here-versions',
			array($this, 'display_versions_page')
		);

		add_submenu_page(
			'bible-here',
			'Settings',
			'Settings',
			'manage_options',
			'bible-here-settings',
			array($this, 'display_settings_page')
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

		// Get statistics
		$books_count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}bible_here_books");
		$genres_count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}bible_here_genres");
		$versions_count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}bible_here_versions");

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
		error_log('Bible_Here_Admin: ========== AJAX匯入請求開始 ==========');
		error_log('Bible_Here_Admin: 收到AJAX匯入請求，時間戳: ' . date('Y-m-d H:i:s'));
		error_log('Bible_Here_Admin: 請求來源IP: ' . $_SERVER['REMOTE_ADDR']);
		error_log('Bible_Here_Admin: 用戶代理: ' . $_SERVER['HTTP_USER_AGENT']);
		
		// Log all POST data for debugging
		error_log('Bible_Here_Admin: POST數據: ' . print_r($_POST, true));
		
		// Get language and version from POST parameters
		$language = sanitize_text_field($_POST['language'] ?? 'en');
		$version = sanitize_text_field($_POST['version'] ?? 'kjv');
		
		error_log('Bible_Here_Admin: 從POST參數獲取 -> 語言: ' . $language . ', 版本: ' . $version);
		
		// Verify nonce
		error_log('Bible_Here_Admin: 開始Nonce驗證...');
		if (!wp_verify_nonce($_POST['nonce'], 'bible_here_ajax_nonce')) {
			error_log('Bible_Here_Admin: ❌ Nonce驗證失敗');
			error_log('Bible_Here_Admin: 提供的Nonce: ' . $_POST['nonce']);
			wp_die('Security check failed');
		}
		error_log('Bible_Here_Admin: ✅ Nonce驗證成功');
		
		// Check user permissions
		error_log('Bible_Here_Admin: 開始用戶權限檢查...');
		if (!current_user_can('manage_options')) {
			error_log('Bible_Here_Admin: ❌ 用戶權限不足，當前用戶ID: ' . get_current_user_id());
			wp_die('Insufficient permissions');
		}
		error_log('Bible_Here_Admin: ✅ 用戶權限檢查通過，用戶ID: ' . get_current_user_id());
		
		// Initialize XML importer
		$xml_importer_file = plugin_dir_path(dirname(__FILE__)) . 'includes/class-bible-here-xml-importer.php';
		error_log('Bible_Here_Admin: XML匯入器檔案路徑: ' . $xml_importer_file);
		error_log('Bible_Here_Admin: 檢查檔案是否存在...');
		
		if (!file_exists($xml_importer_file)) {
			error_log('Bible_Here_Admin: ❌ XML匯入器檔案不存在');
			error_log('Bible_Here_Admin: 當前工作目錄: ' . getcwd());
			error_log('Bible_Here_Admin: 插件目錄: ' . plugin_dir_path(dirname(__FILE__)));
			wp_send_json_error('XML importer file not found');
			return;
		}
		
		error_log('Bible_Here_Admin: ✅ XML匯入器檔案存在，開始載入...');
		require_once $xml_importer_file;
		
		try {
			$xml_importer = new Bible_Here_XML_Importer($this->plugin_name, $this->version);
			error_log('Bible_Here_Admin: ✅ XML匯入器初始化成功');
		} catch (Exception $e) {
			error_log('Bible_Here_Admin: ❌ XML匯入器初始化失敗: ' . $e->getMessage());
			error_log('Bible_Here_Admin: 錯誤堆疊: ' . $e->getTraceAsString());
			wp_send_json_error('XML importer initialization failed: ' . $e->getMessage());
			return;
		}
		
		// Import based on language and version
		error_log('Bible_Here_Admin: 開始執行版本匯入，語言: ' . $language . ', 版本: ' . $version);
		$import_start_time = microtime(true);
		
		// Determine import method based on language and version
		if ($language === 'en' && $version === 'kjv') {
			error_log('Bible_Here_Admin: 執行英文KJV聖經匯入...');
			try {
				$result = $xml_importer->import_kjv_bible();
				error_log('Bible_Here_Admin: KJV匯入方法執行完成');
			} catch (Exception $e) {
				error_log('Bible_Here_Admin: ❌ KJV匯入過程中發生異常: ' . $e->getMessage());
				error_log('Bible_Here_Admin: 異常堆疊: ' . $e->getTraceAsString());
				$result = [
					'success' => false,
					'message' => 'Import failed with exception: ' . $e->getMessage()
				];
			}
		} else {
			error_log('Bible_Here_Admin: ❌ 不支援的語言/版本組合: ' . $language . '/' . $version);
			$result = [
				'success' => false,
				'message' => 'Import for language "' . strtoupper($language) . '" and version "' . strtoupper($version) . '" is not yet implemented.'
			];
		}
		
		$import_duration = microtime(true) - $import_start_time;
		error_log('Bible_Here_Admin: 匯入流程完成，耗時: ' . round($import_duration, 2) . ' 秒');
		error_log('Bible_Here_Admin: 匯入結果: ' . ($result['success'] ? '✅ 成功' : '❌ 失敗'));
		
		if (!$result['success']) {
			if (isset($result['data'])) {
				error_log('Bible_Here_Admin: 錯誤數據: ' . print_r($result['data'], true));
			}
			if (isset($result['message'])) {
				error_log('Bible_Here_Admin: 錯誤訊息: ' . $result['message']);
			}
		} else {
			if (isset($result['message'])) {
				error_log('Bible_Here_Admin: 成功訊息: ' . $result['message']);
			}
			if (isset($result['imported_count'])) {
				error_log('Bible_Here_Admin: 匯入數量: ' . $result['imported_count'] . ' 節經文');
			}
		}
		
		error_log('Bible_Here_Admin: ========== AJAX匯入請求結束 ==========');
		
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
		error_log('Bible_Here_Admin: ========== AJAX刪除版本請求開始 ==========');
		error_log('Bible_Here_Admin: 收到AJAX刪除版本請求，時間戳: ' . date('Y-m-d H:i:s'));
		
		// Verify nonce for security
		if (!wp_verify_nonce($_POST['nonce'], 'bible_here_ajax_nonce')) {
			error_log('Bible_Here_Admin: ❌ Nonce驗證失敗');
			wp_send_json(array('success' => false, 'message' => 'Security check failed'));
			return;
		}
		
		// Check user permissions
		if (!current_user_can('manage_options')) {
			error_log('Bible_Here_Admin: ❌ 用戶權限不足');
			wp_send_json(array('success' => false, 'message' => 'Insufficient permissions'));
			return;
		}
		
		$version = sanitize_text_field($_POST['version']);
		error_log('Bible_Here_Admin: 要刪除的版本: ' . $version);
		
		global $wpdb;
		
		try {
			// Get version info from database
			$version_table = $wpdb->prefix . 'bible_here_versions';
			$version_info = $wpdb->get_row($wpdb->prepare(
				"SELECT * FROM {$version_table} WHERE abbreviation = %s",
				$version
			));
			
			if (!$version_info) {
				error_log('Bible_Here_Admin: ❌ 找不到版本: ' . $version);
				wp_send_json(array('success' => false, 'message' => 'Version not found'));
				return;
			}
			
			// Check if version is imported (rank is not null)
			if (is_null($version_info->rank)) {
				error_log('Bible_Here_Admin: ❌ 版本未匯入，無需刪除: ' . $version);
				wp_send_json(array('success' => false, 'message' => 'Version is not imported'));
				return;
			}
			
			// Drop the content table
			$content_table = $wpdb->prefix . $version_info->table_name;
			error_log('Bible_Here_Admin: 準備刪除內容表格: ' . $content_table);
			
			$drop_result = $wpdb->query("DROP TABLE IF EXISTS `{$content_table}`");
			if ($drop_result === false) {
				error_log('Bible_Here_Admin: ❌ 刪除內容表格失敗: ' . $wpdb->last_error);
				wp_send_json(array('success' => false, 'message' => 'Failed to delete content table'));
				return;
			}
			error_log('Bible_Here_Admin: ✅ 內容表格刪除成功');
			
			// Reset rank to null in versions table
			$update_result = $wpdb->update(
				$version_table,
				array('rank' => null),
				array('abbreviation' => $version),
				array('%s'),
				array('%s')
			);
			
			if ($update_result === false) {
				error_log('Bible_Here_Admin: ❌ 重置rank失敗: ' . $wpdb->last_error);
				wp_send_json(array('success' => false, 'message' => 'Failed to reset version status'));
				return;
			}
			error_log('Bible_Here_Admin: ✅ 版本rank重置成功');
			
			$result = array(
				'success' => true,
				'message' => 'Version deleted successfully'
			);
			
		} catch (Exception $e) {
			error_log('Bible_Here_Admin: ❌ 刪除版本過程中發生異常: ' . $e->getMessage());
			$result = array(
				'success' => false,
				'message' => 'Delete failed with exception: ' . $e->getMessage()
			);
		}
		
		error_log('Bible_Here_Admin: 刪除版本結果: ' . print_r($result, true));
		error_log('Bible_Here_Admin: ========== AJAX刪除版本請求結束 ==========');
		
		// Send JSON response
		wp_send_json($result);
	}
	
	/**
	 * Display the settings page.
	 *
	 * @since    1.0.0
	 */
	public function display_settings_page() {
		// Check user permissions
		if (!current_user_can('manage_options')) {
			wp_die(__('You do not have sufficient permissions to access this page.'));
		}
		
		global $wpdb;
		
		// 查詢所有聖經版本，按 rank 排序
		$versions = $wpdb->get_results(
			"SELECT * FROM {$wpdb->prefix}bible_here_versions ORDER BY rank ASC"
		);
		
		// 獲取當前設定的預設版本，如果沒有設定則使用 rank 最低的版本
		$current_default = get_option('bible_here_default_version');
		if (empty($current_default) && !empty($versions)) {
			$current_default = $versions[0]->abbreviation;
		}
		
		?>
		<div class="wrap">
			<h1>Bible Here Settings</h1>
			<form method="post" action="options.php">
				<?php
				settings_fields('bible_here_settings');
				do_settings_sections('bible_here_settings');
				?>
				<table class="form-table">
					<tr>
						<th scope="row">Default Bible Version</th>
						<td>
							<select name="bible_here_default_version">
								<?php if (!empty($versions)): ?>
									<?php foreach ($versions as $version): ?>
										<option value="<?php echo esc_attr($version->abbreviation); ?>" 
											<?php selected($current_default, $version->abbreviation); ?>>
											<?php echo esc_html($version->name . ' (' . $version->abbreviation . ')'); ?>
										</option>
									<?php endforeach; ?>
								<?php else: ?>
									<option value="">No versions available</option>
								<?php endif; ?>
							</select>
							<p class="description">The version with the lowest rank value is automatically set as default.</p>
						</td>
					</tr>
				</table>
				<?php submit_button(); ?>
			</form>
		</div>
		<?php
	}

	/**
	 * Handle AJAX reload CSV data request
	 *
	 * @since    1.0.0
	 */
	public function handle_ajax_reload_csv() {
		error_log('Bible_Here_Admin: ========== AJAX重新載入CSV請求開始 ==========');
		error_log('Bible_Here_Admin: 收到AJAX重新載入CSV請求，時間戳: ' . date('Y-m-d H:i:s'));
		
		// Verify nonce for security
		if (!wp_verify_nonce($_POST['nonce'], 'bible_here_ajax_nonce')) {
			error_log('Bible_Here_Admin: ❌ Nonce驗證失敗');
			wp_send_json_error('Security check failed');
			return;
		}
		
		// Check user permissions
		if (!current_user_can('manage_options')) {
			error_log('Bible_Here_Admin: ❌ 用戶權限不足');
			wp_send_json_error('Insufficient permissions');
			return;
		}
		
		try {
			// Load the activator class to use its CSV loading functionality
			$activator_file = plugin_dir_path(dirname(__FILE__)) . 'includes/class-bible-here-activator.php';
			if (!file_exists($activator_file)) {
				error_log('Bible_Here_Admin: ❌ Activator檔案不存在');
				wp_send_json_error('Activator file not found');
				return;
			}
			
			require_once $activator_file;
			
			// Call the CSV loading method with force reload
			error_log('Bible_Here_Admin: 開始重新載入CSV資料...');
			$result = Bible_Here_Activator::load_csv_data(true);
			
			if ($result) {
				error_log('Bible_Here_Admin: ✅ CSV資料重新載入成功');
				wp_send_json_success('CSV data reloaded successfully! Books, genres, and versions have been updated from CSV files.');
			} else {
				error_log('Bible_Here_Admin: ❌ CSV資料重新載入失敗');
				wp_send_json_error('Failed to reload CSV data');
			}
			
		} catch (Exception $e) {
			error_log('Bible_Here_Admin: ❌ 重新載入CSV過程中發生異常: ' . $e->getMessage());
			error_log('Bible_Here_Admin: 異常堆疊: ' . $e->getTraceAsString());
			wp_send_json_error('CSV reload failed with exception: ' . $e->getMessage());
		}
		
		error_log('Bible_Here_Admin: ========== AJAX重新載入CSV請求結束 ==========');
	}

}
