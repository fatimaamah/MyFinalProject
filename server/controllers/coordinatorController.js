<<<<<<< HEAD
// server/controllers/coordinatorController.js
const db = require('../config/database');
const { logActivity } = require('../utils/logger');

// === GET DASHBOARD ===
const getDashboard = (req, res) => {
  try {
    const user = req.session.user;
    const userLevel = user.level;

    // ✅ Get all students in coordinator's level
    const students = db
      .prepare(`SELECT * FROM users WHERE role = 'student' AND level = ? ORDER BY full_name`)
      .all(userLevel);

    // ✅ Get all supervisors
    const supervisors = db
      .prepare(`SELECT * FROM users WHERE role = 'supervisor' ORDER BY full_name`)
      .all();

    // ✅ Get existing active assignments
    const assignments = db
      .prepare(`
        SELECT a.*,
               s.id AS student_id, s.full_name AS student_name, s.email AS student_email,
               v.id AS supervisor_id, v.full_name AS supervisor_name, v.email AS supervisor_email
        FROM student_supervisor_assignments a
        LEFT JOIN users s ON s.id = a.student_id
        LEFT JOIN users v ON v.id = a.supervisor_id
        WHERE a.is_active = 1
      `)
      .all();

    // ✅ Merge assignments with student list
    const studentsWithAssignments = students.map(st => {
      const asg = assignments.find(a => a.student_id === st.id);
      return {
        ...st,
        supervisor: asg
          ? { id: asg.supervisor_id, full_name: asg.supervisor_name, email: asg.supervisor_email }
          : null,
        assignmentId: asg ? asg.id : null
      };
    });

    // ✅ Render through layout
    res.render('layouts/main', {
      title: 'Level Coordinator Dashboard',
      view: '../coordinator/dashboard',
      user,
=======
const { supabase } = require('../config/database');
const { logActivity } = require('../utils/logger');

const getDashboard = async (req, res) => {
  try {
    const userLevel = req.session.user.level;

    const { data: students } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'student')
      .eq('level', userLevel)
      .order('full_name');

    const { data: supervisors } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'supervisor')
      .order('full_name');

    const { data: assignments } = await supabase
      .from('student_supervisor_assignments')
      .select(`
        *,
        student:student_id(id, full_name, email),
        supervisor:supervisor_id(id, full_name, email)
      `)
      .eq('is_active', true);

    const studentsWithAssignments = students?.map(student => {
      const assignment = assignments?.find(a => a.student_id === student.id);
      return {
        ...student,
        supervisor: assignment ? assignment.supervisor : null,
        assignmentId: assignment ? assignment.id : null
      };
    });

    res.render('coordinator/dashboard', {
>>>>>>> 0d0ed4a9a4cd455f44f4517cd207ea505dcef7ae
      students: studentsWithAssignments,
      supervisors,
      level: userLevel
    });
<<<<<<< HEAD
  } catch (err) {
    console.error('Dashboard Load Error:', err);
    res.status(500).render('layouts/main', {
      title: 'Error',
      view: '../error',
      user: req.session.user,
      message: 'Failed to load dashboard',
      error: err.message
    });
  }
};

// === ASSIGN STUDENT ===
const assignStudent = (req, res) => {
  const { studentId, supervisorId } = req.body;
  try {
    // ✅ Disable any existing assignment for this student
    const existing = db
      .prepare('SELECT id FROM student_supervisor_assignments WHERE student_id = ? AND is_active = 1')
      .get(studentId);

    if (existing) {
      db.prepare('UPDATE student_supervisor_assignments SET is_active = 0 WHERE id = ?').run(existing.id);
    }

    // ✅ Insert new assignment
    db.prepare(`
      INSERT INTO student_supervisor_assignments (student_id, supervisor_id, level_coordinator_id, is_active)
      VALUES (?, ?, ?, 1)
    `).run(studentId, supervisorId, req.session.user.id);

    // ✅ Log activity
    logActivity(
      req.session.user.id,
      'Assigned student to supervisor',
      'assignment',
      studentId,
      { supervisor_id: supervisorId }
    );

    res.redirect('/coordinator/dashboard');
  } catch (err) {
    console.error('Assign Error:', err);
=======
  } catch (error) {
    console.error('Coordinator dashboard error:', error);
    res.render('error', { message: 'Failed to load dashboard', error });
  }
};

const assignStudent = async (req, res) => {
  const { studentId, supervisorId } = req.body;

  try {
    const { data: existingAssignment } = await supabase
      .from('student_supervisor_assignments')
      .select('id')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .maybeSingle();

    if (existingAssignment) {
      await supabase
        .from('student_supervisor_assignments')
        .update({ is_active: false })
        .eq('id', existingAssignment.id);
    }

    const { error } = await supabase
      .from('student_supervisor_assignments')
      .insert({
        student_id: studentId,
        supervisor_id: supervisorId,
        level_coordinator_id: req.session.user.id,
        is_active: true
      });

    if (!error) {
      await logActivity(req.session.user.id, 'Assigned Student to Supervisor', 'assignment', studentId, {
        supervisor_id: supervisorId
      });
    }

    res.redirect('/coordinator/dashboard');
  } catch (error) {
    console.error('Assign student error:', error);
>>>>>>> 0d0ed4a9a4cd455f44f4517cd207ea505dcef7ae
    res.redirect('/coordinator/dashboard');
  }
};

<<<<<<< HEAD
// === UNASSIGN STUDENT ===
const unassignStudent = (req, res) => {
  const { assignmentId } = req.params;
  try {
    db.prepare(`
      UPDATE student_supervisor_assignments
      SET is_active = 0
      WHERE id = ? AND level_coordinator_id = ?
    `).run(assignmentId, req.session.user.id);

    logActivity(req.session.user.id, 'Unassigned student', 'assignment', assignmentId);

    res.redirect('/coordinator/dashboard');
  } catch (err) {
    console.error('Unassign Error:', err);
=======
const unassignStudent = async (req, res) => {
  const { assignmentId } = req.params;

  try {
    const { error } = await supabase
      .from('student_supervisor_assignments')
      .update({ is_active: false })
      .eq('id', assignmentId)
      .eq('level_coordinator_id', req.session.user.id);

    if (!error) {
      await logActivity(req.session.user.id, 'Unassigned Student from Supervisor', 'assignment', assignmentId);
    }

    res.redirect('/coordinator/dashboard');
  } catch (error) {
    console.error('Unassign student error:', error);
>>>>>>> 0d0ed4a9a4cd455f44f4517cd207ea505dcef7ae
    res.redirect('/coordinator/dashboard');
  }
};

<<<<<<< HEAD
// === PROGRESS OVERVIEW ===
const getProgressOverview = (req, res) => {
  try {
    const user = req.session.user;
    const userLevel = user.level;

    const reports = db
      .prepare(`
        SELECT r.*, 
               s.id AS student_id, s.full_name AS student_name, s.email AS student_email, s.level AS student_level,
               v.id AS supervisor_id, v.full_name AS supervisor_name, v.email AS supervisor_email
        FROM reports r
        LEFT JOIN users s ON s.id = r.student_id
        LEFT JOIN users v ON v.id = r.supervisor_id
        ORDER BY r.submitted_at DESC
      `)
      .all();

    const levelReports = reports.filter(r => r.student_level === userLevel);

    res.render('layouts/main', {
      title: 'Progress Overview',
      view: '../coordinator/progress-overview',
      user,
      reports: levelReports
    });
  } catch (err) {
    console.error('Progress Overview Error:', err);
    res.status(500).render('layouts/main', {
      title: 'Error',
      view: '../error',
      user: req.session.user,
      message: 'Failed to load progress overview',
      error: err.message
    });
=======
const getProgressOverview = async (req, res) => {
  try {
    const userLevel = req.session.user.level;

    const { data: reports } = await supabase
      .from('reports')
      .select(`
        *,
        student:student_id(id, full_name, email, level),
        supervisor:supervisor_id(id, full_name, email)
      `)
      .order('submitted_at', { ascending: false });

    const levelReports = reports?.filter(r => r.student.level === userLevel);

    res.render('coordinator/progress-overview', { reports: levelReports });
  } catch (error) {
    console.error('Progress overview error:', error);
    res.render('error', { message: 'Failed to load progress overview', error });
>>>>>>> 0d0ed4a9a4cd455f44f4517cd207ea505dcef7ae
  }
};

module.exports = {
  getDashboard,
  assignStudent,
  unassignStudent,
  getProgressOverview
};
