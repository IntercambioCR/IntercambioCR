# Funciones de créditos e intercambios

Estas funciones son la fuente de verdad para cualquier movimiento de créditos.
El frontend debe llamarlas mediante server actions, no actualizar saldos directamente.

## Flujos autenticados

### `create_purchase_request(p_listing_id uuid)`

- Bloquea la fila de la publicación.
- Valida que la publicación esté disponible.
- Evita que una persona solicite su propia publicación.
- Mueve créditos de `available` a `held`.
- Crea una solicitud en estado `requested`.
- Crea un chat privado.
- Registra un movimiento `purchase_hold`.

### `seller_accept_purchase(p_purchase_id uuid)`

- Valida que quien llama sea la persona oferente.
- Mueve la solicitud a `seller_accepted`.
- Mueve la publicación a `in_process`.

### `confirm_purchase(p_purchase_id uuid)`

- Valida que quien llama participe en la solicitud.
- Guarda la confirmación de esa persona.
- Cuando ambas partes confirman:
  - Retira los créditos retenidos.
  - Agrega créditos disponibles a la persona oferente.
  - Marca la solicitud y la publicación como completadas.
  - Registra movimientos de ledger para ambas partes.

### `cancel_purchase(p_purchase_id uuid, p_note text)`

- Permite cancelar antes de completar.
- Devuelve los créditos retenidos.
- Hace que la publicación vuelva a estar disponible.
- Registra un movimiento `purchase_refund`.

### `dispute_purchase(p_purchase_id uuid, p_reason text)`

- Permite abrir una disputa.
- Marca la solicitud como disputada.
- Crea un reporte para revisión administrativa.

## Flujos solo para administración

### `admin_make_intake_offer(p_intake_id uuid, p_offered_credits integer, p_notes text)`

- Requiere rol `admin` o `moderator`.
- Guarda la oferta de créditos por un artículo entregado a Intercambio CR.

### `admin_issue_intake_credits(p_intake_id uuid)`

- Requiere rol `admin` o `moderator`.
- Requiere una oferta válida en créditos.
- Agrega créditos disponibles al usuario.
- Marca la entrega como `paid`.
- Registra un movimiento `platform_issue`.

## Regla importante de seguridad

`record_credit_movement` es interna y su ejecución directa está revocada para
clientes anónimos y autenticados. Las filas del ledger solo deben crearse como
parte de una transacción que también cambia saldos.
