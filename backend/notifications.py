import json
import logging
import os
import threading
import urllib.request

logger = logging.getLogger(__name__)


def _post(url: str, payload: dict) -> None:
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception as exc:  # Slack nunca debe romper la API
        logger.warning("No se pudo notificar a Slack: %s", exc)


def notify_product_created(name: str, price: float, stock: int) -> None:
    """Envía un aviso al canal de Slack si SLACK_WEBHOOK_URL está configurada."""
    url = os.getenv("SLACK_WEBHOOK_URL")
    if not url:
        return
    text = f":package: ¡Nuevo producto registrado! *{name}* — ${price:,.2f} (stock: {stock})"
    threading.Thread(target=_post, args=(url, {"text": text}), daemon=True).start()
