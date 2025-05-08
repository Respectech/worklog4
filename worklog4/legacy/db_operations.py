from mysql.connector import Error
from db.db_operations import get_db_connection
import html
import logging
import time

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def get_log_table_view(limit=10, offset=0):
    """Fetch ltc.log entries with user colors and return as HTML table rows."""
    conn = get_db_connection(database='ltc')
    if conn is None:
        logger.error("Failed to connect to ltc database")
        return ""

    try:
        cursor = conn.cursor()
        start_time = time.time()
        cursor.execute("""
            SELECT l.id, l.item_date, l.client, l.consultant, l.description, l.client_amount_due, COALESCE(u.color, '#D3D3D3') AS color
            FROM log l
            LEFT JOIN users u ON l.consultant = u.username
            ORDER BY l.id DESC
            LIMIT %s OFFSET %s
        """, (limit, offset))
        entries = cursor.fetchall()
        query_time = time.time() - start_time
        logger.debug(f"Query executed in {query_time:.3f} seconds for offset {offset}, limit {limit}, rows={len(entries)}")

        cursor.close()
        conn.close()

        if not entries:
            logger.info(f"No log entries found for offset {offset}, limit {limit}")
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
            color_str = str(entry[6] or '#D3D3D3').lstrip('#')  # Ensure consistent hex
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
