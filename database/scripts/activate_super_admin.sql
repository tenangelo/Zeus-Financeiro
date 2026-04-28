-- =============================================================================
-- ZEUS FINANCEIRO — Ativar Super Admin
-- Execute este script no SQL Editor do Supabase para conceder acesso de 
-- super administrador a um usuário específico.
-- =============================================================================

-- Substitua 'email_do_admin@exemplo.com' pelo email do usuário que será super admin.
-- O usuário já deve ter feito signup/login pelo menos uma vez para ter o profile criado.

UPDATE profiles
SET is_super_admin = true
WHERE id = (
    SELECT id FROM auth.users WHERE email = 'seu_email@dominio.com'
);

-- Para verificar se funcionou:
-- SELECT id, full_name, email, is_super_admin FROM profiles WHERE is_super_admin = true;
