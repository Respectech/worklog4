from mysql.connector import Error
from db.db_operations import get_db_connection
import html
import logging
import time

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Global dictionary to store active user colors
user_colors = {}

def load_user_colors():
    """Load username and color for active users into user_colors dictionary."""
    global user_colors
    conn = get_db_connection(database='ltc')
    if conn is None:
        logger.error("Failed to connect to ltc database for user colors")
        return

    try:
        cursor = conn.cursor()
        # Query active users (usergroup does not contain 'inactive')
        sql = """
            SELECT username, color
            FROM users
            WHERE usergroup NOT LIKE '%inactive%';
        """
        cursor.execute(sql)
        rows = cursor.fetchall()
        user_colors = {row[0]: row[1] or '#D3D3D3' for row in rows}
        logger.info(f"Loaded {len(user_colors)} active user colors")
        cursor.close()
        conn.close()
    except Error as e:
        logger.error(f"Error loading user colors: {e}")
        if conn:
            conn.close()

# Load user colors on module initialization
load_user_colors()

def get_log_table_view(limit=10, offset=0, conditions=None):
    """Fetch ltc.log entries and apply user colors from user_colors dictionary, return as HTML table rows."""
    conn = get_db_connection(database='ltc')
    if conn is None:
        logger.error("Failed to connect to ltc database")
        return ""

    try:
        cursor = conn.cursor()
        start_time = time.time()

        # Base SQL query without JOIN
        sql = """
            SELECT id, item_date, client, consultant, description, client_amount_due
            FROM log
        """
        params = []

        # Add query conditions
        if conditions and isinstance(conditions, list):
            valid_columns = {'id', 'item_date', 'client', 'consultant', 'description', 'client_amount_due'}
            valid_operators = {'equals', 'contains', 'doesn\'t_contain', '>', '>=', '<', '<=', '<>'}
            where_clauses = []
            for condition in conditions:
                column = condition.get('column')
                operator = condition.get('operator')
                value = condition.get('value')
                if column not in valid_columns or operator not in valid_operators or not value:
                    logger.warn(f"Invalid condition: column={column}, operator={operator}, value={value}")
                    continue

                if operator == 'equals':
                    where_clauses.append(f"{column} = %s")
                    params.append(value)
                elif operator == 'contains':
                    where_clauses.append(f"{column} LIKE %s")
                    params.append(f"%{value}%")
                elif operator == 'doesn\'t_contain':
                    where_clauses.append(f"{column} NOT LIKE %s")
                    params.append(f"%{value}%")
                elif operator in {'>', '>=', '<', '<=', '<>'}:
                    where_clauses.append(f"{column} {operator} %s")
                    params.append(value)
                else:
                    logger.warn(f"Unsupported operator: {operator}")
                    continue

            if where_clauses:
                sql += " WHERE " + " AND ".join(where_clauses)

        # Add sorting and pagination
        sql += " ORDER BY id DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        logger.debug(f"Executing SQL: {sql} with params: {params}")
        cursor.execute(sql, params)
        entries = cursor.fetchall()
        query_time = time.time() - start_time
        logger.debug(f"Query executed in {query_time:.3f} seconds for offset {offset}, limit {limit}, rows={len(entries)}, conditions={conditions}")

        cursor.close()
        conn.close()

        if not entries:
            logger.info(f"No log entries found for offset {offset}, limit {limit}, conditions={conditions}")
            return ""

        html_output = []
        unique_colors = set()
        for entry in entries:
            id_str = html.escape(str(entry[0]))
            date_str = html.escape(str(entry[1] or ''))
            client_str = html.escape(str(entry[2] or ''))
            consultant_str = html.escape(str(entry[3] or ''))
            description_str = html.escape(str(entry[4] or ''))
            amount_str = html.escape(str(entry[5] if entry[5] is not None else '0.00'))
            # Lookup color from user_colors dictionary
            color_str = user_colors.get(consultant_str, '#D3D3D3').lstrip('#')
            if not color_str or not all(c in '0123456789ABCDEFabcdef' for c in color_str) or len(color_str) != 6:
                logger.warn(f"Invalid color={color_str} for consultant={consultant_str}, using default D3D3D3")
                color_str = 'D3D3D3'
            unique_colors.add(color_str)
            logger.debug(f"Processing row with bgcolor={color_str}")
            html_output.append(
                f"<tr bgcolor=\"{color_str}\">"
                f"<td>{id_str}</td>"
                f"<td>{date_str}</td>"
                f"<td>{client_str}</td>"
                f"<td>{consultant_str}</td>"
                f"<td>{description_str}</td>"
                f"<td>{amount_str}</td>"
                f"</tr>"
            )
        html_result = "".join(html_output)
        logger.debug(f"Loaded {len(entries)} log entries for offset {offset}, unique colors={unique_colors}: {html_result[:100]}...")
        return html_result
    except Error as e:
        logger.error(f"Error fetching log entries: {e}")
        if conn:
            conn.close()
        return ""
