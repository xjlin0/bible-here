(function() {
	'use strict';

	/**
	 * All of the code for your admin-facing JavaScript source
	 * should reside in this file.
	 *
	 * This code uses native JavaScript instead of jQuery for better performance
	 * and to avoid external dependencies.
	 */

	// XML Import functionality
	let importInProgress = false;
	let importCancelled = false;
	let importStartTime = null;
	let importXhr = null;
	let currentImportVersion = null;

	document.addEventListener('DOMContentLoaded', function() {
		// Handle Bible version download/import buttons
		document.addEventListener('click', function(e) {
			if (e.target.classList.contains('bible-download-btn')) {
				if (importInProgress) {
					alert('A download and import is already in progress. Please wait for it to complete.');
					return;
				}
				
				const version = e.target.getAttribute('data-version');
				const language = e.target.getAttribute('data-language');
				
				if (!confirm('Are you sure you want to import the ' + language.toUpperCase() + ' ' + version.toUpperCase() + ' Bible? This may take several minutes.')) {
					return;
				}
				
				// Immediately disable the clicked button and show downloading status
				e.target.disabled = true;
				e.target.textContent = 'Downloading...';
				
				startImport(language, version);
			}
		
			// Handle Delete button clicks
			if (e.target.tagName === 'BUTTON' && e.target.getAttribute('data-action') === 'delete') {
				const version = e.target.getAttribute('data-version');
				
				if (!confirm('Are you sure you want to delete the ' + version.toUpperCase() + ' Bible data? This action cannot be undone.')) {
					return;
				}
				
				deleteVersion(version);
			}
			
			// Handle cancel button click
			if (e.target.id === 'cancel-import-btn') {
				if (importInProgress) {
					cancelImport();
				}
			}
			
			// Handle reload CSV data button click
			if (e.target.id === 'reload-csv-btn') {
				if (!confirm('Are you sure you want to reload all CSV data? This will update books, genres, and versions from the CSV files.')) {
					return;
				}
				
				reloadCSVData();
			}
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
		const startImportBtn = document.getElementById('start-import-btn');
		if (startImportBtn) {
			startImportBtn.disabled = true;
			startImportBtn.textContent = bible_here_ajax.importing_text;
		}
		
		const downloadBtns = document.querySelectorAll('.bible-download-btn');
		downloadBtns.forEach(btn => btn.disabled = true);
		
		const cancelBtn = document.getElementById('cancel-import-btn');
		if (cancelBtn) cancelBtn.style.display = 'block';
		
		const importProgress = document.getElementById('import-progress');
		if (importProgress) importProgress.style.display = 'block';
		
		const progressBar = document.getElementById('progress-bar');
		if (progressBar) progressBar.style.width = '0%';
		
		const progressText = document.getElementById('progress-text');
		if (progressText) progressText.textContent = 'Initializing download and import...';
		
		const statusElement = document.getElementById('import-status');
		if (statusElement) {
			statusElement.style.display = 'block';
		}
		
		addLogMessage('Starting ' + language.toUpperCase() + ' ' + version.toUpperCase() + ' Bible download and import process via ' + bible_here_ajax.ajax_url);
		addLogMessage('Timestamp: ' + importStartTime.toLocaleString());
		
		// Make AJAX request using fetch API
		addLogMessage('Sending download request to server at ' + bible_here_ajax.ajax_url);
		updateProgress(10, 'Connecting to server...');
		
		const formData = new FormData();
		formData.append('action', 'bible_here_import');
		formData.append('language', language);
		formData.append('version', version);
		formData.append('nonce', bible_here_ajax.nonce);
		
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutes timeout
		
		fetch(bible_here_ajax.ajax_url, {
			method: 'POST',
			body: formData,
			signal: controller.signal
		})
		.then(response => response.json())
		.then(response => {
			clearTimeout(timeoutId);
			if (importCancelled) {
				return;
			}
			
			console.log('Bible Here: Download response received', response);
			handleImportResponse(response);
		})
		.catch(error => {
			clearTimeout(timeoutId);
			if (importCancelled || error.name === 'AbortError') {
				return;
			}
			
			console.error('Bible Here: Download request failed', error);
			handleImportError(null, 'fetch_error', error.message);
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
			const progressText = document.getElementById('progress-text');
			if (progressText) progressText.style.color = '#00a32a'; // Green color for success
			
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
			const progressText = document.getElementById('progress-text');
			if (progressText) {
				progressText.textContent = 'Error: ' + (response.message || 'Unknown error');
				progressText.style.color = '#d63638'; // Red color for error
			}
			
			// Show error message
			showNotice('Download and Import failed: ' + (response.message || 'Unknown error'), 'error');
			
			// Don't reset UI on error - keep error messages visible
			// Only reset buttons to allow retry
			importInProgress = false;
			currentImportVersion = null;
			const startImportBtn = document.getElementById('start-import-btn');
			if (startImportBtn) startImportBtn.disabled = false;
			const downloadBtns = document.querySelectorAll('.bible-download-btn');
			downloadBtns.forEach(btn => {
				btn.disabled = false;
				btn.textContent = 'Download'; // Reset button text
			});
			const cancelBtn = document.getElementById('cancel-import-btn');
			if (cancelBtn) cancelBtn.style.display = 'none';
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
		const startImportBtn = document.getElementById('start-import-btn');
		if (startImportBtn) startImportBtn.disabled = false;
		const downloadBtns = document.querySelectorAll('.bible-download-btn');
		downloadBtns.forEach(btn => {
			btn.disabled = false;
			btn.textContent = 'Download'; // Reset button text
		});
		const cancelBtn = document.getElementById('cancel-import-btn');
		if (cancelBtn) cancelBtn.style.display = 'none';
	}

	/**
	 * Delete a Bible version
	 */
	function deleteVersion(version) {
		console.log('Bible Here: Starting delete process for ' + version);
		
		// Disable delete button during operation
		const deleteBtn = document.querySelector('button[data-action="delete"][data-version="' + version + '"]');
		if (deleteBtn) {
			deleteBtn.disabled = true;
			deleteBtn.textContent = 'Deleting...';
		}
		
		// Make AJAX request to delete version
		const formData = new FormData();
		formData.append('action', 'bible_here_delete_version');
		formData.append('version', version);
		formData.append('nonce', bible_here_ajax.nonce);
		
		fetch(bible_here_ajax.ajax_url, {
			method: 'POST',
			body: formData
		})
		.then(response => response.json())
		.then(response => {
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
				if (deleteBtn) {
					deleteBtn.disabled = false;
					deleteBtn.textContent = 'Delete';
				}
			}
		})
		.catch(error => {
			console.error('Bible Here: Delete request failed', error);
			showNotice('Delete request failed: ' + error.message, 'error');
			// Re-enable button on error
			if (deleteBtn) {
				deleteBtn.disabled = false;
				deleteBtn.textContent = 'Delete';
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
		const startImportBtn = document.getElementById('start-import-btn');
		if (startImportBtn) startImportBtn.disabled = false;
		
		const downloadBtns = document.querySelectorAll('.bible-download-btn');
		downloadBtns.forEach(btn => {
			btn.disabled = false;
			btn.textContent = 'Download'; // Reset button text
		});
		
		const cancelBtn = document.getElementById('cancel-import-btn');
		if (cancelBtn) cancelBtn.disabled = true;
		
		addLogMessage('Import cancelled by user.');
		
		// Hide progress after a short delay
		setTimeout(function() {
			const progressContainer = document.getElementById('import-progress-container');
			if (progressContainer) progressContainer.style.display = 'none';
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
		const startImportBtn = document.getElementById('start-import-btn');
		if (startImportBtn) {
			startImportBtn.disabled = false;
			startImportBtn.textContent = bible_here_ajax.start_import_text;
		}
		
		const downloadBtns = document.querySelectorAll('.bible-download-btn');
		downloadBtns.forEach(btn => {
			btn.disabled = false;
			btn.textContent = 'Download'; // Reset button text
		});
		
		const cancelBtn = document.getElementById('cancel-import-btn');
		if (cancelBtn) cancelBtn.style.display = 'none';
		
		// Clear import log content
		const importLog = document.getElementById('import-log');
		if (importLog) importLog.innerHTML = '';
		
		// Remove any existing notice messages
		const importStatus = document.getElementById('import-status');
		if (importStatus) {
			const notices = importStatus.querySelectorAll('.bible-here-notice');
			notices.forEach(notice => notice.remove());
		}
		
		// Reset progress text color
		const progressText = document.getElementById('progress-text');
		if (progressText) progressText.style.color = '';
		
		// Hide progress elements after a delay
		setTimeout(function() {
			const progressContainer = document.getElementById('import-progress-container');
			if (progressContainer) progressContainer.style.display = 'none';
		}, 3000);
	}

	/**
	 * Update progress bar and text
	 */
	function updateProgress(percentage, text) {
		const progressBar = document.getElementById('progress-bar');
		if (progressBar) progressBar.style.width = percentage + '%';
		
		const progressText = document.getElementById('progress-text');
		if (progressText) progressText.textContent = text + ' (' + percentage + '%)';
	}

	/**
	 * Add message to import log
	 */
	function addLogMessage(message) {
		var timestamp = new Date().toLocaleTimeString();
		var logEntry = '[' + timestamp + '] ' + message;
		
		var logElement = document.getElementById('import-log');
		if (logElement) {
			// Use HTML content and <br> tags to ensure line breaks
			var currentContent = logElement.innerHTML;
			logElement.innerHTML = currentContent + (currentContent ? '<br>' : '') + logEntry;
			// Safety check if element exists before accessing scrollHeight
			if (typeof logElement.scrollHeight !== 'undefined') {
				logElement.scrollTop = logElement.scrollHeight;
			}
		} else {
			// If #import-log element not found, try to ensure parent container is visible
			var statusElement = document.getElementById('import-status');
			if (statusElement) {
				statusElement.style.display = 'block';
				// Try to find #import-log element again
				logElement = document.getElementById('import-log');
				if (logElement) {
					// Use HTML content and <br> tags to ensure line breaks
					var currentContent = logElement.innerHTML;
					logElement.innerHTML = currentContent + (currentContent ? '<br>' : '') + logEntry;
					if (typeof logElement.scrollHeight !== 'undefined') {
						logElement.scrollTop = logElement.scrollHeight;
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
		var statusElement = document.getElementById('import-status');
		if (statusElement) {
			// Ensure element is visible
			statusElement.style.display = 'block';
			
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
			const notices = statusElement.querySelectorAll('.bible-here-notice');
			notices.forEach(notice => notice.remove());
			
			// Append notice message below existing content instead of overwriting
			statusElement.insertAdjacentHTML('beforeend', noticeHtml);
			
			// Scroll to bottom to show new notice
			if (typeof statusElement.scrollHeight !== 'undefined') {
				statusElement.scrollTop = statusElement.scrollHeight;
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
		const reloadBtn = document.getElementById('reload-csv-btn');
		if (reloadBtn) {
			reloadBtn.disabled = true;
			reloadBtn.textContent = 'Reloading...';
		}
		
		// Make AJAX request to reload CSV data
		const formData = new FormData();
		formData.append('action', 'bible_here_reload_csv');
		formData.append('nonce', bible_here_ajax.nonce);
		
		fetch(bible_here_ajax.ajax_url, {
			method: 'POST',
			body: formData
		})
		.then(response => response.json())
		.then(response => {
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
				if (reloadBtn) {
					reloadBtn.disabled = false;
					reloadBtn.textContent = '🔄 Reload All CSV Data';
				}
			}
		})
		.catch(error => {
			console.error('Bible Here: CSV reload request failed', error);
			showNotice('CSV reload request failed: ' + error.message, 'error');
			// Re-enable button on error
			if (reloadBtn) {
				reloadBtn.disabled = false;
				reloadBtn.textContent = '🔄 Reload All CSV Data';
			}
		});
	}

})();
