/**
 * Modo demonstração: liga sozinho enquanto o Supabase não está configurado (sem .env.local).
 * Login aceita qualquer usuário e senha, e os dados vêm do gerador do seed, em memória.
 * Serve para navegar por todas as telas localmente antes de ligar o banco de verdade.
 */
export const MODO_DEMO = !process.env.NEXT_PUBLIC_SUPABASE_URL;
