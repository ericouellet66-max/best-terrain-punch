// Supabase Edge Function : création sécurisée d'un compte employé.
// Déploiement : supabase functions deploy creer-employe
// La clé service_role reste côté serveur (variable fournie automatiquement par Supabase).
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function reponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return reponse({ error: 'Méthode non permise' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authHeader = req.headers.get('Authorization') ?? ''
  const clientAppelant = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: userData } = await clientAppelant.auth.getUser()
  if (!userData.user) return reponse({ error: 'Non authentifié' }, 401)

  const { data: estAdmin } = await clientAppelant.rpc('est_admin')
  if (!estAdmin) return reponse({ error: 'Réservé aux administrateurs' }, 403)

  const { nom, courriel, telephone, role, motDePasse } = await req.json()
  const email = String(courriel ?? '').trim().toLowerCase()

  if (!nom || !email.includes('@')) return reponse({ error: 'Nom et courriel valides requis' }, 400)
  if (!motDePasse || String(motDePasse).length < 8) {
    return reponse({ error: 'Mot de passe temporaire de 8 caractères minimum requis' }, 400)
  }
  if (role !== 'employe' && role !== 'admin') return reponse({ error: 'Rôle invalide' }, 400)

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  const { data: existante } = await admin
    .from('employes')
    .select('id')
    .ilike('courriel', email)
    .maybeSingle()

  if (!existante) {
    const { error } = await admin
      .from('employes')
      .insert({ nom, courriel: email, telephone: telephone || null, role, actif: true })
    if (error) return reponse({ error: error.message }, 400)
  }

  // Le déclencheur lier_employe_auth relie la fiche au nouveau compte par courriel.
  const { data: cree, error: erreurAuth } = await admin.auth.admin.createUser({
    email,
    password: String(motDePasse),
    email_confirm: true,
    user_metadata: { nom },
  })
  if (erreurAuth) return reponse({ error: erreurAuth.message }, 400)

  return reponse({ ok: true, userId: cree.user?.id })
})
