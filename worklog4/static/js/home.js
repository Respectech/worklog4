document.addEventListener('DOMContentLoaded', function() {
    // Log Bootstrap availability
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap JavaScript is not loaded');
        return;
    }
    console.log('Bootstrap JavaScript loaded successfully');

    // Verify modal exists
    const modal = document.getElementById('viewModal');
    if (!modal) {
        console.error('Modal with id "viewModal" not found in DOM');
        return;
    }
    console.log('Modal with id "viewModal" found in DOM');

    // Check for duplicate "Select View" forms
    function checkDuplicateForms() {
        const viewTypeSelects = document.querySelectorAll('select#view_type');
        viewTypeSelects.forEach((select, index) => {
            if (!modal.contains(select)) {
                console.warn(`Hiding select#view_type outside #viewModal (index ${index + 1}):`, select.parentElement.outerHTML.substring(0, 100) + '...');
                select.closest('form').style.display = 'none'; // Hide duplicate form
            }
        });
    }
    checkDuplicateForms();

    // Verify gear icons
    const gearIcons = document.querySelectorAll('.template-div-icon');
    if (gearIcons.length === 0) {
        console.error('No gear icons with class "template-div-icon" found');
        return;
    }
    console.log(`Found ${gearIcons.length} gear icons`);
    gearIcons.forEach(icon => {
        console.log(`Gear icon visibility: display=${getComputedStyle(icon).display}, opacity=${getComputedStyle(icon).opacity}`);
    });

    // Fallback click handler for gear icons
    gearIcons.forEach(icon => {
        icon.addEventListener('click', function(event) {
            console.log('Gear icon clicked');
            const panelId = icon.getAttribute('data-panel-id') || 'div1';
            console.log(`Panel ID: ${panelId}`);
            try {
                // Set panel_id in modal form
                const panelInput = modal.querySelector('#panel_id');
                if (panelInput) {
                    panelInput.value = panelId;
                }
                // Check modal classes and state
                console.log('Modal classes:', modal.className);
                console.log('Modal display:', getComputedStyle(modal).display);
                // Check modal dialog width
                const dialog = modal.querySelector('.modal-dialog');
                if (dialog) {
                    console.log('Modal dialog width:', getComputedStyle(dialog).width);
                    console.log('Modal dialog max-width:', getComputedStyle(dialog).maxWidth);
                }
                // Ensure modal is shown as a Bootstrap modal
                const modalInstance = new bootstrap.Modal(modal, {
                    backdrop: 'static',
                    keyboard: false
                });
                modalInstance.show();
                // Re-check for duplicates after modal trigger
                setTimeout(checkDuplicateForms, 100);
            } catch (e) {
                console.error('Error opening modal:', e);
            }
        });
    });

    // Query conditions storage
    const queryConditions = {
        div1: [],
        div2: []
    };

    // Toggle cell selection
    function setupCellToggling(panelId) {
        console.log(`Setting up cell toggling for panelId=${panelId}`);
        const columnCells = document.querySelectorAll(`#query-form-${panelId} .column-cell`);
        const operatorCells = document.querySelectorAll(`#query-form-${panelId} .operator-cell`);

        console.log(`Found ${columnCells.length} column cells and ${operatorCells.length} operator cells`);

        columnCells.forEach(cell => {
            cell.addEventListener('click', function(e) {
                e.preventDefault(); // Prevent any default behavior
                columnCells.forEach(c => c.classList.remove('active'));
                cell.classList.add('active');
                console.log(`Selected column: ${cell.getAttribute('data-value')}`);
            });
        });

        operatorCells.forEach(cell => {
            cell.addEventListener('click', function(e) {
                e.preventDefault(); // Prevent any default behavior
                operatorCells.forEach(c => c.classList.remove('active'));
                cell.classList.add('active');
                console.log(`Selected operator: ${cell.getAttribute('data-value')}`);
            });
        });
    }

    // Initialize cell toggling for each modal
    document.querySelectorAll('[id^="queryModal-"]').forEach(modal => {
        const panelId = modal.id.replace('queryModal-', '');
        setupCellToggling(panelId);
    });

    // Function to add query condition
    window.addQueryCondition = function(panelId) {
        console.log(`addQueryCondition called with panelId=${panelId}`);
        const form = document.getElementById(`query-form-${panelId}`);
        console.log('Form:', form);
        const column = form.querySelector('.column-cell.active')?.getAttribute('data-value');
        const operator = form.querySelector('.operator-cell.active')?.getAttribute('data-value');
        const value = form.querySelector(`#query-value-${panelId}`).value;
        console.log(`Column: ${column}, Operator: ${operator}, Value: ${value}`);
        console.log(`Active column cell:`, form.querySelector('.column-cell.active'));
        console.log(`Active operator cell:`, form.querySelector('.operator-cell.active'));

        if (!column || !operator || !value) {
            console.warn(`Incomplete query condition for ${panelId}: column=${column}, operator=${operator}, value=${value}`);
            alert('Please select a column, operator, and enter a value');
            return;
        }

        console.log(`Adding query condition for ${panelId}: ${column} ${operator} ${value}`);
        queryConditions[panelId].push({ column, operator, value });

        // Close modal
        const queryModal = document.getElementById(`queryModal-${panelId}`);
        console.log('Query modal:', queryModal);
        const modalInstance = bootstrap.Modal.getInstance(queryModal);
        console.log('Modal instance:', modalInstance);
        modalInstance.hide();

        // Refresh table with query
        refreshTable(panelId);
    };

    // Function to clear query conditions
    window.clearQuery = function(panelId) {
        console.log(`clearQuery called for panelId=${panelId}`);
        queryConditions[panelId] = [];
        
        // Reset cell selections and value input in modal
        const form = document.getElementById(`query-form-${panelId}`);
        if (form) {
            form.querySelectorAll('.column-cell.active, .operator-cell.active').forEach(cell => cell.classList.remove('active'));
            form.querySelector(`#query-value-${panelId}`).value = '';
        }

        // Refresh table to show all data
        refreshTable(panelId);
    };

    // Function to display current query
    function displayQuery(panelId) {
        console.log(`displayQuery called for panelId=${panelId}`);
        const conditions = queryConditions[panelId];
        const displayDiv = document.getElementById(`query-display-${panelId}`);
        if (displayDiv) {
            if (conditions.length === 0) {
                displayDiv.textContent = 'Query: None';
            } else {
                const queryText = conditions.map(c => `${c.column} ${c.operator} '${c.value}'`).join(' AND ');
                displayDiv.textContent = `Query: ${queryText}`;
            }
            console.log(`Query display updated: ${displayDiv.textContent}`);
        } else {
            console.warn(`Query display element not found for ${panelId}`);
        }
    }

    // Function to refresh table with query
    function refreshTable(panelId) {
        console.log(`refreshTable called for panelId=${panelId}`);
        const div = document.getElementById(`page_template_div${panelId === 'div1' ? '1' : '2'}`);
        const conditions = queryConditions[panelId];
        console.log(`Conditions:`, conditions);

        // Fetch new table data with query
        const startFetch = performance.now();
        fetch(`/home/recent_logs?limit=10&offset=0&panel_id=${panelId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ conditions })
        })
        .then(response => {
            console.log(`Fetch response status for ${panelId}: ${response.status}`);
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
            const fetchTime = performance.now() - startFetch;
            console.log(`Fetch for ${panelId} took ${fetchTime.toFixed(2)} ms`);
            return response.text();
        })
        .then(html => {
            console.log(`Received HTML length: ${html.length}, content: ${html.substring(0, 100)}...`);
            const gearIcon = div.querySelector('.template-div-icon');
            // Fetch log_table.html with updated view_html
            fetch(`/render_log_table?panel_id=${panelId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ view_html: html })
            })
            .then(response => {
                console.log(`Render log_table response status for ${panelId}: ${response.status}`);
                if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
                return response.text();
            })
            .then(templateHtml => {
                div.innerHTML = templateHtml;
                if (gearIcon) {
                    div.appendChild(gearIcon);
                }
                // Apply background colors
                const rows = div.querySelectorAll(`#logTable-${panelId} tbody tr`);
                rows.forEach(row => {
                    const bgcolor = row.getAttribute('bgcolor');
                    if (bgcolor && /^[0-9A-Fa-f]{6}$/.test(bgcolor)) {
                        const normalizedBgcolor = `#${bgcolor}`;
                        row.style.backgroundColor = normalizedBgcolor;
                        row.classList.add('bg-colored');
                        row.style.setProperty('--row-bgcolor', normalizedBgcolor);
                        console.log(`Applied bgcolor=${normalizedBgcolor} to row in ${panelId}`);
                    } else if (bgcolor) {
                        console.warn(`Invalid bgcolor=${bgcolor} in ${panelId}, skipping`);
                    }
                });
                // Update query display
                displayQuery(panelId);
                // Log scrolling styles
                const tableResponsive = div.querySelector('.table-responsive');
                if (tableResponsive) {
                    console.log(`Table ${panelId} scrolling: overflow-x=${getComputedStyle(tableResponsive).overflowX}, overflow-y=${getComputedStyle(tableResponsive).overflowY}, max-height=${getComputedStyle(tableResponsive).maxHeight}`);
                }
                // Restart loadMoreRows
                loadMoreRows(panelId);
            })
            .catch(error => {
                console.error(`Error fetching log_table template for ${panelId}:`, error);
            });
        })
        .catch(error => {
            console.error(`Error refreshing table for ${panelId}:`, error);
        });
    }

    // Handle modal form submission via AJAX
    const form = document.getElementById('modal-view-form');
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(form);
        const panelId = formData.get('panel_id');
        const viewType = formData.get('view_type');
        console.log(`Submitting view change: panel_id=${panelId}, view_type=${viewType}`);

        fetch('/set_view', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log(`AJAX response:`, data);
            if (data.success) {
                // Update the specific panel
                const panelDiv = document.getElementById(`page_template_div${panelId === 'div1' ? '1' : '2'}`);
                const gearIcon = panelDiv.querySelector('.template-div-icon');
                if (viewType === 'log_table') {
                    // Fetch log_table.html with initial view_html
                    fetch(`/render_log_table?panel_id=${panelId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ view_html: data.view_html })
                    })
                    .then(response => response.text())
                    .then(templateHtml => {
                        panelDiv.innerHTML = templateHtml;
                        if (gearIcon) {
                            panelDiv.appendChild(gearIcon);
                        }
                        // Apply background colors
                        const rows = panelDiv.querySelectorAll(`#logTable-${panelId} tbody tr`);
                        rows.forEach(row => {
                            const bgcolor = row.getAttribute('bgcolor');
                            if (bgcolor && /^[0-9A-Fa-f]{6}$/.test(bgcolor)) {
                                const normalizedBgcolor = `#${bgcolor}`;
                                row.style.backgroundColor = normalizedBgcolor;
                                row.classList.add('bg-colored');
                                row.style.setProperty('--row-bgcolor', normalizedBgcolor);
                                console.log(`Applied bgcolor=${normalizedBgcolor} to row in ${panelId}`);
                            } else if (bgcolor) {
                                console.warn(`Invalid bgcolor=${bgcolor} in ${panelId}, skipping`);
                            }
                        });
                        // Update query display
                        displayQuery(panelId);
                        // Log scrolling styles
                        const tableResponsive = panelDiv.querySelector('.table-responsive');
                        if (tableResponsive) {
                            console.log(`Table ${panelId} scrolling: overflow-x=${getComputedStyle(tableResponsive).overflowX}, overflow-y=${getComputedStyle(tableResponsive).overflowY}, max-height=${getComputedStyle(tableResponsive).maxHeight}`);
                        }
                        // Update viewType for the panel
                        panels.find(p => p.panelId === panelId).viewType = viewType;
                        // Restart loadMoreRows for log_table
                        if (viewType === 'log_table') {
                            loadMoreRows(panelId);
                        }
                    })
                    .catch(error => {
                        console.error(`Error fetching log_table template for ${panelId}:`, error);
                    });
                } else {
                    panelDiv.innerHTML = ''; // Empty for none
                    if (gearIcon) {
                        panelDiv.appendChild(gearIcon);
                    }
                    panels.find(p => p.panelId === panelId).viewType = viewType;
                }
                // Show success message
                const alertDiv = document.createElement('div');
                alertDiv.className = 'alert alert-success alert-dismissible fade show';
                alertDiv.innerHTML = `${data.message} <button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
                document.querySelector('.container-fluid').prepend(alertDiv);
                setTimeout(() => alertDiv.remove(), 3000);
            } else {
                console.error('View update failed:', data.message);
                const alertDiv = document.createElement('div');
                alertDiv.className = 'alert alert-danger alert-dismissible fade show';
                alertDiv.innerHTML = `${data.message} <button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
                document.querySelector('.container-fluid').prepend(alertDiv);
                setTimeout(() => alertDiv.remove(), 3000);
            }
            // Close modal
            const modalInstance = bootstrap.Modal.getInstance(modal);
            modalInstance.hide();
        })
        .catch(error => {
            console.error('Error submitting view change:', error);
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-danger alert-dismissible fade show';
            alertDiv.innerHTML = `Error updating view <button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
            document.querySelector('.container-fluid').prepend(alertDiv);
            setTimeout(() => alertDiv.remove(), 3000);
        });
    });

    // Log view_html content
    console.log('Initial view_html:', {
        div1: window.view_html.div1 ? window.view_html.div1.substring(0, 100) + '...' : 'empty',
        div2: window.view_html.div2 ? window.view_html.div2.substring(0, 100) + '...' : 'empty'
    });

    // Prevent parent elements from capturing clicks
    const containers = document.querySelectorAll('.template-div-container');
    containers.forEach(container => {
        container.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    });

    // Initialize panels
    const panels = [
        { id: 'page_template_div1', viewHtml: window.view_html.div1, panelId: 'div1', viewType: window.view_html.div1 ? 'log_table' : 'none' },
        { id: 'page_template_div2', viewHtml: window.view_html.div2, panelId: 'div2', viewType: window.view_html.div2 ? 'log_table' : 'none' }
    ];

    panels.forEach(panel => {
        const div = document.getElementById(panel.id);
        if (div) {
            console.log(`Initializing ${panel.id} with viewType=${panel.viewType}`);
            const startRender = performance.now();
            // Preserve existing gear icon
            const gearIcon = div.querySelector('.template-div-icon');
            if (panel.viewType === 'log_table' && panel.viewHtml) {
                // Fetch log_table.html with initial view_html
                fetch(`/render_log_table?panel_id=${panel.panelId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ view_html: panel.viewHtml })
                })
                .then(response => {
                    console.log(`Initial render response status for ${panel.id}: ${response.status}`);
                    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
                    return response.text();
                })
                .then(templateHtml => {
                    div.innerHTML = templateHtml;
                    if (gearIcon) {
                        div.appendChild(gearIcon);
                    }
                    // Apply background colors
                    const rows = div.querySelectorAll(`#logTable-${panel.panelId} tbody tr`);
                    rows.forEach(row => {
                        const bgcolor = row.getAttribute('bgcolor');
                        if (bgcolor && /^[0-9A-Fa-f]{6}$/.test(bgcolor)) {
                            const normalizedBgcolor = `#${bgcolor}`;
                            row.style.backgroundColor = normalizedBgcolor;
                            row.classList.add('bg-colored');
                            row.style.setProperty('--row-bgcolor', normalizedBgcolor);
                            console.log(`Applied bgcolor=${normalizedBgcolor} to row in ${panel.panelId}`);
                        } else if (bgcolor) {
                            console.warn(`Invalid bgcolor=${bgcolor} in ${panel.panelId}, skipping`);
                        }
                    });
                    // Update query display
                    displayQuery(panel.panelId);
                    // Log scrolling styles
                    const tableResponsive = div.querySelector('.table-responsive');
                    if (tableResponsive) {
                        console.log(`Table ${panel.id} scrolling: overflow-x=${getComputedStyle(tableResponsive).overflowX}, overflow-y=${getComputedStyle(tableResponsive).overflowY}, max-height=${getComputedStyle(tableResponsive).maxHeight}`);
                    }
                    // Start loadMoreRows
                    if (panel.viewType === 'log_table') {
                        setTimeout(() => loadMoreRows(panel.panelId), 1000);
                    }
                })
                .catch(error => {
                    console.error(`Error fetching log_table template for ${panel.panelId}:`, error);
                });
            } else {
                div.innerHTML = ''; // Empty for none view
                if (gearIcon) {
                    div.appendChild(gearIcon);
                }
            }
            const renderTime = performance.now() - startRender;
            console.log(`Initial render for ${panel.id} took ${renderTime.toFixed(2)} ms`);
        } else {
            console.error(`Div with id "${panel.id}" not found`);
        }
    });

    // Function to load more rows for a specific panel
    function loadMoreRows(panelId) {
        const panel = panels.find(p => p.panelId === panelId);
        if (!panel) {
            console.error(`Panel ${panelId} not found`);
            return;
        }
        if (panel.viewType !== 'log_table') {
            console.log(`Skipping loadMoreRows for ${panel.id} with viewType=${panel.viewType}`);
            return;
        }
        const div = document.getElementById(panel.id);
        const tableBody = div.querySelector(`#logTable-${panel.panelId} tbody`);
        const table = div.querySelector(`#logTable-${panel.panelId}`);
        if (!tableBody || !table) {
            console.log(`Table not found for ${panel.id}, stopping load`);
            return;
        }
        const tableHeight = table.offsetHeight;
        const viewportHeight = window.innerHeight - 120;
        console.log(`Checking height for ${panel.id}: tableHeight=${tableHeight}, viewportHeight=${viewportHeight}`);
        if (tableHeight < viewportHeight) {
            const offset = tableBody.querySelectorAll('tr').length;
            if (offset >= 100) {
                console.log(`Maximum row limit of 100 reached for ${panel.id}`);
                return;
            }
            console.log(`Fetching more rows for ${panel.id}: offset=${offset}, limit=10`);
            const startFetch = performance.now();
            fetch(`/home/recent_logs?limit=10&offset=${offset}&panel_id=${panel.panelId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ conditions: queryConditions[panel.panelId] })
            })
            .then(response => {
                console.log(`Fetch response status for ${panel.id}: ${response.status}`);
                if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
                const fetchTime = performance.now() - startFetch;
                console.log(`Fetch for ${panel.id} took ${fetchTime.toFixed(2)} ms`);
                return response.text();
            })
            .then(html => {
                console.log(`Received HTML length: ${html.length}, content: ${html.substring(0, 100)}...`);
                if (!html.trim()) {
                    console.log(`No more entries to load for ${panel.id}`);
                    return;
                }
                const startRender = performance.now();
                const sanitizedHtml = html.replace(/>\s+</g, '><').replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
                console.log(`Sanitized HTML length: ${sanitizedHtml.length}, content: ${sanitizedHtml.substring(0, 100)}...`);
                const parser = new DOMParser();
                const doc = parser.parseFromString(`<table><tbody>${sanitizedHtml}</tbody></table>`, 'text/html');
                const rows = doc.querySelectorAll('tbody tr');
                console.log(`Found ${rows.length} rows for ${panel.id}`);
                let validRows = [];
                rows.forEach((row, index) => {
                    const tdElements = Array.from(row.children).filter(el => el.tagName.toLowerCase() === 'td');
                    console.log(`Row ${index + 1} <td> count: ${tdElements.length}, HTML: ${row.outerHTML.substring(0, 100)}...`);
                    if (tdElements.length === 6) {
                        validRows.push(row.outerHTML);
                    } else {
                        console.warn(`Invalid row ${index + 1} (expected 6 <td>, got ${tdElements.length}) for ${panel.id}:`, row.outerHTML);
                    }
                });
                if (validRows.length === 0) {
                    console.warn(`No valid rows to add for offset ${offset} in ${panel.id}`);
                    panel.validationFailures = (panel.validationFailures || 0) + 1;
                    if (panel.validationFailures >= 3) {
                        console.warn(`Too many validation failures, stopping load for ${panel.id}`);
                        return;
                    }
                    setTimeout(() => loadMoreRows(panel.panelId), 1000);
                    return;
                }
                panel.validationFailures = 0;
                console.log(`Adding ${validRows.length} rows to ${panel.id}`);
                tableBody.insertAdjacentHTML('beforeend', validRows.join(''));
                const newRows = tableBody.querySelectorAll(`tr:nth-last-child(-n+${validRows.length})`);
                newRows.forEach(row => {
                    const bgcolor = row.getAttribute('bgcolor');
                    if (bgcolor && /^[0-9A-Fa-f]{6}$/.test(bgcolor)) {
                        const normalizedBgcolor = `#${bgcolor}`;
                        row.style.backgroundColor = normalizedBgcolor;
                        row.classList.add('bg-colored');
                        row.style.setProperty('--row-bgcolor', normalizedBgcolor);
                        console.log(`Applied bgcolor=${normalizedBgcolor} to row in ${panel.id}`);
                    } else if (bgcolor) {
                        console.warn(`Invalid bgcolor=${bgcolor} in ${panel.id}, skipping`);
                    }
                });
                const renderTime = performance.now() - startRender;
                console.log(`Row render for ${panel.id} took ${renderTime.toFixed(2)} ms`);
                setTimeout(() => loadMoreRows(panel.panelId), 1000);
            })
            .then(() => {
                console.log(`Current row count for ${panel.id}: ${tableBody.querySelectorAll('tr').length}`);
            })
            .catch(error => {
                console.error(`Error loading more rows for ${panel.id}:`, error);
            });
        } else {
            console.log(`Table height exceeds viewport for ${panel.id}, stopping load`);
        }
    }
});
