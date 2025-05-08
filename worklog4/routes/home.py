from flask import Blueprint, render_template, session, flash, request, redirect, url_for, jsonify
from db.db_operations import get_page_templates, set_user_preferred_template, get_db_connection, get_user_view_preference, set_user_view_preference
from legacy.db_operations import get_log_table_view
import logging
import time
from functools import lru_cache

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

home_bp = Blueprint('home', __name__)

# Cache view_html for 60 seconds
@lru_cache(maxsize=32)
def cached_get_log_table_view(limit, offset=0, panel_id='div1'):
    start_time = time.time()
    result = get_log_table_view(limit, offset)
    cache_time = time.time() - start_time
    logger.debug(f"Cached view_html generated in {cache_time:.3f} seconds for limit={limit}, offset={offset}, panel_id={panel_id}")
    return result

@home_bp.route('/home', methods=['GET', 'POST'])
def home():
    if 'username' not in session:
        flash('Please log in to access this page.', 'error')
        return redirect(url_for('login.login'))

    username = session['username']
    template_html = session.get('template_html', '<div class="template-div-container" id="page_template_div1"><i class="bi bi-gear template-div-icon" data-bs-toggle="modal" data-bs-target="#viewModal" data-panel-id="div1"></i></div>')
    template_id = session.get('template_id', 1)  # Default to Single Pane

    if request.method == 'POST':
        if 'template_id' in request.form:
            template_id = request.form.get('template_id')
            if template_id:
                if set_user_preferred_template(username, template_id):
                    flash('Preferred template updated!', 'success')
                    conn = get_db_connection(database='wl4')
                    if conn:
                        cursor = conn.cursor()
                        cursor.execute("SELECT value, id FROM page_templates WHERE id = %s", (template_id,))
                        result = cursor.fetchone()
                        cursor.close()
                        conn.close()
                        if result:
                            template_html = result[0].decode('utf-8')
                            logger.debug(f"Loaded template_html for id={template_id}: {template_html[:100]}...")
                            session['template_html'] = template_html
                            session['template_id'] = result[1]
                            # Clear cache to ensure fresh view_html
                            cached_get_log_table_view.cache_clear()
                else:
                    flash('Failed to update preferred template.', 'error')
                return redirect(url_for('home.home'))
        elif 'view_type' in request.form:
            # Handle form submission for backward compatibility
            view_type = request.form.get('view_type')
            panel_id = request.form.get('panel_id', 'div1')
            if view_type:
                if set_user_view_preference(username, template_id, view_type, panel_id):
                    flash(f'Preferred view updated for panel {panel_id}!', 'success')
                    cached_get_log_table_view.cache_clear()
                else:
                    flash(f'Failed to update preferred view for panel {panel_id}.', 'error')
                return redirect(url_for('home.home'))

    templates = get_page_templates()
    # Get view preferences for both panels
    view_type_div1 = get_user_view_preference(username, template_id, 'div1') or 'log_table'
    view_type_div2 = get_user_view_preference(username, template_id, 'div2') or 'none'
    logger.debug(f"View preferences for {username}, template {template_id}: div1={view_type_div1}, div2={view_type_div2}")
    available_views = [
        {'type': 'log_table', 'name': 'Log Table'},
        {'type': 'none', 'name': 'None'}
    ]
    view_html_div1 = ""
    view_html_div2 = ""
    if view_type_div1 == 'log_table':
        start_time = time.time()
        view_html_div1 = cached_get_log_table_view(limit=10, panel_id='div1')  # Limit to 10 rows
        response_time = time.time() - start_time
        row_count = view_html_div1.count('<tr')  # Approximate row count
        logger.debug(f"view_html_div1 response took {response_time:.3f} seconds, rows={row_count}, content: {view_html_div1[:100]}...")
    if view_type_div2 == 'log_table':
        start_time = time.time()
        view_html_div2 = cached_get_log_table_view(limit=10, panel_id='div2')  # Limit to 10 rows
        response_time = time.time() - start_time
        row_count = view_html_div2.count('<tr')
        logger.debug(f"view_html_div2 response took {response_time:.3f} seconds, rows={row_count}, content: {view_html_div2[:100]}...")
    else:
        logger.debug(f"view_html_div2 set to empty for view_type={view_type_div2}")

    logger.debug(f"Rendering home.html with template_html: {template_html[:100]}...")
    return render_template(
        'home.html',
        username=username,
        template_html=template_html,
        templates=templates,
        view_html_div1=view_html_div1,
        view_html_div2=view_html_div2,
        available_views=available_views
    )

@home_bp.route('/set_view', methods=['POST'])
def set_view():
    if 'username' not in session:
        return jsonify({'success': False, 'message': 'Please log in to update view.'}), 401

    username = session['username']
    template_id = session.get('template_id', 1)
    view_type = request.form.get('view_type')
    panel_id = request.form.get('panel_id', 'div1')

    logger.debug(f"Setting view for {username}, template {template_id}, panel {panel_id}: {view_type}")

    if not view_type:
        return jsonify({'success': False, 'message': 'View type is required.'}), 400

    try:
        success = set_user_view_preference(username, template_id, view_type, panel_id)
        cached_get_log_table_view.cache_clear()  # Clear cache for updated panel
        if success:
            view_html = ""
            if view_type == 'log_table':
                start_time = time.time()
                view_html = cached_get_log_table_view(limit=10, panel_id=panel_id)  # Limit to 10 rows
                response_time = time.time() - start_time
                row_count = view_html.count('<tr')
                logger.debug(f"Generated view_html for {panel_id} in {response_time:.3f} seconds, rows={row_count}, content: {view_html[:100]}...")
            else:
                logger.debug(f"view_html for {panel_id} set to empty for view_type={view_type}")
            return jsonify({
                'success': True,
                'message': f'Preferred view updated for panel {panel_id}!',
                'view_html': view_html
            })
        else:
            return jsonify({'success': False, 'message': f'Failed to update view for panel {panel_id}.'}), 500
    except Exception as e:
        logger.error(f"Error setting view: {e}")
        return jsonify({'success': False, 'message': 'Server error occurred.'}), 500
