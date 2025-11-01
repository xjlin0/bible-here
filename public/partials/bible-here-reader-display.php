<?php

/**
 * Provide a public-facing view for the bible-here-reader shortcode.
 *
 * This file is used to markup the public-facing aspects of the plugin.
 *
 * @link       https://github.com/xjlin0
 * @since      1.0.0
 *
 * @package    Bible_Here
 * @subpackage Bible_Here/public/partials
 */

// Prevent direct access
if ( ! defined( 'WPINC' ) ) {
	die;
}

// Determine the initial mode - always single mode now
$initial_mode = 'single';
$default_book = !empty( $atts['book'] ) ? sanitize_text_field( $atts['book'] ) : 19;
$default_chapter = !empty( $atts['chapter'] ) ? intval( $atts['chapter'] ) : 117;
$default_language = !empty( $atts['language'] ) ? sanitize_text_field( $atts['language'] ) : 'en';
$default_version = !empty( $atts['version'] ) ? sanitize_text_field( $atts['version'] ) : 'bible_here_en_kjv';

// Book number to short name mapping for initial display - loaded from database
global $wpdb;
$book_short_names_results = $wpdb->get_results(
	"SELECT book_number, title_short FROM {$wpdb->prefix}bible_here_books WHERE language='" . esc_sql( $default_language ) . "'",
	ARRAY_A
);

// Convert results to associative array with book_number as key and title_short as value
$book_short_names = array();
if ($book_short_names_results) {
	foreach ($book_short_names_results as $row) {
		$book_short_names[intval($row['book_number'])] = $row['title_short'];
	}
}

// Fallback to hardcoded values if database query fails
// if (empty($book_short_names)) {
// 	$book_short_names = array(
// 		1 => 'Gen', 2 => 'Exod', 3 => 'Lev', 4 => 'Num', 5 => 'Deut',
// 		6 => 'Josh', 7 => 'Judg', 8 => 'Ruth', 9 => '1Sam', 10 => '2Sam',
// 		11 => '1Kgs', 12 => '2Kgs', 13 => '1Chr', 14 => '2Chr', 15 => 'Ezra',
// 		16 => 'Neh', 17 => 'Esth', 18 => 'Job', 19 => 'Ps', 20 => 'Prov',
// 		21 => 'Eccl', 22 => 'Song', 23 => 'Isa', 24 => 'Jer', 25 => 'Lam',
// 		26 => 'Ezek', 27 => 'Dan', 28 => 'Hos', 29 => 'Joel', 30 => 'Amos',
// 		31 => 'Obad', 32 => 'Jonah', 33 => 'Mic', 34 => 'Nah', 35 => 'Hab',
// 		36 => 'Zeph', 37 => 'Hag', 38 => 'Zech', 39 => 'Mal', 40 => 'Matt',
// 		41 => 'Mark', 42 => 'Luke', 43 => 'John', 44 => 'Acts', 45 => 'Rom',
// 		46 => '1Cor', 47 => '2Cor', 48 => 'Gal', 49 => 'Eph', 50 => 'Phil',
// 		51 => 'Col', 52 => '1Thess', 53 => '2Thess', 54 => '1Tim', 55 => '2Tim',
// 		56 => 'Titus', 57 => 'Phlm', 58 => 'Heb', 59 => 'Jas', 60 => '1Pet',
// 		61 => '2Pet', 62 => '1John', 63 => '2John', 64 => '3John', 65 => 'Jude', 66 => 'Rev'
// 	);
// }

$default_book_short = isset($book_short_names[$default_book]) ? $book_short_names[$default_book] : 'Ps';

// Check if cross references are installed
$reference_installed = $wpdb->get_var("SELECT EXISTS(SELECT 1 FROM {$wpdb->prefix}bible_here_cross_references LIMIT 1)");
$strong_installed = $wpdb->get_var("SELECT EXISTS(SELECT 1 FROM {$wpdb->prefix}bible_here_strong_dictionary LIMIT 1)");
?>

<div id="<?php echo esc_attr( $reader_id ); ?>" class="bible-here-reader" 
     data-mode="<?php echo esc_attr( $initial_mode ); ?>"
     data-book="<?php echo esc_attr( $default_book ); ?>"
     data-chapter="<?php echo esc_attr( $default_chapter ); ?>"
     data-language1="<?php echo esc_attr( $default_language ); ?>"
     data-version1="<?php echo esc_attr( $default_version ); ?>"
     data-reference-installed="<?php echo esc_attr( $reference_installed ? '1' : '0' ); ?>"
	 data-strong-installed="<?php echo esc_attr( $strong_installed ? '1' : '0' ); ?>">

	<!-- Navigation Bar (All buttons in single row) -->
	<div class="bible-reader-nav">
		<!-- Search Button (moved to leftmost position) -->
		<div class="search-container">
			<button type="button" class="btn-nav btn-search" title="<?php _e( 'Search', 'bible-here' ); ?>">
				<span class="search-icon">🔍</span>
			</button>
			<div class="search-input-container" style="display: none;">
				<input type="text" class="search-input" placeholder="<?php _e( 'Search verses...', 'bible-here' ); ?>" maxlength="100">
				<button type="button" class="search-submit-btn" title="<?php _e( 'Search', 'bible-here' ); ?>">
					<span class="search-icon">🔍</span>
				</button>
				<button type="button" class="search-cancel-btn" title="<?php _e( 'Cancel', 'bible-here' ); ?>">
					<span class="cancel-icon">×</span>
				</button>
			</div>
		</div>

		<!-- Navigation Group: Previous, Book+Chapter, Version, Next (grouped together) -->
		<div class="nav-group navigation-controls">
			<button type="button" class="btn-nav btn-prev" title="<?php _e( 'Previous Chapter', 'bible-here' ); ?>">
				<span class="nav-arrow">‹</span>
			</button>
			
			<!-- Book and Chapter Button -->
			<div class="book-chapter-selector1">
				<button type="button" class="btn-nav btn1-book-chapter" value="1" title="<?php _e( 'Select Book and Chapter', 'bible-here' ); ?>">
					<span class="book-chapter-text1" data-version-name-short="KJV" data-book-name-short="<?php echo esc_attr( $default_book_short ); ?>">KJV <?php echo esc_html( $default_book_short ); ?> <?php echo esc_html( $default_chapter ); ?></span>
				</button>
				<!-- Hidden selectors for functionality -->
				<select id="<?php echo esc_attr( $reader_id ); ?>-book" class="book-select" style="display: none;">
					<option value="Genesis" <?php selected( $default_book, 'Genesis' ); ?>><?php _e( 'Genesis', 'bible-here' ); ?></option>
				</select>
				<select id="<?php echo esc_attr( $reader_id ); ?>-chapter" class="chapter-select" style="display: none;">
					<option value="1" <?php selected( $default_chapter, 1 ); ?>>1</option>
				</select>
			</div>

			<!-- Book Chapter Menu (Hidden by default) -->
			<div class="book-chapter-menu" style="display: none;">
				<div class="book-chapter-menu-content">
					<!-- Tab Navigation -->
					<div class="menu-tabs">
						<button type="button" class="menu-tab" data-tab="versions"><?php _e( 'Version', 'bible-here' ); ?></button>
						<button type="button" class="menu-tab active" data-tab="books"><?php _e( 'Book', 'bible-here' ); ?></button>
						<button type="button" class="menu-tab" data-tab="chapters"><?php _e( 'Chapter', 'bible-here' ); ?></button>
					</div>

					<!-- Tab Content -->
					<div class="menu-content">
						<!-- Versions Tab -->
						<div class="tab-content" data-content="versions">
							<div class="versions-list">
							<!-- Versions will be dynamically loaded here -->
					</div>
						</div>

						<!-- Books Tab -->
						<div class="tab-content active" data-content="books">
							<div class="books-section">
						<h5 class="testament-title"><?php _e( 'Old Testament', 'bible-here' ); ?></h5>
						<div class="books-grid old-testament">
							<!-- Old Testament books will be dynamically loaded here -->
						</div>
					</div>
							<div class="books-section">
						<h5 class="testament-title"><?php _e( 'New Testament', 'bible-here' ); ?></h5>
						<div class="books-grid new-testament">
							<!-- New Testament books will be dynamically loaded here -->
						</div>
					</div>
						</div>

						<!-- Chapters Tab -->
						<div class="tab-content" data-content="chapters">
							<div class="chapters-grid">
								<!-- Chapters will be dynamically populated based on selected book -->
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Swap/Toggle Button -->
			<button type="button" class="btn-nav btn-swap" title="<?php _e( 'Swap Versions', 'bible-here' ); ?>">
				<span class="swap-icon">⇄</span>
			</button>

			<!-- Book and Chapter Button for Second Version (Dual Mode Only) -->
			<div class="book-chapter-selector2" style="display: none;">
				<button type="button" class="btn-nav btn2-book-chapter" value="2" title="<?php _e( 'Select Version for Second Panel', 'bible-here' ); ?>">
					<span class="book-chapter-text2" data-version-name-short="" data-book-name-short=""><?php _e( 'Select Version', 'bible-here' ); ?></span>
				</button>
			</div>

			<!-- More Versions / Version Toggle Button (moved to middle of navigation group) -->
			<button type="button" class="btn-nav btn-versions" title="<?php _e( 'More Versions', 'bible-here' ); ?>">
				<span class="versions-text"><?php _e( '+ version', 'bible-here' ); ?></span>
			</button>
			
			<button type="button" class="btn-nav btn-next" title="<?php _e( 'Next Chapter', 'bible-here' ); ?>">
				<span class="nav-arrow">›</span>
			</button>
		</div>

		<!-- Settings Button -->
		<button type="button" class="btn-nav btn-settings" title="<?php _e( 'Settings', 'bible-here' ); ?>">
			<span class="settings-icon">⚙️</span>
		</button>

		<!-- Settings Menu (Hidden by default) -->
		<div class="theme-menu" style="display: none;">
			<div class="theme-menu-content">
				<!-- Theme Settings Section -->
				<div class="settings-section">
					<h4><?php _e( 'Theme Settings', 'bible-here' ); ?></h4>
					<div class="theme-options">
						<label class="theme-option">
							<input type="radio" name="theme-preference" value="light" checked>
							<span><?php _e( 'Light Theme', 'bible-here' ); ?></span>
						</label>
						<label class="theme-option">
							<input type="radio" name="theme-preference" value="dark">
							<span><?php _e( 'Dark Theme', 'bible-here' ); ?></span>
						</label>
						<label class="theme-option">
							<input type="radio" name="theme-preference" value="system">
							<span><?php _e( 'By system preferences', 'bible-here' ); ?></span>
						</label>
					</div>
				</div>

				<!-- Font Size Settings Section -->
				<div class="settings-section">
					<h4><?php _e( 'Font Size', 'bible-here' ); ?></h4>
					<div class="font-size-control">
						<label for="font-size-slider"><?php _e( 'Size:', 'bible-here' ); ?></label>
						<input type="range" id="font-size-slider" class="font-size-slider" min="0" max="7" value="2" step="1">
						<span class="font-size-value">16px</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Content Area -->
	<div class="bible-reader-content">
		<!-- Loading Indicator -->
		<div class="loading-indicator" style="display: none;">
			<div class="spinner"></div>
			<p><?php _e( 'Loading...', 'bible-here' ); ?></p>
		</div>

		<!-- Error Message -->
		<div class="error-message" style="display: none;">
			<div class="error-content">
				<h4><?php _e( 'Error', 'bible-here' ); ?></h4>
				<p class="error-text"></p>
				<button type="button" class="btn-retry"><?php _e( 'Retry', 'bible-here' ); ?></button>
			</div>
		</div>
		<!-- Single Version Mode (Default) -->
		<div class="single-version-mode">
			<div class="bible-version version-1" data-language-number="1">
				<div class="verses-container">
					<!-- Verses will be loaded here -->
				</div>
			</div>
		</div>

		<!-- Dual Version Mode -->
		<div class="dual-version-mode" style="display: none;">
			<div class="versions-container">
				<div class="bible-version version-1" style="order: 0;" data-language-number="1">
					<div class="verses-container">
						<!-- Verses will be loaded here -->
					</div>
				</div>
				<!-- Resizable Divider -->
				<div class="resizable-divider" title="<?php _e( 'Drag to resize', 'bible-here' ); ?>">
					<div class="divider-handle">
						<div class="divider-grip"></div>
					</div>
				</div>
				<div class="bible-version version-2" style="order: 2;" data-language-number="2">
					<button type="button" class="btn-close-version" title="<?php _e( 'Close dual version', 'bible-here' ); ?>">
						<span class="close-icon">×</span>
					</button>
					<div class="verses-container">
						<!-- Verses will be loaded here -->
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Cross Reference Modal -->
	<div id="cross-reference-modal" class="cross-reference-modal" style="display: none;">
		<div class="modal-overlay"></div>
		<div class="modal-container">
			<div class="modal-header">
				<h3 class="modal-title"></h3>
				<button type="button" class="modal-close" title="<?php _e( 'Close', 'bible-here' ); ?>">
					<span class="close-icon">X</span>
				</button>
			</div>
			<div class="modal-content">
				<div class="cross-references-list">
					<!-- Cross references will be loaded here -->
				</div>
			</div>
		</div>
	</div>

	<!-- Search Results Modal -->
	<div id="search-results-modal" class="search-results-modal" style="display: none;">
		<div class="modal-overlay"></div>
		<div class="modal-container">
			<div class="modal-header">
				<h3 class="modal-title"></h3>
				<button type="button" class="modal-close" title="<?php _e( 'Close', 'bible-here' ); ?>">
					<span class="close-icon">X</span>
				</button>
			</div>
			<div class="modal-content">
				<div class="search-results-list">
					<!-- Search results will be loaded here -->
				</div>
			</div>
		</div>
	</div>

	<!-- Strong Number Modal -->
	<div id="strong-number-modal" class="strong-number-modal" style="display: none;">
		<div class="modal-overlay"></div>
		<div class="modal-container">
			<div class="modal-header">
				<h3 class="modal-title"></h3>
				<button type="button" class="modal-backward modal-close" title="<?php _e( 'Backward', 'bible-here' ); ?>">
					<span class="backward-icon">&lt;</span>
				</button>
				<button type="button" class="strong-forward modal-close" title="<?php _e( 'Forward', 'bible-here' ); ?>">
					<span class="forward-icon">&gt;</span>
				</button>
				<button type="button" class="modal-close close-button" title="<?php _e( 'Close', 'bible-here' ); ?>">
					<span class="close-icon">X</span>
				</button>
			</div>
			<div class="modal-content">
				<div class="strong-numbers-list">
					<!-- Strong numbers will be loaded here -->
				</div>
			</div>
		</div>
	</div>
</div>