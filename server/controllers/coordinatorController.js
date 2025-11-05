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
      students: studentsWithAssignments,
      supervisors,
      level: userLevel
    });
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
    res.redirect('/coordinator/dashboard');
  }
};

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
    res.redirect('/coordinator/dashboard');
  }
};

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
  }
};

module.exports = {
  getDashboard,
  assignStudent,
  unassignStudent,
  getProgressOverview
};
