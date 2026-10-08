-- Migration additive B.E.S.T. Terrain + Ferme Denis St-Pierre.
-- À exécuter UNE FOIS dans Supabase SQL Editor avant de déployer la nouvelle application.
-- Aucune suppression des données historiques.
BEGIN;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS employeur text;
UPDATE public.jobs SET employeur = 'best' WHERE employeur IS NULL;
ALTER TABLE public.jobs ALTER COLUMN employeur SET DEFAULT 'best';
ALTER TABLE public.jobs ALTER COLUMN employeur SET NOT NULL;
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_employeur_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_employeur_check CHECK (employeur IN ('best','ferme'));
ALTER TABLE public.punchs ADD COLUMN IF NOT EXISTS employeur text;
UPDATE public.punchs p SET employeur = COALESCE((SELECT j.employeur FROM public.jobs j WHERE j.id=p.job_id),'best') WHERE p.employeur IS NULL;
ALTER TABLE public.punchs ALTER COLUMN employeur SET DEFAULT 'best';
ALTER TABLE public.punchs ALTER COLUMN employeur SET NOT NULL;
ALTER TABLE public.punchs DROP CONSTRAINT IF EXISTS punchs_employeur_check;
ALTER TABLE public.punchs ADD CONSTRAINT punchs_employeur_check CHECK (employeur IN ('best','ferme'));
ALTER TABLE public.photos_jobs ADD COLUMN IF NOT EXISTS note text;
CREATE INDEX IF NOT EXISTS punchs_employeur_employe_date_idx ON public.punchs(employeur, employe_id, horodatage DESC);
CREATE INDEX IF NOT EXISTS jobs_employeur_idx ON public.jobs(employeur);
-- Bloque les punchs associés à un chantier de l'autre employeur.
CREATE OR REPLACE FUNCTION public.verifier_employeur_punch() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE employeur_job text;
BEGIN
 IF NEW.job_id IS NOT NULL THEN
  SELECT employeur INTO employeur_job FROM public.jobs WHERE id=NEW.job_id;
  IF employeur_job IS NULL OR employeur_job <> NEW.employeur THEN
   RAISE EXCEPTION 'Le chantier et le punch doivent appartenir au même employeur';
  END IF;
 END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS verifier_employeur_punch_trigger ON public.punchs;
CREATE TRIGGER verifier_employeur_punch_trigger BEFORE INSERT OR UPDATE OF job_id, employeur ON public.punchs FOR EACH ROW EXECUTE FUNCTION public.verifier_employeur_punch();
COMMIT;
