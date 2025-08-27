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
 * Description:       A Wordpress plugin to show Christian Bible scriptures, including admin pages to download versions of Bible installed locally without calling remote API, a frontend page for users to read the verse, and auto/manual-tagging scriptures in all Pages/Posts.
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
	
	// Set activation notice transient
	set_transient( 'bible_here_activation_notice', true, 5 );
	
	// Redirect to avoid showing default WordPress activation message
	// if ( ! wp_doing_ajax() && ! wp_doing_cron() ) {
	// 	$versions_url = admin_url( 'admin.php?page=bible-here-versions&activated=true' );
	// 	wp_safe_redirect( $versions_url );
	// 	exit;
	// }
}

/**
 * Display activation notice with link to versions page.
 */
function bible_here_activation_notice() {
	// Check if we're on the versions page and activation parameter is set
	if ( isset( $_GET['page'] ) && $_GET['page'] === 'bible-here-versions' && isset( $_GET['activated'] ) && $_GET['activated'] === 'true' ) {
		echo '<div class="notice notice-success is-dismissible">';
		echo '<p>Plugin activated successfully! You can now download and install Bible versions.</p>';
		echo '</div>';
		return;
	}
	
	// Don't show fallback notice to avoid duplicate messages
	// The redirect will handle showing the notice on the correct page
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

// Add activation notice hook
add_action( 'admin_notices', 'bible_here_activation_notice' );

// Add deactivation warning script
add_action( 'admin_footer-plugins.php', 'bible_here_deactivation_warning' );

// Add AJAX handler for setting deactivation mode
add_action( 'wp_ajax_bible_here_set_deactivation_mode', 'bible_here_handle_deactivation_mode' );

/**
 * Handle AJAX request to set deactivation mode.
 */
function bible_here_handle_deactivation_mode() {
	// Verify nonce
	if ( ! wp_verify_nonce( $_POST['nonce'], 'bible_here_deactivate_nonce' ) ) {
		wp_die( 'Security check failed' );
	}
	
	// Check user permissions
	if ( ! current_user_can( 'activate_plugins' ) ) {
		wp_die( 'Insufficient permissions' );
	}
	
	// Store the deactivation mode in a transient
	$delete_data = isset( $_POST['delete_data'] ) && $_POST['delete_data'] === 'true';
	set_transient( 'bible_here_deactivation_mode', $delete_data ? 'delete' : 'preserve', 60 );
	
	wp_send_json_success();
}

/**
 * Add JavaScript prompt dialog for plugin deactivation.
 */
function bible_here_deactivation_warning() {
	$plugin_file = plugin_basename( __FILE__ );
	$ajax_url = admin_url( 'admin-ajax.php' );
	$nonce = wp_create_nonce( 'bible_here_deactivate_nonce' );
	?>
	<script type="text/javascript">
	jQuery(document).ready(function($) {
		$('tr[data-plugin="<?php echo $plugin_file; ?>"] .deactivate a').click(function(e) {
			e.preventDefault();
			var originalUrl = this.href;
			
			var userInput = prompt('Sad to see you want to deactivate the plugin. Please let us know if you also want to delete all its data:\n- Enter "deactivate and delete" to deactivate the plugin and delete all its data.\n- Enter all other text & click OK will still deactivate the plugin but keep its data.\n- Click Cancel to abort the deactivation', 'deactivate and delete');
			
			if (userInput === null) {
				// User clicked Cancel, do nothing
				return;
			}
			
			var deleteData = (userInput.toLowerCase() === 'deactivate and delete');
			
			// Send AJAX request to set deactivation mode
			$.ajax({
				url: '<?php echo $ajax_url; ?>',
				type: 'POST',
				data: {
					action: 'bible_here_set_deactivation_mode',
					delete_data: deleteData,
					nonce: '<?php echo $nonce; ?>'
				},
				success: function(response) {
					// Proceed with deactivation
					window.location.href = originalUrl;
				},
				error: function() {
					alert('Getting error when setting deactivation mode, please try again.');
				}
			});
		});
	});
	</script>
	<?php
}

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
