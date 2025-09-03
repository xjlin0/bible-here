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
$default_book = !empty( $atts['book'] ) ? sanitize_text_field( $atts['book'] ) : 'Genesis';
$default_chapter = !empty( $atts['chapter'] ) ? intval( $atts['chapter'] ) : 1;
$default_language = !empty( $atts['language'] ) ? sanitize_text_field( $atts['language'] ) : 'en';
$default_version = !empty( $atts['version'] ) ? sanitize_text_field( $atts['version'] ) : 'bible_here_en_kjv';

?>

<div id="<?php echo esc_attr( $reader_id ); ?>" class="bible-here-reader" 
     data-mode="<?php echo esc_attr( $initial_mode ); ?>"
     data-book="<?php echo esc_attr( $default_book ); ?>"
     data-chapter="<?php echo esc_attr( $default_chapter ); ?>"
     data-language="<?php echo esc_attr( $default_language ); ?>"
     data-version="<?php echo esc_attr( $default_version ); ?>">

	<!-- Navigation Bar (All buttons in single row) -->
	<div class="bible-reader-nav">
		<!-- Search Button (moved to leftmost position) -->
		<button type="button" class="btn-nav btn-search" title="<?php _e( 'Search', 'bible-here' ); ?>">
			<span class="search-icon">🔍</span>
		</button>

		<!-- Navigation Group: Previous, Book+Chapter, Version, Next (grouped together) -->
		<div class="nav-group navigation-controls">
			<button type="button" class="btn-nav btn-prev" title="<?php _e( 'Previous Chapter', 'bible-here' ); ?>">
				<span class="nav-arrow">‹</span>
			</button>
			
			<!-- Book and Chapter Button -->
			<div class="book-chapter-selector">
				<button type="button" class="btn-nav btn-book-chapter" title="<?php _e( 'Select Book and Chapter', 'bible-here' ); ?>">
					<span class="book-chapter-text"><?php echo esc_html( $default_book ); ?> <?php echo esc_html( $default_chapter ); ?></span>
					<span class="dropdown-arrow">▼</span>
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
						<button type="button" class="menu-tab" data-tab="versions"><?php _e( '和合本', 'bible-here' ); ?></button>
						<button type="button" class="menu-tab active" data-tab="books"><?php _e( '書卷', 'bible-here' ); ?></button>
						<button type="button" class="menu-tab" data-tab="chapters"><?php _e( '章', 'bible-here' ); ?></button>
					</div>

					<!-- Tab Content -->
					<div class="menu-content">
						<!-- Versions Tab -->
						<div class="tab-content" data-content="versions">
							<div class="versions-list">
								<div class="version-item active"><?php _e( '和合本', 'bible-here' ); ?></div>
								<div class="version-item"><?php _e( 'KJV', 'bible-here' ); ?></div>
								<div class="version-item"><?php _e( 'NIV', 'bible-here' ); ?></div>
							</div>
						</div>

						<!-- Books Tab -->
						<div class="tab-content active" data-content="books">
							<div class="books-section">
								<h5 class="testament-title"><?php _e( '舊約', 'bible-here' ); ?></h5>
								<div class="books-grid old-testament">
									<div class="book-item active" data-book="Genesis"><?php _e( '創', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '創世記', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Exodus"><?php _e( '出', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '出埃及記', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Leviticus"><?php _e( '利', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '利未記', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Numbers"><?php _e( '民', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '民數記', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Deuteronomy"><?php _e( '申', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '申命記', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Joshua"><?php _e( '書', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '約書亞記', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Judges"><?php _e( '士', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '士師記', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Ruth"><?php _e( '得', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '路得記', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="1Samuel"><?php _e( '撒上', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '撒母耳記上', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="2Samuel"><?php _e( '撒下', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '撒母耳記下', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="1Kings"><?php _e( '王上', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '列王紀上', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="2Kings"><?php _e( '王下', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '列王紀下', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="1Chronicles"><?php _e( '代上', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '歷代志上', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="2Chronicles"><?php _e( '代下', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '歷代志下', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Ezra"><?php _e( '拉', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '以斯拉記', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Nehemiah"><?php _e( '尼', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '尼希米記', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Esther"><?php _e( '斯', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '以斯帖記', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Job"><?php _e( '伯', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '約伯記', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Psalms"><?php _e( '詩', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '詩篇', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Proverbs"><?php _e( '箴', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '箴言', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Ecclesiastes"><?php _e( '傳', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '傳道書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="SongofSongs"><?php _e( '歌', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '雅歌', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Isaiah"><?php _e( '賽', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '以賽亞書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Jeremiah"><?php _e( '耶', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '耶利米書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Lamentations"><?php _e( '哀', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '耶利米哀歌', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Ezekiel"><?php _e( '結', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '以西結書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Daniel"><?php _e( '但', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '但以理書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Hosea"><?php _e( '何', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '何西阿書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Joel"><?php _e( '珥', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '約珥書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Amos"><?php _e( '摩', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '阿摩司書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Obadiah"><?php _e( '俄', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '俄巴底亞書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Jonah"><?php _e( '拿', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '約拿書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Micah"><?php _e( '彌', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '彌迦書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Nahum"><?php _e( '鴻', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '那鴻書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Habakkuk"><?php _e( '哈', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '哈巴谷書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Zephaniah"><?php _e( '番', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '西番雅書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Haggai"><?php _e( '該', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '哈該書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Zechariah"><?php _e( '亞', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '撒迦利亞書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Malachi"><?php _e( '瑪', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '瑪拉基書', 'bible-here' ); ?></span></div>
								</div>
							</div>
							<div class="books-section">
								<h5 class="testament-title"><?php _e( '新約', 'bible-here' ); ?></h5>
								<div class="books-grid new-testament">
									<div class="book-item" data-book="Matthew"><?php _e( '太', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '馬太福音', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Mark"><?php _e( '可', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '馬可福音', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Luke"><?php _e( '路', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '路加福音', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="John"><?php _e( '約', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '約翰福音', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Acts"><?php _e( '徒', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '使徒行傳', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Romans"><?php _e( '羅', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '羅馬書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="1Corinthians"><?php _e( '林前', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '哥林多前書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="2Corinthians"><?php _e( '林後', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '哥林多後書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Galatians"><?php _e( '加', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '加拉太書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Ephesians"><?php _e( '弗', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '以弗所書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Philippians"><?php _e( '腓', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '腓立比書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Colossians"><?php _e( '西', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '歌羅西書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="1Thessalonians"><?php _e( '帖前', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '帖撒羅尼迦前書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="2Thessalonians"><?php _e( '帖後', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '帖撒羅尼迦後書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="1Timothy"><?php _e( '提前', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '提摩太前書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="2Timothy"><?php _e( '提後', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '提摩太後書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Titus"><?php _e( '多', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '提多書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Philemon"><?php _e( '門', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '腓利門書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Hebrews"><?php _e( '來', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '希伯來書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="James"><?php _e( '雅', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '雅各書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="1Peter"><?php _e( '彼前', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '彼得前書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="2Peter"><?php _e( '彼後', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '彼得後書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="1John"><?php _e( '約一', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '約翰一書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="2John"><?php _e( '約二', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '約翰二書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="3John"><?php _e( '約三', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '約翰三書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Jude"><?php _e( '猶', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '猶大書', 'bible-here' ); ?></span></div>
									<div class="book-item" data-book="Revelation"><?php _e( '啟', 'bible-here' ); ?><br><span class="book-subtitle"><?php _e( '啟示錄', 'bible-here' ); ?></span></div>
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
		<!-- Single Version Mode (Default) -->
		<div class="single-version-mode">
			<div class="bible-version version-1">
				<div class="chapter-content">
					<!-- Verses will be loaded here -->
				</div>
			</div>
		</div>

		<!-- Dual Version Mode -->
		<div class="dual-version-mode" style="display: none;">
			<div class="versions-container">
				<div class="bible-version version-1" style="order: 0;">
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
				<div class="bible-version version-2" style="order: 2;">
					<div class="verses-container">
						<!-- Verses will be loaded here -->
					</div>
				</div>
			</div>
		</div>

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
	</div>
</div>