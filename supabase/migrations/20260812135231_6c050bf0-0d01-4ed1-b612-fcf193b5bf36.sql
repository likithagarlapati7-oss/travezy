REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon, authenticated;

REVOKE SELECT ON public.providers FROM anon;
GRANT SELECT (id, business_name, description, location, logo_url, verified, created_at) ON public.providers TO anon;

REVOKE SELECT ON public.reviews FROM anon, authenticated;
GRANT SELECT (id, service_id, rating, comment, created_at) ON public.reviews TO anon, authenticated;