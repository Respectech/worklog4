from flask import Blueprint, render_template, session, flash, request, redirect, url_for
from db.db_operations import get_page_templates, set_user_preferred_template, get_db_connection, get_user_view_preference, set_user_view_preference
from legacy.db_operations import get_log_table_view

home_bp = Blueprint('home', __name__)

@home_bp.route('/home', methods=['GET', 'POST'])
def home():
    if 'username' not in session:
        flash('Please log in to access this page.', 'error')
        return redirect(url_for('login.login'))

    username = session['username']
    template_html = session.get('template_html', '<div></div>')
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
                            session['template_html'] = result[0].decode('utf-8')
                            session['template_id'] = result[1]
                else:
                    flash('Failed to update preferred template.', 'error')
                return redirect(url_for('home.home'))
        elif 'view_type' in request.form:
            view_type = request.form.get('view_type')
            if view_type:
                if set_user_view_preference(username, template_id, view_type):
                    flash('Preferred view updated!', 'success')
                else:
                    flash('Failed to update preferred view.', 'error')
                return redirect(url_for('home.home'))

    templates = get_page_templates()
    view_type = get_user_view_preference(username, template_id)
    available_views = [
        {'type': 'log_table', 'name': 'Log Table'},
        {'type': 'none', 'name': 'None'}
    ]
    view_html = ""
    if view_type == 'log_table':
        view_html = get_log_table_view()
    elif view_type == 'none':
        view_html = ""

    return render_template('home.html', username=username, template_html=template_html, templates=templates, view_html=view_html, available_views=available_views)
