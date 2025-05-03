import mysql.connector
from mysql.connector import Error
from config.db_config import load_db_config

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
        print(f"Error connecting to MySQL: {e}")
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
            info VARCHAR(255)
        )
        """
        cursor.execute(create_table_query)
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Error as e:
        print(f"Error creating wl4 database/table: {e}")
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
        print(f"Error syncing user to wl4: {e}")
        if conn_ltc:
            conn_ltc.close()
        if 'conn_wl4' in locals():
            conn_wl4.close()
        return False
