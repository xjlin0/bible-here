<?php

/**
 * Provide a admin area view for the plugin
 *
 * This file is used to markup the admin-facing aspects of the plugin.
 *
 * @link       https://github.com/xjlin0
 * @since      1.0.0
 *
 * @package    Bible_Here
 * @subpackage Bible_Here/admin/partials
 */
?>

<!-- This file should primarily consist of HTML with a little bit of PHP. -->

<div class="wrap">
    <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
    
    <div class="bible-here-dashboard">
        <div class="bible-here-stats">
            <h2>Plugin Statistics</h2>
            <div class="stats-grid">
                <div class="stat-box">
                    <h3>Bible Books</h3>
                    <p class="stat-number"><?php echo esc_html($books_count); ?></p>
                </div>
                <div class="stat-box">
                    <h3>Genres</h3>
                    <p class="stat-number"><?php echo esc_html($genres_count); ?></p>
                </div>
                <div class="stat-box">
                    <h3>Bible Versions</h3>
                    <p class="stat-number"><?php echo esc_html($versions_count); ?></p>
                </div>
            </div>
        </div>
        
        <div class="bible-here-quick-actions">
            <h2>Quick Actions</h2>
            <div class="action-buttons">
                <a href="<?php echo admin_url('admin.php?page=bible-here-versions'); ?>" class="button button-primary">
                    Manage Bible Versions
                </a>
                <a href="<?php echo admin_url('admin.php?page=bible-here-settings'); ?>" class="button button-secondary">
                    Plugin Settings
                </a>
            </div>
        </div>
        
        <div class="bible-here-info">
            <h2>About Bible Here Plugin</h2>
            <p>The Bible Here plugin allows you to easily reference Bible verses in your WordPress content. It provides:</p>
            <ul>
                <li>Automatic Bible verse detection and linking</li>
                <li>Multiple Bible version support</li>
                <li>Customizable display options</li>
                <li>Cross-reference functionality</li>
            </ul>
        </div>
    </div>
</div>

<style>
.bible-here-dashboard {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-top: 20px;
}

.bible-here-stats,
.bible-here-quick-actions,
.bible-here-info {
    background: #fff;
    border: 1px solid #ccd0d4;
    padding: 20px;
    border-radius: 4px;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
    margin-top: 15px;
}

.stat-box {
    text-align: center;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 4px;
}

.stat-number {
    font-size: 24px;
    font-weight: bold;
    color: #0073aa;
    margin: 5px 0;
}

.action-buttons {
    margin-top: 15px;
}

.action-buttons .button {
    margin-right: 10px;
    margin-bottom: 10px;
}

.bible-here-info {
    grid-column: 1 / -1;
}

@media (max-width: 768px) {
    .bible-here-dashboard {
        grid-template-columns: 1fr;
    }
    
    .stats-grid {
        grid-template-columns: 1fr;
    }
}
</style>