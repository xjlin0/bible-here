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
        <div class="bible-here-label-settings">
            <h2>Scripture reference linking configuration</h2>
            <p><strong>Disable</strong> scripture reference linking for selected pages/posts, or enable/disable across the entire site.</p>
            <p>
                <button type="button" class="button button-secondary" id="select-all-disabled">Select all</button>
                <button type="button" class="button button-secondary" id="unselect-all-disabled">Unselect all</button>
            </p>
            <form method="post" action="">
                <?php wp_nonce_field('bible_here_label_settings_nonce'); ?>
                <input type="hidden" name="bible_here_action" value="save_disabled_pages" />

                <div class="bible-here-page-selection-div">
                    <?php if (is_null($disabled_pages_option)) : ?>
                        <p style="color:#d63638;">Currently scripture reference linking is disabled across the entire site.</p>
                    <?php else : ?>
                        <p style="color:#46b450;">
                            <?php
                            if (is_array($disabled_pages_option) && empty($disabled_pages_option)) {
                                echo 'Currently scripture reference linking is enabled across the entire site.';
                            } else {
                                echo 'Currently scripture reference linking is enabled except the following pages/posts:';
                            }
                            ?>
                        </p>
                    <?php endif; ?>
                    <?php if (!empty($posts)) : ?>
                        <?php foreach ($posts as $p) : ?>
                            <label style="display:block; margin-bottom:8px;">
                                <input type="checkbox" name="disabled_pages[]" value="<?php echo esc_attr($p->ID); ?>" <?php echo is_array($disabled_pages_option) && in_array($p->ID, $disabled_pages_option, true) ? 'checked' : ''; ?> />
                                <?php echo esc_html(get_the_title($p)); ?>
                                <span style="color:#666;">(ID: <?php echo esc_html($p->ID); ?>, <?php echo esc_html($p->post_type); ?>)</span>
                            </label>
                        <?php endforeach; ?>
                    <?php else : ?>
                        <p>No posts or pages available for management.</p>
                    <?php endif; ?>
                </div>

                <?php submit_button('Enable scripture reference linking except the above selected pages/posts'); ?>
            </form>

            <form method="post" action="" style="margin-top: 12px; display:inline-block; margin-right:8px;">
                <?php wp_nonce_field('bible_here_label_settings_nonce'); ?>
                <input type="hidden" name="bible_here_action" value="disable_all" />
                <input type="submit" class="button button-secondary button-disable-all" value="Disable scripture reference linking across the entire site" />
            </form>

            <form method="post" action="" style="margin-top: 12px; display:inline-block;">
                <?php wp_nonce_field('bible_here_label_settings_nonce'); ?>
                <input type="hidden" name="bible_here_action" value="enable_all" />
                <input type="submit" class="button button-secondary button-enable-all" value="Enable scripture reference linking across the entire site" />
            </form>
        </div>
    </div>
</div>