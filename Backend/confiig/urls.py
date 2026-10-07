from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include

urlpatterns = [
    path("api/users/", include("apps.users.urls")),
    path("api/categories/", include("apps.categories.urls")),
    path("api/products/", include("apps.products.urls")),
    path("api/offers/", include("apps.offers.urls")),
    path("api/favorites/", include("apps.favorites.urls")),
    path("api/orders/", include("apps.orders.urls")),
    path("api/cart/", include("apps.cart.urls")),
    path("api/reviews/", include("apps.reviews.urls")),
    path("api/payments/", include("apps.payments.urls")),
]

if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )

