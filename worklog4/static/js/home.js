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
                        // Update viewType for the panel
                        panels.find(p => p.panelId === panelId).viewType = viewType;
                        // Trigger log_table-specific rendering if available
                        if (typeof window.logTableRender === 'function') {
                            window.logTableRender(panelId, templateHtml, gearIcon);
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
    window.panels = [
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
                    // Trigger log_table-specific rendering if available
                    if (typeof window.logTableRender === 'function') {
                        window.logTableRender(panel.panelId, templateHtml, gearIcon);
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
});
