<?php

/**
 * The plugin bootstrap file
 *
 * This file is read by WordPress to generate the plugin information in the plugin
 * admin area. This file also includes all of the dependencies used by the plugin,
 * registers the activation and deactivation functions, and defines a function
 * that starts the plugin.
 *
 * @link              https://github.com/xjlin0
 * @since             1.0.0
 * @package           Bible_Here
 *
 * @wordpress-plugin
 * Plugin Name:       Bible here
 * Plugin URI:        https://wordpress.org/plugins/bible-here
 * Description:       A Wordpress plugin to show Christian Bible scriptures, including admin page to download versions of Bible, a frontend page for users to read the verse, and auto/manual-tagging scriptures in all Pages/Posts.
 * Version:           1.0.0
 * Author:            Jack Lin
 * Author URI:        https://github.com/xjlin0/
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       bible-here
 * Domain Path:       /languages
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Currently plugin version.
 * Start at version 1.0.0 and use SemVer - https://semver.org
 * Rename this for your plugin and update it as you release new versions.
 */
define( 'BIBLE_HERE_VERSION', '1.0.0' );

/**
 * The code that runs during plugin activation.
 * This action is documented in includes/class-bible-here-activator.php
 */
function activate_bible_here() {
	require_once plugin_dir_path( __FILE__ ) . 'includes/class-bible-here-activator.php';
	Bible_Here_Activator::activate();
}

/**
 * The code that runs during plugin deactivation.
 * This action is documented in includes/class-bible-here-deactivator.php
 */
function deactivate_bible_here() {
	require_once plugin_dir_path( __FILE__ ) . 'includes/class-bible-here-deactivator.php';
	Bible_Here_Deactivator::deactivate();
}

register_activation_hook( __FILE__, 'activate_bible_here' );
register_deactivation_hook( __FILE__, 'deactivate_bible_here' );

/**
 * The core plugin class that is used to define internationalization,
 * admin-specific hooks, and public-facing site hooks.
 */
require plugin_dir_path( __FILE__ ) . 'includes/class-bible-here.php';

/**
 * Begins execution of the plugin.
 *
 * Since everything within the plugin is registered via hooks,
 * then kicking off the plugin from this point in the file does
 * not affect the page life cycle.
 *
 * @since    1.0.0
 */
function run_bible_here() {

	$plugin = new Bible_Here();
	$plugin->run();

}
run_bible_here();
