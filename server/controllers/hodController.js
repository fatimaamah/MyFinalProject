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
    res.redirect('/hod/reports');
  }
};

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
