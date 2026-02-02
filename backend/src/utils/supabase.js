const { createClient } = require('@supabase/supabase-js');

let supabaseAdmin = null;

/**
 * Cliente Supabase con Service Role (solo para operaciones de admin en backend)
 */
function getSupabaseAdmin() {
  if (!supabaseAdmin && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return supabaseAdmin;
}

/**
 * Crear usuario en Supabase Auth (para que pueda hacer login con email/password)
 * @param {string} email
 * @param {string} password
 * @param {Object} metadata - user_metadata (firstName, lastName, etc.)
 * @returns {Object|null} Usuario creado o null si falla/Supabase no configurado
 */
async function createSupabaseUser(email, password, metadata = {}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (error) {
      console.warn('Supabase createUser error:', error.message);
      return null;
    }
    return data.user;
  } catch (err) {
    console.error('Error creando usuario en Supabase:', err);
    return null;
  }
}

/**
 * Actualizar contraseña de usuario en Supabase
 */
async function updateSupabasePassword(userId, newPassword) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  try {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    return !error;
  } catch (err) {
    console.error('Error actualizando contraseña en Supabase:', err);
    return false;
  }
}

module.exports = {
  getSupabaseAdmin,
  createSupabaseUser,
  updateSupabasePassword,
};
