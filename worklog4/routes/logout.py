from flask import Blueprint, session, flash, redirect, url_for

logout_bp = Blueprint('logout', __name__)

@logout_bp.route('/logout')
def logout():
    session.pop('username', None)
    flash('You have been logged out.', 'success')
    return redirect(url_for('login.login'))
