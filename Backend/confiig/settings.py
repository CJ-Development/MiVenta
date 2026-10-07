import os

from pathlib import Path


# ============================================================
# BASE
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent


# ============================================================
# CARGA MANUAL DE VARIABLES .env
# ============================================================

# Local:
#   BaulMagicoShop/.env
#   Backend/.env
#
# Vercel:
#   Las variables llegan directamente por os.environ.
#
# IMPORTANTE:
# - No sobrescribimos variables que ya existan.
# - Quitamos comillas externas de valores provenientes de .env.

_ENV_FILES = [
    PROJECT_ROOT / ".env",
    BASE_DIR / ".env",
]

for _env_path in _ENV_FILES:
    if not _env_path.exists():
        continue

    for _line in _env_path.read_text(
        encoding="utf-8"
    ).splitlines():

        _line = _line.strip()

        if (
            not _line
            or _line.startswith("#")
            or "=" not in _line
        ):
            continue

        _key, _value = _line.split("=", 1)

        _key = _key.strip()
        _value = _value.strip()

        # El .env descargado por Vercel puede contener:
        #
        # POSTGRES_HOST="host.example.com"
        #
        # Django necesita:
        #
        # host.example.com

        if (
            len(_value) >= 2
            and _value[0] == _value[-1]
            and _value[0] in ('"', "'")
        ):
            _value = _value[1:-1]

        os.environ.setdefault(_key, _value)


# ============================================================
# SEGURIDAD
# ============================================================

SECRET_KEY = os.environ.get(
    "SECRET_KEY",
    "django-insecure-development-key-change-me",
)

DEBUG = os.environ.get(
    "DEBUG",
    "False",
).lower() in (
    "1",
    "true",
    "yes",
)


# ============================================================
# HOSTS
# ============================================================

ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    ".vercel.app",
]

_env_hosts = os.environ.get("ALLOWED_HOSTS")
if _env_hosts:
    for host in _env_hosts.split(","):
        host = host.strip()
        if host and host not in ALLOWED_HOSTS:
            ALLOWED_HOSTS.append(host)

# Dominio actual de Vercel
# (inyectado por la plataforma, sin protocolo)
VERCEL_URL = os.environ.get("VERCEL_URL")

if VERCEL_URL:
    _vercel_host = VERCEL_URL.strip()

    if _vercel_host and _vercel_host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(_vercel_host)


# ============================================================
# APLICACIONES
# ============================================================

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",

    # Aplicaciones BaulMagicoShop
    "apps.users",
    "apps.categories",
    "apps.products",
    "apps.cart",
    "apps.offers",
    "apps.orders",
    "apps.payments",
    "apps.favorites",
    "apps.notifications",
    "apps.reviews",
]


# ============================================================
# MIDDLEWARE
# ============================================================

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# ============================================================
# URLS / WSGI
# ============================================================

ROOT_URLCONF = "confiig.urls"
WSGI_APPLICATION = "confiig.wsgi.application"


# ============================================================
# TEMPLATES
# ============================================================

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# ============================================================
# DATABASE
# ============================================================

# Si se proporciona DATABASE_URL (Supabase PostgreSQL), usar dj_database_url
import dj_database_url

DATABASE_URL = (
    os.environ.get("DATABASE_URL")
    or os.environ.get("POSTGRES_URL")
    or os.environ.get("SUPABASE_DB_URL")
)

if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
            ssl_require=True,
        )
    }
    if "postgresql" in DATABASES["default"].get("ENGINE", "") or "postgres" in DATABASE_URL:
        DATABASES["default"]["ENGINE"] = "django.db.backends.postgresql"
else:
    # Conector para usar MySQL en Python en desarrollo local (XAMPP)
    try:
        import pymysql
        pymysql.install_as_MySQLdb()
    except ImportError:
        pass

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": os.environ.get("DB_NAME", "miventa_db"),
            "USER": os.environ.get("DB_USER", "root"),
            "PASSWORD": os.environ.get("DB_PASSWORD", ""),
            "HOST": os.environ.get("DB_HOST", "127.0.0.1"),
            "PORT": os.environ.get("DB_PORT", "3306"),
        }
    }


# ============================================================
# USUARIO PERSONALIZADO
# ============================================================

AUTH_USER_MODEL = "users.Usuario"


# ============================================================
# VALIDADORES DE CONTRASEÑA
# ============================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "UserAttributeSimilarityValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "MinimumLengthValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "CommonPasswordValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "NumericPasswordValidator"
        ),
    },
]


# ============================================================
# IDIOMA / ZONA HORARIA
# ============================================================

LANGUAGE_CODE = "es-co"
TIME_ZONE = "America/Bogota"

USE_I18N = True
USE_TZ = True


# ============================================================
# ARCHIVOS ESTÁTICOS
# ============================================================

STATIC_URL = "/static/"


# ============================================================
# MEDIA
# ============================================================

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"


# ============================================================
# CORS
# ============================================================

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5178",
    "http://127.0.0.1:5178",
]

FRONTEND_URL = os.environ.get("FRONTEND_URL")

if FRONTEND_URL:
    FRONTEND_URL = FRONTEND_URL.rstrip("/")
    if FRONTEND_URL not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS.append(FRONTEND_URL)

_cors_env = os.environ.get("CORS_ALLOWED_ORIGINS")
if _cors_env:
    for origin in _cors_env.split(","):
        origin = origin.strip().rstrip("/")
        if origin and origin not in CORS_ALLOWED_ORIGINS:
            CORS_ALLOWED_ORIGINS.append(origin)

CORS_ALLOW_CREDENTIALS = True


# ============================================================
# CSRF
# ============================================================

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5178",
    "http://127.0.0.1:5178",
    "https://*.vercel.app",
]

if FRONTEND_URL:
    if FRONTEND_URL not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(FRONTEND_URL)

_csrf_env = os.environ.get("CSRF_TRUSTED_ORIGINS")
if _csrf_env:
    for origin in _csrf_env.split(","):
        origin = origin.strip().rstrip("/")
        if origin and origin not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append(origin)


# ============================================================
# COOKIES
# ============================================================

# Política unificada entre dev y prod.
#
# En dev usamos HTTP (localhost) → Secure=False.
# En prod (Vercel) usamos HTTPS → Secure=True.
#
# CSRF_COOKIE_HTTPONLY=False permite que el frontend
# pueda leer la cookie csrftoken desde JavaScript.


if DEBUG:
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = False

    CSRF_COOKIE_SAMESITE = "Lax"
    CSRF_COOKIE_SECURE = False
    CSRF_COOKIE_HTTPONLY = False

else:
    SESSION_COOKIE_SAMESITE = "None"
    SESSION_COOKIE_SECURE = True

    CSRF_COOKIE_SAMESITE = "None"
    CSRF_COOKIE_SECURE = True
    CSRF_COOKIE_HTTPONLY = False


# ============================================================
# SESSION ENGINE
# ============================================================

# En Vercel serverless, las sesiones en memoria no funcionan
# porque cada request puede ejecutarse en una instancia distinta.
#
# Usamos sesiones basadas en cookies firmadas.

SESSION_ENGINE = (
    "django.contrib.sessions.backends.signed_cookies"
)

SESSION_COOKIE_HTTPONLY = True


# ============================================================
# DJANGO REST FRAMEWORK
# ============================================================

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],

    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],

    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
}


# ============================================================
# SEGURIDAD PARA PRODUCCIÓN
# ============================================================

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = (
        "HTTP_X_FORWARDED_PROTO",
        "https",
    )

    SECURE_SSL_REDIRECT = False
    X_FRAME_OPTIONS = "DENY"


# ============================================================
# DEFAULT PRIMARY KEY
# ============================================================

DEFAULT_AUTO_FIELD = (
    "django.db.models.BigAutoField"
)


# ============================================================
# ALMACENAMIENTO DE ARCHIVOS (MEDIA)
# ============================================================

BLOB_READ_WRITE_TOKEN = os.environ.get("BLOB_READ_WRITE_TOKEN")


# ============================================================
# WHATSAPP
# ============================================================

# Número de WhatsApp del administrador/vendedor.
# Formato: código de país + número, sin +, espacios ni guiones.

WHATSAPP_NUMBER = os.environ.get(
    "WHATSAPP_NUMBER",
    "573181174546",
)