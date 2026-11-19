"""
Django settings for backend_django project (Yadotena Milk & Foods).

All deployment-specific values come from environment variables (see
``.env.example``). A ``.env`` file next to ``manage.py`` is loaded for local
development; real environment variables always win.
"""

import os
import sys
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))


def _load_dotenv(path: Path) -> None:
    if not path.is_file():
        return
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv(BASE_DIR / '.env')


def env(key: str, default: str = '') -> str:
    return os.environ.get(key, default)


def env_bool(key: str, default: bool = False) -> bool:
    value = os.environ.get(key)
    if value is None:
        return default
    return value.strip().lower() in ('1', 'true', 'yes', 'on')


def env_list(key: str, default: str = '') -> list:
    return [item.strip() for item in env(key, default).split(',') if item.strip()]


# --- Core / security -------------------------------------------------------

DEBUG = env_bool('DJANGO_DEBUG', False)

SECRET_KEY = env('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = 'dev-only-insecure-secret-key-do-not-use-in-production'
    else:
        raise ImproperlyConfigured('DJANGO_SECRET_KEY must be set when DJANGO_DEBUG is false.')

ALLOWED_HOSTS = env_list('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1')

# Behind a TLS-terminating proxy (nginx, Render, etc.)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = env_bool('DJANGO_SECURE_SSL_REDIRECT', False)
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'same-origin'
# HSTS: off by default; set DJANGO_HSTS_SECONDS (e.g. 31536000) once the API
# is confirmed to be HTTPS-only — browsers cache it, so it is hard to undo.
SECURE_HSTS_SECONDS = int(env('DJANGO_HSTS_SECONDS', '0'))
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool('DJANGO_HSTS_INCLUDE_SUBDOMAINS', False)
SECURE_HSTS_PRELOAD = False
X_FRAME_OPTIONS = 'DENY'

# --- Applications ----------------------------------------------------------

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party packages
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'django_filters',

    # Internal Apps
    'apps.authentication.apps.AuthenticationConfig',
    'apps.menu.apps.MenuConfig',
    'apps.tables.apps.TablesConfig',
    'apps.orders.apps.OrdersConfig',
    'apps.service_requests.apps.ServiceRequestsConfig',
    'apps.payments.apps.PaymentsConfig',
    'apps.expenses.apps.ExpensesConfig',
    'apps.customers.apps.CustomersConfig',
    'apps.reviews.apps.ReviewsConfig',
    'apps.core.apps.CoreConfig',
    'apps.products.apps.ProductsConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend_django.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend_django.wsgi.application'

# --- Database --------------------------------------------------------------

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': env('SQLITE_PATH', str(BASE_DIR / 'db.sqlite3')),
        'OPTIONS': {
            'timeout': 20,
            # WAL lets the POS read while another request writes; IMMEDIATE
            # takes the write lock up front so concurrent order writes queue
            # instead of failing with "database is locked" mid-transaction.
            'init_command': 'PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;',
            'transaction_mode': 'IMMEDIATE',
        },
    }
}

# --- Auth ------------------------------------------------------------------

AUTH_USER_MODEL = 'authentication.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

if 'test' in sys.argv:
    # Fast hashing for the test suite only.
    PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']

# Lifetime of staff API tokens issued at login.
API_TOKEN_TTL_HOURS = int(env('API_TOKEN_TTL_HOURS', '12'))

REST_FRAMEWORK = {
    # Secure by default: every endpoint needs staff unless it opts out.
    'DEFAULT_PERMISSION_CLASSES': [
        'apps.core.permissions.IsStaff',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'apps.authentication.tokens.ExpiringTokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'EXCEPTION_HANDLER': 'apps.core.exceptions.exception_handler',
    # Money as JSON numbers (the frontend does arithmetic on them, as with the Go API).
    'COERCE_DECIMAL_TO_STRING': False,
    # Scoped throttles only: many customers share one restaurant Wi-Fi IP,
    # so a blanket per-IP anonymous throttle would block real diners.
    'DEFAULT_THROTTLE_RATES': {
        'login': env('THROTTLE_LOGIN', '10/min'),
        'public_orders': env('THROTTLE_PUBLIC_ORDERS', '60/min'),
        'public_writes': env('THROTTLE_PUBLIC_WRITES', '60/min'),
        'ably_token': env('THROTTLE_ABLY_TOKEN', '60/min'),
    },
}

if not DEBUG:
    REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = ['rest_framework.renderers.JSONRenderer']

# --- CORS / CSRF -----------------------------------------------------------

# The browser authenticates with an Authorization header, not cookies.
CORS_ALLOWED_ORIGINS = env_list('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000')
CORS_ALLOW_CREDENTIALS = False
# The POS sends Idempotency-Key on order creation (retry-safe submits); without
# it in the allow-list the browser drops the preflighted POST cross-origin.
from corsheaders.defaults import default_headers  # noqa: E402
CORS_ALLOW_HEADERS = (*default_headers, 'idempotency-key')
CSRF_TRUSTED_ORIGINS = env_list('CSRF_TRUSTED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000')

# --- I18N ------------------------------------------------------------------

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Addis_Ababa'
USE_I18N = True
USE_TZ = True

# --- Static & media --------------------------------------------------------

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = 'media/'
MEDIA_ROOT = Path(env('MEDIA_ROOT', str(BASE_DIR / 'media')))

# Serve uploaded menu images from Django itself. Leave on unless a web server
# (nginx, etc.) serves MEDIA_ROOT directly.
SERVE_MEDIA = env_bool('SERVE_MEDIA', True)

DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --- Integrations ----------------------------------------------------------

ABLY_API_KEY = env('ABLY_API_KEY')

# --- Logging ---------------------------------------------------------------

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'simple': {'format': '%(asctime)s %(levelname)s %(name)s: %(message)s'},
    },
    'handlers': {
        'console': {'class': 'logging.StreamHandler', 'formatter': 'simple'},
    },
    'root': {'handlers': ['console'], 'level': env('LOG_LEVEL', 'INFO')},
    'loggers': {
        'django.request': {'handlers': ['console'], 'level': 'WARNING', 'propagate': False},
    },
}
