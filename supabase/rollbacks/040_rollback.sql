-- Greatlife — Rollback de la migration 040
-- Restaure le WITH CHECK de 039 sans guillemets sur date/time.

DROP POLICY IF EXISTS "reservations_public_insert" ON public.reservations;

CREATE POLICY "reservations_public_insert" ON public.reservations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND char_length(trim(nom)) BETWEEN 1 AND 200
    AND char_length(email) BETWEEN 3 AND 320
    AND char_length(coalesce(phone, '')) <= 40
    AND char_length(coalesce(date, '')) BETWEEN 1 AND 40
    AND char_length(coalesce(time, '')) BETWEEN 1 AND 40
    AND guests BETWEEN 1 AND 50
    AND char_length(coalesce(message, '')) <= 2000
  );
