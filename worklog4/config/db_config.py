def load_db_config():
    config = {}
    try:
        with open('login.txt', 'r') as f:
            for line in f:
                if '=' in line:
                    key, value = line.strip().split('=', 1)
                    config[key] = value
        # Validate required MySQL keys
        required = ['host', 'port', 'user', 'password']
        for key in required:
            if key not in config:
                raise ValueError(f"Missing {key} in login.txt")
        # Validate secret_key
        if 'secret_key' not in config:
            raise ValueError("Missing secret_key in login.txt")
        # Convert port to int
        config['port'] = int(config['port'])
        return config
    except FileNotFoundError:
        print("Error: login.txt not found")
        return None
    except ValueError as e:
        print(f"Error in login.txt: {e}")
        return None
