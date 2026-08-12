-- NOTIFY trigger: emit pg_notify on every INSERT/UPDATE/DELETE so the
-- realtime listener can broadcast changes to SSE clients.

CREATE OR REPLACE FUNCTION notify_db_change() RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
  row_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    row_id := OLD.id;
  ELSE
    row_id := NEW.id;
  END IF;

  payload := json_build_object(
    'table', TG_TABLE_NAME,
    'op', TG_OP,
    'ts', (extract(epoch from now()) * 1000)::bigint,
    'rowId', row_id
  );

  PERFORM pg_notify('db_changes', payload::text);
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to every domain table.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'movie', 'plan', 'subscription', 'series',
      'tv_channel', 'tv_playlist', 'anime',
      'favorite', 'history', '"user"'
    ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_notify_db_change ON %s;
       CREATE TRIGGER trg_notify_db_change
         AFTER INSERT OR UPDATE OR DELETE ON %s
         FOR EACH ROW EXECUTE FUNCTION notify_db_change();',
      t, t
    );
  END LOOP;
END
$$;