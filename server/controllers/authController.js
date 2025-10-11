const bcrypt = require('bcryptjs');
const { supabase } = require('../config/database');
const { logActivity } = require('../utils/logger');

const getLogin = (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('auth/login', { error: null });
};

const postLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error || !user) {
      return res.render('auth/login', { error: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.render('auth/login', { error: 'Invalid email or password' });
    }

    req.session.user = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      department: user.department,
      level: user.level
    };

    await logActivity(user.id, 'Login', 'user', user.id);

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    res.render('auth/login', { error: 'An error occurred. Please try again.' });
  }
};

const getRegister = (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('auth/register', { error: null });
};

const postRegister = async (req, res) => {
  const { email, password, full_name, department, level } = req.body;

  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return res.render('auth/register', { error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: hashedPassword,
        full_name,
        role: 'student',
        department,
        level
      })
      .select()
      .single();

    if (error) {
      return res.render('auth/register', { error: 'Failed to create account' });
    }

    await logActivity(newUser.id, 'Account Created', 'user', newUser.id);

    req.session.user = {
      id: newUser.id,
      email: newUser.email,
      full_name: newUser.full_name,
      role: newUser.role,
      department: newUser.department,
      level: newUser.level
    };

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Registration error:', error);
    res.render('auth/register', { error: 'An error occurred. Please try again.' });
  }
};

const logout = (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
};

module.exports = {
  getLogin,
  postLogin,
  getRegister,
  postRegister,
  logout
};
