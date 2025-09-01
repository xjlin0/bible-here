<?php

/**
 * The public-facing functionality of the plugin.
 *
 * @link       https://github.com/xjlin0
 * @since      1.0.0
 *
 * @package    Bible_Here
 * @subpackage Bible_Here/public
 */

/**
 * The public-facing functionality of the plugin.
 *
 * Defines the plugin name, version, and two examples hooks for how to
 * enqueue the public-facing stylesheet and JavaScript.
 *
 * @package    Bible_Here
 * @subpackage Bible_Here/public
 * @author     Jack Lin <xjlin0@gmail.com>
 */
class Bible_Here_Public {

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
	 * @param      string    $plugin_name       The name of the plugin.
	 * @param      string    $version    The version of this plugin.
	 */
	public function __construct( $plugin_name, $version ) {

		$this->plugin_name = $plugin_name;
		$this->version = $version;

	}

	/**
	 * Register the shortcodes for the public-facing side of the site.
	 *
	 * @since    1.0.0
	 */
	public function register_shortcodes() {
		add_shortcode( 'bible-here-reader', array( $this, 'bible_here_reader_shortcode' ) );
	}

	/**
	 * Handle the bible-here-reader shortcode.
	 *
	 * @since    1.0.0
	 * @param    array    $atts    Shortcode attributes.
	 * @return   string            The shortcode output.
	 */
	public function bible_here_reader_shortcode( $atts ) {
		// Parse shortcode attributes with new defaults
		$atts = shortcode_atts( array(
			'version' => 'bible_here_en_kjv',
			'book' => '1',
			'chapter' => '1',
			'language' => 'en'
		), $atts, 'bible-here-reader' );

		// Generate unique ID for this reader instance
		static $reader_count = 0;
		$reader_count++;
		$reader_id = 'bible-here-reader-' . $reader_count;

		// Enqueue scripts and styles for this shortcode
		$this->enqueue_reader_assets();

		// Start output buffering
		ob_start();
		
		// Include the reader template
		include plugin_dir_path( __FILE__ ) . 'partials/bible-here-reader-display.php';
		
		return ob_get_clean();
	}

	/**
	 * Enqueue assets specifically for the bible reader.
	 *
	 * @since    1.0.0
	 */
	private function enqueue_reader_assets() {
		// Enqueue reader-specific CSS
		wp_enqueue_style( 
			$this->plugin_name . '-reader', 
			plugin_dir_url( __FILE__ ) . 'css/bible-here-reader.css', 
			array(), 
			$this->version, 
			'all' 
		);

		// Enqueue reader-specific JavaScript (no jQuery dependency)
		wp_enqueue_script( 
			$this->plugin_name . '-reader', 
			plugin_dir_url( __FILE__ ) . 'js/bible-here-reader.js', 
			array(), 
			$this->version, 
			true 
		);

		// Localize script with AJAX URL and nonce
		wp_localize_script( 
			$this->plugin_name . '-reader', 
			'bibleHereAjax', 
			array(
				'ajaxurl' => admin_url( 'admin-ajax.php' ),
				'nonce' => wp_create_nonce( 'bible_here_nonce' )
			)
		);
	}

	/**
	 * Handle AJAX request for getting Bible versions.
	 *
	 * @since    1.0.0
	 */
	public function handle_ajax_get_versions() {
		// Verify nonce
		if ( ! wp_verify_nonce( $_SERVER['HTTP_X_WP_NONCE'], 'bible_here_nonce' ) ) {
			wp_die( 'Security check failed', 'Unauthorized', array( 'response' => 401 ) );
		}

		// Get parameters from GET request
		$language = sanitize_text_field( $_GET['language'] ?? 'en' );
		$types = isset( $_GET['types'] ) ? array_map( 'sanitize_text_field', (array) $_GET['types'] ) : [];

		// Mock response for phase 1 - this will be replaced with actual database queries in phase 2
		$mock_versions = array(
			array(
				'table_name' => 'kjv',
				'version_name' => 'King James Version',
				'language' => 'en',
				'type' => 'Bible',
				'rank' => 1
			),
			array(
				'table_name' => 'niv',
				'version_name' => 'New International Version',
				'language' => 'en',
				'type' => 'Bible',
				'rank' => 2
			),
			array(
				'table_name' => 'cunp',
				'version_name' => 'Chinese Union Version (Traditional)',
				'language' => 'zh-TW',
				'type' => 'Bible',
				'rank' => 1
			)
		);

		// Filter by language
		$filtered_versions = array_filter( $mock_versions, function( $version ) use ( $language ) {
			return $version['language'] === $language;
		});

		wp_send_json_success( array_values( $filtered_versions ) );
	}

	/**
	 * Handle AJAX request for getting Bible books.
	 *
	 * @since    1.0.0
	 */
	public function handle_ajax_get_books() {
		// Verify nonce
		if ( ! wp_verify_nonce( $_SERVER['HTTP_X_WP_NONCE'], 'bible_here_nonce' ) ) {
			wp_die( 'Security check failed', 'Unauthorized', array( 'response' => 401 ) );
		}

		// Get parameters from GET request
		$language = sanitize_text_field( $_GET['language'] ?? 'en' );

		// Mock response for phase 1 - this will be replaced with actual database queries in phase 2
		$mock_books = array(
			array(
				'book_name' => 'genesis',
				'book_name_display' => $language === 'zh-TW' ? '創世記' : 'Genesis',
				'book_number' => 1,
				'testament' => 'OT'
			),
			array(
				'book_name' => 'exodus',
				'book_name_display' => $language === 'zh-TW' ? '出埃及記' : 'Exodus',
				'book_number' => 2,
				'testament' => 'OT'
			),
			array(
				'book_name' => 'matthew',
				'book_name_display' => $language === 'zh-TW' ? '馬太福音' : 'Matthew',
				'book_number' => 40,
				'testament' => 'NT'
			),
			array(
				'book_name' => 'john',
				'book_name_display' => $language === 'zh-TW' ? '約翰福音' : 'John',
				'book_number' => 43,
				'testament' => 'NT'
			)
		);

		wp_send_json_success( $mock_books );
	}

	/**
	 * Register the stylesheets for the public-facing side of the site.
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

		wp_enqueue_style( $this->plugin_name, plugin_dir_url( __FILE__ ) . 'css/bible-here-public.css', array(), $this->version, 'all' );

	}

	/**
	 * Register the JavaScript for the public-facing side of the site.
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

		wp_enqueue_script( $this->plugin_name, plugin_dir_url( __FILE__ ) . 'js/bible-here-public.js', array( 'jquery' ), $this->version, false );

	}

}
