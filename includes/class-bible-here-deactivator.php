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
	 * Deactivate the plugin without deleting data.
	 *
	 * @since    1.0.0
	 */
	public static function deactivate_preserve_data() {
		// Log the exact time when preserve data mode is executed
		error_log( '[Bible Here] deactivate_preserve_data() called at: ' . date( 'Y-m-d H:i:s.u' ) . ' (microtime: ' . microtime( true ) . ')' );
		
		// Plugin is deactivated but data is preserved
		// No cleanup operations are performed
		// This allows users to reactivate the plugin later with their data intact
		
		error_log( '[Bible Here] deactivate_preserve_data() completed at: ' . date( 'Y-m-d H:i:s.u' ) . ' (microtime: ' . microtime( true ) . ')' );
	}
	
	/**
	 * Recursively delete a directory and all its contents.
	 *
	 * @param string $dir Directory path to delete.
	 * @return bool True on success, false on failure.
	 */
	private static function delete_directory( $dir ) {
		if ( ! is_dir( $dir ) ) {
			return false;
		}
		
		$files = array_diff( scandir( $dir ), array( '.', '..' ) );
		foreach ( $files as $file ) {
			$path = $dir . DIRECTORY_SEPARATOR . $file;
			if ( is_dir( $path ) ) {
				self::delete_directory( $path );
			} else {
				unlink( $path );
			}
		}
		
		return rmdir( $dir );
	}

	/**
	 * Short Description. (use period)
	 *
	 * Long Description.
	 *
	 * @since    1.0.0
	 */
	public static function deactivate() {
		// Log the exact time when deactivate() method is called
		error_log( '[Bible Here] Deactivator::deactivate() method called at: ' . date( 'Y-m-d H:i:s.u' ) . ' (microtime: ' . microtime( true ) . ')' );
		
		// Check deactivation mode from transient
		$deactivation_mode = get_transient( 'bible_here_deactivation_mode' );
		
		if ( $deactivation_mode === 'delete' ) {
			// Delete all data
			self::deactivate_with_cleanup();
		} else {
			// Preserve data
			self::deactivate_preserve_data();
		}
		
		// Clean up the transient
		delete_transient( 'bible_here_deactivation_mode' );
	}
	
	/**
	 * Deactivate plugin and delete all data.
	 *
	 * @since    1.0.0
	 */
	public static function deactivate_with_cleanup() {
		// Log the exact time when cleanup mode is executed
		error_log( '[Bible Here] deactivate_with_cleanup() called at: ' . date( 'Y-m-d H:i:s.u' ) . ' (microtime: ' . microtime( true ) . ')' );
		
		global $wpdb;

		// Set time and memory limits for cleanup operation
		set_time_limit( 300 ); // 5 minutes
		ini_set( 'memory_limit', '256M' );

		// Log start time for performance tracking
		$start_time = microtime( true );
		error_log( 'Bible Here: Starting deactivation cleanup at ' . date( 'Y-m-d H:i:s' ) );

		try {
			// Disable foreign key checks for faster deletion
			$wpdb->query( 'SET FOREIGN_KEY_CHECKS = 0' );

			// Define all possible plugin tables (base tables + version tables)
			$base_tables = array(
				$wpdb->prefix . 'bible_here_genres',
				$wpdb->prefix . 'bible_here_books',
				$wpdb->prefix . 'bible_here_versions',
				$wpdb->prefix . 'bible_here_cross_references',
				$wpdb->prefix . 'bible_here_abbreviations',
				$wpdb->prefix . 'bible_here_strong_dictionary',
				$wpdb->prefix . 'bible_here_languages'
			);

			// Get version-specific tables by checking versions table first
			$version_tables = array();
			$versions_table = $wpdb->prefix . 'bible_here_versions';
			if ( $wpdb->get_var( "SHOW TABLES LIKE '{$versions_table}'" ) ) {
				$versions = $wpdb->get_results( "SELECT table_name FROM {$versions_table}" );
				foreach ( $versions as $version ) {
					$version_tables[] = $wpdb->prefix . $version->table_name;
				}
			}

			// Combine all tables
			$all_tables = array_merge( $base_tables, $version_tables );

			// Build batch DROP TABLE statement
			if ( ! empty( $all_tables ) ) {
				$existing_tables = array();
				
				// Check which tables actually exist to avoid errors
				foreach ( $all_tables as $table ) {
					if ( $wpdb->get_var( "SHOW TABLES LIKE '{$table}'" ) ) {
						$existing_tables[] = "`{$table}`";
					}
				}

				// Execute batch DROP TABLE if we have tables to drop
				if ( ! empty( $existing_tables ) ) {
					$drop_sql = 'DROP TABLE IF EXISTS ' . implode( ', ', $existing_tables );
					$result = $wpdb->query( $drop_sql );
					
					if ( $result === false ) {
						error_log( 'Bible Here: Error dropping tables: ' . $wpdb->last_error );
						// Fallback to individual drops if batch fails
						foreach ( $existing_tables as $table ) {
							$wpdb->query( "DROP TABLE IF EXISTS {$table}" );
						}
					} else {
						error_log( 'Bible Here: Successfully dropped ' . count( $existing_tables ) . ' tables' );
					}
				}
			}

			// Re-enable foreign key checks
			$wpdb->query( 'SET FOREIGN_KEY_CHECKS = 1' );

		} catch ( Exception $e ) {
			error_log( 'Bible Here: Error during deactivation cleanup: ' . $e->getMessage() );
			// Re-enable foreign key checks even on error
			$wpdb->query( 'SET FOREIGN_KEY_CHECKS = 1' );
		}

		// Clean up any uploaded files
		$upload_dir = wp_upload_dir();
		$plugin_upload_dir = $upload_dir['basedir'] . '/bible-here-temp';
		if ( is_dir( $plugin_upload_dir ) ) {
			self::delete_directory( $plugin_upload_dir );
			error_log( 'Bible Here: Cleaned up upload directory' );
		}

		// Log completion time
		$end_time = microtime( true );
		$execution_time = round( $end_time - $start_time, 2 );
		error_log( 'Bible Here: Deactivation cleanup completed in ' . $execution_time . ' seconds' );
	}

}
