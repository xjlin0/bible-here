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
		// Plugin is deactivated but data is preserved
		// No cleanup operations are performed
		// This allows users to reactivate the plugin later with their data intact
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
		global $wpdb;

		// Get all tables with our prefix
		$tables = $wpdb->get_results(
			$wpdb->prepare(
				"SHOW TABLES LIKE %s",
				$wpdb->esc_like( $wpdb->prefix . 'bible_here_' ) . '%'
			)
		);

		// Drop all plugin tables
		foreach ( $tables as $table ) {
			$table_name = array_values( (array) $table )[0];
			$wpdb->query( "DROP TABLE IF EXISTS `{$table_name}`" );
		}

		// Clean up any uploaded files
		$upload_dir = wp_upload_dir();
		$plugin_upload_dir = $upload_dir['basedir'] . '/bible-here-temp';
		if ( is_dir( $plugin_upload_dir ) ) {
			self::delete_directory( $plugin_upload_dir );
		}
	}

}
