<?php

/**
 * Fired during plugin deactivation
 *
 * @link       https://github.com/xjlin0
 * @since      1.0.0
 *
 * @package    Bible_Here
 * @subpackage Bible_Here/includes
 */

/**
 * Fired during plugin deactivation.
 *
 * This class defines all code necessary to run during the plugin's deactivation.
 *
 * @since      1.0.0
 * @package    Bible_Here
 * @subpackage Bible_Here/includes
 * @author     Jack Lin <xjlin0@gmail.com>
 */
class Bible_Here_Deactivator {

	/**
	 * Deactivate the plugin and clean up all database tables
	 *
	 * This method removes all plugin-related database tables including:
	 * - Core plugin tables (books, genres, versions, etc.)
	 * - Dynamically created verse tables (from bible_here_bible_versions.table_name)
	 *
	 * @since    1.0.0
	 */
	public static function deactivate() {
		global $wpdb;
		
		error_log('Bible_Here_Deactivator: Starting plugin deactivation cleanup process');
		
		// Get all dynamically created verse tables from bible_here_bible_versions
		$versions_table = $wpdb->prefix . 'bible_here_bible_versions';
		
		// Check if the versions table exists before querying
		if ($wpdb->get_var("SHOW TABLES LIKE '{$versions_table}'") == $versions_table) {
			$verse_tables = $wpdb->get_col(
				"SELECT table_name FROM {$versions_table} WHERE table_name IS NOT NULL AND table_name != ''"
			);
			
			if ($verse_tables) {
				error_log('Bible_Here_Deactivator: Found ' . count($verse_tables) . ' dynamically created verse tables');
				
				// Drop each verse table
				foreach ($verse_tables as $table_name) {
					$full_table_name = $wpdb->prefix . $table_name;
					
					// Verify table exists before dropping
					if ($wpdb->get_var("SHOW TABLES LIKE '{$full_table_name}'") == $full_table_name) {
						$result = $wpdb->query("DROP TABLE IF EXISTS {$full_table_name}");
						if ($result !== false) {
							error_log('Bible_Here_Deactivator: Successfully deleted verse table: ' . $full_table_name);
						} else {
							error_log('Bible_Here_Deactivator: Failed to delete verse table: ' . $full_table_name . ' - ' . $wpdb->last_error);
						}
					} else {
						error_log('Bible_Here_Deactivator: Bible table not found, skipped: ' . $full_table_name);
					}
				}
			} else {
				error_log('Bible_Here_Deactivator: No dynamically created verse tables found');
			}
		} else {
			error_log('Bible_Here_Deactivator: bible_here_bible_versions table does not exist, skipped dynamic table cleanup');
		}
		
		// Define all core plugin tables to be removed
		$core_tables = array(
			'bible_here_books',
			'bible_here_genres',
			'bible_here_bible_versions',
			'bible_here_cross_references',
			'bible_here_abbreviations',
			'bible_here_bible_commentaries'
		);
		
		error_log('Bible_Here_Deactivator: Starting deletion of core plugin tables');
		
		// Drop each core table
		foreach ($core_tables as $table_name) {
			$full_table_name = $wpdb->prefix . $table_name;
			
			// Verify table exists before dropping
			if ($wpdb->get_var("SHOW TABLES LIKE '{$full_table_name}'") == $full_table_name) {
				$result = $wpdb->query("DROP TABLE IF EXISTS {$full_table_name}");
				if ($result !== false) {
					error_log('Bible_Here_Deactivator: Successfully deleted core table: ' . $full_table_name);
				} else {
					error_log('Bible_Here_Deactivator: Failed to delete core table: ' . $full_table_name . ' - ' . $wpdb->last_error);
				}
			} else {
				error_log('Bible_Here_Deactivator: Core table not found, skipped: ' . $full_table_name);
			}
		}
		
		// Clean up temporary files directory
		$upload_dir = wp_upload_dir();
		$temp_dir = $upload_dir['basedir'] . '/bible-here-temp/';
		
		if (is_dir($temp_dir)) {
			error_log('Bible_Here_Deactivator: Starting cleanup of temporary files directory: ' . $temp_dir);
			
			// Remove all files in temp directory
			$files = glob($temp_dir . '*');
			foreach ($files as $file) {
				if (is_file($file)) {
					unlink($file);
					error_log('Bible_Here_Deactivator: Successfully deleted temporary file: ' . $file);
				}
			}
			
			// Remove temp directory
			if (rmdir($temp_dir)) {
				error_log('Bible_Here_Deactivator: Successfully deleted temporary directory: ' . $temp_dir);
			} else {
				error_log('Bible_Here_Deactivator: Failed to delete temporary directory: ' . $temp_dir);
			}
		} else {
			error_log('Bible_Here_Deactivator: Temporary directory does not exist, skipped cleanup: ' . $temp_dir);
		}
		
		error_log('Bible_Here_Deactivator: Plugin deactivation cleanup process completed');
	}

}
