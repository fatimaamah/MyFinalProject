const { supabase } = require('../config/database');
const { logActivity } = require('../utils/logger');
const path = require('path');

const getDashboard = async (req, res) => {
  try {
    const { data: assignments } = await supabase
      .from('student_supervisor_assignments')
      .select(`
        *,
        student:student_id(id, full_name, email, department, level)
      `)
      .eq('supervisor_id', req.session.user.id)
      .eq('is_active', true);

    const studentIds = assignments?.map(a => a.student_id) || [];

    let reports = [];
    if (studentIds.length > 0) {
      const { data: reportsData } = await supabase
        .from('reports')
        .select(`
          *,
          student:student_id(id, full_name, email, level)
        `)
        .in('student_id', studentIds)
        .order('submitted_at', { ascending: false });
      reports = reportsData || [];
    }

    const students = assignments?.map(a => ({
      ...a.student,
      reportsCount: reports.filter(r => r.student_id === a.student_id).length,
      pendingCount: reports.filter(r => r.student_id === a.student_id && r.status === 'pending').length
    }));

    res.render('supervisor/dashboard', { students, recentReports: reports.slice(0, 10) });
  } catch (error) {
    console.error('Supervisor dashboard error:', error);
    res.render('error', { message: 'Failed to load dashboard', error });
  }
};

const getStudentReports = async (req, res) => {
  const { studentId } = req.params;

  try {
    const { data: assignment } = await supabase
      .from('student_supervisor_assignments')
      .select(`
        *,
        student:student_id(id, full_name, email, department, level)
      `)
      .eq('student_id', studentId)
      .eq('supervisor_id', req.session.user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!assignment) {
      return res.redirect('/supervisor/dashboard');
    }

    const { data: reports } = await supabase
      .from('reports')
      .select('*')
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false });

    res.render('supervisor/student-reports', { student: assignment.student, reports });
  } catch (error) {
    console.error('Student reports error:', error);
    res.redirect('/supervisor/dashboard');
  }
};

const getReportDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const { data: report } = await supabase
      .from('reports')
      .select(`
        *,
        student:student_id(id, full_name, email, level)
      `)
      .eq('id', id)
      .eq('supervisor_id', req.session.user.id)
      .single();

    if (!report) {
      return res.redirect('/supervisor/dashboard');
    }

    const { data: feedback } = await supabase
      .from('feedback')
      .select('*')
      .eq('report_id', id)
      .order('created_at', { ascending: false });

    res.render('supervisor/report-details', { report, feedback });
  } catch (error) {
    console.error('Report details error:', error);
    res.redirect('/supervisor/dashboard');
  }
};

const postFeedback = async (req, res) => {
  const { reportId, comment, action } = req.body;

  try {
    const { error: feedbackError } = await supabase
      .from('feedback')
      .insert({
        report_id: reportId,
        supervisor_id: req.session.user.id,
        comment,
        action_taken: action
      });

    if (feedbackError) {
      return res.redirect(`/supervisor/report/${reportId}`);
    }

    let newStatus = 'feedback_given';
    if (action === 'approved') {
      newStatus = 'approved';
    } else if (action === 'rejected') {
      newStatus = 'rejected';
    }

    await supabase
      .from('reports')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', reportId);

    await logActivity(req.session.user.id, `Provided Feedback (${action})`, 'report', reportId);

    res.redirect(`/supervisor/report/${reportId}`);
  } catch (error) {
    console.error('Feedback error:', error);
    res.redirect(`/supervisor/report/${reportId}`);
  }
};

const moveToNextStage = async (req, res) => {
  const { reportId } = req.body;

  try {
    const { data: report } = await supabase
      .from('reports')
      .select('report_stage, student_id')
      .eq('id', reportId)
      .single();

    const stageMap = {
      'progress_1': 'progress_2',
      'progress_2': 'progress_3',
      'progress_3': 'final'
    };

    const nextStage = stageMap[report.report_stage];
    if (!nextStage) {
      return res.redirect(`/supervisor/report/${reportId}`);
    }

    await supabase
      .from('reports')
      .update({ report_stage: nextStage, updated_at: new Date().toISOString() })
      .eq('id', reportId);

    await logActivity(req.session.user.id, `Moved Report to ${nextStage}`, 'report', reportId);

    res.redirect(`/supervisor/student/${report.student_id}`);
  } catch (error) {
    console.error('Move to next stage error:', error);
    res.redirect(`/supervisor/report/${reportId}`);
  }
};

module.exports = {
  getDashboard,
  getStudentReports,
  getReportDetails,
  postFeedback,
  moveToNextStage
};
