from flask import Blueprint, request
from .db_operations import get_log_table_view

legacy_bp = Blueprint('legacy', __name__)

@legacy_bp.route('/recent_logs')
def recent_logs():
    limit = int(request.args.get('limit', 10))
    offset = int(request.args.get('offset', 0))
    return get_log_table_view(limit=limit, offset=offset)
