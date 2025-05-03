from flask import Blueprint, render_template, request, redirect, url_for, session, flash
from mysql.connector import Error
from db.db_operations import get_db_connection, create_wl4_database_and_table, sync_user_to_wl4

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

                session['username'] = username
                flash('Login successful!', 'success')
                return redirect(url_for('home.home'))
            else:
                flash('Invalid username or password.', 'error')
        except Error as e:
            flash(f'Database error: {e}', 'error')
            conn.close()

    return render_template('login.html')
