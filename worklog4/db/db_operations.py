import mysql.connector
from mysql.connector import Error
from config.db_config import load_db_config
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def get_db_connection(database=None):
    config = load_db_config()
    if config is None:
        return None
    try:
        conn = mysql.connector.connect(
            host=config['host'],
            port=config['port'],
            user=config['user'],
            password=config['password'],
            database=database
        )
        return conn
    except Error as e:
        logger.error(f"Error connecting to MySQL: {e}")
        return None

def create_wl4_database_and_table():
    conn = get_db_connection()
    if conn is None:
        return False

    try:
        cursor = conn.cursor()
        cursor.execute("SHOW DATABASES LIKE 'wl4'")
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return True

        cursor.execute("CREATE DATABASE wl4")
        cursor.close()
        conn.close()

        conn = get_db_connection(database='wl4')
        if conn is None:
            return False

        cursor = conn.cursor()
        create_table_query = """
        CREATE TABLE users (
            username VARCHAR(255),
            first_name VARCHAR(255),
            last_name VARCHAR(255),
            password VARCHAR(255),
            rate DECIMAL(10,2),
            permissions TEXT,
            usergroup VARCHAR(255),
            color VARCHAR(7),
            email VARCHAR(255),
            info VARCHAR(255),
            preferred_template_id INT,
            FOREIGN KEY (preferred_template_id) REFERENCES page_templates(id)
        )
        """
        cursor.execute(create_table_query)
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Error as e:
        logger.error(f"Error creating wl4 database/table: {e}")
        if conn:
            conn.close()
        return False

def sync_user_to_wl4(username):
    conn_ltc = get_db_connection(database='ltc')
    if conn_ltc is None:
        return False

    try:
        cursor_ltc = conn_ltc.cursor()
        cursor_ltc.execute(
            "SELECT username, first_name, last_name, color FROM users WHERE username = %s",
            (username,)
        )
        user = cursor_ltc.fetchone()
        cursor_ltc.close()
        conn_ltc.close()

        if not user:
            return False

        conn_wl4 = get_db_connection(database='wl4')
        if conn_wl4 is None:
            return False

        cursor_wl4 = conn_wl4.cursor()
        cursor_wl4.execute(
            "SELECT username FROM users WHERE username = %s",
            (username,)
        )
        if cursor_wl4.fetchone():
            cursor_wl4.close()
            conn_wl4.close()
            return True

        insert_query = """
        INSERT INTO users (username, first_name, last_name, color)
        VALUES (%s, %s, %s, %s)
        """
        cursor_wl4.execute(insert_query, user)
        conn_wl4.commit()
        cursor_wl4.close()
        conn_wl4.close()
        return True
    except Error as e:
        logger.error(f"Error syncing user to wl4: {e}")
        if conn_ltc:
            conn_ltc.close()
        if 'conn_wl4' in locals():
            conn_wl4.close()
        return False

def ensure_page_templates_table():
    """Ensure the page_templates and template_view_preferences tables exist."""
    conn = get_db_connection(database='wl4')
    if conn is None:
        logger.error("Failed to connect to wl4 database")
        return False

    try:
        cursor = conn.cursor()
        cursor.execute("SHOW TABLES LIKE 'page_templates'")
        table_exists = cursor.fetchone()

        if not table_exists:
            cursor.execute("""
                CREATE TABLE page_templates (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    version VARCHAR(50) NOT NULL,
                    value BLOB NOT NULL
                )
            """)
            initial_html = """
            <div class="template-div-container">
                <div id="page_template_div1"></div>
                <i class="bi bi-gear template-div-icon" data-bs-toggle="modal" data-bs-target="#viewModal" data-panel-id="div1"></i>
            </div>
            """.strip()
            cursor.execute("""
                INSERT INTO page_templates (name, version, value)
                VALUES (%s, %s, %s)
            """, ("Single Pane", "1.0", initial_html.encode('utf-8')))
            conn.commit()
            logger.info("Created page_templates table and inserted initial record")
        else:
            expected_html = """
            <div class="template-div-container">
                <div id="page_template_div1"></div>
                <i class="bi bi-gear template-div-icon" data-bs-toggle="modal" data-bs-target="#viewModal" data-panel-id="div1"></i>
            </div>
            """.strip()
            cursor.execute("""
                SELECT value FROM page_templates WHERE name = %s AND version = %s
            """, ("Single Pane", "1.0"))
            result = cursor.fetchone()
            if result and result[0].decode('utf-8') != expected_html:
                cursor.execute("""
                    UPDATE page_templates
                    SET value = %s
                    WHERE name = %s AND version = %s
                """, (expected_html.encode('utf-8'), "Single Pane", "1.0"))
                conn.commit()
                logger.info("Updated Single Pane template value")

        cursor.execute("SHOW TABLES LIKE 'template_view_preferences'")
        prefs_table_exists = cursor.fetchone()

        if not prefs_table_exists:
            cursor.execute("""
                CREATE TABLE template_view_preferences (
                    user_id VARCHAR(255),
                    template_id INT,
                    panel_id VARCHAR(10) DEFAULT 'div1',
                    view_type VARCHAR(50),
                    PRIMARY KEY (user_id, template_id, panel_id),
                    FOREIGN KEY (template_id) REFERENCES page_templates(id)
                )
            """)
            conn.commit()
            logger.info("Created template_view_preferences table")

        return True
    except Error as e:
        logger.error(f"Error ensuring tables: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def get_page_templates():
    """Retrieve all page templates for selection."""
    conn = get_db_connection(database='wl4')
    if conn is None:
        logger.error("Failed to connect to wl4 database")
        return []

    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, version FROM page_templates")
        templates = cursor.fetchall()
        cursor.close()
        conn.close()
        return [{'id': t[0], 'name': t[1], 'version': t[2]} for t in templates]
    except Error as e:
        logger.error(f"Error fetching page templates: {e}")
        if conn:
            conn.close()
        return []

def get_user_preferred_template(username):
    """Get the preferred template HTML snippet and ID for a user."""
    conn = get_db_connection(database='wl4')
    if conn is None:
        logger.error("Failed to connect to wl4 database")
        return None, None

    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT pt.value, pt.id
            FROM users u
            LEFT JOIN page_templates pt ON u.preferred_template_id = pt.id
            WHERE u.username = %s
        """, (username,))
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        if result and result[0]:
            return result[0].decode('utf-8'), result[1]
        return None, None
    except Error as e:
        logger.error(f"Error fetching user preferred template: {e}")
        if conn:
            conn.close()
        return None, None

def set_user_preferred_template(username, template_id):
    """Set the user's preferred template."""
    conn = get_db_connection(database='wl4')
    if conn is None:
        logger.error("Failed to connect to wl4 database")
        return False

    try:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE users
            SET preferred_template_id = %s
            WHERE username = %s
        """, (template_id, username))
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Error as e:
        logger.error(f"Error setting user preferred template: {e}")
        if conn:
            conn.close()
        return False

def get_user_view_preference(username, template_id, panel_id='div1'):
    """Get the user's preferred view for a template and panel."""
    conn = get_db_connection(database='wl4')
    if conn is None:
        logger.error("Failed to connect to wl4 database")
        return None

    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT view_type
            FROM template_view_preferences
            WHERE user_id = %s AND template_id = %s AND panel_id = %s
        """, (username, template_id, panel_id))
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        logger.debug(f"Fetched view preference for user {username}, template {template_id}, panel {panel_id}: {result[0] if result else None}")
        return result[0] if result else None
    except Error as e:
        logger.error(f"Error fetching view preference: {e}")
        if conn:
            conn.close()
        return None

def set_user_view_preference(username, template_id, view_type, panel_id='div1'):
    """Set the user's preferred view for a template and panel."""
    conn = get_db_connection(database='wl4')
    if conn is None:
        logger.error("Failed to connect to wl4 database")
        return False

    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO template_view_preferences (user_id, template_id, panel_id, view_type)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE view_type = %s
        """, (username, template_id, panel_id, view_type, view_type))
        conn.commit()
        cursor.close()
        conn.close()
        logger.debug(f"Set view preference for user {username}, template {template_id}, panel {panel_id}: {view_type}")
        return True
    except Error as e:
        logger.error(f"Error setting view preference: {e}")
        if conn:
            conn.close()
        return False
