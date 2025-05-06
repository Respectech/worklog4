from flask import Blueprint, render_template, request, redirect, url_for, session, flash
from mysql.connector import Error
from db.db_operations import get_db_connection, create_wl4_database_and_table, sync_user_to_wl4, ensure_page_templates_table, get_user_preferred_template

login_bp = Blueprint('login', __name__)

@login_bp.route('/', methods=['GET', 'POST'])
def login():
    if 'username' in session:
        return redirect(url_for('home.home'))

    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        conn = get_db_connection(database='ltc')
        if conn is None:
            flash('Database connection failed.', 'error')
            return render_template('login.html')

        try:
            cursor = conn.cursor()
            query = "SELECT username, password FROM users WHERE username = %s AND password = %s"
            cursor.execute(query, (username, password))
            user = cursor.fetchone()
            cursor.close()
            conn.close()

            if user:
                if not create_wl4_database_and_table():
                    flash('Failed to initialize wl4 database.', 'error')
                    return render_template('login.html')

                if not sync_user_to_wl4(username):
                    flash('Failed to sync user to wl4 database.', 'error')
                    return render_template('login.html')

                if not ensure_page_templates_table():
                    flash('Failed to initialize page templates.', 'error')
                    return render_template('login.html')

                session['username'] = username
                template_html, template_id = get_user_preferred_template(username)
                if template_html is None or template_id is None:
                    # Fallback to Single Pane
                    template_html = """
                    <div class="template-div-container">
                        <div id="page_template_div1"></div>
                        <i class="bi bi-gear template-div-icon" data-bs-toggle="modal" data-bs-target="#viewModal"></i>
                    </div>
                    """.strip()
                    template_id = 1
                    # Set default template in database
                    conn = get_db_connection(database='wl4')
                    if conn:
                        try:
                            cursor = conn.cursor()
                            cursor.execute("""
                                UPDATE users
                                SET preferred_template_id = %s
                                WHERE username = %s
                            """, (template_id, username))
                            conn.commit()
                        except Error as e:
                            print(f"Error setting default template: {e}")
                        finally:
                            cursor.close()
                            conn.close()
                session['template_html'] = template_html
                session['template_id'] = template_id
                flash('Login successful!', 'success')
                return redirect(url_for('home.home'))
            else:
                flash('Invalid username or password.', 'error')
        except Error as e:
            flash(f'Database error: {e}', 'error')
            if conn:
                conn.close()
        except ValueError as e:
            flash(f'Internal error: {e}', 'error')
            if conn:
                conn.close()

    return render_template('login.html')
