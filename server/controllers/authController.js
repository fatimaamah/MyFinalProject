const bcrypt = require('bcryptjs');
<<<<<<< HEAD
const db = require('../config/database');
const { logActivity } = require('../utils/logger');

const getLogin = (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/login', { 
    error: null,
    success: null 
  });
=======
const { supabase } = require('../config/database');
const { logActivity } = require('../utils/logger');

const getLogin = (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('auth/login', { error: null });
>>>>>>> 0d0ed4a9a4cd455f44f4517cd207ea505dcef7ae
};

const postLogin = async (req, res) => {
  const { email, password } = req.body;
<<<<<<< HEAD
  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.render('auth/login', { 
      error: 'Invalid email or password', 
      success: null 
    });

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.render('auth/login', { 
      error: 'Invalid email or password', 
      success: null 
    });
=======

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
>>>>>>> 0d0ed4a9a4cd455f44f4517cd207ea505dcef7ae

    req.session.user = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      department: user.department,
<<<<<<< HEAD
      level: user.level,
      registration_number: user.registration_number
    };

    await logActivity(user.id, 'Login', 'user', user.id);
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.render('auth/login', { 
      error: 'An error occurred. Please try again.', 
      success: null 
    });
=======
      level: user.level
    };

    await logActivity(user.id, 'Login', 'user', user.id);

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    res.render('auth/login', { error: 'An error occurred. Please try again.' });
>>>>>>> 0d0ed4a9a4cd455f44f4517cd207ea505dcef7ae
  }
};

const getRegister = (req, res) => {
<<<<<<< HEAD
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/register', { 
    error: null,
    success: null,
    full_name: '',
    email: '',
    registration_number: '',
    level: '',
    department: '',
    phone: ''
  });
};

const postRegister = async (req, res) => {
  const { 
    email, 
    password, 
    confirm_password, 
    full_name, 
    department, 
    level, 
    registration_number,
    phone,
    otp,
    terms 
  } = req.body;

  // Prepare response data
  const responseData = {
    error: null,
    success: null,
    full_name: full_name || '',
    email: email || '',
    registration_number: registration_number || '',
    level: level || '',
    department: department || '',
    phone: phone || ''
  };

  try {
    // Validation checks
    if (password !== confirm_password) {
      responseData.error = 'Passwords do not match';
      return res.render('auth/register', responseData);
    }

    if (password.length < 6) {
      responseData.error = 'Password must be at least 6 characters long';
      return res.render('auth/register', responseData);
    }

    if (!terms) {
      responseData.error = 'You must agree to the terms and conditions';
      return res.render('auth/register', responseData);
    }

    if (!otp) {
      responseData.error = 'Verification code is required';
      return res.render('auth/register', responseData);
    }

    // Check if email already exists
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingEmail) {
      responseData.error = 'Email already registered';
      return res.render('auth/register', responseData);
    }

    // Check if registration number already exists
    let existingRegNo = null;
    try {
      existingRegNo = db.prepare('SELECT id FROM users WHERE registration_number = ?').get(registration_number);
    } catch (e) {
      // Column might not exist yet, ignore this check
      console.log('Registration number check skipped - column may not exist');
    }

    if (existingRegNo) {
      responseData.error = 'Registration number already exists';
      return res.render('auth/register', responseData);
    }

    // Validate registration number format (basic check)
    if (!registration_number || registration_number.trim().length < 3) {
      responseData.error = 'Valid registration number is required';
      return res.render('auth/register', responseData);
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Try to insert with registration_number and phone, fallback to basic insert if columns don't exist
    let result;
    try {
      const stmt = db.prepare(`
        INSERT INTO users (email, password_hash, full_name, role, department, level, registration_number, phone)
        VALUES (?, ?, ?, 'student', ?, ?, ?, ?)
      `);
      
      result = stmt.run(
        email, 
        hashedPassword, 
        full_name, 
        department, 
        level, 
        registration_number,
        phone || null
      );
    } catch (dbError) {
      // Fallback: insert without the new columns
      console.log('Fallback: inserting without registration_number and phone');
      const stmt = db.prepare(`
        INSERT INTO users (email, password_hash, full_name, role, department, level)
        VALUES (?, ?, ?, 'student', ?, ?)
      `);
      
      result = stmt.run(
        email, 
        hashedPassword, 
        full_name, 
        department, 
        level
      );
    }

    // Create session
    req.session.user = {
      id: result.lastInsertRowid,
      email,
      full_name,
      role: 'student',
      department,
      level,
      registration_number: registration_number || null
    };

    // Log the activity
    await logActivity(
      result.lastInsertRowid, 
      'Account Created', 
      'user', 
      result.lastInsertRowid,
      { 
        registration_number,
        department,
        level 
      }
    );

    // Redirect to dashboard
    res.redirect('/dashboard');

  } catch (err) {
    console.error('Registration Error:', err);
    
    // Handle specific database errors
    let errorMessage = 'An error occurred during registration. Please try again.';
    
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      if (err.message.includes('email')) {
        errorMessage = 'Email already registered';
      } else if (err.message.includes('registration_number')) {
        errorMessage = 'Registration number already exists';
      }
    }

    responseData.error = errorMessage;
    res.render('auth/register', responseData);
=======
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
>>>>>>> 0d0ed4a9a4cd455f44f4517cd207ea505dcef7ae
  }
};

const logout = (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
};

<<<<<<< HEAD
module.exports = { 
  getLogin, 
  postLogin, 
  getRegister, 
  postRegister, 
  logout 
};
=======
module.exports = {
  getLogin,
  postLogin,
  getRegister,
  postRegister,
  logout
};
>>>>>>> 0d0ed4a9a4cd455f44f4517cd207ea505dcef7ae
