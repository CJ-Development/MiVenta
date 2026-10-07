import os

# ==============================================================
# VARIABLES DE ENTORNO REQUERIDAS (FASE 4 - API CLIENT)
# ==============================================================

TIENDANUBE_ACCESS_TOKEN = os.environ.get("TIENDANUBE_ACCESS_TOKEN", "")
TIENDANUBE_STORE_ID = os.environ.get("TIENDANUBE_STORE_ID", "")
TIENDANUBE_APP_NAME = os.environ.get("TIENDANUBE_APP_NAME", "MiVentaIntegration")
TIENDANUBE_CONTACT_EMAIL = os.environ.get("TIENDANUBE_CONTACT_EMAIL", "")

# ==============================================================
# VARIABLES DE ENTORNO FUTURAS
# ==============================================================

# Reservada EXCLUSIVAMENTE para validacion de Webhooks (HMAC) en el futuro
TIENDANUBE_CLIENT_SECRET = os.environ.get("TIENDANUBE_CLIENT_SECRET", "")

# ==============================================================
# CONSTANTES
# ==============================================================

TIENDANUBE_API_BASE_URL = "https://api.tiendanube.com/v1"
TIENDANUBE_USER_AGENT = f"{TIENDANUBE_APP_NAME} ({TIENDANUBE_CONTACT_EMAIL})"

def check_configuration():
    return bool(TIENDANUBE_ACCESS_TOKEN and TIENDANUBE_STORE_ID and TIENDANUBE_CONTACT_EMAIL)
