"""
Punto de entrada para Vercel — DENTRO de Backend/.

El proyecto en Vercel tiene Root Directory = "Backend".
Vercel entonces:
  1. Busca /api/*.py y los despliega como serverless functions.
  2. Aplica las reglas de /routes desde vercel.json.

Este archivo es ese handler: carga Django desde la raíz del proyecto
(que aquí es la propia carpeta Backend/) y expone la WSGI app como
`app`, que es lo que Vercel invoca en cada request.
"""

import os
import sys

# ============================================================
# PYTHON PATH
# ============================================================
# Como vercel.json vive dentro de Backend/ y Vercel hace deploy
# desde Backend/, la raíz del proyecto Django = la carpeta
# donde está este archivo.
# ============================================================

_PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

# En este layout Backend es la raíz, así que _PROJECT_ROOT
# ya es la carpeta correcta. Lo añadimos por seguridad.

if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)


# ============================================================
# DJANGO
# ============================================================

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "confiig.settings",
)


# ============================================================
# HANDLER PARA VERCEL
# ============================================================
# Vercel espera que el módulo exponga una variable `app` callable
# WSGI/ASGI. Django devuelve ya una WSGI app lista.
# ============================================================

from django.core.wsgi import get_wsgi_application  # noqa: E402

app = get_wsgi_application()  # noqa: E402
