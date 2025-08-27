<?php

/**
 * The XML import functionality of the plugin.
 *
 * @link       https://example.com
 * @since      1.0.0
 *
 * @package    Bible_Here
 * @subpackage Bible_Here/includes
 */

/**
 * The XML import functionality of the plugin.
 *
 * Defines the plugin name, version, and handles XML import operations.
 *
 * @package    Bible_Here
 * @subpackage Bible_Here/includes
 * @author     Your Name <email@example.com>
 */
class Bible_Here_XML_Importer {

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

		error_log('Bible_Here_XML_Importer: 類別初始化完成');
	}

	/**
	 * Import KJV Bible from Zefania XML
	 *
	 * @since    1.0.0
	 * @return   array    Result array with success status and message
	 */
	public function import_kjv_bible() {
		error_log('Bible_Here_XML_Importer: 開始KJV聖經匯入流程');
		
		$start_time = microtime(true);
		
		try {
			// Step 1: Get KJV download URL from database
			$download_url = $this->get_kjv_download_url();
			if (!$download_url) {
				error_log('Bible_Here_XML_Importer: 錯誤 - 無法取得經文下載URL');
				return array('success' => false, 'message' => '無法取得經文下載URL');
			}
			error_log('Bible_Here_XML_Importer: 經文下載URL取得成功: ' . $download_url);

			// Step 2: Download ZIP file
			$zip_file_path = $this->download_zip_file($download_url);
			if (!$zip_file_path) {
				error_log('Bible_Here_XML_Importer: 錯誤 - ZIP檔案下載失敗');
				return array('success' => false, 'message' => 'ZIP檔案下載失敗');
			}
			error_log('Bible_Here_XML_Importer: ZIP檔案下載成功: ' . $zip_file_path);

			// Additional download confirmation log
			if (file_exists($zip_file_path)) {
				$file_size = filesize($zip_file_path);
				$file_size_kb = round($file_size / 1024, 2);
				$file_size_mb = round($file_size / (1024 * 1024), 2);
				error_log('Bible_Here_XML_Importer: 檔案下載確認 - 檔案存在: ' . $zip_file_path);
				error_log('Bible_Here_XML_Importer: 檔案下載確認 - 檔案大小: ' . $file_size . ' bytes (' . $file_size_kb . ' KB, ' . $file_size_mb . ' MB)');
				
				// Check if file is readable
				if (is_readable($zip_file_path)) {
					error_log('Bible_Here_XML_Importer: 檔案下載確認 - 檔案可讀取');
				} else {
					error_log('Bible_Here_XML_Importer: 檔案下載確認 - 警告：檔案無法讀取');
				}
				
				// Verify file is not empty
				if ($file_size > 0) {
					error_log('Bible_Here_XML_Importer: 檔案下載確認 - 檔案非空');
				} else {
					error_log('Bible_Here_XML_Importer: 檔案下載確認 - 錯誤：檔案為空');
				}
			} else {
				error_log('Bible_Here_XML_Importer: 檔案下載確認 - 錯誤：檔案不存在: ' . $zip_file_path);
			}

			// Step 3: Extract XML file from ZIP
			$xml_file_path = $this->extract_xml_from_zip($zip_file_path);
			if (!$xml_file_path) {
				error_log('Bible_Here_XML_Importer: 錯誤 - XML檔案解壓縮失敗');
				return array('success' => false, 'message' => 'XML檔案解壓縮失敗');
			}
			error_log('Bible_Here_XML_Importer: XML檔案解壓縮成功: ' . $xml_file_path);

			// Step 4: Parse XML file
			$bible_data = $this->parse_zefania_xml($xml_file_path);
			if (!$bible_data) {
				error_log('Bible_Here_XML_Importer: 錯誤 - XML解析失敗');
				return array('success' => false, 'message' => 'XML解析失敗');
			}
			error_log('Bible_Here_XML_Importer: XML解析成功，共解析 ' . count($bible_data) . ' 節經文');

			// Step 5: Create version-specific content table
			$table_created = $this->create_version_content_table('kjv');
			if (!$table_created) {
				error_log('Bible_Here_XML_Importer: 錯誤 - 經文內容表格創建失敗');
				return array('success' => false, 'message' => '經文內容表格創建失敗');
			}
			error_log('Bible_Here_XML_Importer: 經文內容表格創建成功');

			// Step 6: Import bible data to database
			$import_result = $this->import_bible_data($bible_data, 'kjv');
			if (!$import_result['success']) {
				error_log('Bible_Here_XML_Importer: 錯誤 - 聖經數據匯入失敗: ' . $import_result['message']);
				return $import_result;
			}
			error_log('Bible_Here_XML_Importer: 聖經數據匯入成功，共匯入 ' . $import_result['imported_count'] . ' 節經文');

			// Step 7: Update version rank to 0 after successful import
			$this->update_version_rank('kjv', 0);
			error_log('Bible_Here_XML_Importer: 經文版本rank已更新為0');

			// Step 8: Clean up temporary files
			$this->cleanup_temp_files($zip_file_path, $xml_file_path);
			error_log('Bible_Here_XML_Importer: 臨時檔案清理完成');

			$end_time = microtime(true);
			$execution_time = round($end_time - $start_time, 2);
			error_log('Bible_Here_XML_Importer: 聖經匯入流程完成，總耗時: ' . $execution_time . ' 秒');

			return array(
				'success' => true, 
				'message' => 'KJV聖經匯入成功',
				'imported_count' => $import_result['imported_count'],
				'execution_time' => $execution_time
			);

		} catch (Exception $e) {
			error_log('Bible_Here_XML_Importer: 匯入過程發生異常: ' . $e->getMessage());
			return array('success' => false, 'message' => '匯入過程發生異常: ' . $e->getMessage());
		}
	}

	/**
	 * Get KJV download URL from database
	 *
	 * @since    1.0.0
	 * @return   string|false    Download URL or false on failure
	 */
	private function get_kjv_download_url() {
		global $wpdb;
		
		error_log('Bible_Here_XML_Importer: 開始從資料庫取得KJV下載URL');
		
		$table_name = $wpdb->prefix . 'bible_here_versions';
		$result = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT download_url FROM {$table_name} WHERE abbreviation = %s",
				'kjv'
			)
		);
		
		// Convert GitHub blob URL to raw download URL
		if ($result && strpos($result, 'github.com') !== false && strpos($result, '/blob/') !== false) {
			$result = str_replace('github.com', 'raw.githubusercontent.com', $result);
			$result = str_replace('/blob/', '/', $result);
			error_log('Bible_Here_XML_Importer: 轉換GitHub URL為直接下載連結: ' . $result);
		}
		
		if ($wpdb->last_error) {
			error_log('Bible_Here_XML_Importer: 資料庫查詢錯誤: ' . $wpdb->last_error);
			return false;
		}
		
		if (!$result) {
			error_log('Bible_Here_XML_Importer: 未找到KJV版本的下載URL');
			return false;
		}
		
		error_log('Bible_Here_XML_Importer: 成功取得KJV下載URL');
		return $result;
	}

	/**
	 * Download ZIP file from URL
	 *
	 * @since    1.0.0
	 * @param    string    $url    Download URL
	 * @return   string|false    Local file path or false on failure
	 */
	private function download_zip_file($url) {
		error_log('Bible_Here_XML_Importer: 開始下載ZIP檔案: ' . $url);
		
		$upload_dir = wp_upload_dir();
		$temp_dir = $upload_dir['basedir'] . '/bible-here-temp/';
		
		// Create temp directory if not exists
		if (!file_exists($temp_dir)) {
			wp_mkdir_p($temp_dir);
			error_log('Bible_Here_XML_Importer: 創建臨時目錄: ' . $temp_dir);
		}
		
		$zip_filename = 'kjv_bible_' . date('Y-m-d_H-i-s') . '.zip';
		$zip_file_path = $temp_dir . $zip_filename;
		
		error_log('Bible_Here_XML_Importer: 目標檔案路徑: ' . $zip_file_path);
		
		// Use WordPress HTTP API for download
		error_log('Bible_Here_XML_Importer: 開始HTTP請求，URL: ' . $url);
		error_log('Bible_Here_XML_Importer: 請求參數 - timeout: 300, stream: true, filename: ' . $zip_file_path);
		
		$response = wp_remote_get($url, array(
			'timeout' => 300, // 5 minutes timeout
			'stream' => true,
			'filename' => $zip_file_path
		));
		
		error_log('Bible_Here_XML_Importer: HTTP請求完成');
		
		if (is_wp_error($response)) {
			$error_code = $response->get_error_code();
			$error_message = $response->get_error_message();
			$error_data = $response->get_error_data();
			error_log('Bible_Here_XML_Importer: 下載失敗 - WP錯誤代碼: ' . $error_code);
			error_log('Bible_Here_XML_Importer: 下載失敗 - WP錯誤訊息: ' . $error_message);
			if ($error_data) {
				error_log('Bible_Here_XML_Importer: 下載失敗 - WP錯誤數據: ' . print_r($error_data, true));
			}
			return false;
		}
		
		$response_code = wp_remote_retrieve_response_code($response);
		$response_message = wp_remote_retrieve_response_message($response);
		$response_headers = wp_remote_retrieve_headers($response);
		
		error_log('Bible_Here_XML_Importer: HTTP響應狀態碼: ' . $response_code);
		error_log('Bible_Here_XML_Importer: HTTP響應訊息: ' . $response_message);
		
		// 詳細記錄響應標頭
		if (isset($response_headers['content-length'])) {
			$expected_size = (int)$response_headers['content-length'];
			$expected_size_kb = round($expected_size / 1024, 2);
			$expected_size_mb = round($expected_size / (1024 * 1024), 2);
			error_log('Bible_Here_XML_Importer: 響應Content-Length: ' . $expected_size . ' bytes (' . $expected_size_kb . ' KB, ' . $expected_size_mb . ' MB)');
		}
		if (isset($response_headers['content-type'])) {
			$content_type = $response_headers['content-type'];
			error_log('Bible_Here_XML_Importer: 響應Content-Type: ' . $content_type);
			
			// 檢查 Content-Type 是否為 ZIP 檔案
			if (strpos($content_type, 'application/zip') === false && 
			    strpos($content_type, 'application/x-zip') === false && 
			    strpos($content_type, 'application/octet-stream') === false) {
				error_log('Bible_Here_XML_Importer: 警告 - Content-Type 不是 ZIP 檔案格式: ' . $content_type);
				error_log('Bible_Here_XML_Importer: 可能下載到錯誤頁面或非ZIP檔案');
			}
		}
		
		// 檢查 HTTP 狀態碼
		if ($response_code !== 200) {
			error_log('Bible_Here_XML_Importer: 下載失敗 - HTTP狀態碼: ' . $response_code . ' (' . $response_message . ')');
			if ($response_code === 404) {
				error_log('Bible_Here_XML_Importer: 檔案不存在 (404)，請檢查下載URL是否正確');
			} elseif ($response_code === 403) {
				error_log('Bible_Here_XML_Importer: 存取被拒絕 (403)，請檢查檔案權限');
			} elseif ($response_code >= 500) {
				error_log('Bible_Here_XML_Importer: 伺服器錯誤 (' . $response_code . ')，請稍後再試');
			}
			return false;
		}
		
		if (!file_exists($zip_file_path)) {
			error_log('Bible_Here_XML_Importer: 下載失敗 - 檔案不存在: ' . $zip_file_path);
			return false;
		}
		
		// 檢查下載後的檔案是否存在
		if (!file_exists($zip_file_path)) {
			error_log('Bible_Here_XML_Importer: 下載失敗 - 檔案不存在: ' . $zip_file_path);
			error_log('Bible_Here_XML_Importer: 可能原因：下載失敗、權限問題或磁碟空間不足');
			return false;
		}
		
		$file_size = filesize($zip_file_path);
		$file_size_kb = round($file_size / 1024, 2);
		$file_size_mb = round($file_size / (1024 * 1024), 2);
		
		error_log('Bible_Here_XML_Importer: ZIP檔案下載成功');
		error_log('Bible_Here_XML_Importer: 檔案路徑: ' . $zip_file_path);
		error_log('Bible_Here_XML_Importer: 實際檔案大小: ' . $file_size . ' bytes (' . $file_size_kb . ' KB, ' . $file_size_mb . ' MB)');
		
		// 與預期大小比較（如果有 Content-Length）
		if (isset($expected_size) && $expected_size > 0) {
			if ($file_size !== $expected_size) {
				error_log('Bible_Here_XML_Importer: 警告 - 檔案大小不符預期');
				error_log('Bible_Here_XML_Importer: 預期大小: ' . $expected_size . ' bytes, 實際大小: ' . $file_size . ' bytes');
				error_log('Bible_Here_XML_Importer: 差異: ' . abs($expected_size - $file_size) . ' bytes');
			} else {
				error_log('Bible_Here_XML_Importer: 檔案大小驗證通過，與預期大小一致');
			}
		}
		
		// 檢查檔案大小是否合理（大於 500KB）
		if ($file_size < 512000) { // 500KB = 512000 bytes
			error_log('Bible_Here_XML_Importer: 下載失敗 - 檔案大小過小 (' . $file_size_kb . ' KB)，預期應大於 500KB');
			error_log('Bible_Here_XML_Importer: 可能原因：下載不完整、檔案損壞或伺服器返回錯誤頁面');
			
			// 檢查檔案內容前幾個字節
			$file_content = file_get_contents($zip_file_path, false, null, 0, 100);
			if ($file_content) {
				error_log('Bible_Here_XML_Importer: 檔案前100字節內容: ' . substr($file_content, 0, 100));
				if (strpos($file_content, '<html') !== false || strpos($file_content, '<!DOCTYPE') !== false) {
					error_log('Bible_Here_XML_Importer: 檔案內容似乎是HTML頁面，不是ZIP檔案');
				}
			}
			
			// 清理無效檔案
			unlink($zip_file_path);
			return false;
		}
		
		// 驗證 ZIP 檔案簽名（前4個字節應該是 "PK"）
		$file_signature = file_get_contents($zip_file_path, false, null, 0, 4);
		if ($file_signature) {
			$hex_signature = bin2hex($file_signature);
			error_log('Bible_Here_XML_Importer: 檔案簽名（前4字節）: ' . $hex_signature);
			
			// ZIP 檔案的魔術數字：50 4B 03 04 (PK..)
			if (substr($hex_signature, 0, 4) !== '504b') {
				error_log('Bible_Here_XML_Importer: 警告 - 檔案簽名不符合ZIP格式');
				error_log('Bible_Here_XML_Importer: 預期簽名: 504b (PK), 實際簽名: ' . substr($hex_signature, 0, 4));
				error_log('Bible_Here_XML_Importer: 檔案可能不是有效的ZIP檔案');
				
				// 顯示檔案前100字節以供調試
				$debug_content = file_get_contents($zip_file_path, false, null, 0, 100);
				if ($debug_content) {
					error_log('Bible_Here_XML_Importer: 檔案前100字節內容: ' . $debug_content);
				}
				
				// 清理無效檔案
				unlink($zip_file_path);
				return false;
			} else {
				error_log('Bible_Here_XML_Importer: ZIP檔案簽名驗證通過');
			}
		} else {
			error_log('Bible_Here_XML_Importer: 警告 - 無法讀取檔案簽名');
		}
		
		error_log('Bible_Here_XML_Importer: 檔案大小檢查通過 (' . $file_size_kb . ' KB > 500KB)');
		
		return $zip_file_path;
	}

	/**
	 * Extract XML file from ZIP archive
	 *
	 * @since    1.0.0
	 * @param    string    $zip_file_path    Path to ZIP file
	 * @return   string|false    Path to extracted XML file or false on failure
	 */
	private function extract_xml_from_zip($zip_file_path) {
		error_log('Bible_Here_XML_Importer: 開始解壓縮ZIP檔案: ' . $zip_file_path);
		
		// Check if ZIP file exists before processing
		if (!file_exists($zip_file_path)) {
			error_log('Bible_Here_XML_Importer: 錯誤 - ZIP檔案不存在: ' . $zip_file_path);
			return false;
		}
		
		$zip_file_size = filesize($zip_file_path);
		error_log('Bible_Here_XML_Importer: ZIP檔案存在性檢查通過，檔案大小: ' . round($zip_file_size / 1024, 2) . ' KB');
		
		if (!class_exists('ZipArchive')) {
			error_log('Bible_Here_XML_Importer: 錯誤 - ZipArchive類別不存在，請檢查PHP是否安裝zip擴展');
			return false;
		}
		
		error_log('Bible_Here_XML_Importer: ZipArchive類別檢查通過');
		
		$zip = new ZipArchive();
		$result = $zip->open($zip_file_path);
		
		if ($result !== TRUE) {
			$error_messages = [
				ZipArchive::ER_OK => 'No error',
				ZipArchive::ER_MULTIDISK => 'Multi-disk zip archives not supported',
				ZipArchive::ER_RENAME => 'Renaming temporary file failed',
				ZipArchive::ER_CLOSE => 'Closing zip archive failed',
				ZipArchive::ER_SEEK => 'Seek error',
				ZipArchive::ER_READ => 'Read error',
				ZipArchive::ER_WRITE => 'Write error',
				ZipArchive::ER_CRC => 'CRC error',
				ZipArchive::ER_ZIPCLOSED => 'Containing zip archive was closed',
				ZipArchive::ER_NOENT => 'No such file',
				ZipArchive::ER_EXISTS => 'File already exists',
				ZipArchive::ER_OPEN => 'Can not open file',
				ZipArchive::ER_TMPOPEN => 'Failure to create temporary file',
				ZipArchive::ER_ZLIB => 'Zlib error',
				ZipArchive::ER_MEMORY => 'Memory allocation failure',
				ZipArchive::ER_CHANGED => 'Entry has been changed',
				ZipArchive::ER_COMPNOTSUPP => 'Compression method not supported',
				ZipArchive::ER_EOF => 'Premature EOF',
				ZipArchive::ER_INVAL => 'Invalid argument',
				ZipArchive::ER_NOZIP => 'Not a zip archive',
				ZipArchive::ER_INTERNAL => 'Internal error',
				ZipArchive::ER_INCONS => 'Zip archive inconsistent',
				ZipArchive::ER_REMOVE => 'Can not remove file',
				ZipArchive::ER_DELETED => 'Entry has been deleted'
			];
			$error_message = isset($error_messages[$result]) ? $error_messages[$result] : 'Unknown error';
			error_log('Bible_Here_XML_Importer: ZIP檔案開啟失敗，錯誤代碼: ' . $result . ' (' . $error_message . ')');
			return false;
		}
		
		error_log('Bible_Here_XML_Importer: ZIP檔案開啟成功，包含 ' . $zip->numFiles . ' 個檔案');
		
		// List all files in ZIP for debugging
		error_log('Bible_Here_XML_Importer: ZIP檔案內容列表:');
		for ($i = 0; $i < $zip->numFiles; $i++) {
			$file_info = $zip->statIndex($i);
			$filename = $file_info['name'];
			$file_size = $file_info['size'];
			$compressed_size = $file_info['comp_size'];
			$file_extension = pathinfo($filename, PATHINFO_EXTENSION);
			error_log('Bible_Here_XML_Importer: [' . ($i + 1) . '] ' . $filename . ' (大小: ' . $file_size . ' bytes, 壓縮後: ' . $compressed_size . ' bytes, 副檔名: ' . $file_extension . ')');
		}
		
		// Find XML file in ZIP
		$xml_file_name = null;
		error_log('Bible_Here_XML_Importer: 開始搜尋XML檔案...');
		for ($i = 0; $i < $zip->numFiles; $i++) {
			$file_info = $zip->statIndex($i);
			$filename = $file_info['name'];
			$file_extension = pathinfo($filename, PATHINFO_EXTENSION);
			
			if ($file_extension === 'xml') {
				$xml_file_name = $filename;
				error_log('Bible_Here_XML_Importer: 找到XML檔案: ' . $xml_file_name . ' (大小: ' . $file_info['size'] . ' bytes)');
				break;
			}
		}
		
		if (!$xml_file_name) {
			error_log('Bible_Here_XML_Importer: 錯誤 - ZIP檔案中未找到XML檔案');
			error_log('Bible_Here_XML_Importer: 請檢查ZIP檔案是否包含有效的XML檔案');
			$zip->close();
			return false;
		}
		
		// Extract XML file
		$upload_dir = wp_upload_dir();
		$temp_dir = $upload_dir['basedir'] . '/bible-here-temp/';
		// Use basename to get final filename, but keep track of full path for extraction
		$xml_final_name = basename($xml_file_name);
		$xml_file_path = $temp_dir . $xml_final_name;
		
		error_log('Bible_Here_XML_Importer: 準備解壓縮XML檔案');
		error_log('Bible_Here_XML_Importer: 來源檔案: ' . $xml_file_name);
		error_log('Bible_Here_XML_Importer: 最終檔案名: ' . $xml_final_name);
		error_log('Bible_Here_XML_Importer: 目標路徑: ' . $xml_file_path);
		error_log('Bible_Here_XML_Importer: 臨時目錄: ' . $temp_dir);
		
		// Ensure temp directory exists
		if (!file_exists($temp_dir)) {
			error_log('Bible_Here_XML_Importer: 臨時目錄不存在，正在創建: ' . $temp_dir);
			wp_mkdir_p($temp_dir);
		}
		
		error_log('Bible_Here_XML_Importer: 開始解壓縮...');
		$extraction_result = $zip->extractTo($temp_dir, $xml_file_name);
		
		if (!$extraction_result) {
			$last_error = $zip->getStatusString();
			$zip_error_code = $zip->status;
			error_log('Bible_Here_XML_Importer: XML檔案解壓縮失敗');
			error_log('Bible_Here_XML_Importer: ZIP錯誤狀態: ' . $last_error);
			error_log('Bible_Here_XML_Importer: ZIP錯誤代碼: ' . $zip_error_code);
			error_log('Bible_Here_XML_Importer: 可能原因：檔案損壞、權限不足或磁碟空間不足');
			$zip->close();
			return false;
		}
		
		error_log('Bible_Here_XML_Importer: 解壓縮操作完成，正在關閉ZIP檔案');
		$zip->close();
		
		// Check if file was extracted with directory structure
		$extracted_file_with_path = $temp_dir . $xml_file_name;
		error_log('Bible_Here_XML_Importer: 檢查解壓縮後的檔案（含路徑）: ' . $extracted_file_with_path);
		
		if (file_exists($extracted_file_with_path)) {
			// File extracted with directory structure, move it to final location
			error_log('Bible_Here_XML_Importer: 檔案解壓縮到子目錄，正在移動到最終位置');
			if (rename($extracted_file_with_path, $xml_file_path)) {
				error_log('Bible_Here_XML_Importer: 檔案移動成功: ' . $xml_file_path);
				// Clean up empty directory if it exists
				$extracted_dir = dirname($extracted_file_with_path);
				if (is_dir($extracted_dir) && $extracted_dir !== $temp_dir) {
					@rmdir($extracted_dir);
					error_log('Bible_Here_XML_Importer: 已清理空目錄: ' . $extracted_dir);
				}
			} else {
				error_log('Bible_Here_XML_Importer: 檔案移動失敗');
				return false;
			}
		} else {
			// Check if file was extracted directly to temp directory
			error_log('Bible_Here_XML_Importer: 檢查解壓縮後的檔案（直接路徑）: ' . $xml_file_path);
			if (!file_exists($xml_file_path)) {
				error_log('Bible_Here_XML_Importer: 錯誤 - 解壓縮後XML檔案不存在');
				error_log('Bible_Here_XML_Importer: 嘗試的路徑1: ' . $extracted_file_with_path);
				error_log('Bible_Here_XML_Importer: 嘗試的路徑2: ' . $xml_file_path);
				// List files in temp directory for debugging
				if (is_dir($temp_dir)) {
					$files = scandir($temp_dir);
					error_log('Bible_Here_XML_Importer: 臨時目錄內容: ' . implode(', ', $files));
					// Also check subdirectories
					foreach ($files as $file) {
						if ($file !== '.' && $file !== '..' && is_dir($temp_dir . $file)) {
							$subdir_files = scandir($temp_dir . $file);
							error_log('Bible_Here_XML_Importer: 子目錄 ' . $file . ' 內容: ' . implode(', ', $subdir_files));
						}
					}
				}
				return false;
			}
		}
		
		$xml_file_size = filesize($xml_file_path);
		$xml_file_size_kb = round($xml_file_size / 1024, 2);
		error_log('Bible_Here_XML_Importer: XML檔案解壓縮成功');
		error_log('Bible_Here_XML_Importer: XML檔案大小: ' . $xml_file_size . ' bytes (' . $xml_file_size_kb . ' KB)');
		
		return $xml_file_path;
	}

	/**
	 * Parse Zefania XML file
	 *
	 * @since    1.0.0
	 * @param    string    $xml_file_path    Path to XML file
	 * @return   array|false    Parsed bible data or false on failure
	 */
	private function parse_zefania_xml($xml_file_path) {
		error_log('Bible_Here_XML_Importer: 開始解析Zefania XML檔案: ' . $xml_file_path);
		
		libxml_use_internal_errors(true);
		$xml = simplexml_load_file($xml_file_path);
		
		if ($xml === false) {
			$errors = libxml_get_errors();
			foreach ($errors as $error) {
				error_log('Bible_Here_XML_Importer: XML解析錯誤: ' . $error->message);
			}
			return false;
		}
		
		error_log('Bible_Here_XML_Importer: XML檔案載入成功');
		
		$bible_data = array();
		$verse_count = 0;
		$book_count = 0;
		
		// Parse books
		if (isset($xml->BIBLEBOOK)) {
			foreach ($xml->BIBLEBOOK as $book) {
				$book_number = (int)$book['bnumber'];
				$book_name = (string)$book['bname'];
				$book_count++;
				
				error_log('Bible_Here_XML_Importer: 解析書卷 ' . $book_count . ': ' . $book_name . ' (編號: ' . $book_number . ')');
				
				// Parse chapters
				if (isset($book->CHAPTER)) {
					foreach ($book->CHAPTER as $chapter) {
						$chapter_number = (int)$chapter['cnumber'];
						
						// Parse verses
						if (isset($chapter->VERS)) {
							foreach ($chapter->VERS as $verse) {
								$verse_number = (int)$verse['vnumber'];
								$verse_text = (string)$verse;
								
								$bible_data[] = array(
									'book_number' => $book_number,
									'chapter_number' => $chapter_number,
									'verse_number' => $verse_number,
									'verse_text' => trim($verse_text)
								);
								
								$verse_count++;
								
								// Log progress every 1000 verses
								if ($verse_count % 1000 === 0) {
									error_log('Bible_Here_XML_Importer: 已解析 ' . $verse_count . ' 節經文');
								}
							}
						}
					}
				}
			}
		}
		
		error_log('Bible_Here_XML_Importer: XML解析完成，共解析 ' . $book_count . ' 卷書，' . $verse_count . ' 節經文');
		
		return $bible_data;
	}

	/**
	 * Create version-specific content table
	 *
	 * @since    1.0.0
	 * @param    string    $version_abbreviation    Version abbreviation (e.g., 'kjv')
	 * @return   bool    True on success, false on failure
	 */
	private function create_version_content_table($version_abbreviation) {
		global $wpdb;
		
		error_log('Bible_Here_XML_Importer: 開始創建版本特定內容表格: ' . $version_abbreviation);
		
		// Get table name from bible_here_versions
		$versions_table = $wpdb->prefix . 'bible_here_versions';
		$table_name_suffix = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT table_name FROM {$versions_table} WHERE abbreviation = %s",
				$version_abbreviation
			)
		);
		
		if (!$table_name_suffix) {
			error_log('Bible_Here_XML_Importer: 錯誤 - 未找到版本 ' . $version_abbreviation . ' 的表格名稱');
			return false;
		}
		
		$table_name = $wpdb->prefix . $table_name_suffix;
		error_log('Bible_Here_XML_Importer: 目標表格名稱: ' . $table_name);
		
		// Check if table already exists
		if ($wpdb->get_var("SHOW TABLES LIKE '{$table_name}'") == $table_name) {
			error_log('Bible_Here_XML_Importer: 版本內容表格已存在，跳過創建: ' . $table_name);
			return true;
		}
		
		$charset_collate = $wpdb->get_charset_collate();
		$index_name = 'uniq_'.$table_name;
		
		$sql = "CREATE TABLE IF NOT EXISTS {$table_name} (
			verse_id int(8) unsigned zerofill NOT NULL AUTO_INCREMENT COMMENT 'verse ID: 2-digit book_number + 3-digit chapter_number + 3-digit verse_number',
			book_number tinyint(1) unsigned NOT NULL,
	        chapter_number tinyint(1) unsigned NOT NULL,
	        verse_number tinyint(1) unsigned NOT NULL,
			verse_text text NOT NULL,
			verse_strong text,
		  PRIMARY KEY (verse_id),
		  UNIQUE KEY {$index_name} (book_number, chapter_number, verse_number)
		) {$charset_collate};";
		
		error_log('Bible_Here_XML_Importer: 執行SQL創建表格: ' . $sql);
		
		require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
		dbDelta($sql);
		
		if ($wpdb->last_error) {
			error_log('Bible_Here_XML_Importer: 表格創建失敗，資料庫錯誤: ' . $wpdb->last_error);
			return false;
		}
		
		// Verify table creation
		if ($wpdb->get_var("SHOW TABLES LIKE '{$table_name}'") != $table_name) {
			error_log('Bible_Here_XML_Importer: 表格創建驗證失敗');
			return false;
		}
		
		error_log('Bible_Here_XML_Importer: 版本內容表格創建成功: ' . $table_name);
		return true;
	}

	/**
	 * Import bible data to database
	 *
	 * @since    1.0.0
	 * @param    array    $bible_data    Array of bible verses
	 * @param    string   $version_abbreviation    Version abbreviation (e.g., 'kjv')
	 * @return   array    Result array with success status and message
	 */
	private function import_bible_data($bible_data, $version_abbreviation) {
		global $wpdb;
		
		error_log('Bible_Here_XML_Importer: 開始匯入聖經數據，共 ' . count($bible_data) . ' 節經文，版本: ' . $version_abbreviation);
		
		// Get table name from bible_here_versions
		$versions_table = $wpdb->prefix . 'bible_here_versions';
		$table_name_suffix = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT table_name FROM {$versions_table} WHERE abbreviation = %s",
				$version_abbreviation
			)
		);
		
		if (!$table_name_suffix) {
			error_log('Bible_Here_XML_Importer: 錯誤 - 未找到版本 ' . $version_abbreviation . ' 的表格名稱');
			return array('success' => false, 'message' => '未找到版本表格名稱');
		}
		
		$table_name = $wpdb->prefix . $table_name_suffix;
		error_log('Bible_Here_XML_Importer: 目標表格名稱: ' . $table_name);
		$imported_count = 0;
		$batch_size = 100; // Process in batches of 100 verses
		$total_verses = count($bible_data);
		
		// Clear existing data
		error_log('Bible_Here_XML_Importer: 清空現有數據');
		$wpdb->query("TRUNCATE TABLE {$table_name}");
		
		if ($wpdb->last_error) {
			error_log('Bible_Here_XML_Importer: 清空表格失敗: ' . $wpdb->last_error);
			return array('success' => false, 'message' => '清空表格失敗');
		}
		
		// Process data in batches
		for ($i = 0; $i < $total_verses; $i += $batch_size) {
			$batch = array_slice($bible_data, $i, $batch_size);
			$batch_number = floor($i / $batch_size) + 1;
			$total_batches = ceil($total_verses / $batch_size);
			
			error_log('Bible_Here_XML_Importer: 處理批次 ' . $batch_number . '/' . $total_batches . '，包含 ' . count($batch) . ' 節經文');
			
			// Build batch insert query
			$values = array();
			$placeholders = array();
			
			foreach ($batch as $verse) {
				// Generate custom ID: 2-digit book + 3-digit chapter + 3-digit verse
				$custom_id = sprintf('%02d%03d%03d', $verse['book_number'], $verse['chapter_number'], $verse['verse_number']);
				$values[] = $custom_id;
				$values[] = $verse['book_number'];
				$values[] = $verse['chapter_number'];
				$values[] = $verse['verse_number'];
				$values[] = $verse['verse_text'];
				$placeholders[] = '(%s, %d, %d, %d, %s)';
			}
			
			$sql = "INSERT INTO {$table_name} (verse_id, book_number, chapter_number, verse_number, verse_text) VALUES " . implode(', ', $placeholders);
			$prepared_sql = $wpdb->prepare($sql, $values);
			
			$result = $wpdb->query($prepared_sql);
			
			if ($result === false) {
				error_log('Bible_Here_XML_Importer: 批次 ' . $batch_number . ' 匯入失敗: ' . $wpdb->last_error);
				return array('success' => false, 'message' => '數據匯入失敗: ' . $wpdb->last_error);
			}
			
			$imported_count += $result;
			error_log('Bible_Here_XML_Importer: 批次 ' . $batch_number . ' 匯入成功，本批次匯入 ' . $result . ' 節，累計匯入 ' . $imported_count . ' 節');
			
			// Log progress percentage
			$progress_percentage = round(($imported_count / $total_verses) * 100, 1);
			error_log('Bible_Here_XML_Importer: 匯入進度: ' . $progress_percentage . '% (' . $imported_count . '/' . $total_verses . ')');
		}
		
		error_log('Bible_Here_XML_Importer: 聖經數據匯入完成，總共匯入 ' . $imported_count . ' 節經文');
		
		return array(
			'success' => true,
			'message' => '數據匯入成功',
			'imported_count' => $imported_count
		);
	}

	/**
	 * Clean up temporary files
	 *
	 * @since    1.0.0
	 * @param    string    $zip_file_path    Path to ZIP file
	 * @param    string    $xml_file_path    Path to XML file
	 */
	private function cleanup_temp_files($zip_file_path, $xml_file_path) {
		error_log('Bible_Here_XML_Importer: 開始清理臨時檔案');
		
		if (file_exists($zip_file_path)) {
			unlink($zip_file_path);
			error_log('Bible_Here_XML_Importer: 已刪除ZIP檔案: ' . $zip_file_path);
		}
		
		if (file_exists($xml_file_path)) {
			unlink($xml_file_path);
			error_log('Bible_Here_XML_Importer: 已刪除XML檔案: ' . $xml_file_path);
		}
		
		error_log('Bible_Here_XML_Importer: 臨時檔案清理完成');
	}

	/**
	 * Update version rank after successful import
	 *
	 * @since    1.0.0
	 * @param    string    $version_abbreviation    Version abbreviation (e.g., 'kjv')
	 * @param    int       $rank                   New rank value
	 * @return   bool      True on success, false on failure
	 */
	private function update_version_rank($version_abbreviation, $rank) {
		global $wpdb;
		
		error_log('Bible_Here_XML_Importer: 開始更新版本rank - 版本: ' . $version_abbreviation . ', rank: ' . $rank);
		
		$table_name = $wpdb->prefix . 'bible_here_versions';
		$result = $wpdb->update(
			$table_name,
			array('rank' => $rank),
			array('abbreviation' => $version_abbreviation),
			array('%d'),
			array('%s')
		);
		
		if ($wpdb->last_error) {
			error_log('Bible_Here_XML_Importer: 更新版本rank失敗，資料庫錯誤: ' . $wpdb->last_error);
			return false;
		}
		
		if ($result === false) {
			error_log('Bible_Here_XML_Importer: 更新版本rank失敗');
			return false;
		}
		
		error_log('Bible_Here_XML_Importer: 版本rank更新成功，影響行數: ' . $result);
		return true;
	}

	/**
	 * Get import progress (for AJAX calls)
	 *
	 * @since    1.0.0
	 * @return   array    Progress information
	 */
	public function get_import_progress() {
		// This would be used for real-time progress updates
		// For now, return basic info
		return array(
			'status' => 'ready',
			'message' => '準備開始匯入'
		);
	}
}