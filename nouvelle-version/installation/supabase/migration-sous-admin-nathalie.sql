-- B.E.S.T. Terrain Punch — migration à réviser avant exécution en production.
-- Aucune suppression de punchs, jobs ou employés. Ne pas relancer schema.sql après ceci.
BEGIN;
ALTER TABLE public.employes ADD COLUMN IF NOT EXISTS employeur text NOT NULL DEFAULT 'best';
ALTER TABLE public.employes DROP CONSTRAINT IF EXISTS employes_employeur_check;
ALTER TABLE public.employes ADD CONSTRAINT employes_employeur_check CHECK (employeur IN ('best','ferme'));
ALTER TABLE public.employes DROP CONSTRAINT IF EXISTS employes_role_check;
ALTER TABLE public.employes ADD CONSTRAINT employes_role_check CHECK (role IN ('employe','admin','sous_admin'));
-- La fiche Nathalie doit être unique et déjà reliée à un compte Auth.
DO $$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.employes WHERE nom ILIKE 'nathalie%' AND role = 'admin' AND user_id IS NOT NULL;
 IF n <> 1 THEN RAISE EXCEPTION 'Compte Nathalie ambigu ou introuvable (% fiche(s)). Aucun changement effectué.', n; END IF;
 UPDATE public.employes SET role = 'sous_admin', employeur = 'best' WHERE nom ILIKE 'nathalie%' AND role = 'admin' AND user_id IS NOT NULL;
END $$;

CREATE OR REPLACE FUNCTION public.est_sous_admin_best() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.employes WHERE user_id = auth.uid() AND role = 'sous_admin' AND actif);
$$;
GRANT EXECUTE ON FUNCTION public.est_sous_admin_best() TO authenticated;

-- Empêcher l'élévation de privilèges et les transferts d'entreprise via l'API.
CREATE OR REPLACE FUNCTION public.proteger_employe_sous_admin() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF public.est_sous_admin_best() THEN
   IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Opération réservée à l’administrateur principal'; END IF;
   IF OLD.employeur IS DISTINCT FROM 'best' OR OLD.role IS DISTINCT FROM 'employe'
     OR NEW.employeur IS DISTINCT FROM OLD.employeur OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.actif IS DISTINCT FROM OLD.actif
   THEN RAISE EXCEPTION 'Le sous-administrateur peut modifier uniquement les coordonnées des employés B.E.S.T.'; END IF;
 END IF;
 RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
DROP TRIGGER IF EXISTS proteger_employe_sous_admin ON public.employes;
CREATE TRIGGER proteger_employe_sous_admin BEFORE INSERT OR UPDATE OR DELETE ON public.employes
FOR EACH ROW EXECUTE FUNCTION public.proteger_employe_sous_admin();

-- Remplacer les politiques permissives existantes par des politiques limitées.
DROP POLICY IF EXISTS employes_select ON public.employes;
CREATE POLICY employes_select ON public.employes FOR SELECT TO authenticated USING (
 user_id = auth.uid() OR public.est_admin() OR (public.est_sous_admin_best() AND employeur = 'best' AND role = 'employe')
);
DROP POLICY IF EXISTS employes_insert_admin ON public.employes;
CREATE POLICY employes_insert_admin ON public.employes FOR INSERT TO authenticated WITH CHECK (public.est_admin());
DROP POLICY IF EXISTS employes_update_admin ON public.employes;
CREATE POLICY employes_update_admin ON public.employes FOR UPDATE TO authenticated USING (
 public.est_admin() OR (public.est_sous_admin_best() AND employeur = 'best' AND role = 'employe')
) WITH CHECK (public.est_admin() OR (public.est_sous_admin_best() AND employeur = 'best' AND role = 'employe'));
DROP POLICY IF EXISTS employes_delete_admin ON public.employes;
CREATE POLICY employes_delete_admin ON public.employes FOR DELETE TO authenticated USING (public.est_admin());

DROP POLICY IF EXISTS jobs_select ON public.jobs;
CREATE POLICY jobs_select ON public.jobs FOR SELECT TO authenticated USING (
 NOT public.est_sous_admin_best() OR employeur = 'best'
);
DROP POLICY IF EXISTS jobs_insert_admin ON public.jobs;
CREATE POLICY jobs_insert_admin ON public.jobs FOR INSERT TO authenticated WITH CHECK (public.est_admin());
DROP POLICY IF EXISTS jobs_update_admin ON public.jobs;
CREATE POLICY jobs_update_admin ON public.jobs FOR UPDATE TO authenticated USING (public.est_admin()) WITH CHECK (public.est_admin());
DROP POLICY IF EXISTS jobs_delete_admin ON public.jobs;
CREATE POLICY jobs_delete_admin ON public.jobs FOR DELETE TO authenticated USING (public.est_admin());

DROP POLICY IF EXISTS punchs_select ON public.punchs;
CREATE POLICY punchs_select ON public.punchs FOR SELECT TO authenticated USING (
 public.est_admin() OR (public.est_sous_admin_best() AND employeur = 'best')
 OR employe_id IN (SELECT id FROM public.employes WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS punchs_insert ON public.punchs;
CREATE POLICY punchs_insert ON public.punchs FOR INSERT TO authenticated WITH CHECK (
 public.est_admin() OR (public.est_sous_admin_best() AND employeur = 'best'
   AND (job_id IS NULL OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.employeur = 'best')))
 OR (employe_id IN (SELECT id FROM public.employes WHERE user_id = auth.uid() AND actif)
     AND horodatage BETWEEN now() - interval '5 minutes' AND now() + interval '5 minutes')
);
DROP POLICY IF EXISTS punchs_update_admin ON public.punchs;
CREATE POLICY punchs_update_admin ON public.punchs FOR UPDATE TO authenticated USING (
 public.est_admin() OR (public.est_sous_admin_best() AND employeur = 'best')
) WITH CHECK (public.est_admin() OR (public.est_sous_admin_best() AND employeur = 'best'
 AND (job_id IS NULL OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.employeur = 'best'))));
DROP POLICY IF EXISTS punchs_delete_admin ON public.punchs;
CREATE POLICY punchs_delete_admin ON public.punchs FOR DELETE TO authenticated USING (
 public.est_admin() OR (public.est_sous_admin_best() AND employeur = 'best')
);

DROP POLICY IF EXISTS photos_select ON public.photos_jobs;
CREATE POLICY photos_select ON public.photos_jobs FOR SELECT TO authenticated USING (
 public.est_admin() OR (public.est_sous_admin_best() AND EXISTS
  (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.employeur = 'best'))
 OR employe_id IN (SELECT id FROM public.employes WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS photos_insert ON public.photos_jobs;
CREATE POLICY photos_insert ON public.photos_jobs FOR INSERT TO authenticated WITH CHECK (
 public.est_admin() OR (public.est_sous_admin_best() AND EXISTS
  (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.employeur = 'best'))
 OR employe_id IN (SELECT id FROM public.employes WHERE user_id = auth.uid() AND actif)
);

DROP POLICY IF EXISTS notifications_admin_select ON public.notifications_admin;
CREATE POLICY notifications_admin_select ON public.notifications_admin FOR SELECT TO authenticated USING (
 public.est_admin() OR (public.est_sous_admin_best() AND EXISTS
 (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.employeur = 'best'))
);
DROP POLICY IF EXISTS notifications_admin_update ON public.notifications_admin;
CREATE POLICY notifications_admin_update ON public.notifications_admin FOR UPDATE TO authenticated USING (
 public.est_admin() OR (public.est_sous_admin_best() AND EXISTS
 (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.employeur = 'best'))
) WITH CHECK (public.est_admin() OR (public.est_sous_admin_best() AND EXISTS
 (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.employeur = 'best')));

-- Photos: restreindre aussi l'accès au stockage pour la sous-administratrice.
DROP POLICY IF EXISTS photos_jobs_storage_select ON storage.objects;
CREATE POLICY photos_jobs_storage_select ON storage.objects FOR SELECT TO authenticated USING (
 bucket_id = 'photos-jobs' AND (
 NOT public.est_sous_admin_best() OR EXISTS (
 SELECT 1 FROM public.jobs j WHERE j.id::text = split_part(name, '/', 1) AND j.employeur = 'best')
 ));
DROP POLICY IF EXISTS photos_jobs_storage_insert ON storage.objects;
CREATE POLICY photos_jobs_storage_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
 bucket_id = 'photos-jobs' AND (
 NOT public.est_sous_admin_best() OR EXISTS (
 SELECT 1 FROM public.jobs j WHERE j.id::text = split_part(name, '/', 1) AND j.employeur = 'best')
 ));
COMMIT;
