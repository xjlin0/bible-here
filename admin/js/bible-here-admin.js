(function( $ ) {
	'use strict';

	/**
	 * All of the code for your admin-facing JavaScript source
	 * should reside in this file.
	 *
	 * Note: It has been assumed you will write jQuery code here, so the
	 * $ function reference has been prepared for usage within the scope
	 * of this function.
	 *
	 * This enables you to define handlers, for when the DOM is ready:
	 *
	 * $(function() {
	 *
	 * });
	 *
	 * When the window is loaded:
	 *
	 * $( window ).load(function() {
	 *
	 * });
	 *
	 * ...and/or other possibilities.
	 *
	 * Ideally, it is not considered best practise to attach more than a
	 * single DOM-ready or window-load handler for a particular page.
	 * Although scripts in the WordPress core, Plugins and Themes may be
	 * practising this, we should strive to set a better example in our own work.
	 */

	// XML Import functionality
	var importInProgress = false;
	var importCancelled = false;
	var importStartTime = null;
	var importXhr = null;
	var currentImportVersion = null;

	$(document).ready(function() {
		// Handle import button click (legacy XML import page)
		// $('#start-import-btn').on('click', function() {
		// 	if (importInProgress) {
		// 		return;
		// 	}
			
		// 	if (!confirm('Are you sure you want to start the KJV Bible download and import? This may take several minutes and will replace existing data.')) {
		// 		return;
		// 	}
			
		// 	startImport('kjv');
		// });
		
		// Handle Bible version download/import buttons
		$(document).on('click', '.bible-download-btn', function() {
			if (importInProgress) {
				alert('A download and import is already in progress. Please wait for it to complete.');
				return;
			}
			
			var version = $(this).data('version');
			var language = $(this).data('language');
			
			if (!confirm('Are you sure you want to import the ' + language.toUpperCase() + ' ' + version.toUpperCase() + ' Bible? This may take several minutes.')) {
				return;
			}
			
			startImport(language, version);
		});
		
		// Handle Delete button clicks
		$(document).on('click', 'button[data-action="delete"]', function() {
			var version = $(this).data('version');
			
			if (!confirm('Are you sure you want to delete the ' + version.toUpperCase() + ' Bible data? This action cannot be undone.')) {
				return;
			}
			
			deleteVersion(version);
		});
		
		// Handle cancel button click
		$('#cancel-import-btn').on('click', function() {
			if (importInProgress) {
				cancelImport();
			}
		});
		
		// Handle reload CSV data button click
		$('#reload-csv-btn').on('click', function() {
			if (!confirm('Are you sure you want to reload all CSV data? This will update books, genres, and versions from the CSV files.')) {
				return;
			}
			
			reloadCSVData();
		});
	});

	/**
	 * Start the XML import process
	 */
	function startImport(language, version) {
		language = language || 'en'; // Default to English if no language specified
		version = version || 'kjv'; // Default to KJV if no version specified
		console.log('Bible Here: Starting XML download and import process for ' + language + ' ' + version);
		
		// Reset UI to clear any previous error messages or logs
		resetImportUI();
		
		importInProgress = true;
		importStartTime = new Date();
		currentImportVersion = version;
		
		// Update UI
		$('#start-import-btn').prop('disabled', true).text(bible_here_ajax.importing_text);
		$('.bible-download-btn').prop('disabled', true);
		$('#cancel-import-btn').show();
		$('#import-progress').show();
		$('#progress-bar').css('width', '0%');
		$('#progress-text').text('Initializing download and import...');
		
		var statusElement = $('#import-status');
		if (statusElement.length) {
			statusElement.show();
		}
		
		addLogMessage('Starting ' + language.toUpperCase() + ' ' + version.toUpperCase() + ' Bible download and import process via ' + bible_here_ajax.ajax_url);
		addLogMessage('Timestamp: ' + importStartTime.toLocaleString());
		
		// Make AJAX request
		$.ajax({
			url: bible_here_ajax.ajax_url,
			type: 'POST',
			data: {
				action: 'bible_here_import',
				language: language,
				version: version,
				nonce: bible_here_ajax.nonce
			},
			timeout: 600000, // 10 minutes timeout
			beforeSend: function() {
				addLogMessage('Sending download request to server at ' + bible_here_ajax.ajax_url);
				updateProgress(10, 'Connecting to server...');
			},
			success: function(response) {
				if (importCancelled) {
					return;
				}
				
				console.log('Bible Here: Download response received', response);
				handleImportResponse(response);
			},
			error: function(xhr, status, error) {
				if (importCancelled || status === 'abort') {
					return;
				}
				
				console.error('Bible Here: Download request failed', status, error);
				handleImportError(xhr, status, error);
			}
		});
	}

	/**
	 * Handle successful import response
	 */
	function handleImportResponse(response) {
		var endTime = new Date();
		var duration = Math.round((endTime - importStartTime) / 1000);
		
		if (response.success) {
			updateProgress(100, bible_here_ajax.import_success);
			addLogMessage('Download and import completed successfully!');
			addLogMessage('Imported verses: ' + (response.imported_count || 'Unknown'));
			addLogMessage('Execution time: ' + (response.execution_time || duration) + ' seconds');
			addLogMessage('Finished at: ' + endTime.toLocaleString());
			
			// Ensure progress text shows success with green color
			$('#progress-text').css('color', '#00a32a'); // Green color for success
			
			// Update the status for this version
			if (currentImportVersion) {
				// The page will reload to show updated status
			}
			
			// Show success message
			showNotice('KJV Bible download and import completed successfully! Imported ' + (response.imported_count || 'Unknown') + ' verses.', 'success');
			
			// Reset UI only on success
			resetImportUI();
			
			// Refresh page after 3 seconds to update status
			setTimeout(function() {
				location.reload();
			}, 3000);
			
		} else {
			// Update progress bar to show error
			updateProgress(0, 'Download and Import failed: ' + (response.message || 'Unknown error'));
			addLogMessage('Download and Import failed: ' + (response.message || 'Unknown error'));
			addLogMessage('Duration: ' + duration + ' seconds');
			
			// Also update the progress text directly to ensure visibility
			$('#progress-text').text('Error: ' + (response.message || 'Unknown error'));
			$('#progress-text').css('color', '#d63638'); // Red color for error
			
			// Show error message
			showNotice('Download and Import failed: ' + (response.message || 'Unknown error'), 'error');
			
			// Don't reset UI on error - keep error messages visible
			// Only reset buttons to allow retry
			importInProgress = false;
			currentImportVersion = null;
			$('#start-import-btn').prop('disabled', false);
			$('.bible-download-btn').prop('disabled', false);
			$('#cancel-import-btn').hide();
		}
	}

	/**
	 * Handle import error
	 */
	function handleImportError(xhr, status, error) {
		var endTime = new Date();
		var duration = Math.round((endTime - importStartTime) / 1000);
		
		updateProgress(0, 'Import failed');
		addLogMessage('Download and Import request failed!');
		addLogMessage('Status: ' + status);
		addLogMessage('Error: ' + error);
		addLogMessage('Duration: ' + duration + ' seconds');
		
		if (xhr.responseText) {
			addLogMessage('Server response: ' + xhr.responseText.substring(0, 500));
		}
		
		// Show error message
		showNotice('Download and Import request failed: ' + status + ' - ' + error, 'error');
		
		// Don't reset UI on error - keep error messages visible
		// Only reset buttons to allow retry
		importInProgress = false;
		currentImportVersion = null;
		$('#start-import-btn').prop('disabled', false);
		$('.bible-download-btn').prop('disabled', false);
		$('#cancel-import-btn').hide();
	}

	/**
	 * Delete a Bible version
	 */
	function deleteVersion(version) {
		console.log('Bible Here: Starting delete process for ' + version);
		
		// Disable delete button during operation
		$('button[data-action="delete"][data-version="' + version + '"]').prop('disabled', true).text('Deleting...');
		
		// Make AJAX request to delete version
		$.ajax({
			url: bible_here_ajax.ajax_url,
			type: 'POST',
			data: {
				action: 'bible_here_delete_version',
				version: version,
				nonce: bible_here_ajax.nonce
			},
			timeout: 30000, // 30 seconds timeout
			success: function(response) {
				console.log('Bible Here: Delete response received', response);
				
				if (response.success) {
					showNotice(version.toUpperCase() + ' Bible data deleted successfully!', 'success');
					
					// Refresh page after 2 seconds to update UI
					setTimeout(function() {
						location.reload();
					}, 2000);
				} else {
					showNotice('Failed to delete ' + version.toUpperCase() + ' Bible data: ' + (response.message || 'Unknown error'), 'error');
					// Re-enable button on error
					$('button[data-action="delete"][data-version="' + version + '"]').prop('disabled', false).text('Delete');
				}
			},
			error: function(xhr, status, error) {
				console.error('Bible Here: Delete request failed', status, error);
				showNotice('Delete request failed: ' + status + ' - ' + error, 'error');
				// Re-enable button on error
				$('button[data-action="delete"][data-version="' + version + '"]').prop('disabled', false).text('Delete');
			}
		});
	}

	/**
	 * Cancel the import process
	 */
	function cancelImport() {
		if (!importInProgress) {
			return;
		}
		
		importCancelled = true;
		importInProgress = false;
		
		// Abort the current AJAX request if it exists
		if (importXhr) {
			importXhr.abort();
			importXhr = null;
		}
		
		// Reset UI
		$('#start-import-btn').prop('disabled', false);
		$('.bible-download-btn').prop('disabled', false);
		$('#cancel-import-btn').prop('disabled', true);
		
		addLogMessage('Import cancelled by user.');
		
		// Hide progress after a short delay
		setTimeout(function() {
			$('#import-progress-container').hide();
		}, 2000);
	}

	/**
	 * Reset the import UI to initial state
	 */
	function resetImportUI() {
		console.log('Bible Here: Resetting import UI');
		
		importInProgress = false;
		currentImportVersion = null;
		
		// Reset buttons
		$('#start-import-btn').prop('disabled', false).text(bible_here_ajax.start_import_text);
		$('.bible-download-btn').prop('disabled', false);
		$('#cancel-import-btn').hide();
		
		// Clear import log content
		$('#import-log').html('');
		
		// Remove any existing notice messages
		$('#import-status').find('.bible-here-notice').remove();
		
		// Reset progress text color
		$('#progress-text').css('color', '');
		
		// Hide progress elements after a delay
		setTimeout(function() {
			$('#import-progress-container').hide();
		}, 3000);
	}

	/**
	 * Update progress bar and text
	 */
	function updateProgress(percentage, text) {
		$('#progress-bar').css('width', percentage + '%');
		$('#progress-text').text(text + ' (' + percentage + '%)');
	}

	/**
	 * Add message to import log
	 */
	function addLogMessage(message) {
		var timestamp = new Date().toLocaleTimeString();
		var logEntry = '[' + timestamp + '] ' + message;
		
		var logElement = $('#import-log');
		if (logElement.length > 0) {
			// Use HTML content and <br> tags to ensure line breaks
			var currentContent = logElement.html();
			logElement.html(currentContent + (currentContent ? '<br>' : '') + logEntry);
			// Safety check if element exists before accessing scrollHeight
			var logDomElement = logElement[0];
			if (logDomElement && typeof logDomElement.scrollHeight !== 'undefined') {
				logElement.scrollTop(logDomElement.scrollHeight);
			}
		} else {
			// If #import-log element not found, try to ensure parent container is visible
			var statusElement = $('#import-status');
			if (statusElement.length > 0) {
				statusElement.show();
				// Try to find #import-log element again
				logElement = $('#import-log');
				if (logElement.length > 0) {
					// Use HTML content and <br> tags to ensure line breaks
					var currentContent = logElement.html();
					logElement.html(currentContent + (currentContent ? '<br>' : '') + logEntry);
					var logDomElement = logElement[0];
					if (logDomElement && typeof logDomElement.scrollHeight !== 'undefined') {
						logElement.scrollTop(logDomElement.scrollHeight);
					}
				} else {
					console.error('Bible Here: Download and Import log element (#import-log) still not found after showing parent container');
				}
			} else {
				console.error('Bible Here: Download and Import log element (#import-log) not found in DOM');
			}
		}
		
		console.log('Bible Here Download and Import Log: ' + logEntry);
	}

	/**
	 * Show admin notice
	 */
	function showNotice(message, type) {
		console.log('Bible Here: Showing notice:', message, type);
		
		// Use correct ID selector
		var statusElement = $('#import-status');
		if (statusElement.length) {
			// Ensure element is visible
			statusElement.show();
			
			// Create notice message element without overwriting existing content
			var noticeHtml = '';
			if (type === 'error') {
				noticeHtml = '<div class="bible-here-notice bible-here-error" style="color: #d63384; background: #f8d7da; border: 1px solid #f5c2c7; padding: 10px; margin: 10px 0; border-radius: 4px;"><strong>Error:</strong>' + message + '</div>';
			} else if (type === 'success') {
				noticeHtml = '<div class="bible-here-notice bible-here-success" style="color: #0f5132; background: #d1e7dd; border: 1px solid #badbcc; padding: 10px; margin: 10px 0; border-radius: 4px;"><strong>Success:</strong>' + message + '</div>';
			} else {
				noticeHtml = '<div class="bible-here-notice bible-here-info" style="color: #055160; background: #cff4fc; border: 1px solid #b6effb; padding: 10px; margin: 10px 0; border-radius: 4px;">' + message + '</div>';
			}
			
			// Remove previous notice messages (if any)
			statusElement.find('.bible-here-notice').remove();
			
			// Append notice message below existing content instead of overwriting
			statusElement.append(noticeHtml);
			
			// Scroll to bottom to show new notice
			var statusDomElement = statusElement[0];
			if (statusDomElement && typeof statusDomElement.scrollHeight !== 'undefined') {
				statusElement.scrollTop(statusDomElement.scrollHeight);
			}
		} else {
			console.error('Bible Here: Download and Import status element (#import-status) not found');
		}
	}

	/**
	 * Reload CSV data
	 */
	function reloadCSVData() {
		console.log('Bible Here: Starting CSV data reload process');
		
		// Disable the reload button during operation
		$('#reload-csv-btn').prop('disabled', true).text('Reloading...');
		
		// Make AJAX request to reload CSV data
		$.ajax({
			url: bible_here_ajax.ajax_url,
			type: 'POST',
			data: {
				action: 'bible_here_reload_csv',
				nonce: bible_here_ajax.nonce
			},
			timeout: 30000, // 30 seconds timeout
			success: function(response) {
				console.log('Bible Here: CSV reload response received', response);
				
				if (response.success) {
					showNotice('CSV data reloaded successfully! ' + (response.message || ''), 'success');
					
					// Refresh page after 2 seconds to update UI
					setTimeout(function() {
						location.reload();
					}, 2000);
				} else {
					showNotice('Failed to reload CSV data: ' + (response.message || 'Unknown error'), 'error');
					// Re-enable button on error
					$('#reload-csv-btn').prop('disabled', false).text('🔄 Reload All CSV Data');
				}
			},
			error: function(xhr, status, error) {
				console.error('Bible Here: CSV reload request failed', status, error);
				showNotice('CSV reload request failed: ' + status + ' - ' + error, 'error');
				// Re-enable button on error
				$('#reload-csv-btn').prop('disabled', false).text('🔄 Reload All CSV Data');
			}
		});
	}

})( jQuery );
