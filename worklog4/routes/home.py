from flask import Blueprint, render_template, session, flash, redirect, url_for

home_bp = Blueprint('home', __name__)

@home_bp.route('/home')
def home():
    if 'username' not in session:
        flash('Please log in to access this page.', 'error')
        return redirect(url_for('login.login'))
    return render_template('home.html', username=session['username'])
