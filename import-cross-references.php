<?php
/**
 * Cross References Import Script for Bible Here Plugin
 * This script imports cross reference data from data/cross_references.zip
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    // Load WordPress if not already loaded
    require_once('../../../wp-load.php');
}

// Check if user has admin privileges
if (!current_user_can('manage_options')) {
    wp_die('You do not have sufficient permissions to access this page.');
}

// Load the XML Importer class
require_once plugin_dir_path(__FILE__) . 'includes/class-bible-here-xml-importer.php';

// Set time limit for long-running import
set_time_limit(300); // 5 minutes
ini_set('memory_limit', '512M');

// Start output buffering to show progress
ob_start();

?>
<!DOCTYPE html>
<html>
<head>
    <title>Bible Here - Cross References Import</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .success { color: green; }
        .error { color: red; }
        .info { color: blue; }
        .progress { background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 5px; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Bible Here - Cross References Import</h1>
        
        <?php
        echo '<div class="progress">Starting cross references import...</div>';
        ob_flush();
        flush();
        
        try {
            // Create importer instance
            $importer = new Bible_Here_XML_Importer();
            
            echo '<div class="info">Importer initialized successfully.</div>';
            ob_flush();
            flush();
            
            // Start import
            $start_time = microtime(true);
            $result = $importer->import_cross_references();
            $end_time = microtime(true);
            
            if ($result['success']) {
                echo '<div class="success">';
                echo '<h2>✓ Import Completed Successfully!</h2>';
                echo '<p><strong>Records imported:</strong> ' . number_format($result['imported_count']) . '</p>';
                echo '<p><strong>Execution time:</strong> ' . round($end_time - $start_time, 2) . ' seconds</p>';
                echo '<p><strong>Message:</strong> ' . esc_html($result['message']) . '</p>';
                echo '</div>';
                
                // Verify import by checking database
                global $wpdb;
                $table_name = $wpdb->prefix . 'bible_here_cross_references';
                $count = $wpdb->get_var("SELECT COUNT(*) FROM $table_name");
                
                echo '<div class="info">';
                echo '<h3>Database Verification</h3>';
                echo '<p><strong>Total records in database:</strong> ' . number_format($count) . '</p>';
                
                // Show sample records
                $samples = $wpdb->get_results("SELECT * FROM $table_name LIMIT 5", ARRAY_A);
                if ($samples) {
                    echo '<h4>Sample Records:</h4>';
                    echo '<pre>' . print_r($samples, true) . '</pre>';
                }
                echo '</div>';
                
            } else {
                echo '<div class="error">';
                echo '<h2>✗ Import Failed</h2>';
                echo '<p><strong>Error:</strong> ' . esc_html($result['message']) . '</p>';
                echo '</div>';
            }
            
        } catch (Exception $e) {
            echo '<div class="error">';
            echo '<h2>✗ Import Error</h2>';
            echo '<p><strong>Exception:</strong> ' . esc_html($e->getMessage()) . '</p>';
            echo '<p><strong>File:</strong> ' . esc_html($e->getFile()) . '</p>';
            echo '<p><strong>Line:</strong> ' . $e->getLine() . '</p>';
            echo '</div>';
        }
        
        ?>
        
        <div style="margin-top: 30px;">
            <a href="<?php echo admin_url('admin.php?page=bible-here'); ?>" class="button">← Back to Bible Here Settings</a>
        </div>
    </div>
</body>
</html>