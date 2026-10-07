import os
import django
import time
from django.conf import settings
from django.db import connection, reset_queries

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'confiig.settings')
django.setup()

from apps.products.services import ProductoService
from apps.products.serializers import ProductoSerializer

# Habilitar logging de queries
settings.DEBUG = True

def test_products_performance():
    print("=== TEST DE RENDIMIENTO GET /api/products/ ===")
    print()
    
    # Limpiar queries anteriores
    reset_queries()
    
    # Medir tiempo
    start_time = time.time()
    
    # Ejecutar la misma lógica que la vista
    productos = ProductoService.listar()
    serializer = ProductoSerializer(productos, many=True)
    data = serializer.data
    
    end_time = time.time()
    
    # Obtener información de queries
    num_queries = len(connection.queries)
    total_time = end_time - start_time
    
    print(f"Productos obtenidos: {len(productos)}")
    print(f"Tiempo total: {total_time:.3f} segundos")
    print(f"SQL queries: {num_queries}")
    print()
    
    # Mostrar las queries más lentas
    if num_queries > 0:
        print("=== QUERIES MÁS LENTAS ===")
        sorted_queries = sorted(connection.queries, key=lambda x: float(x.get('time', 0)), reverse=True)
        for i, query in enumerate(sorted_queries[:10], 1):
            time_val = query.get('time', '0')
            try:
                time_float = float(time_val)
                print(f"{i}. {time_float:.4f}s - {query['sql'][:100]}...")
            except (ValueError, TypeError):
                print(f"{i}. {time_val}s - {query['sql'][:100]}...")
        print()
    
    # Verificar estructura del JSON
    print("=== VERIFICACIÓN DE ESTRUCTURA JSON ===")
    if data:
        first_product = data[0]
        print(f"Campos del primer producto: {list(first_product.keys())}")
        print(f"Tiene variantes: {'variantes' in first_product}")
        print(f"Tiene categorías: {'categorias' in first_product}")
        print(f"Tiene stock_general: {'stock_general' in first_product}")
        print(f"Tiene imagenes_generales: {'imagenes_generales' in first_product}")
        
        if 'variantes' in first_product and first_product['variantes']:
            first_variant = first_product['variantes'][0]
            print(f"Campos de primera variante: {list(first_variant.keys())}")
            print(f"Tiene imágenes: {'imagenes' in first_variant}")
        
        if 'categorias' in first_product and first_product['categorias']:
            first_category = first_product['categorias'][0]
            print(f"Campos de primera categoría: {list(first_category.keys())}")
            print(f"Tiene subcategorias: {'subcategorias' in first_category}")
    
    print()
    print("=== RESULTADO ===")
    if num_queries < 20:
        print("✅ OPTIMIZACIÓN EXITOSA - Queries reducidas significativamente")
    elif num_queries < 50:
        print("⚠️ OPTIMIZACIÓN PARCIAL - Mejora notable pero aún pueden optimizarse más")
    else:
        print("❌ OPTIMIZACIÓN INSUFICIENTE - Aún existen demasiadas queries")

if __name__ == "__main__":
    test_products_performance()