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
        
        <div class="bible-here-quick-actions">
            <h2>Quick Actions</h2>
            <div class="action-buttons">
                <a href="<?php echo admin_url('admin.php?page=bible-here-versions'); ?>" class="button button-primary">
                    Manage Bible Versions
                </a>
            </div>
        </div>
        
        <div class="bible-here-settings">
            <h2>Settings</h2>
            <form method="post" action="">
                <?php wp_nonce_field('bible_here_settings_nonce'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row">Default Bible Version</th>
                        <td>
                            <select name="bible_here_default_version">
                                <?php if (!empty($versions)): ?>
                                    <?php foreach ($versions as $version): ?>
                                        <option value="<?php echo esc_attr($version->abbreviation); ?>" 
                                            <?php selected($current_default, $version->abbreviation); ?>>
                                            <?php echo esc_html($version->name . ' (' . $version->abbreviation . ')'); ?>
                                        </option>
                                    <?php endforeach; ?>
                                <?php else: ?>
                                    <option value="">No imported versions available</option>
                                <?php endif; ?>
                            </select>
                            <p class="description">Select the default Bible version for verse references.</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button('Save Settings'); ?>
            </form>
        </div>
    </div>
</div>