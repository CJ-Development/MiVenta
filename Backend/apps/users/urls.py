from django.urls import path

from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    MeView,
    UserListView,
    UsuarioDetalleView,
    CambiarPasswordView,
    DireccionView,
    DireccionDetalleView,
    CsrfTokenView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="user-me"),
    path("csrf/", CsrfTokenView.as_view(), name="csrf"),

    path("", UserListView.as_view(), name="users"),
    path("<int:id>/", UsuarioDetalleView.as_view(), name="user-detail"),
    path(
        "<int:id>/cambiar-password/",
        CambiarPasswordView.as_view(),
        name="user-change-password"
    ),

    path(
        "direcciones/",
        DireccionView.as_view(),
        name="user-direcciones"
    ),
    path(
        "direcciones/<int:id>/",
        DireccionDetalleView.as_view(),
        name="user-direccion-detalle"
    ),
]

app_name = "users"