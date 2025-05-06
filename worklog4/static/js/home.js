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

    // Verify gear icon
    const gearIcon = document.querySelector('.template-div-icon');
    if (!gearIcon) {
        console.error('Gear icon with class "template-div-icon" not found');
        return;
    }
    console.log('Gear icon found');

    // Manual click handler for gear icon
    gearIcon.addEventListener('click', function(event) {
        event.stopPropagation();
        console.log('Gear icon clicked');
        try {
            const modalInstance = new bootstrap.Modal(modal);
            modalInstance.show();
        } catch (e) {
            console.error('Error opening modal:', e);
        }
    });

    // Prevent parent elements from capturing clicks
    const container = document.querySelector('.template-div-container');
    if (container) {
        container.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    }

    // Initialize table and load more rows
    const div = document.getElementById('page_template_div1');
    if (div) {
        // Set initial table structure
        div.innerHTML = `
            <table id="logTable" class="table table-striped table-hover">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Date</th>
                        <th>Client</th>
                        <th>Consultant</th>
                        <th>Description</th>
                        <th>Amount Due</th>
                    </tr>
                </thead>
                <tbody>
                    ${window.view_html || ''}
                </tbody>
            </table>
        `;
        const table = $('#logTable').DataTable({
            colReorder: true,
            paging: false, // Disable pagination
            pageLength: 100, // High limit as fallback
            order: [[0, 'desc']],
            search: true,
            dom: 'frtip' // Keep search and reorder, no pagination controls
        });
        const tableApi = $('#logTable').dataTable().api();
        let validationFailures = 0;

        // Function to load more rows
        function loadMoreRows() {
            const tableBody = div.querySelector('#logTable tbody');
            const table = div.querySelector('#logTable');
            const tableHeight = table.offsetHeight;
            const viewportHeight = window.innerHeight - 120;
            console.log(`Checking height: tableHeight=${tableHeight}, viewportHeight=${viewportHeight}`);
            if (tableHeight < viewportHeight) {
                const offset = tableBody.querySelectorAll('tr').length;
                if (offset >= 100) {
                    console.log('Maximum row limit of 100 reached');
                    return;
                }
                console.log(`Fetching more rows: offset=${offset}, limit=10`);
                fetch(`/legacy/recent_logs?limit=10&offset=${offset}`)
                    .then(response => {
                        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
                        return response.text();
                    })
                    .then(html => {
                        console.log(`Received HTML length: ${html.length}, content: ${html.substring(0, 100)}...`);
                        if (!html.trim()) {
                            console.log('No more entries to load');
                            return;
                        }
                        // Remove whitespace between tags and sanitize
                        const sanitizedHtml = html.replace(/>\s+</g, '><').replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
                        console.log(`Sanitized HTML length: ${sanitizedHtml.length}, content: ${sanitizedHtml.substring(0, 100)}...`);
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(`<table><tbody>${sanitizedHtml}</tbody></table>`, 'text/html');
                        const rows = doc.querySelectorAll('tbody tr');
                        console.log(`Found ${rows.length} rows`);
                        let validRows = [];
                        rows.forEach((row, index) => {
                            const tdElements = Array.from(row.children).filter(el => el.tagName.toLowerCase() === 'td');
                            console.log(`Row ${index + 1} <td> count: ${tdElements.length}, HTML: ${row.outerHTML.substring(0, 100)}...`);
                            if (tdElements.length === 6) {
                                validRows.push(row.outerHTML);
                            } else {
                                console.warn(`Invalid row ${index + 1} (expected 6 <td>, got ${tdElements.length}):`, row.outerHTML);
                            }
                        });
                        if (validRows.length === 0) {
                            console.warn('No valid rows to add for offset ' + offset);
                            validationFailures++;
                            if (validationFailures >= 3) {
                                console.warn('Too many validation failures, appending rows directly as fallback');
                                const fallbackRows = Array.from(rows).map(row => row.outerHTML);
                                tableBody.insertAdjacentHTML('beforeend', fallbackRows.join(''));
                                try {
                                    tableApi.rows.add($(fallbackRows.join(''))).draw(false);
                                } catch (e) {
                                    console.error('Error adding fallback rows to DataTables:', e);
                                    return;
                                }
                                validationFailures = 0;
                            }
                            setTimeout(loadMoreRows, 500);
                            return;
                        }
                        validationFailures = 0;
                        console.log(`Adding ${validRows.length} rows`);
                        tableBody.insertAdjacentHTML('beforeend', validRows.join(''));
                        try {
                            tableApi.rows.add($(validRows.join(''))).draw(false);
                        } catch (e) {
                            console.error('Error adding rows to DataTables:', e);
                            return;
                        }
                        setTimeout(loadMoreRows, 500);
                    })
                    .then(() => {
                        // Log the current row count after each fetch
                        console.log(`Current row count: ${tableBody.querySelectorAll('tr').length}`);
                    })
                    .catch(error => {
                        console.error('Error loading more rows:', error);
                        return;
                    });
            } else {
                console.log('Table height exceeds viewport, stopping load');
            }
        }

        if (div.querySelector('#logTable')) {
            setTimeout(loadMoreRows, 500);
        }
    } else {
        console.error('Div with id "page_template_div1" not found');
    }
});
