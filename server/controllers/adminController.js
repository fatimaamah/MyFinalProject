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
  getAddCoordinator,
  postAddCoordinator,
  getEditCoordinator,
  postEditCoordinator,
  deleteCoordinator,
  getActivityLogs
};
