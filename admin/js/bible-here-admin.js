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
				if (!confirm('Are you sure you want to reload default seed data? This will update books, genres, and versions from the CSV files.')) {
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
			// Use the actual version being imported instead of fixed KJV message
			const versionName = currentImportVersion ? currentImportVersion.toUpperCase() : 'Bible';
			const successMessage = versionName + ' Bible imported successfully!';
			
			// Get data from response.data (wp_send_json_success format)
			const responseData = response.data || response;
			const importedCount = responseData.imported_count || 0;
			const executionTime = responseData.execution_time || duration;
			
			updateProgress(100, successMessage);
			addLogMessage('Download and import completed successfully!');
			addLogMessage('Imported verses: ' + importedCount);
			addLogMessage('Execution time: ' + executionTime + ' seconds');
			addLogMessage('Finished at: ' + endTime.toLocaleString());
			
			// Ensure progress text shows success with green color
			const progressText = document.getElementById('progress-text');
			if (progressText) progressText.style.color = '#00a32a'; // Green color for success
			
			// Update the status for this version
			if (currentImportVersion) {
				// The page will reload to show updated status
			}
			
			// Show success message
			showNotice(versionName + ' Bible download and import completed successfully! Imported ' + importedCount + ' verses.', 'success');
			
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
		
		// Find the Import Progress section to display notice above it
		var importSection = document.querySelector('.bible-import-section');
		var importProgressTitle = importSection ? importSection.querySelector('h2') : null;
		
		if (importProgressTitle) {
			// Create notice message element
			var noticeHtml = '';
			if (type === 'error') {
				noticeHtml = '<div class="bible-here-notice bible-here-error" style="color: #d63384; background: #f8d7da; border: 1px solid #f5c2c7; padding: 10px; margin: 10px 0; border-radius: 4px;"><strong>Error:</strong>' + message + '</div>';
			} else if (type === 'success') {
				noticeHtml = '<div class="bible-here-notice bible-here-success" style="color: #0f5132; background: #d1e7dd; border: 1px solid #badbcc; padding: 10px; margin: 10px 0; border-radius: 4px;"><strong>Success:</strong>' + message + '</div>';
			} else {
				noticeHtml = '<div class="bible-here-notice bible-here-info" style="color: #055160; background: #cff4fc; border: 1px solid #b6effb; padding: 10px; margin: 10px 0; border-radius: 4px;">' + message + '</div>';
			}
			
			// Remove previous notice messages (if any) from the import section
			const existingNotices = importSection.querySelectorAll('.bible-here-notice');
			existingNotices.forEach(notice => notice.remove());
			
			// Insert notice message above the Import Progress title
			importProgressTitle.insertAdjacentHTML('beforebegin', noticeHtml);
			
			// Scroll to the notice to make it visible
			const newNotice = importSection.querySelector('.bible-here-notice');
			if (newNotice) {
				newNotice.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		} else {
			console.error('Bible Here: Import Progress section not found');
		}
	}

	/**
	 * Reload CSV data
	 */
	function reloadCSVData() {
		console.log('Bible Here: Starting default seed data reload process');
		
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
				showNotice('Failed to reload default seed data: ' + (response.message || 'Unknown error'), 'error');
				// Re-enable button on error
				if (reloadBtn) {
					reloadBtn.disabled = false;
					reloadBtn.textContent = '🔄 Reload default seed data';
				}
			}
		})
		.catch(error => {
			console.error('Bible Here: Seed data reload request failed', error);
			showNotice('Seed data reload request failed: ' + error.message, 'error');
			// Re-enable button on error
			if (reloadBtn) {
				reloadBtn.disabled = false;
				reloadBtn.textContent = '🔄 Reload default seed data';
			}
		});
	}

	// Version table modal editing functionality
	document.addEventListener('DOMContentLoaded', function() {
		console.log('DOMContentLoaded event fired, initializing version modal editing and CSV upload...');
		initVersionModalEditing();
		initCSVUploadModal();
		console.log('Initialization completed.');
	});

	/**
	 * Initialize version modal editing functionality
	 */
	function initVersionModalEditing() {
		console.log('Initializing version modal editing...');
		const modal = document.getElementById('version-modal');
		if (!modal) {
			console.error('Version modal not found!');
			return;
		}
		console.log('Version modal found, setting up event listeners...');

		// Handle Add New Version button
		const addVersionBtn = document.getElementById('add-version-btn');
		if (addVersionBtn) {
			addVersionBtn.addEventListener('click', function() {
				openVersionModal();
			});
		}

		// Handle Edit buttons in table
		document.addEventListener('click', function(e) {
			if (e.target.classList.contains('edit-version-btn')) {
				const versionId = e.target.getAttribute('data-version-id');
				openVersionModal(versionId);
			}
		});

		// Handle Upload buttons in table
		document.addEventListener('click', function(e) {
			console.log('Click event detected on element:', e.target);
			console.log('Element classes:', e.target.classList);
			
			if (e.target.classList.contains('upload-csv-btn')) {
				console.log('Upload CSV button clicked!');
				const versionId = e.target.getAttribute('data-version-id');
				const tableName = e.target.getAttribute('data-table-name');
				const language = e.target.getAttribute('data-language');
				console.log('Button attributes - versionId:', versionId, 'tableName:', tableName, 'language:', language);
				console.log('About to call openCSVUploadModal...');
				openCSVUploadModal(versionId, tableName, language);
				console.log('openCSVUploadModal call completed.');
			}
		});

		// Handle modal close
		const closeBtn = modal.querySelector('.close');
		if (closeBtn) {
			closeBtn.addEventListener('click', function(e) {
				e.preventDefault();
				closeVersionModalWithConfirm();
			});
		}

		// Handle cancel button
		const cancelBtn = document.getElementById('cancel-modal');
		if (cancelBtn) {
			cancelBtn.addEventListener('click', function(e) {
				e.preventDefault();
				closeVersionModalWithConfirm();
			});
		}

		// Handle save button
		const saveBtn = document.getElementById('save-version');
		if (saveBtn) {
			saveBtn.addEventListener('click', saveVersion);
		}

		// Handle delete button
		const deleteBtn = document.getElementById('delete-version');
		if (deleteBtn) {
			deleteBtn.addEventListener('click', deleteVersionFromModal);
		}

		// Close modal when clicking outside
		modal.addEventListener('click', function(e) {
			if (e.target === modal) {
				e.preventDefault();
				closeVersionModalWithConfirm();
			}
		});

		// Track form changes
		const formInputs = modal.querySelectorAll('input, select, textarea');
		formInputs.forEach(input => {
			input.addEventListener('input', markFormModified);
			input.addEventListener('change', markFormModified);
		});

		// Setup language/abbreviation change handlers for duplicate checking and auto-fill
		const languageInput = document.getElementById('language');
		const abbreviationInput = document.getElementById('abbreviation');
		const tableNameInput = document.getElementById('table-name');

		if (languageInput && abbreviationInput) {
			languageInput.addEventListener('input', handleLanguageAbbreviationChange);
			abbreviationInput.addEventListener('input', handleLanguageAbbreviationChange);
		}

		// Handle ESC key to close modal
		document.addEventListener('keydown', function(e) {
			if (e.key === 'Escape' && modal.style.display === 'block') {
				e.preventDefault();
				closeVersionModalWithConfirm();
			}
		});
	}
	

	/**
	 * Open version modal for editing or adding
	 */
	function openVersionModal(versionId = null) {
		const modal = document.getElementById('version-modal');
		const modalTitle = document.getElementById('modal-title');
		const deleteBtn = document.getElementById('delete-version');
		const form = document.getElementById('version-form');

		// Reset form modified state when opening modal
		resetFormModified();

		if (versionId) {
			// Edit mode
			modalTitle.textContent = 'Edit Version';
			deleteBtn.style.display = 'inline-block';
			loadVersionData(versionId);
		} else {
			// Add mode
			modalTitle.textContent = 'Add New Version';
			deleteBtn.style.display = 'none';
			clearVersionForm();
		}

		modal.style.display = 'block';
		console.log('CSV upload modal opened successfully! Modal display style set to block.');
		console.log('Modal visibility check - offsetHeight:', modal.offsetHeight, 'offsetWidth:', modal.offsetWidth);
	}

	/**
	 * Close version modal with confirmation
	 */
	function closeVersionModalWithConfirm() {
		console.log('closeVersionModalWithConfirm called, formModified:', formModified);
		// Always show confirmation dialog regardless of form modification status
		console.log('Showing confirmation dialog');
		if (!confirm('Are you sure you want to close this dialog?')) {
			console.log('User cancelled close action');
			return;
		}
		console.log('User confirmed close action');
		closeVersionModal();
	}

	/**
	 * Close version modal without confirmation (for internal use)
	 */
	function closeVersionModal() {
		const modal = document.getElementById('version-modal');
		modal.style.display = 'none';
		resetFormModified();
	}

	/**
	 * Load version data into modal form
	 */
	function loadVersionData(versionId) {
		// Set version ID immediately
		document.getElementById('version-id').value = versionId;

		// Disable delete button during loading to prevent premature clicks
		const deleteBtn = document.getElementById('delete-version');
		if (deleteBtn) {
			deleteBtn.disabled = true;
			deleteBtn.textContent = 'Loading...';
		}

		// Load complete data from database via AJAX
		const formData = new FormData();
		formData.append('action', 'bible_here_get_version_data');
		formData.append('version_id', versionId);
		formData.append('nonce', bible_here_ajax.nonce);

		fetch(bible_here_ajax.ajax_url, {
			method: 'POST',
			body: formData
		})
		.then(response => response.json())
		.then(response => {
			if (response.success) {
				const data = response.data;
				
				// Populate all form fields with complete data
				document.getElementById('table-name').value = data.table_name || '';
				document.getElementById('language').value = data.language || '';
				document.getElementById('abbreviation').value = data.abbreviation || '';
				document.getElementById('name').value = data.name || '';
				document.getElementById('info-text').value = data.info_text || '';
				document.getElementById('info-url').value = data.info_url || '';
				document.getElementById('publisher').value = data.publisher || '';
				document.getElementById('copyright').value = data.copyright || '';
				document.getElementById('download-url').value = data.download_url || '';
				document.getElementById('rank').value = data.rank || '';
				document.getElementById('trim').value = data.trim || '0';
				document.getElementById('for-login').value = data.for_login || '0';
				document.getElementById('type').value = data.type || 'Bible';
				
				// Reset form modified state after loading data
				resetFormModified();
				
				// Show/hide delete button based on rank and seed conditions
				const deleteVersionBtn = document.getElementById('delete-version');
				if (deleteVersionBtn) {
					// Show delete button only if rank is null and seed is false
					const rankValue = data.rank;
					const seedValue = data.seed;
					
					if (rankValue === null && (seedValue == 0 || seedValue === false)) {
						deleteVersionBtn.style.display = 'inline-block';
					} else {
						deleteVersionBtn.style.display = 'none';
					}
				}
				
				// Implement conditional editing logic for seed=true records
				const seedValue = data.seed;
				const rankValue = data.rank;
				
				if (seedValue == 1 || seedValue === true) {
					// For seed=true records, only allow editing for_login and rank (if rank is not null)
					const readonlyFields = ['table-name', 'language', 'abbreviation', 'name', 'info-text', 'info-url', 'publisher', 'copyright', 'download-url', 'trim', 'type'];
					readonlyFields.forEach(fieldId => {
						const field = document.getElementById(fieldId);
						if (field) {
							// Use disabled for select elements, readOnly for input/textarea
							if (field.tagName === 'SELECT') {
								field.disabled = true;
							} else {
								field.readOnly = true;
							}
							field.style.backgroundColor = '#f5f5f5';
						}
					});
				} else {
					// For seed=false records, allow editing all fields
					const allFields = ['table-name', 'language', 'abbreviation', 'name', 'info-text', 'info-url', 'publisher', 'copyright', 'download-url', 'rank', 'trim', 'for-login', 'type'];
					allFields.forEach(fieldId => {
						const field = document.getElementById(fieldId);
						if (field) {
							// Use disabled for select elements, readOnly for input/textarea
							if (field.tagName === 'SELECT') {
								field.disabled = false;
							} else {
								field.readOnly = false;
							}
							field.style.backgroundColor = '';
						}
					});
				}
				
				// Disable rank field if rank is null (regardless of seed value)
				const rankField = document.getElementById('rank');
				if (rankField && (rankValue === null || rankValue === '')) {
					rankField.readOnly = true;
					rankField.style.backgroundColor = '#f5f5f5';
				}
				
				// Re-enable delete button after successful data loading
				if (deleteBtn) {
					deleteBtn.disabled = false;
					deleteBtn.textContent = 'Delete Record';
				}
			} else {
				console.error('Failed to load version data:', response.message);
				showNotice('Error: Failed to load version data', 'error');
				
				// Re-enable delete button even on error, but keep version ID
				if (deleteBtn) {
					deleteBtn.disabled = false;
					deleteBtn.textContent = 'Delete Record';
				}
			}
		})
		.catch(error => {
			console.error('Version data request failed:', error);
			showNotice('Error: Failed to load version data', 'error');
			
			// Re-enable delete button even on error, but keep version ID
			if (deleteBtn) {
				deleteBtn.disabled = false;
				deleteBtn.textContent = 'Delete Record';
			}
		});
	}

	/**
	 * Clear version form
	 */
	function clearVersionForm() {
		document.getElementById('version-id').value = '';
		document.getElementById('table-name').value = '';
		document.getElementById('language').value = '';
		document.getElementById('abbreviation').value = '';
		document.getElementById('name').value = '';
		document.getElementById('info-text').value = '';
		document.getElementById('info-url').value = '';
		document.getElementById('publisher').value = '';
		document.getElementById('copyright').value = '';
		document.getElementById('download-url').value = '';
		document.getElementById('rank').value = '';
		document.getElementById('trim').value = '0';
		document.getElementById('for-login').value = '0';
		document.getElementById('type').value = 'Bible'; // Set default type

		// Clear warning message and enable save button
		const warningDiv = document.getElementById('duplicate-warning');
		const saveBtn = document.getElementById('save-version');
		const deleteVersionBtn = document.getElementById('delete-version');
		
		if (warningDiv) {
			warningDiv.style.display = 'none';
		}
		if (saveBtn) {
			saveBtn.disabled = false;
		}
		// Hide delete button for new versions
		if (deleteVersionBtn) {
			deleteVersionBtn.style.display = 'none';
		}
		
		// Reset all field states to editable for new version form
		const allFields = ['table-name', 'language', 'abbreviation', 'name', 'info-text', 'info-url', 'publisher', 'copyright', 'download-url', 'rank', 'trim', 'for-login', 'type'];
		allFields.forEach(fieldId => {
			const field = document.getElementById(fieldId);
			if (field) {
				// Use disabled for select elements, readOnly for input/textarea
				if (field.tagName === 'SELECT') {
					field.disabled = false;
				} else {
					field.readOnly = false;
				}
				field.style.backgroundColor = '';
			}
		});
		
		// For new versions, disable rank field since it starts as empty (null)
		const rankField = document.getElementById('rank');
		if (rankField) {
			rankField.readOnly = true;
			rankField.style.backgroundColor = '#f5f5f5';
		}
	}

	/**
	 * Handle language/abbreviation input changes for duplicate checking and auto-fill
	 */
	function handleLanguageAbbreviationChange() {
		const languageInput = document.getElementById('language');
		const abbreviationInput = document.getElementById('abbreviation');
		const tableNameInput = document.getElementById('table-name');
		const warningDiv = document.getElementById('duplicate-warning');
		const saveBtn = document.getElementById('save-version');

		const language = languageInput.value.trim();
		const abbreviation = abbreviationInput.value.trim();

		// Auto-fill table name if empty
		if (language && abbreviation && !tableNameInput.value.trim()) {
			tableNameInput.value = `wp_bible_here_${language}_${abbreviation}`;
			markFormModified();
		}

		// Check for duplicates if both fields have values
		if (language && abbreviation) {
			checkVersionDuplicate(language, abbreviation);
		} else {
			// Clear warning and enable save button if fields are empty
			if (warningDiv) {
				warningDiv.style.display = 'none';
			}
			if (saveBtn) {
				saveBtn.disabled = false;
			}
		}
	}

	/**
	 * Check if language/abbreviation combination already exists
	 */
	function checkVersionDuplicate(language, abbreviation) {
		const versionId = document.getElementById('version-id').value;
		const warningDiv = document.getElementById('duplicate-warning');
		const saveBtn = document.getElementById('save-version');

		const formData = new FormData();
		formData.append('action', 'bible_here_get_versions');
		formData.append('language', language);
		formData.append('abbreviation', abbreviation);
		formData.append('exclude_id', versionId || '0'); // Exclude current record in edit mode
		formData.append('nonce', bible_here_ajax.nonce);

		fetch(bible_here_ajax.ajax_url, {
			method: 'POST',
			body: formData
		})
		.then(response => response.json())
		.then(response => {
			if (response.success) {
				if (response.data.exists) {
				// Show warning and disable save button
				if (warningDiv) {
					warningDiv.innerHTML = `<strong>Bad:</strong> ${response.data.message}`;
					warningDiv.style.display = 'block';
				}
					if (saveBtn) {
						saveBtn.disabled = true;
					}
				} else {
					// Hide warning and enable save button
					if (warningDiv) {
						warningDiv.style.display = 'none';
					}
					if (saveBtn) {
						saveBtn.disabled = false;
					}
				}
			} else {
				console.error('Version check failed:', response.message);
			}
		})
		.catch(error => {
			console.error('Version check request failed:', error);
		});
	}

	/**
	 * Save version data
	 */
	function saveVersion() {
		// Add confirmation dialog
		const versionId = document.getElementById('version-id').value;
		const action = versionId ? 'update' : 'add';
		const confirmMessage = versionId ? 'Are you sure you want to save changes to this version?' : 'Are you sure you want to add this new version?';

		if (!confirm(confirmMessage)) {
			return;
		}

		// Validate required fields
		const language = document.getElementById('language').value.trim();
		const abbreviation = document.getElementById('abbreviation').value.trim();
		const name = document.getElementById('name').value.trim();
		const tableName = document.getElementById('table-name').value.trim();

		if (!language || !abbreviation || !name || !tableName) {
			showNotice('Error: Please fill in all required fields: Language, Abbreviation, Name, and Table Name.', 'error');
			return;
		}
		const form = document.getElementById('version-form');
		const formData = new FormData(form);
		// const versionId = document.getElementById('version-id').value;

		if (versionId) {
			formData.append('action', 'bible_here_save_version');
		} else {
			formData.append('action', 'bible_here_add_version');
		}
		formData.append('nonce', bible_here_ajax.nonce);

		// Disable save button during request
		const saveBtn = document.getElementById('save-version');
		saveBtn.disabled = true;
		saveBtn.textContent = 'Saving...';

		fetch(bible_here_ajax.ajax_url, {
			method: 'POST',
			body: formData
		})
		.then(response => {
			// Check if response is JSON
			const contentType = response.headers.get('content-type');
			if (contentType && contentType.includes('application/json')) {
				return response.json();
			} else {
				// If not JSON, get text to see the actual error
				return response.text().then(text => {
					throw new Error('Server returned non-JSON response: ' + text.substring(0, 200));
				});
			}
		})
		.then(response => {
			saveBtn.disabled = false;
			saveBtn.textContent = 'Save';

			if (response.success) {
				showNotice(versionId ? 'Version updated successfully!' : 'Version added successfully!', 'success');
				resetFormModified();
				closeVersionModal();
				// Reload page to show changes
				setTimeout(() => location.reload(), 1000);
			} else {
				// Extract more detailed error message
				let errorMessage = response.message || 'Unknown error';
				// Check for database duplicate entry error
				if (errorMessage.includes('Duplicate entry')) {
					const match = errorMessage.match(/Duplicate entry '([^']+)' for key '([^']+)'/);
					if (match) {
						errorMessage = `Duplicate entry detected: '${match[1]}' already exists. Please use a different value.`;
					} else {
						errorMessage = 'This entry already exists. Please use different values.';
					}
				}
				showNotice('Failed to save version: ' + errorMessage, 'error');
			}
		})
		.catch(error => {
			saveBtn.disabled = false;
			saveBtn.textContent = 'Save';
			showNotice('Save failed: ' + error.message, 'error');
		});
	}

	// Form modification tracking
	let formModified = false;

	/**
	 * Mark form as modified
	 */
	function markFormModified() {
		formModified = true;
		console.log('Form marked as modified');
	}

	/**
	 * Check if form has been modified
	 */
	function isFormModified() {
		return formModified;
	}

	/**
	 * Reset form modified state
	 */
	function resetFormModified() {
		formModified = false;
	}

	/**
	 * Delete version from modal
	 */
	function deleteVersionFromModal() {
		const versionId = document.getElementById('version-id').value;
		const versionName = document.getElementById('name').value || 'this version';

		console.log('deleteVersion called, versionId:', versionId, 'versionName:', versionName);

		if (!versionId) {
			console.log('No version ID found, showing error');
			showNotice('No version selected for deletion', 'error');
			return;
		}

		if (!confirm('Are you sure you want to delete "' + versionName + '"? This action cannot be undone.')) {
			return;
		}

		const formData = new FormData();
		formData.append('action', 'bible_here_delete_version_row');
		formData.append('version_id', versionId);
		formData.append('nonce', bible_here_ajax.nonce);

		// Disable delete button during request
		const deleteBtn = document.getElementById('delete-version');
		deleteBtn.disabled = true;
		deleteBtn.textContent = 'Deleting...';

		fetch(bible_here_ajax.ajax_url, {
			method: 'POST',
			body: formData
		})
		.then(response => response.json())
		.then(response => {
			deleteBtn.disabled = false;
			deleteBtn.textContent = 'Delete Record';

			if (response.success) {
				showNotice('Version deleted successfully!', 'success');
				closeVersionModal();
				// Reload page to show changes
				setTimeout(() => location.reload(), 1000);
			} else {
				showNotice('Failed to delete version: ' + (response.message || 'Unknown error'), 'error');
			}
		})
		.catch(error => {
			deleteBtn.disabled = false;
			deleteBtn.textContent = 'Delete Record';
			showNotice('Delete failed: ' + error.message, 'error');
		});
	}

	/**
	 * Initialize CSV upload modal functionality
	 */
	function initCSVUploadModal() {
		console.log('Initializing CSV upload modal...');
		const modal = document.getElementById('csv-upload-modal');
		if (!modal) {
			console.error('CSV upload modal not found!');
			return;
		}
		console.log('CSV upload modal found, setting up event listeners...');

		// Handle modal close
		const closeBtn = modal.querySelector('.close');
		if (closeBtn) {
			console.log('CSV modal close button found, adding event listener');
			closeBtn.addEventListener('click', function(e) {
				e.preventDefault();
				closeCSVUploadModal();
			});
		} else {
			console.error('CSV modal close button not found!');
		}

		// Handle cancel button
		const cancelBtn = document.getElementById('cancel-csv-upload');
		if (cancelBtn) {
			console.log('CSV modal cancel button found, adding event listener');
			cancelBtn.addEventListener('click', function(e) {
				e.preventDefault();
				closeCSVUploadModal();
			});
		} else {
			console.error('CSV modal cancel button not found!');
		}

		// Handle upload button
		const uploadBtn = document.getElementById('upload-csv-btn');
		if (uploadBtn) {
			console.log('Upload button found, adding click event listener');
			uploadBtn.addEventListener('click', uploadCSVFile);
			console.log('Upload button event listener added successfully');
		} else {
			console.error('Upload button not found!');
		}

		// Close modal when clicking outside
		modal.addEventListener('click', function(e) {
			if (e.target === modal) {
				e.preventDefault();
				closeCSVUploadModal();
			}
		});

		// Handle ESC key to close modal
		document.addEventListener('keydown', function(e) {
			if (e.key === 'Escape' && modal.style.display === 'block') {
				e.preventDefault();
				closeCSVUploadModal();
			}
		});
	}

	/**
	 * Open CSV upload modal
	 */
	function openCSVUploadModal(versionId, tableName, language) {
		console.log('Opening CSV upload modal with params:', {versionId, tableName, language});
		const modal = document.getElementById('csv-upload-modal');
		if (!modal) {
			console.error('CSV upload modal element not found!');
			return;
		}
		console.log('Modal element found, proceeding to open...');
		const versionInput = document.getElementById('csv-version-id');
		const tableNameInput = document.getElementById('csv-table-name');
		const languageInput = document.getElementById('csv-language');
		const fileInput = document.getElementById('csv-file');
		const progressBar = document.getElementById('csv-progress');
		const resultDiv = document.getElementById('csv-result');

		// Set form data
		console.log('Checking form elements:');
		console.log('versionInput:', versionInput ? 'found' : 'NOT FOUND');
		console.log('tableNameInput:', tableNameInput ? 'found' : 'NOT FOUND');
		console.log('languageInput:', languageInput ? 'found' : 'NOT FOUND');
		console.log('fileInput:', fileInput ? 'found' : 'NOT FOUND');
		
		if (versionInput) versionInput.value = versionId;
		if (tableNameInput) tableNameInput.value = tableName;
		if (languageInput) languageInput.value = language;

		// Reset form
		if (fileInput) fileInput.value = '';
		if (progressBar) {
			progressBar.style.display = 'none';
			progressBar.querySelector('.progress-bar').style.width = '0%';
		}
		if (resultDiv) {
			resultDiv.style.display = 'none';
			resultDiv.innerHTML = '';
		}

		modal.style.display = 'block';
	}

	/**
	 * Close CSV upload modal
	 */
	function closeCSVUploadModal() {
		const modal = document.getElementById('csv-upload-modal');
		modal.style.display = 'none';
	}

	/**
	 * Upload and process CSV file
	 */
	function uploadCSVFile() {
		console.log('uploadCSVFile function called');
		const fileInput = document.getElementById('csv-file');
		const versionId = document.getElementById('csv-version-id').value;
		const tableName = document.getElementById('csv-table-name').value;
		const language = document.getElementById('csv-language').value;
		const progressBar = document.getElementById('csv-progress');
		const resultDiv = document.getElementById('csv-result');
		const uploadBtn = document.getElementById('upload-csv-btn');

		if (!fileInput.files[0]) {
			showCSVResult('請選擇一個 CSV 檔案', 'error');
			return;
		}

		const file = fileInput.files[0];
		if (!file.name.toLowerCase().endsWith('.csv')) {
			showCSVResult('請選擇 CSV 格式的檔案', 'error');
			return;
		}

		// Show progress bar
		if (progressBar) {
			progressBar.style.display = 'block';
			progressBar.querySelector('.progress-bar').style.width = '10%';
		}

		// Disable upload button
		if (uploadBtn) {
			uploadBtn.disabled = true;
			uploadBtn.textContent = '上傳中...';
		}

		// Read and parse CSV file
		const reader = new FileReader();
		reader.onload = function(e) {
			try {
				const csvContent = e.target.result;
				const parsedData = parseCSV(csvContent);

				if (parsedData.length === 0) {
					throw new Error('CSV 檔案為空或格式不正確');
				}

				// Update progress
				if (progressBar) {
					progressBar.querySelector('.progress-bar').style.width = '50%';
				}

				// Send data to server
				uploadCSVData(versionId, tableName, language, parsedData);

			} catch (error) {
				showCSVResult('CSV 解析錯誤: ' + error.message, 'error');
				resetUploadButton();
			}
		};

		reader.onerror = function() {
			showCSVResult('檔案讀取失敗', 'error');
			resetUploadButton();
		};

		reader.readAsText(file, 'UTF-8');
	}

	/**
	 * Parse CSV content
	 */
	function parseCSV(csvContent) {
		const lines = csvContent.trim().split('\n');
		const data = [];
		let startIndex = 0;

		// Check if first line is header
		if (lines.length > 0) {
			const firstLine = lines[0].trim();
			// Skip header if it contains the expected column names
			if (firstLine.toLowerCase().includes('book_number') && 
				firstLine.toLowerCase().includes('chapter_number') && 
				firstLine.toLowerCase().includes('verse_number') && 
				firstLine.toLowerCase().includes('verse_text')) {
				startIndex = 1;
				console.log('CSV header detected, skipping first line');
			}
		}

		for (let i = startIndex; i < lines.length; i++) {
			const line = lines[i].trim();
			if (!line) continue;

			// Parse CSV line (handle quotes)
			const columns = parseCSVLine(line);

			if (columns.length !== 4) {
				throw new Error(`第 ${i - startIndex + 1} 行格式錯誤：應該有 4 個欄位 (book_number,chapter_number,verse_number,verse_text)`);
			}

			const bookNumber = parseInt(columns[0]);
			const chapterNumber = parseInt(columns[1]);
			const verseNumber = parseInt(columns[2]);
			const verseText = columns[3];

			if (isNaN(bookNumber) || isNaN(chapterNumber) || isNaN(verseNumber)) {
				throw new Error(`第 ${i - startIndex + 1} 行格式錯誤：book_number, chapter_number, verse_number 必須是數字`);
			}

			// Allow empty verse_text and set it to null
			const finalVerseText = verseText.trim() === '' ? null : verseText;

			data.push({
				book_number: bookNumber,
				chapter_number: chapterNumber,
				verse_number: verseNumber,
				verse_text: finalVerseText
			});
		}

		return data;
	}

	/**
	 * Parse a single CSV line (handle quotes)
	 */
	function parseCSVLine(line) {
		const result = [];
		let current = '';
		let inQuotes = false;
		let i = 0;

		while (i < line.length) {
			const char = line[i];

			if (char === '"') {
				if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
					// Escaped quote
					current += '"';
					i += 2;
				} else {
					// Toggle quote state
					inQuotes = !inQuotes;
					i++;
				}
			} else if (char === ',' && !inQuotes) {
				// Field separator
				result.push(current.trim());
				current = '';
				i++;
			} else {
				current += char;
				i++;
			}
		}

		// Add the last field
		result.push(current.trim());

		return result;
	}

	/**
	 * Upload CSV data to server
	 */
	function uploadCSVData(versionId, tableName, language, data) {
		console.log('uploadCSVData function called with parameters:');
		console.log('- versionId:', versionId);
		console.log('- tableName:', tableName);
		console.log('- language:', language);
		console.log('- data length:', data.length);
		console.log('- first 3 data items:', data.slice(0, 3));
		console.log('- ajax_url:', bible_here_ajax.ajax_url);
		console.log('- nonce:', bible_here_ajax.nonce);

		const formData = new FormData();
		formData.append('action', 'bible_here_upload_csv');
		formData.append('version_id', versionId);
		formData.append('table_name', tableName);
		formData.append('language', language);
		formData.append('csv_data', JSON.stringify(data));
		formData.append('nonce', bible_here_ajax.nonce);

		console.log('FormData prepared, sending fetch request...');

		fetch(bible_here_ajax.ajax_url, {
			method: 'POST',
			body: formData
		})
		.then(response => {
			console.log('Fetch response received:');
			console.log('- status:', response.status);
			console.log('- statusText:', response.statusText);
			console.log('- ok:', response.ok);
			console.log('- headers:', response.headers);
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			
			return response.text().then(text => {
				console.log('Raw response text:', text);
				try {
					return JSON.parse(text);
				} catch (e) {
					console.error('JSON parse error:', e);
					console.error('Response text that failed to parse:', text);
					throw new Error('Invalid JSON response from server');
				}
			});
		})
		.then(response => {
			console.log('Parsed JSON response:', response);
			
			const progressBar = document.getElementById('csv-progress');
			if (progressBar) {
				progressBar.querySelector('.progress-bar').style.width = '100%';
			}

			if (response.success) {
				console.log('Upload successful:', response.data);
				showCSVResult(`上傳成功！共匯入 ${response.data.imported_count} 筆經文`, 'success');
				// Reload page after 2 seconds
				setTimeout(() => {
					location.reload();
				}, 2000);
			} else {
				console.error('Upload failed:', response);
				showCSVResult('上傳失敗: ' + (response.message || '未知錯誤'), 'error');
			}

			resetUploadButton();
		})
		.catch(error => {
			console.error('Fetch error caught:', error);
			console.error('Error message:', error.message);
			console.error('Error stack:', error.stack);
			showCSVResult('上傳失敗: ' + error.message, 'error');
			resetUploadButton();
		});
	}

	/**
	 * Show CSV upload result
	 */
	function showCSVResult(message, type) {
		const resultDiv = document.getElementById('csv-result');
		if (resultDiv) {
			resultDiv.innerHTML = `<div class="notice notice-${type === 'error' ? 'error' : 'success'}"><p>${message}</p></div>`;
			resultDiv.style.display = 'block';
		}
	}

	/**
	 * Reset upload button state
	 */
	function resetUploadButton() {
		const uploadBtn = document.getElementById('upload-csv-btn');
		const progressBar = document.getElementById('csv-progress');

		if (uploadBtn) {
			uploadBtn.disabled = false;
			uploadBtn.textContent = 'Upload';
		}

		if (progressBar) {
			progressBar.style.display = 'none';
			progressBar.querySelector('.progress-bar').style.width = '0%';
		}
	}

})();
