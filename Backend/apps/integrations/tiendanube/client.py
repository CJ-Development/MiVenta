import logging
import requests
from requests.exceptions import Timeout, RequestException
from . import config

logger = logging.getLogger(__name__)

class TiendanubeAPIError(Exception):
    """Excepcion base para errores de la API de Tiendanube."""
    pass

class TiendanubeAuthError(TiendanubeAPIError):
    """HTTP 401 - Token invalido o falta de permisos."""
    pass

class TiendanubeRateLimitError(TiendanubeAPIError):
    """HTTP 429 - Rate limit excedido. Contiene los headers para posibles reintentos."""
    def __init__(self, message, retry_after=None, limit_reset=None):
        super().__init__(message)
        self.retry_after = retry_after
        self.limit_reset = limit_reset

class TiendanubeNotFoundError(TiendanubeAPIError):
    """HTTP 404 - Recurso no encontrado."""
    pass

class TiendanubeServerError(TiendanubeAPIError):
    """HTTP 5xx - Error en los servidores de Tiendanube."""
    pass


class TiendanubeAPIClient:
    """Cliente aislado para interactuar con la API de Tiendanube."""

    def __init__(self):
        if not config.check_configuration():
            logger.warning("Credenciales de Tiendanube no configuradas correctamente en .env")
        
        self.access_token = config.TIENDANUBE_ACCESS_TOKEN
        # La URL base oficial incluye el store_id en el path: https://api.tiendanube.com/v1/{store_id}
        self.base_url = f"{config.TIENDANUBE_API_BASE_URL}/{config.TIENDANUBE_STORE_ID}"
        self.user_agent = config.TIENDANUBE_USER_AGENT
        
        self.headers = {
            "Authentication": f"bearer {self.access_token}",
            "User-Agent": self.user_agent,
            "Content-Type": "application/json"
        }
        self.timeout = 15  # Segundos

    def _request(self, method, endpoint, params=None, data=None):
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=self.headers,
                params=params,
                json=data,
                timeout=self.timeout
            )
            
            status = response.status_code
            
            if status == 200 or status == 201:
                return response.json()
                
            elif status == 401 or status == 403:
                # No exponemos el token en el log, solo un mensaje de error
                logger.error("Error de Autenticacion 401/403 en Tiendanube (revisar token o scopes).")
                raise TiendanubeAuthError("Access token is invalid or missing permissions.")
                
            elif status == 404:
                return None  # Devolvemos None manejable por quien llama
                
            elif status == 429:
                # Extraer informacion de reintento si existe en los headers
                retry_after = response.headers.get("Retry-After")
                limit_reset = response.headers.get("X-Rate-Limit-Reset")
                logger.error("Rate limit excedido (HTTP 429).")
                raise TiendanubeRateLimitError(
                    "Tiendanube rate limit exceeded.", 
                    retry_after=retry_after, 
                    limit_reset=limit_reset
                )
                
            elif status >= 500:
                logger.error(f"Error interno del servidor de Tiendanube (HTTP {status}).")
                raise TiendanubeServerError(f"Tiendanube Remote Server Error: {status}")
                
            else:
                response.raise_for_status()
            
        except Timeout:
            logger.error("Timeout al comunicarse con la API de Tiendanube.")
            raise TiendanubeAPIError("Timeout communicating with Tiendanube API")
        except requests.exceptions.JSONDecodeError:
            logger.error("Respuesta invalida de Tiendanube (No es JSON).")
            raise TiendanubeAPIError("Invalid JSON response from Tiendanube")
        except RequestException as e:
            logger.error(f"Error HTTP desconocido: {type(e).__name__}")
            raise TiendanubeAPIError(f"HTTP Request failed.")

    def get_product(self, product_id):
        """
        Consulta un producto especifico por su ID de Tiendanube.
        GET /products/{product_id}
        """
        logger.info(f"Consultando producto {product_id} en Tiendanube...")
        return self._request("GET", f"products/{product_id}")
