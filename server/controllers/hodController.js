<<<<<<< HEAD
const db = require('../config/database');
const { logActivity } = require('../utils/logger');

// HOD Dashboard
const getDashboard = (req, res) => {
  try {
    const dept = req.session.user.department;

    // Students & Supervisors - FIXED: Use single quotes for string literals
    const students = db.prepare("SELECT * FROM users WHERE role = 'student' AND department = ? ORDER BY full_name").all(dept);
    const supervisors = db.prepare("SELECT * FROM users WHERE role = 'supervisor' AND department = ? ORDER BY full_name").all(dept);

    // Reports with student and supervisor names
    const reports = db.prepare(`
      SELECT r.*, 
             s.full_name AS student_name, 
             s.department AS student_department,
             v.full_name AS supervisor_name
      FROM reports r
      LEFT JOIN users s ON s.id = r.student_id
      LEFT JOIN users v ON v.id = r.supervisor_id
      ORDER BY r.submitted_at DESC
    `).all();

    // Filter reports by HOD's department
    const deptReports = reports.filter(r => r.student_department === dept);

    // Dashboard statistics
    const stats = {
      totalStudents: students.length,
      totalSupervisors: supervisors.length,
      totalReports: deptReports.length,
      pendingReports: deptReports.filter(r => r.status === 'pending').length,
      approvedReports: deptReports.filter(r => r.status === 'approved').length
    };

    // Render
    res.render('layouts/main', {
      title: 'HOD Dashboard',
      view: '../hod/dashboard',
      stats,
      recentReports: deptReports.slice(0, 10),
      user: req.session.user
    });

  } catch (err) {
    console.error('HOD Dashboard Error:', err);
    res.status(500).render('error', { 
      message: 'Failed to load dashboard', 
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
};

// View all students in HOD's department
const getStudents = (req, res) => {
  try {
    const dept = req.session.user.department;

    const students = db.prepare("SELECT * FROM users WHERE role = 'student' AND department = ? ORDER BY full_name").all(dept);

    const assignments = db.prepare(`
      SELECT a.*, u.id AS supervisor_id, u.full_name AS supervisor_name, u.email AS supervisor_email
      FROM student_supervisor_assignments a
      LEFT JOIN users u ON u.id = a.supervisor_id
      WHERE a.is_active = 1
    `).all();

    const studentsWithSupervisors = students.map(s => {
      const a = assignments.find(x => x.student_id === s.id);
      return { 
        ...s, 
        supervisor: a ? { id: a.supervisor_id, full_name: a.supervisor_name, email: a.supervisor_email } : null 
      };
    });

    res.render('layouts/main', {
      title: 'Department Students',
      view: '../hod/students',
      students: studentsWithSupervisors,
      user: req.session.user
    });

  } catch (err) {
    console.error('HOD Students Error:', err);
    res.status(500).render('error', { 
      message: 'Failed to load students', 
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
};

// View all reports with optional filters
const getReports = (req, res) => {
  try {
    const dept = req.session.user.department;
    const { status, supervisor } = req.query;

    const reports = db.prepare(`
      SELECT r.*, 
             s.full_name AS student_name, 
             s.department AS student_department,
             v.full_name AS supervisor_name,
             v.id AS supervisor_id
      FROM reports r
      LEFT JOIN users s ON s.id = r.student_id
      LEFT JOIN users v ON v.id = r.supervisor_id
      ORDER BY r.submitted_at DESC
    `).all();

    let filtered = reports.filter(r => r.student_department === dept);
    if (status) filtered = filtered.filter(r => r.status === status);
    if (supervisor) filtered = filtered.filter(r => r.supervisor_id == supervisor);

    const supervisors = db.prepare("SELECT id, full_name FROM users WHERE role = 'supervisor' AND department = ?").all(dept);

    res.render('layouts/main', {
      title: 'Department Reports',
      view: '../hod/reports',
      reports: filtered,
      supervisors,
      filters: { status, supervisor },
      user: req.session.user
    });

  } catch (err) {
    console.error('HOD Reports Error:', err);
    res.status(500).render('error', { 
      message: 'Failed to load reports', 
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
};

// View details of a single report
const getReportDetails = (req, res) => {
  try {
    const reportId = req.params.id;

    const report = db.prepare(`
      SELECT r.*, 
             s.full_name AS student_name, 
             s.email AS student_email,
             s.department AS student_department,
             v.full_name AS supervisor_name, 
             v.email AS supervisor_email
      FROM reports r
      LEFT JOIN users s ON s.id = r.student_id
      LEFT JOIN users v ON v.id = r.supervisor_id
      WHERE r.id = ?
    `).get(reportId);

    if (!report || report.student_department !== req.session.user.department) {
      req.flash('error', 'Report not found or not in your department.');
      return res.redirect('/hod/reports');
    }

    const feedback = db.prepare(`
      SELECT f.*, u.full_name AS supervisor_name
      FROM feedback f
      LEFT JOIN users u ON u.id = f.supervisor_id
      WHERE f.report_id = ? ORDER BY f.created_at DESC
    `).all(reportId);

    const hodFeedback = db.prepare(`
      SELECT h.*, u.full_name AS hod_name
      FROM hod_feedback h
      LEFT JOIN users u ON u.id = h.hod_id
      WHERE h.report_id = ? ORDER BY h.created_at DESC
    `).all(reportId);

    res.render('layouts/main', {
      title: `Report Details - ${report.title}`,
      view: '../hod/report-details',
      report,
      feedback,
      hodFeedback,
      user: req.session.user
    });

  } catch (err) {
    console.error('HOD Report Details Error:', err);
    req.flash('error', 'Failed to load report details.');
=======
const { supabase } = require('../config/database');
const { logActivity } = require('../utils/logger');

const getDashboard = async (req, res) => {
  try {
    const userDept = req.session.user.department;

    const { data: students } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'student')
      .eq('department', userDept)
      .order('full_name');

    const { data: supervisors } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'supervisor')
      .eq('department', userDept)
      .order('full_name');

    const { data: reports } = await supabase
      .from('reports')
      .select(`
        *,
        student:student_id(id, full_name, email, department)
      `)
      .order('submitted_at', { ascending: false });

    const deptReports = reports?.filter(r => r.student.department === userDept);

    const stats = {
      totalStudents: students?.length || 0,
      totalSupervisors: supervisors?.length || 0,
      totalReports: deptReports?.length || 0,
      pendingReports: deptReports?.filter(r => r.status === 'pending').length || 0,
      approvedReports: deptReports?.filter(r => r.status === 'approved').length || 0
    };

    res.render('hod/dashboard', { stats, recentReports: deptReports.slice(0, 10) });
  } catch (error) {
    console.error('HOD dashboard error:', error);
    res.render('error', { message: 'Failed to load dashboard', error });
  }
};

const getStudents = async (req, res) => {
  try {
    const userDept = req.session.user.department;

    const { data: students } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'student')
      .eq('department', userDept)
      .order('full_name');

    const { data: assignments } = await supabase
      .from('student_supervisor_assignments')
      .select(`
        *,
        supervisor:supervisor_id(id, full_name, email)
      `)
      .eq('is_active', true);

    const studentsWithSupervisors = students?.map(student => {
      const assignment = assignments?.find(a => a.student_id === student.id);
      return {
        ...student,
        supervisor: assignment ? assignment.supervisor : null
      };
    });

    res.render('hod/students', { students: studentsWithSupervisors });
  } catch (error) {
    console.error('HOD students error:', error);
    res.render('error', { message: 'Failed to load students', error });
  }
};

const getReports = async (req, res) => {
  try {
    const userDept = req.session.user.department;
    const { status, supervisor } = req.query;

    let query = supabase
      .from('reports')
      .select(`
        *,
        student:student_id(id, full_name, email, department, level),
        supervisor:supervisor_id(id, full_name, email)
      `)
      .order('submitted_at', { ascending: false });

    const { data: allReports } = await query;
    let reports = allReports?.filter(r => r.student.department === userDept);

    if (status) {
      reports = reports.filter(r => r.status === status);
    }
    if (supervisor) {
      reports = reports.filter(r => r.supervisor_id === supervisor);
    }

    const { data: supervisors } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('role', 'supervisor')
      .eq('department', userDept);

    res.render('hod/reports', { reports, supervisors, filters: { status, supervisor } });
  } catch (error) {
    console.error('HOD reports error:', error);
    res.render('error', { message: 'Failed to load reports', error });
  }
};

const getReportDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const { data: report } = await supabase
      .from('reports')
      .select(`
        *,
        student:student_id(id, full_name, email, department, level),
        supervisor:supervisor_id(id, full_name, email)
      `)
      .eq('id', id)
      .single();

    if (!report || report.student.department !== req.session.user.department) {
      return res.redirect('/hod/reports');
    }

    const { data: feedback } = await supabase
      .from('feedback')
      .select(`
        *,
        supervisor:supervisor_id(full_name, email)
      `)
      .eq('report_id', id)
      .order('created_at', { ascending: false });

    const { data: hodFeedback } = await supabase
      .from('hod_feedback')
      .select(`
        *,
        hod:hod_id(full_name, email)
      `)
      .eq('report_id', id)
      .order('created_at', { ascending: false });

    res.render('hod/report-details', { report, feedback, hodFeedback });
  } catch (error) {
    console.error('HOD report details error:', error);
>>>>>>> 0d0ed4a9a4cd455f44f4517cd207ea505dcef7ae
    res.redirect('/hod/reports');
  }
};

<<<<<<< HEAD
// Post HOD feedback
const postFeedback = async (req, res) => {
  try {
    const { reportId, comment } = req.body;

    db.prepare('INSERT INTO hod_feedback (report_id, hod_id, comment) VALUES (?, ?, ?)')
      .run(reportId, req.session.user.id, comment);

    await logActivity(req.session.user.id, 'Provided HOD Feedback', 'report', reportId);

    req.flash('success', 'Feedback submitted successfully.');
    res.redirect(`/hod/report/${reportId}`);
  } catch (err) {
    console.error('HOD Feedback Error:', err);
    req.flash('error', 'Failed to submit feedback.');
    res.redirect(`/hod/report/${req.body.reportId}`);
  }
};

module.exports = { 
  getDashboard, 
  getStudents, 
  getReports, 
  getReportDetails, 
  postFeedback 
};
=======
const postFeedback = async (req, res) => {
  const { reportId, comment } = req.body;

  try {
    const { error } = await supabase
      .from('hod_feedback')
      .insert({
        report_id: reportId,
        hod_id: req.session.user.id,
        comment
      });

    if (!error) {
      await logActivity(req.session.user.id, 'Provided HOD Feedback', 'report', reportId);
    }

    res.redirect(`/hod/report/${reportId}`);
  } catch (error) {
    console.error('HOD feedback error:', error);
    res.redirect(`/hod/report/${reportId}`);
  }
};

module.exports = {
  getDashboard,
  getStudents,
  getReports,
  getReportDetails,
  postFeedback
};
>>>>>>> 0d0ed4a9a4cd455f44f4517cd207ea505dcef7ae
