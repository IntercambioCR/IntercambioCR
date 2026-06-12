# Checklist de seguridad de créditos

Este checklist valida que el saldo no dependa del frontend y que Supabase bloquee operaciones inválidas.

## Preparación

1. Aplicar `supabase/credit-hardening.sql` en Supabase SQL Editor.
2. Crear dos cuentas normales.
3. Asignar rol `admin` solo a la cuenta administradora.
4. Emitir créditos de prueba a una cuenta normal desde `/admin`.

## Casos obligatorios

1. Usuario intenta gastar más créditos de los que tiene.
   - Crear una publicación con valor mayor al saldo del usuario comprador.
   - Intentar solicitarla o aceptar una oferta con créditos mayor al saldo.
   - Resultado esperado: operación bloqueada con mensaje de créditos insuficientes.

2. Usuario intenta enviar créditos negativos.
   - Modificar el formulario desde DevTools o enviar una solicitud manual con `credits = -100`.
   - Resultado esperado: Supabase rechaza por constraints o por RPC.

3. Usuario intenta enviar 0 créditos.
   - Enviar oferta de tipo créditos o mixta con `credits = 0`.
   - Resultado esperado: Supabase rechaza por constraint o por RPC.

4. Usuario intenta modificar saldo desde DevTools o API.
   - Intentar actualizar `credit_accounts.available` desde cliente.
   - Resultado esperado: RLS bloquea la actualización. Usuarios solo pueden leer su propia cuenta.

5. Usuario normal intenta emitir créditos.
   - Llamar `admin_adjust_credits` o `admin_issue_intake_credits` desde una cuenta sin rol `admin`.
   - Resultado esperado: `admin_required`.

6. Admin emite créditos correctamente.
   - Crear solicitud de entrega.
   - Guardar oferta administrativa.
   - Emitir créditos.
   - Resultado esperado: saldo aumenta y se crea fila en `credit_transactions` con saldo anterior y nuevo.

7. Dos operaciones simultáneas no generan saldo incorrecto.
   - Intentar aceptar dos ofertas con créditos desde la misma cuenta y saldo insuficiente para ambas.
   - Resultado esperado: una puede pasar si hay saldo, la otra falla por `insufficient_credits`.

8. Intercambio cancelado revierte créditos si aplica.
   - Crear una compra u oferta con créditos retenidos.
   - Cancelar antes de completar.
   - Resultado esperado: créditos retenidos vuelven a disponibles y se registra `devolucion`.

9. Historial muestra saldo anterior y nuevo.
   - Abrir `/billetera`.
   - Resultado esperado: cada transacción nueva muestra `saldo anterior → saldo nuevo`.

## Consultas útiles

```sql
select *
from credit_accounts
where available < 0 or held < 0 or pending < 0 or frozen < 0;
```

Debe devolver 0 filas.

```sql
select user_id, type, amount, previous_balance, new_balance, description, created_at
from credit_transactions
order by created_at desc;
```

Debe mostrar auditoría con `previous_balance + amount = new_balance`.
