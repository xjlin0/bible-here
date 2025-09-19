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

		error_log('Bible_Here_XML_Importer: Class initialization completed');
	}

	/**
	 * Import KJV Bible from Zefania XML
	 *
	 * @since    1.0.0
	 * @return   array    Result array with success status and message
	 */
	/**
	 * Import KJV Bible (legacy method for backward compatibility)
	 * This method now uses the new dynamic import system
	 *
	 * @since    1.0.0
	 * @return   array    Result array with success status and message
	 */
	public function import_kjv_bible() {
		error_log('Bible_Here_XML_Importer: Starting KJV Bible import (legacy method)');
		error_log('Bible_Here_XML_Importer: Redirecting to dynamic import system for en/kjv');
		
		$start_time = microtime(true);
		
		// Use the new dynamic import method
		$result = $this->import_bible('en', 'kjv');
		
		if ($result['success']) {
			$end_time = microtime(true);
			$execution_time = round($end_time - $start_time, 2);
			
			// Add execution time to result for backward compatibility
			$result['execution_time'] = $execution_time;
			$result['message'] = 'KJV Bible import successful';
			
			error_log('Bible_Here_XML_Importer: KJV Bible import completed via dynamic system, total time: ' . $execution_time . ' seconds');
		}
		
		return $result;
	}

	/**
	 * Get KJV download URL from database
	 *
	 * @since    1.0.0
	 * @return   string|false    Download URL or false on failure
	 */
	/**
	 * Get download URL for a specific Bible version
	 *
	 * @since    1.0.0
	 * @param    string    $version_abbreviation    Version abbreviation (e.g., 'kjv', 'cuv')
	 * @return   string|false    Download URL or false on failure
	 */
	private function get_version_download_url($version_abbreviation) {
		global $wpdb;
		
		error_log('Bible_Here_XML_Importer: Starting to get ' . strtoupper($version_abbreviation) . ' download URL from database');
		
		$table_name = $wpdb->prefix . 'bible_here_versions';
		$result = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT download_url FROM {$table_name} WHERE abbreviation = %s",
				$version_abbreviation
			)
		);
		
		// Convert GitHub blob URL to raw download URL
		if ($result && strpos($result, 'github.com') !== false && strpos($result, '/blob/') !== false) {
			$result = str_replace('github.com', 'raw.githubusercontent.com', $result);
			$result = str_replace('/blob/', '/', $result);
			error_log('Bible_Here_XML_Importer: Converting GitHub URL to direct download link: ' . $result);
		}
		
		if ($wpdb->last_error) {
			error_log('Bible_Here_XML_Importer: Database query error: ' . $wpdb->last_error);
			return false;
		}
		
		if (!$result) {
			error_log('Bible_Here_XML_Importer: ' . strtoupper($version_abbreviation) . ' version download URL not found');
			return false;
		}
		
		error_log('Bible_Here_XML_Importer: Successfully obtained ' . strtoupper($version_abbreviation) . ' download URL');
		return $result;
	}

	/**
	 * Get KJV download URL (backward compatibility wrapper)
	 *
	 * @since    1.0.0
	 * @return   string|false    Download URL or false on failure
	 */
	// private function get_kjv_download_url() {
	// 	return $this->get_version_download_url('kjv');
	// }

	/**
	 * Download ZIP file from URL
	 *
	 * @since    1.0.0
	 * @param    string    $url       Download URL
	 * @param    string    $version   Version abbreviation for filename (optional, defaults to 'bible')
	 * @return   string|false    Local file path or false on failure
	 */
	private function download_zip_file($url, $version = 'bible') {
		error_log('Bible_Here_XML_Importer: Starting ZIP file download: ' . $url);
		
		$upload_dir = wp_upload_dir();
		$temp_dir = $upload_dir['basedir'] . '/bible-here-temp/';
		
		// Create temp directory if not exists
		if (!file_exists($temp_dir)) {
			wp_mkdir_p($temp_dir);
			error_log('Bible_Here_XML_Importer: Creating temporary directory: ' . $temp_dir);
		}
		
		$zip_filename = $version . '_bible_' . date('Y-m-d_H-i-s') . '.zip';
		$zip_file_path = $temp_dir . $zip_filename;
		
		error_log('Bible_Here_XML_Importer: Target file path: ' . $zip_file_path);
		
		// Use WordPress HTTP API for download
		error_log('Bible_Here_XML_Importer: Starting HTTP request, URL: ' . $url);
		error_log('Bible_Here_XML_Importer: Request parameters - timeout: 300, stream: true, filename: ' . $zip_file_path);
		
		$response = wp_remote_get($url, array(
			'timeout' => 300, // 5 minutes timeout
			'stream' => true,
			'filename' => $zip_file_path
		));
		
		error_log('Bible_Here_XML_Importer: HTTP request completed');
		
		if (is_wp_error($response)) {
			$error_code = $response->get_error_code();
			$error_message = $response->get_error_message();
			$error_data = $response->get_error_data();
			error_log('Bible_Here_XML_Importer: Download failed - WP error code: ' . $error_code);
			error_log('Bible_Here_XML_Importer: Download failed - WP error message: ' . $error_message);
			if ($error_data) {
				error_log('Bible_Here_XML_Importer: Download failed - WP error data: ' . print_r($error_data, true));
			}
			return false;
		}
		
		$response_code = wp_remote_retrieve_response_code($response);
		$response_message = wp_remote_retrieve_response_message($response);
		$response_headers = wp_remote_retrieve_headers($response);
		
		error_log('Bible_Here_XML_Importer: HTTP response status code: ' . $response_code);
		error_log('Bible_Here_XML_Importer: HTTP response message: ' . $response_message);
		
		// Log response headers in detail
		if (isset($response_headers['content-length'])) {
			$expected_size = (int)$response_headers['content-length'];
			$expected_size_kb = round($expected_size / 1024, 2);
			$expected_size_mb = round($expected_size / (1024 * 1024), 2);
			error_log('Bible_Here_XML_Importer: Response Content-Length: ' . $expected_size . ' bytes (' . $expected_size_kb . ' KB, ' . $expected_size_mb . ' MB)');
		}
		if (isset($response_headers['content-type'])) {
			$content_type = $response_headers['content-type'];
			error_log('Bible_Here_XML_Importer: Response Content-Type: ' . $content_type);
			
			// Check if Content-Type is ZIP file
			if (strpos($content_type, 'application/zip') === false && 
			    strpos($content_type, 'application/x-zip') === false && 
			    strpos($content_type, 'application/octet-stream') === false) {
				error_log('Bible_Here_XML_Importer: Warning - Content-Type is not ZIP file format: ' . $content_type);
				error_log('Bible_Here_XML_Importer: May have downloaded error page or non-ZIP file');
			}
		}
		
		// Check HTTP status code
		if ($response_code !== 200) {
			error_log('Bible_Here_XML_Importer: Download failed - HTTP status code: ' . $response_code . ' (' . $response_message . ')');
			if ($response_code === 404) {
				error_log('Bible_Here_XML_Importer: File does not exist (404), please check if download URL is correct');
			} elseif ($response_code === 403) {
				error_log('Bible_Here_XML_Importer: Access denied (403), please check file permissions');
			} elseif ($response_code >= 500) {
				error_log('Bible_Here_XML_Importer: Server error (' . $response_code . '), please try again later');
			}
			return false;
		}
		
		if (!file_exists($zip_file_path)) {
			error_log('Bible_Here_XML_Importer: Download failed - file does not exist: ' . $zip_file_path);
			return false;
		}
		
		// Check if downloaded file exists
		if (!file_exists($zip_file_path)) {
			error_log('Bible_Here_XML_Importer: Download failed - file does not exist: ' . $zip_file_path);
			error_log('Bible_Here_XML_Importer: Possible causes: download failed, permission issues, or insufficient disk space');
			return false;
		}
		
		$file_size = filesize($zip_file_path);
		$file_size_kb = round($file_size / 1024, 2);
		$file_size_mb = round($file_size / (1024 * 1024), 2);
		
		error_log('Bible_Here_XML_Importer: ZIP file download successful');
		error_log('Bible_Here_XML_Importer: File path: ' . $zip_file_path);
		error_log('Bible_Here_XML_Importer: Actual file size: ' . $file_size . ' bytes (' . $file_size_kb . ' KB, ' . $file_size_mb . ' MB)');
		
		// Compare with expected size (if Content-Length is available)
		if (isset($expected_size) && $expected_size > 0) {
			if ($file_size !== $expected_size) {
				error_log('Bible_Here_XML_Importer: Warning - file size does not match expected');
				error_log('Bible_Here_XML_Importer: Expected size: ' . $expected_size . ' bytes, actual size: ' . $file_size . ' bytes');
				error_log('Bible_Here_XML_Importer: Difference: ' . abs($expected_size - $file_size) . ' bytes');
			} else {
				error_log('Bible_Here_XML_Importer: File size validation passed, matches expected size');
			}
		}
		
		// Check if file size is reasonable (greater than 500KB)
		if ($file_size < 512000) { // 500KB = 512000 bytes
			error_log('Bible_Here_XML_Importer: Download failed - file size too small (' . $file_size_kb . ' KB), expected to be greater than 500KB');
			error_log('Bible_Here_XML_Importer: Possible causes: incomplete download, corrupted file, or server returned error page');
			
			// Check first few bytes of file content
			$file_content = file_get_contents($zip_file_path, false, null, 0, 100);
			if ($file_content) {
				error_log('Bible_Here_XML_Importer: First 100 bytes of file content: ' . substr($file_content, 0, 100));
				if (strpos($file_content, '<html') !== false || strpos($file_content, '<!DOCTYPE') !== false) {
					error_log('Bible_Here_XML_Importer: File content appears to be HTML page, not ZIP file');
				}
			}
			
			// Clean up invalid file
			unlink($zip_file_path);
			return false;
		}
		
		// Validate ZIP file signature (first 4 bytes should be "PK")
		$file_signature = file_get_contents($zip_file_path, false, null, 0, 4);
		if ($file_signature) {
			$hex_signature = bin2hex($file_signature);
			error_log('Bible_Here_XML_Importer: File signature (first 4 bytes): ' . $hex_signature);
			
			// ZIP file magic number: 50 4B 03 04 (PK..)
			if (substr($hex_signature, 0, 4) !== '504b') {
				error_log('Bible_Here_XML_Importer: Warning - file signature does not match ZIP format');
				error_log('Bible_Here_XML_Importer: Expected signature: 504b (PK), actual signature: ' . substr($hex_signature, 0, 4));
				error_log('Bible_Here_XML_Importer: File may not be a valid ZIP file');
				
				// Show first 100 bytes of file for debugging
				$debug_content = file_get_contents($zip_file_path, false, null, 0, 100);
				if ($debug_content) {
					error_log('Bible_Here_XML_Importer: First 100 bytes of file content: ' . $debug_content);
				}
				
				// Clean up invalid file
				unlink($zip_file_path);
				return false;
			} else {
				error_log('Bible_Here_XML_Importer: ZIP file signature validation passed');
			}
		} else {
			error_log('Bible_Here_XML_Importer: Warning - unable to read file signature');
		}
		
		error_log('Bible_Here_XML_Importer: File size check passed (' . $file_size_kb . ' KB > 500KB)');
		
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
		error_log('Bible_Here_XML_Importer: Starting ZIP file extraction: ' . $zip_file_path);

		// Check if ZIP file exists before processing
		if (!file_exists($zip_file_path)) {
			error_log('Bible_Here_XML_Importer: Error - ZIP file does not exist: ' . $zip_file_path);
			return false;
		}

		$zip_file_size = filesize($zip_file_path);
		error_log('Bible_Here_XML_Importer: ZIP file existence check passed, file size: ' . round($zip_file_size / 1024, 2) . ' KB');

		if (!class_exists('ZipArchive')) {
			error_log('Bible_Here_XML_Importer: Error - ZipArchive class does not exist, please check if PHP zip extension is installed');
			return false;
		}

		error_log('Bible_Here_XML_Importer: ZipArchive class check passed');

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
			error_log('Bible_Here_XML_Importer: ZIP file opening failed, error code: ' . $result . ' (' . $error_message . ')');
			return false;
		}

		error_log('Bible_Here_XML_Importer: ZIP file opened successfully, contains ' . $zip->numFiles . ' files');

		// List all files in ZIP for debugging
		error_log('Bible_Here_XML_Importer: ZIP file content list:');
		for ($i = 0; $i < $zip->numFiles; $i++) {
			$file_info = $zip->statIndex($i);
			$filename = $file_info['name'];
			$file_size = $file_info['size'];
			$compressed_size = $file_info['comp_size'];
			$file_extension = pathinfo($filename, PATHINFO_EXTENSION);
			error_log('Bible_Here_XML_Importer: [' . ($i + 1) . '] ' . $filename . ' (size: ' . $file_size . ' bytes, compressed: ' . $compressed_size . ' bytes, extension: ' . $file_extension . ')');
		}

		// Find XML file in ZIP
		$xml_file_name = null;
		error_log('Bible_Here_XML_Importer: Starting XML file search...');
		for ($i = 0; $i < $zip->numFiles; $i++) {
			$file_info = $zip->statIndex($i);
			$filename = $file_info['name'];
			$file_extension = pathinfo($filename, PATHINFO_EXTENSION);

			if ($file_extension === 'xml') {
				$xml_file_name = $filename;
				error_log('Bible_Here_XML_Importer: Found XML file: ' . $xml_file_name . ' (size: ' . $file_info['size'] . ' bytes)');
				break;
			}
		}

		if (!$xml_file_name) {
			error_log('Bible_Here_XML_Importer: Error - No XML file found in ZIP archive');
			error_log('Bible_Here_XML_Importer: Please check if ZIP file contains valid XML file');
			$zip->close();
			return false;
		}

		// Extract XML file
		$upload_dir = wp_upload_dir();
		$temp_dir = $upload_dir['basedir'] . '/bible-here-temp/';
		// Use basename to get final filename, but keep track of full path for extraction
		$xml_final_name = basename($xml_file_name);
		$xml_file_path = $temp_dir . $xml_final_name;

		error_log('Bible_Here_XML_Importer: Preparing XML file extraction');
		error_log('Bible_Here_XML_Importer: Source file: ' . $xml_file_name);
		error_log('Bible_Here_XML_Importer: Final filename: ' . $xml_final_name);
		error_log('Bible_Here_XML_Importer: Target path: ' . $xml_file_path);
		error_log('Bible_Here_XML_Importer: Temp directory: ' . $temp_dir);

		// Ensure temp directory exists
		if (!file_exists($temp_dir)) {
			error_log('Bible_Here_XML_Importer: Temp directory does not exist, creating: ' . $temp_dir);
			wp_mkdir_p($temp_dir);
		}

		error_log('Bible_Here_XML_Importer: Starting extraction...');
		$extraction_result = $zip->extractTo($temp_dir, $xml_file_name);

		if (!$extraction_result) {
			$last_error = $zip->getStatusString();
			$zip_error_code = $zip->status;
			error_log('Bible_Here_XML_Importer: XML file extraction failed');
			error_log('Bible_Here_XML_Importer: ZIP error status: ' . $last_error);
			error_log('Bible_Here_XML_Importer: ZIP error code: ' . $zip_error_code);
			error_log('Bible_Here_XML_Importer: Possible causes: corrupted file, insufficient permissions, or insufficient disk space');
			$zip->close();
			return false;
		}

		error_log('Bible_Here_XML_Importer: Extraction operation completed, closing ZIP file');
		$zip->close();

		// Check if file was extracted with directory structure
		$extracted_file_with_path = $temp_dir . $xml_file_name;
		error_log('Bible_Here_XML_Importer: Checking extracted file (with path): ' . $extracted_file_with_path);

		if (file_exists($extracted_file_with_path)) {
			// File extracted with directory structure, move it to final location
			error_log('Bible_Here_XML_Importer: File extracted to subdirectory, moving to final location');
			if (rename($extracted_file_with_path, $xml_file_path)) {
				error_log('Bible_Here_XML_Importer: File moved successfully: ' . $xml_file_path);
				// Clean up empty directory if it exists
				$extracted_dir = dirname($extracted_file_with_path);
				if (is_dir($extracted_dir) && $extracted_dir !== $temp_dir) {
					@rmdir($extracted_dir);
					error_log('Bible_Here_XML_Importer: Cleaned up empty directory: ' . $extracted_dir);
				}
			} else {
				error_log('Bible_Here_XML_Importer: File move failed');
				return false;
			}
		} else {
			// Check if file was extracted directly to temp directory
			error_log('Bible_Here_XML_Importer: Checking extracted file (direct path): ' . $xml_file_path);
			if (!file_exists($xml_file_path)) {
				error_log('Bible_Here_XML_Importer: Error - Extracted XML file does not exist');
				error_log('Bible_Here_XML_Importer: Attempted path 1: ' . $extracted_file_with_path);
				error_log('Bible_Here_XML_Importer: Attempted path 2: ' . $xml_file_path);
				// List files in temp directory for debugging
				if (is_dir($temp_dir)) {
					$files = scandir($temp_dir);
					error_log('Bible_Here_XML_Importer: Temp directory contents: ' . implode(', ', $files));
					// Also check subdirectories
					foreach ($files as $file) {
						if ($file !== '.' && $file !== '..' && is_dir($temp_dir . $file)) {
							$subdir_files = scandir($temp_dir . $file);
							error_log('Bible_Here_XML_Importer: Subdirectory ' . $file . ' contents: ' . implode(', ', $subdir_files));
						}
					}
				}
				return false;
			}
		}

		$xml_file_size = filesize($xml_file_path);
		$xml_file_size_kb = round($xml_file_size / 1024, 2);
		error_log('Bible_Here_XML_Importer: XML file extraction successful');
		error_log('Bible_Here_XML_Importer: XML file size: ' . $xml_file_size . ' bytes (' . $xml_file_size_kb . ' KB)');

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
		error_log('Bible_Here_XML_Importer: Starting Zefania XML file parsing: ' . $xml_file_path);

		libxml_use_internal_errors(true);
		$xml = simplexml_load_file($xml_file_path);

		if ($xml === false) {
			$errors = libxml_get_errors();
			foreach ($errors as $error) {
				error_log('Bible_Here_XML_Importer: XML parsing error: ' . $error->message);
			}
			return false;
		}

		error_log('Bible_Here_XML_Importer: XML file loaded successfully');

		$bible_data = array();
		$verse_count = 0;
		$book_count = 0;

		// Parse books
		if (isset($xml->BIBLEBOOK)) {
			foreach ($xml->BIBLEBOOK as $book) {
				$book_number = (int)$book['bnumber'];
				$book_name = (string)$book['bname'];
				$book_count++;

				error_log('Bible_Here_XML_Importer: Processing book ' . $book_count . ': ' . $book_name . ' (Number: ' . $book_number . ')');

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
									error_log('Bible_Here_XML_Importer: Parsed ' . $verse_count . ' verses');
								}
							}
						}
					}
				}
			}
		}

		error_log('Bible_Here_XML_Importer: XML parsing completed, parsed ' . $book_count . ' books, ' . $verse_count . ' verses');

		return $bible_data;
	}

	/**
	 * Create version-specific content table
	 *
	 * @since    1.0.0
	 * @param    string    $version_abbreviation    Version abbreviation (e.g., 'kjv')
	 * @return   bool    True on success, false on failure
	 */
	private function create_version_content_table($version_abbreviation, $table_comment) {
		global $wpdb;

		error_log('Bible_Here_XML_Importer: Starting to create version-specific content table: ' . $version_abbreviation);

		// Get table name from bible_here_versions
		$versions_table = $wpdb->prefix . 'bible_here_versions';
		$table_name_suffix = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT table_name FROM {$versions_table} WHERE abbreviation = %s",
				$version_abbreviation
			)
		);

		if (!$table_name_suffix) {
			error_log('Bible_Here_XML_Importer: Error - Table name not found for version ' . $version_abbreviation);
			return false;
		}

		$table_name = $wpdb->prefix . $table_name_suffix;
		error_log('Bible_Here_XML_Importer: Target table name: ' . $table_name);
		
		// Check if table already exists
		if ($wpdb->get_var("SHOW TABLES LIKE '{$table_name}'") == $table_name) {
			error_log('Bible_Here_XML_Importer: Version content table already exists, skipping creation: ' . $table_name);
			return true;
		}

		// Use unified table creation method from Activator
		require_once plugin_dir_path(__FILE__) . 'class-bible-here-activator.php';
		$result = Bible_Here_Activator::create_version_content_table($table_name, $table_comment);
		
		if ($result) {
			error_log('Bible_Here_XML_Importer: Version content table created successfully: ' . $table_name);
		} else {
			error_log('Bible_Here_XML_Importer: Table creation failed: ' . $wpdb->last_error);
		}
		
		return $result;
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
		
		error_log('Bible_Here_XML_Importer: Starting to import Bible data, total ' . count($bible_data) . ' verses, version: ' . $version_abbreviation);
		
		// Get table name and trim setting from bible_here_versions
		$versions_table = $wpdb->prefix . 'bible_here_versions';
		$version_info = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT table_name, trim FROM {$versions_table} WHERE abbreviation = %s",
				$version_abbreviation
			)
		);
		
		if (!$version_info || !$version_info->table_name) {
			error_log('Bible_Here_XML_Importer: Error - Table name not found for version ' . $version_abbreviation);
			return array('success' => false, 'message' => 'Version table name not found');
		}
		
		$table_name_suffix = $version_info->table_name;
		$should_trim = (bool) $version_info->trim;
		
		$table_name = $wpdb->prefix . $table_name_suffix;
		error_log('Bible_Here_XML_Importer: Target table name: ' . $table_name);
		$imported_count = 0;
		$batch_size = 1000; // Process in batches of 1000 verses
		$total_verses = count($bible_data);
		
		// Clear existing data
		error_log('Bible_Here_XML_Importer: Clearing existing data');
		$wpdb->query("TRUNCATE TABLE {$table_name}");
		
		if ($wpdb->last_error) {
			error_log('Bible_Here_XML_Importer: Failed to clear table: ' . $wpdb->last_error);
			return array('success' => false, 'message' => 'Failed to clear table');
		}
		
		// Process data in batches
		for ($i = 0; $i < $total_verses; $i += $batch_size) {
			$batch = array_slice($bible_data, $i, $batch_size);
			$batch_number = floor($i / $batch_size) + 1;
			$total_batches = ceil($total_verses / $batch_size);
			
			error_log('Bible_Here_XML_Importer: Processing batch ' . $batch_number . '/' . $total_batches . ', containing ' . count($batch) . ' verses');
			
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
				
				// Process verse text based on trim setting
				$verse_text = $verse['verse_text'];
				if ($should_trim) {
					// Remove all whitespace characters (spaces, tabs, newlines, etc.)
					$verse_text = preg_replace('/\s+/', '', $verse_text);
				}
				$values[] = $verse_text;
				$placeholders[] = '(%s, %d, %d, %d, %s)';
			}
			
			$sql = "REPLACE INTO {$table_name} (verse_id, book_number, chapter_number, verse_number, verse_text) VALUES " . implode(', ', $placeholders);
			$prepared_sql = $wpdb->prepare($sql, $values);
			
			$result = $wpdb->query($prepared_sql);
			
			if ($result === false) {
				error_log('Bible_Here_XML_Importer: Batch ' . $batch_number . ' import failed: ' . $wpdb->last_error);
				return array('success' => false, 'message' => 'Data import failed: ' . $wpdb->last_error);
			}
			
			$imported_count += $result;
			error_log('Bible_Here_XML_Importer: Batch ' . $batch_number . ' import successful, imported ' . $result . ' verses in this batch, total imported ' . $imported_count . ' verses');
			
			// Log progress percentage
			$progress_percentage = round(($imported_count / $total_verses) * 100, 1);
			error_log('Bible_Here_XML_Importer: Import progress: ' . $progress_percentage . '% (' . $imported_count . '/' . $total_verses . ')');
		}
		
		error_log('Bible_Here_XML_Importer: Bible data import completed, total imported ' . $imported_count . ' verses');
		
		return array(
			'success' => true,
			'message' => 'Data import successful',
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
		error_log('Bible_Here_XML_Importer: Starting to clean up temporary files');
		
		if (file_exists($zip_file_path)) {
			unlink($zip_file_path);
			error_log('Bible_Here_XML_Importer: Deleted ZIP file: ' . $zip_file_path);
		}
		
		if (file_exists($xml_file_path)) {
			unlink($xml_file_path);
			error_log('Bible_Here_XML_Importer: Deleted XML file: ' . $xml_file_path);
		}
		
		error_log('Bible_Here_XML_Importer: Temporary files cleanup completed');
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
		
		error_log('Bible_Here_XML_Importer: Starting to update version rank - Version: ' . $version_abbreviation . ', rank: ' . $rank);
		
		$table_name = $wpdb->prefix . 'bible_here_versions';
		$result = $wpdb->update(
			$table_name,
			array('rank' => $rank),
			array('abbreviation' => $version_abbreviation),
			array('%d'),
			array('%s')
		);
		
		if ($wpdb->last_error) {
			error_log('Bible_Here_XML_Importer: Failed to update version rank, database error: ' . $wpdb->last_error);
			return false;
		}
		
		if ($result === false) {
			error_log('Bible_Here_XML_Importer: Failed to update version rank');
			return false;
		}
		
		error_log('Bible_Here_XML_Importer: Version rank updated successfully, affected rows: ' . $result);
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
			'message' => 'Ready to start import'
		);
	}

	/**
	 * Get version information from database
	 *
	 * @since    1.0.0
	 * @param    string    $language    Language code (e.g., 'en', 'zh_tw', 'es')
	 * @param    string    $version     Version abbreviation (e.g., 'kjv', 'cuv', 'rv')
	 * @return   array|false    Version information or false if not found
	 */
	private function get_version_info_from_db($language, $version) {
		global $wpdb;
		
		$table_name = $wpdb->prefix . 'bible_here_versions';
		
		$sql = $wpdb->prepare(
			"SELECT * FROM {$table_name} WHERE language = %s AND abbreviation = %s",
			$language,
			$version
		);
		
		$result = $wpdb->get_row($sql, ARRAY_A);
		
		if ($result) {
			error_log('Bible_Here_XML_Importer: Found version in database: ' . $result['name'] . ' (' . $language . '/' . $version . ')');
			return $result;
		}
		
		error_log('Bible_Here_XML_Importer: Version not found in database: ' . $language . '/' . $version);
		return false;
	}

	/**
	 * Generic bible import method - dynamically handles different language/version combinations
	 *
	 * @since    1.0.0
	 * @param    string    $language    Language code (e.g., 'en', 'zh_tw')
	 * @param    string    $version     Version abbreviation (e.g., 'kjv', 'cuv')
	 * @return   array     Result array with success status and message
	 */
	public function import_bible($language, $version) {
		error_log('Bible_Here_XML_Importer: Starting dynamic bible import - Language: ' . $language . ', Version: ' . $version);
		
		// Get version configuration from database
		$version_info = $this->get_version_info_from_db($language, $version);
		
		if (!$version_info) {
			$error_msg = 'Version not found in database: ' . $language . '/' . $version;
			error_log('Bible_Here_XML_Importer: ' . $error_msg);
			return array('success' => false, 'message' => $error_msg);
		}
		
		error_log('Bible_Here_XML_Importer: Found version in database - Name: ' . $version_info['name'] . ', Table: ' . $version_info['table_name']);
		
		try {
			// Step 1: Get download URL using generic method
			$version_abbreviation = $version_info['abbreviation'];
			error_log('Bible_Here_XML_Importer: Getting download URL for version: ' . $version_abbreviation);
			$download_url = $this->get_version_download_url($version_abbreviation);
			
			if (!$download_url) {
				$error_msg = 'Failed to get download URL for ' . $language . '/' . $version;
				error_log('Bible_Here_XML_Importer: ' . $error_msg);
				return array('success' => false, 'message' => $error_msg);
			}
			
			error_log('Bible_Here_XML_Importer: Download URL obtained: ' . $download_url);
			
			// Step 2: Download ZIP file
			$zip_file_path = $this->download_zip_file($download_url, $version);
			if (!$zip_file_path) {
				$error_msg = 'Failed to download ZIP file for ' . $language . '/' . $version;
				error_log('Bible_Here_XML_Importer: ' . $error_msg);
				return array('success' => false, 'message' => $error_msg);
			}
			
			// Step 3: Extract XML from ZIP
			$xml_file_path = $this->extract_xml_from_zip($zip_file_path);
			if (!$xml_file_path) {
				$this->cleanup_temp_files($zip_file_path, '');
				$error_msg = 'Failed to extract XML from ZIP for ' . $language . '/' . $version;
				error_log('Bible_Here_XML_Importer: ' . $error_msg);
				return array('success' => false, 'message' => $error_msg);
			}
			
			// Step 4: Parse XML using Zefania XML parser (universal for all versions)
			$xml_parser_method = 'parse_zefania_xml';
			error_log('Bible_Here_XML_Importer: Parsing XML using method: ' . $xml_parser_method);
			$bible_data = $this->parse_zefania_xml($xml_file_path);
			
			if (!$bible_data || !is_array($bible_data) || empty($bible_data)) {
				$this->cleanup_temp_files($zip_file_path, $xml_file_path);
				$error_msg = 'Failed to parse XML or no data found for ' . $language . '/' . $version;
				error_log('Bible_Here_XML_Importer: ' . $error_msg);
				return array('success' => false, 'message' => $error_msg);
			}
			
			// Step 5: Create version content table
			$table_created = $this->create_version_content_table($version, 'From '.$download_url);
			if (!$table_created) {
				$this->cleanup_temp_files($zip_file_path, $xml_file_path);
				$error_msg = 'Failed to create version content table for ' . $version;
				error_log('Bible_Here_XML_Importer: ' . $error_msg);
				return array('success' => false, 'message' => $error_msg);
			}
			
			// Step 5.5: Set version rank to 0 at the beginning of import
			// This allows deletion even if import fails later
			$rank_set = $this->update_version_rank($version, 0);
			if (!$rank_set) {
				error_log('Bible_Here_XML_Importer: Warning - Failed to set initial rank to 0, continuing with import');
			}
			
			// Step 6: Import data to database
			$import_result = $this->import_bible_data($bible_data, $version);
			if (!$import_result['success']) {
				$this->cleanup_temp_files($zip_file_path, $xml_file_path);
				error_log('Bible_Here_XML_Importer: Data import failed: ' . $import_result['message']);
				return $import_result;
			}
			
			// Step 7: Update version rank
			$rank_updated = $this->update_version_rank($version, 1);
			if (!$rank_updated) {
				error_log('Bible_Here_XML_Importer: Warning - Failed to update version rank, but import was successful');
			}
			
			// Step 8: Clean up temporary files
			$this->cleanup_temp_files($zip_file_path, $xml_file_path);
			
			$success_msg = 'Successfully imported ' . $version_info['name'] . ' (' . $language . '/' . $version . ') - ' . $import_result['imported_count'] . ' verses';
			error_log('Bible_Here_XML_Importer: ' . $success_msg);
			
			return array(
				'success' => true,
				'message' => $success_msg,
				'imported_count' => $import_result['imported_count']
			);
			
		} catch (Exception $e) {
			$error_msg = 'Exception during import: ' . $e->getMessage();
			error_log('Bible_Here_XML_Importer: ' . $error_msg);
			
			// Clean up any temporary files that might exist
			if (isset($zip_file_path)) {
				$this->cleanup_temp_files($zip_file_path, isset($xml_file_path) ? $xml_file_path : '');
			}
			
			return array('success' => false, 'message' => $error_msg);
		}
	}

	/**
	 * Import cross references data from CSV file
	 *
	 * @since    1.0.0
	 * @return   array    Result array with success status and message
	 */
	public function import_cross_references() {
		error_log('Bible_Here_XML_Importer: Starting cross references import');
		
		$start_time = microtime(true);
		
		try {
			// Step 1: Check if cross_references.csv exists in data directory
			$plugin_dir = plugin_dir_path(dirname(__FILE__));
			$csv_file_path = $plugin_dir . 'data/cross_references.csv';
			
			if (!file_exists($csv_file_path)) {
				// Try to extract from ZIP if CSV doesn't exist
				$zip_file_path = $plugin_dir . 'data/cross_references.zip';
				
				if (!file_exists($zip_file_path)) {
					$error_msg = 'Cross references ZIP file not found: ' . $zip_file_path;
					error_log('Bible_Here_XML_Importer: ' . $error_msg);
					return array('success' => false, 'message' => $error_msg);
				}
				
				// Extract CSV from ZIP
				$csv_file_path = $this->extract_csv_from_zip($zip_file_path);
				if (!$csv_file_path) {
					$error_msg = 'Failed to extract CSV from cross references ZIP';
					error_log('Bible_Here_XML_Importer: ' . $error_msg);
					return array('success' => false, 'message' => $error_msg);
				}
			}
			
			// Step 2: Import data directly from CSV to database (streaming approach)
			$import_result = $this->import_cross_references_streaming($csv_file_path);
			if (!$import_result['success']) {
				error_log('Bible_Here_XML_Importer: Cross references data import failed: ' . $import_result['message']);
				return $import_result;
			}
			
			$end_time = microtime(true);
			$execution_time = round($end_time - $start_time, 2);
			
			$success_msg = 'Successfully imported cross references - ' . $import_result['imported_count'] . ' records in ' . $execution_time . ' seconds';
			error_log('Bible_Here_XML_Importer: ' . $success_msg);
			
			return array(
				'success' => true,
				'message' => $success_msg,
				'imported_count' => $import_result['imported_count'],
				'execution_time' => $execution_time
			);
			
		} catch (Exception $e) {
			$error_msg = 'Exception during cross references import: ' . $e->getMessage();
			error_log('Bible_Here_XML_Importer: ' . $error_msg);
			return array('success' => false, 'message' => $error_msg);
		}
	}

	/**
	 * Extract CSV file from cross references ZIP
	 *
	 * @since    1.0.0
	 * @param    string    $zip_file_path    Path to ZIP file
	 * @return   string|false    Path to extracted CSV file or false on failure
	 */
	private function extract_csv_from_zip($zip_file_path) {
		error_log('Bible_Here_XML_Importer: Extracting CSV from ZIP: ' . $zip_file_path);
		
		if (!class_exists('ZipArchive')) {
			error_log('Bible_Here_XML_Importer: ZipArchive class not available');
			return false;
		}
		
		$zip = new ZipArchive();
		$result = $zip->open($zip_file_path);
		
		if ($result !== TRUE) {
			error_log('Bible_Here_XML_Importer: Failed to open ZIP file, error code: ' . $result);
			return false;
		}
		
		// Look for CSV file in ZIP
		$csv_filename = null;
		for ($i = 0; $i < $zip->numFiles; $i++) {
			$filename = $zip->getNameIndex($i);
			if (pathinfo($filename, PATHINFO_EXTENSION) === 'csv') {
				$csv_filename = $filename;
				break;
			}
		}
		
		if (!$csv_filename) {
			error_log('Bible_Here_XML_Importer: No CSV file found in ZIP');
			$zip->close();
			return false;
		}
		
		// Extract to data directory
		$plugin_dir = plugin_dir_path(dirname(__FILE__));
		$extract_path = $plugin_dir . 'data/';
		
		if (!$zip->extractTo($extract_path, $csv_filename)) {
			error_log('Bible_Here_XML_Importer: Failed to extract CSV file');
			$zip->close();
			return false;
		}
		
		$zip->close();
		$extracted_csv_path = $extract_path . $csv_filename;
		
		error_log('Bible_Here_XML_Importer: Successfully extracted CSV to: ' . $extracted_csv_path);
		return $extracted_csv_path;
	}

	/**
	 * Parse cross references CSV file
	 *
	 * @since    1.0.0
	 * @param    string    $csv_file_path    Path to CSV file
	 * @return   array|false    Array of cross references data or false on failure
	 */
	private function parse_cross_references_csv($csv_file_path) {
		error_log('Bible_Here_XML_Importer: Parsing cross references CSV: ' . $csv_file_path);
		
		if (!file_exists($csv_file_path)) {
			error_log('Bible_Here_XML_Importer: CSV file does not exist: ' . $csv_file_path);
			return false;
		}
		
		$cross_references = array();
		$row_count = 0;
		
		if (($handle = fopen($csv_file_path, 'r')) !== FALSE) {
			// Skip header row
			$header = fgetcsv($handle, 0, ',', '"', '\\');
			error_log('Bible_Here_XML_Importer: CSV header: ' . implode(', ', $header));
			
			while (($data = fgetcsv($handle, 0, ',', '"', '\\')) !== FALSE) {
				$row_count++;
				
				// Validate data format
				if (count($data) < 4) {
					error_log('Bible_Here_XML_Importer: Invalid CSV row at line ' . ($row_count + 1) . ': ' . implode(', ', $data));
					continue;
				}
				
				$verse_id = trim($data[0], '"');
				$rank = intval(trim($data[1], '"'));
				$start = trim($data[2], '"');
				$finish = trim($data[3], '"');
				
				// Skip empty or invalid records
				if (empty($verse_id) || empty($start)) {
					continue;
				}
				
				$cross_references[] = array(
					'verse_id' => $verse_id,
					'rank' => $rank,
					'start' => $start,
					'finish' => $finish
				);
				
				// Log progress every 10000 records
				if ($row_count % 10000 === 0) {
					error_log('Bible_Here_XML_Importer: Parsed ' . $row_count . ' cross reference records');
				}
			}
			
			fclose($handle);
		} else {
			error_log('Bible_Here_XML_Importer: Failed to open CSV file for reading');
			return false;
		}
		
		error_log('Bible_Here_XML_Importer: Successfully parsed ' . count($cross_references) . ' cross reference records from ' . $row_count . ' CSV rows');
		return $cross_references;
	}

	/**
	 * Import cross references data to database using streaming approach
	 *
	 * @since    1.0.0
	 * @param    string    $csv_file_path    Path to CSV file
	 * @return   array    Result array with success status and message
	 */
	public function import_cross_references_streaming($csv_file_path) {
		global $wpdb;
		
		$table_name = $wpdb->prefix . 'bible_here_cross_references';
		$batch_size = 1000; // Process 1000 records per batch as requested
		$imported_count = 0;
		$row_count = 0;
		$batch_data = array();
		
		error_log('Bible_Here_XML_Importer: Starting streaming import of cross references from: ' . $csv_file_path);
		
		// Clear existing data
		error_log('Bible_Here_XML_Importer: Clearing existing cross references data');
		$wpdb->query("TRUNCATE TABLE {$table_name}");
		
		if ($wpdb->last_error) {
			error_log('Bible_Here_XML_Importer: Failed to clear cross references table: ' . $wpdb->last_error);
			return array('success' => false, 'message' => 'Failed to clear cross references table');
		}
		
		if (($handle = fopen($csv_file_path, 'r')) !== FALSE) {
			// Skip header row
			$header = fgetcsv($handle, 0, ',', '"', '\\');
			error_log('Bible_Here_XML_Importer: CSV header: ' . implode(', ', $header));
			
			while (($data = fgetcsv($handle, 0, ',', '"', '\\')) !== FALSE) {
				$row_count++;
				
				// Validate data format
				if (count($data) < 4) {
					error_log('Bible_Here_XML_Importer: Invalid CSV row at line ' . ($row_count + 1) . ': ' . implode(', ', $data));
					continue;
				}
				
				$verse_id = trim($data[0], '"');
				$rank = intval(trim($data[1], '"'));
				$start = trim($data[2], '"');
				$finish = trim($data[3], '"');

				// Skip empty or invalid records
				if (empty($verse_id) || empty($start)) {
					continue;
				}

				if ($finish === '') {
					$finish = null;
				}

				$batch_data[] = array(
					'verse_id' => $verse_id,
					'rank' => $rank,
					'start' => $start,
					'finish' => $finish
				);
				
				// Process batch when it reaches the batch size
				if (count($batch_data) >= $batch_size) {
					$batch_result = $this->process_cross_references_batch($batch_data, $table_name);
					if (!$batch_result['success']) {
						fclose($handle);
						return $batch_result;
					}
					$imported_count += $batch_result['imported_count'];
					$batch_data = array(); // Clear batch
					
					// Log progress every batch
					error_log('Bible_Here_XML_Importer: Processed ' . $imported_count . ' cross reference records');
				}
			}
			
			// Process remaining data in the last batch
			if (!empty($batch_data)) {
				$batch_result = $this->process_cross_references_batch($batch_data, $table_name);
				if (!$batch_result['success']) {
					fclose($handle);
					return $batch_result;
				}
				$imported_count += $batch_result['imported_count'];
			}
			
			fclose($handle);
		} else {
			error_log('Bible_Here_XML_Importer: Failed to open CSV file for reading');
			return array('success' => false, 'message' => 'Failed to open CSV file for reading');
		}
		
		error_log('Bible_Here_XML_Importer: Cross references streaming import completed successfully, total imported: ' . $imported_count . ' records from ' . $row_count . ' CSV rows');
		
		return array(
			'success' => true,
			'message' => 'Cross references import completed',
			'imported_count' => $imported_count
		);
	}
	
	/**
	 * Process a batch of cross references data
	 *
	 * @since    1.0.0
	 * @param    array    $batch_data    Array of cross references for this batch
	 * @param    string   $table_name   Database table name
	 * @return   array    Result array with success status and imported count
	 */
	private function process_cross_references_batch($batch_data, $table_name) {
		global $wpdb;
		
		// Build batch insert query
		$values = array();
		$placeholders = array();
		
		foreach ($batch_data as $record) {
			$values[] = $record['verse_id'];
			$values[] = $record['rank'];
			$values[] = $record['start'];

			if (array_key_exists('finish', $record) && $record['finish'] !== null) {
				$values[] = $record['finish'];
				$placeholders[] = '(%s, %d, %s, %s)';
			} else {  // finish is NULL → Directly use SQL NULL
				$placeholders[] = '(%s, %d, %s, NULL)';
			}
		}
		
		$sql = "INSERT INTO {$table_name} (verse_id, rank, start, finish) VALUES " . implode(', ', $placeholders);
		$prepared_sql = $wpdb->prepare($sql, $values);
		
		$result = $wpdb->query($prepared_sql);
		
		if ($result === false) {
			error_log('Bible_Here_XML_Importer: Cross references batch import failed: ' . $wpdb->last_error);
			return array('success' => false, 'message' => 'Cross references batch import failed: ' . $wpdb->last_error);
		}
		
		return array(
			'success' => true,
			'imported_count' => $result
		);
	}

	/**
	 * Get CUV download URL (backward compatibility wrapper)
	 *
	 * @since    1.0.0
	 * @return   string|false    Download URL or false on failure
	 */
	private function get_cuv_download_url() {
		return $this->get_version_download_url('cuv');
	}

	/**
	 * Parse KJV XML file (wrapper for backward compatibility)
	 *
	 * @since    1.0.0
	 * @param    string    $xml_file_path    Path to XML file
	 * @return   array|false    Array of bible verses or false on failure
	 */
	private function parse_kjv_xml($xml_file_path) {
		error_log('Bible_Here_XML_Importer: Starting to parse KJV XML file (legacy method): ' . $xml_file_path);
		
		// Use the standard Zefania XML parser
		return $this->parse_zefania_xml($xml_file_path);
	}

	/**
	 * Parse CUV XML file (wrapper for backward compatibility)
	 *
	 * @since    1.0.0
	 * @param    string    $xml_file_path    Path to XML file
	 * @return   array|false    Array of bible verses or false on failure
	 */
	// private function parse_cuv_xml($xml_file_path) {
	// 	error_log('Bible_Here_XML_Importer: Starting to parse CUV XML file: ' . $xml_file_path);
		
	// 	if (!file_exists($xml_file_path)) {
	// 		error_log('Bible_Here_XML_Importer: CUV XML file does not exist: ' . $xml_file_path);
	// 		return false;
	// 	}
		
	// 	// Use the standard Zefania XML parser
	// 	// This can be customized later if CUV XML has different structure
	// 	return $this->parse_zefania_xml($xml_file_path);
	// }
}