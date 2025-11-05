<<<<<<< HEAD
// server/controllers/adminController.js
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const renderPage = require('../utils/renderHelper');

// === ADMIN DASHBOARD ===
const getDashboard = (req, res) => {
  try {
    const user = req.session.user;
    const allUsers = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();

    const stats = {
      coordinators: allUsers.filter(u => u.role === 'level_coordinator').length,
      supervisors: allUsers.filter(u => u.role === 'supervisor').length,
      students: allUsers.filter(u => u.role === 'student').length,
      hods: allUsers.filter(u => u.role === 'hod').length
    };

    const recentUsers = allUsers.slice(0, 5);
    const coordinators = allUsers.filter(u => u.role === 'level_coordinator');

    renderPage(res, {
      title: 'Admin Dashboard',
      view: '../admin/dashboard',
      user,
      stats,
      coordinators,
      recentUsers
    });
  } catch (error) {
    console.error('❌ Error loading admin dashboard:', error);
    renderPage(res, {
      title: 'Error',
      view: '../error',
      user: req.session.user,
      message: 'Failed to load dashboard',
      error: error.message
    });
  }
};
// === MANAGE USERS PAGE ===
const getManageUsers = (req, res) => {
  try {
    const user = req.session.user;

    // Fetch all users
    const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();

    renderPage(res, {
      title: 'Manage Users',
      view: '../admin/manage-users',
      user,
      users
    });
  } catch (error) {
    console.error('❌ Error loading Manage Users:', error);
    renderPage(res, {
      title: 'Error',
      view: '../error',
      user: req.session.user,
      message: 'Failed to load users',
      error: error.message
    });
  }
};

// === ADD USER (POST) ===
const postAddUser = (req, res) => {
  const { full_name, email, password, role, level, department } = req.body;
  try {
    const password_hash = bcrypt.hashSync(password, 10);

    // Prevent duplicate email
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existing) {
      return renderPage(res, {
        title: 'Manage Users',
        view: '../admin/manage-users',
        user: req.session.user,
        error: 'Email already exists.',
        users: db.prepare('SELECT * FROM users ORDER BY created_at DESC').all()
      });
    }

    db.prepare(`
      INSERT INTO users (full_name, email, password_hash, role, level, department, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(full_name, email, password_hash, role, level || null, department || 'Computer Science');

    res.redirect('/admin/manage-users');
  } catch (error) {
    console.error('❌ Error adding user:', error);
    renderPage(res, {
      title: 'Error',
      view: '../error',
      user: req.session.user,
      message: 'Failed to add user',
      error: error.message
    });
  }
};

// === DELETE USER ===
const deleteUser = (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.redirect('/admin/manage-users');
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    renderPage(res, {
      title: 'Error',
      view: '../error',
      user: req.session.user,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};
// View Students
// server/controllers/adminController.js

// === VIEW STUDENTS ===
const getViewStudents = (req, res) => {
  try {
    // Fetch all students from the database
    const students = db.prepare("SELECT * FROM users WHERE role = 'student' ORDER BY created_at DESC").all();

    // Render the students page using your layout
    renderPage(res, {
      title: 'View Students',
      view: '../admin/view-students', // relative to layouts/main.ejs
      user: req.session.user,
      students
    });
  } catch (error) {
    console.error('❌ Error loading students:', error);
    renderPage(res, {
      title: 'Error',
      view: '../error',
      user: req.session.user,
      message: 'Failed to load students',
      error: error.message
    });
  }
};



// View Supervisors
const getViewSupervisors = (req, res) => {
  try {
    const supervisors = db.prepare("SELECT * FROM users WHERE role = 'supervisor' ORDER BY created_at DESC").all();
    renderPage(res, {
      title: 'View Supervisors',
      view: '../admin/view-supervisors',
      user: req.session.user,
      supervisors
    });
  } catch (error) {
    console.error(error);
    renderPage(res, {
      title: 'Error',
      view: '../error',
      user: req.session.user,
      message: 'Failed to load supervisors',
      error: error.message
    });
  }
};


// === ADD COORDINATOR PAGE ===
const getAddCoordinator = (req, res) => {
  renderPage(res, {
    title: 'Add Level Coordinator',
    view: '../admin/add-coordinator',
    user: req.session.user
  });
};

// === ADD COORDINATOR (POST) ===
const postAddCoordinator = (req, res) => {
  const { full_name, email, password, level } = req.body;
  const department = req.session.user?.department || 'Computer Science';

  try {
    const password_hash = bcrypt.hashSync(password, 10);
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (existing) {
      return renderPage(res, {
        title: 'Add Level Coordinator',
        view: '../admin/add-coordinator',
        user: req.session.user,
        error: 'Email already exists. Please use a different email.'
      });
    }

    db.prepare(`
      INSERT INTO users (full_name, email, password_hash, role, level, department, created_at, updated_at)
      VALUES (?, ?, ?, 'level_coordinator', ?, ?, datetime('now'), datetime('now'))
    `).run(full_name, email, password_hash, level, department);

    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('❌ Error adding coordinator:', error);
    renderPage(res, {
      title: 'Error',
      view: '../error',
      user: req.session.user,
      message: 'Error adding coordinator',
      error: error.message
    });
  }
};

// === EDIT COORDINATOR PAGE ===
const getEditCoordinator = (req, res) => {
  const { id } = req.params;
  try {
    const coordinator = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!coordinator) {
      return renderPage(res, {
        title: 'Not Found',
        view: '../error',
        message: 'Coordinator not found',
        error: 'Invalid coordinator ID',
        user: req.session.user
      });
    }

    renderPage(res, {
      title: 'Edit Level Coordinator',
      view: '../admin/edit-coordinator',
      user: req.session.user,
      coordinator
    });
  } catch (error) {
    console.error('❌ Error loading edit coordinator:', error);
    renderPage(res, {
      title: 'Error',
      view: '../error',
      user: req.session.user,
      message: 'Failed to load coordinator data',
      error: error.message
    });
  }
};

// === UPDATE COORDINATOR ===
const postEditCoordinator = (req, res) => {
  const { id } = req.params;
  const { full_name, email, level, department } = req.body;

  try {
    db.prepare(`
      UPDATE users
      SET full_name = ?, email = ?, level = ?, department = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(full_name, email, level, department, id);

    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('❌ Error updating coordinator:', error);
    renderPage(res, {
      title: 'Error',
      view: '../error',
      user: req.session.user,
      message: 'Failed to update coordinator',
      error: error.message
    });
  }
};

// === DELETE COORDINATOR ===
const deleteCoordinator = (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('❌ Error deleting coordinator:', error);
    renderPage(res, {
      title: 'Error',
      view: '../error',
      user: req.session.user,
      message: 'Failed to delete coordinator',
      error: error.message
    });
  }
};

// === ACTIVITY LOGS ===
const getActivityLogs = (req, res) => {
  try {
    const logs = db
      .prepare(`
        SELECT al.*, u.full_name AS user_name
        FROM activity_logs al
        LEFT JOIN users u ON u.id = al.user_id
        ORDER BY al.created_at DESC
      `)
      .all();

    renderPage(res, {
      title: 'Activity Logs',
      view: '../admin/activity-logs',
      user: req.session.user,
      logs
    });
  } catch (error) {
    console.error('❌ Error loading activity logs:', error);
    renderPage(res, {
      title: 'Error',
      view: '../error',
      user: req.session.user,
      message: 'Failed to load activity logs',
      error: error.message
    });
  }
};
// === VIEW COORDINATORS ===
const getViewCoordinators = (req, res) => {
  try {
    const coordinators = db.prepare("SELECT * FROM users WHERE role = 'level_coordinator' ORDER BY created_at DESC").all();
    renderPage(res, {
      title: 'View Coordinators',
      view: '../admin/view-coordinators', // <-- path to your EJS partial
      user: req.session.user,
      coordinators
    });
  } catch (error) {
    console.error(error);
    renderPage(res, {
      title: 'Error',
      view: '../error',
      user: req.session.user,
      message: 'Failed to load coordinators',
      error: error.message
    });
  }
};


// adminController.js
const getViewHods = (req, res) => {
  try {
    const hods = db.prepare("SELECT * FROM users WHERE role = 'hod' ORDER BY created_at DESC").all();
    renderPage(res, {
      title: 'View HODs',
      view: '../admin/view-hods', // <-- path to EJS partial
      user: req.session.user,
      hods
    });
  } catch (error) {
    console.error(error);
    renderPage(res, {
      title: 'Error',
      view: '../error',
      user: req.session.user,
      message: 'Failed to load HODs',
      error: error.message
    });
  }
};


module.exports = {
  getDashboard,
  getManageUsers,
  postAddUser,
  deleteUser,
=======
const bcrypt = require('bcryptjs');
const { supabase } = require('../config/database');
const { logActivity } = require('../utils/logger');

const getDashboard = async (req, res) => {
  try {
    const { data: coordinators } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'level_coordinator')
      .order('created_at', { ascending: false });

    const { data: allUsers } = await supabase
      .from('users')
      .select('role');

    const stats = {
      coordinators: coordinators?.length || 0,
      students: allUsers?.filter(u => u.role === 'student').length || 0,
      supervisors: allUsers?.filter(u => u.role === 'supervisor').length || 0,
      hods: allUsers?.filter(u => u.role === 'hod').length || 0
    };

    res.render('admin/dashboard', { coordinators, stats });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.render('error', { message: 'Failed to load dashboard', error });
  }
};

const getAddCoordinator = (req, res) => {
  res.render('admin/add-coordinator', { error: null });
};

const postAddCoordinator = async (req, res) => {
  const { email, password, full_name, level } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: newCoordinator, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: hashedPassword,
        full_name,
        role: 'level_coordinator',
        level
      })
      .select()
      .single();

    if (error) {
      return res.render('admin/add-coordinator', { error: 'Failed to create coordinator' });
    }

    await logActivity(req.session.user.id, 'Created Level Coordinator', 'user', newCoordinator.id, {
      coordinator_name: full_name,
      level
    });

    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Add coordinator error:', error);
    res.render('admin/add-coordinator', { error: 'An error occurred' });
  }
};

const getEditCoordinator = async (req, res) => {
  const { id } = req.params;

  try {
    const { data: coordinator } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('role', 'level_coordinator')
      .single();

    if (!coordinator) {
      return res.redirect('/admin/dashboard');
    }

    res.render('admin/edit-coordinator', { coordinator, error: null });
  } catch (error) {
    console.error('Get edit coordinator error:', error);
    res.redirect('/admin/dashboard');
  }
};

const postEditCoordinator = async (req, res) => {
  const { id } = req.params;
  const { email, full_name, level, password } = req.body;

  try {
    const updateData = { email, full_name, level };

    if (password && password.trim() !== '') {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .eq('role', 'level_coordinator');

    if (error) {
      const { data: coordinator } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      return res.render('admin/edit-coordinator', { coordinator, error: 'Failed to update coordinator' });
    }

    await logActivity(req.session.user.id, 'Updated Level Coordinator', 'user', id);

    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Edit coordinator error:', error);
    res.redirect('/admin/dashboard');
  }
};

const deleteCoordinator = async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .eq('role', 'level_coordinator');

    if (!error) {
      await logActivity(req.session.user.id, 'Deleted Level Coordinator', 'user', id);
    }

    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Delete coordinator error:', error);
    res.redirect('/admin/dashboard');
  }
};

const getActivityLogs = async (req, res) => {
  try {
    const { data: logs } = await supabase
      .from('activity_logs')
      .select('*, users(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(100);

    res.render('admin/activity-logs', { logs });
  } catch (error) {
    console.error('Activity logs error:', error);
    res.render('error', { message: 'Failed to load activity logs', error });
  }
};

module.exports = {
  getDashboard,
>>>>>>> 0d0ed4a9a4cd455f44f4517cd207ea505dcef7ae
  getAddCoordinator,
  postAddCoordinator,
  getEditCoordinator,
  postEditCoordinator,
  deleteCoordinator,
<<<<<<< HEAD
  getActivityLogs,
  getViewCoordinators,  // ✅ existing
  getViewHods,          // ✅ existing
  getViewStudents,      // ✅ new
  getViewSupervisors    // ✅ new
};

=======
  getActivityLogs
};
>>>>>>> 0d0ed4a9a4cd455f44f4517cd207ea505dcef7ae
