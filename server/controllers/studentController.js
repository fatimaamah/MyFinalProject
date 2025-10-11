const { supabase } = require('../config/database');
const { logActivity } = require('../utils/logger');
const path = require('path');

const getDashboard = async (req, res) => {
  try {
    const { data: assignment } = await supabase
      .from('student_supervisor_assignments')
      .select(`
        *,
        supervisor:supervisor_id(id, full_name, email)
      `)
      .eq('student_id', req.session.user.id)
      .eq('is_active', true)
      .maybeSingle();

    const { data: reports } = await supabase
      .from('reports')
      .select('*')
      .eq('student_id', req.session.user.id)
      .order('submitted_at', { ascending: false });

    const reportsByStage = {
      progress_1: reports?.filter(r => r.report_stage === 'progress_1') || [],
      progress_2: reports?.filter(r => r.report_stage === 'progress_2') || [],
      progress_3: reports?.filter(r => r.report_stage === 'progress_3') || [],
      final: reports?.filter(r => r.report_stage === 'final') || []
    };

    res.render('student/dashboard', {
      supervisor: assignment?.supervisor || null,
      reports,
      reportsByStage
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.render('error', { message: 'Failed to load dashboard', error });
  }
};

const getUploadReport = (req, res) => {
  res.render('student/upload-report', { error: null });
};

const postUploadReport = async (req, res) => {
  const { title, report_stage } = req.body;

  try {
    if (!req.file) {
      return res.render('student/upload-report', { error: 'Please select a file to upload' });
    }

    const { data: assignment } = await supabase
      .from('student_supervisor_assignments')
      .select('supervisor_id')
      .eq('student_id', req.session.user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!assignment) {
      return res.render('student/upload-report', { error: 'You are not assigned to a supervisor yet' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    const { data: newReport, error } = await supabase
      .from('reports')
      .insert({
        student_id: req.session.user.id,
        supervisor_id: assignment.supervisor_id,
        report_stage,
        title,
        file_url: fileUrl,
        file_name: req.file.originalname,
        file_size: req.file.size,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      return res.render('student/upload-report', { error: 'Failed to upload report' });
    }

    await logActivity(req.session.user.id, 'Uploaded Report', 'report', newReport.id, {
      title,
      stage: report_stage
    });

    res.redirect('/student/dashboard');
  } catch (error) {
    console.error('Upload report error:', error);
    res.render('student/upload-report', { error: 'An error occurred' });
  }
};

const getReportDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const { data: report } = await supabase
      .from('reports')
      .select(`
        *,
        supervisor:supervisor_id(full_name, email)
      `)
      .eq('id', id)
      .eq('student_id', req.session.user.id)
      .single();

    if (!report) {
      return res.redirect('/student/dashboard');
    }

    const { data: feedback } = await supabase
      .from('feedback')
      .select(`
        *,
        supervisor:supervisor_id(full_name, email)
      `)
      .eq('report_id', id)
      .order('created_at', { ascending: false });

    res.render('student/report-details', { report, feedback });
  } catch (error) {
    console.error('Report details error:', error);
    res.redirect('/student/dashboard');
  }
};

const getReuploadReport = async (req, res) => {
  const { id } = req.params;

  try {
    const { data: report } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .eq('student_id', req.session.user.id)
      .single();

    if (!report) {
      return res.redirect('/student/dashboard');
    }

    res.render('student/reupload-report', { report, error: null });
  } catch (error) {
    console.error('Get reupload error:', error);
    res.redirect('/student/dashboard');
  }
};

const postReuploadReport = async (req, res) => {
  const { id } = req.params;

  try {
    if (!req.file) {
      const { data: report } = await supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .single();
      return res.render('student/reupload-report', { report, error: 'Please select a file' });
    }

    const { data: currentReport } = await supabase
      .from('reports')
      .select('version')
      .eq('id', id)
      .eq('student_id', req.session.user.id)
      .single();

    if (!currentReport) {
      return res.redirect('/student/dashboard');
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const newVersion = currentReport.version + 1;

    await supabase
      .from('reports')
      .update({
        file_url: fileUrl,
        file_name: req.file.originalname,
        file_size: req.file.size,
        version: newVersion,
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    await logActivity(req.session.user.id, 'Reuploaded Report', 'report', id, {
      version: newVersion
    });

    res.redirect(`/student/report/${id}`);
  } catch (error) {
    console.error('Reupload report error:', error);
    res.redirect('/student/dashboard');
  }
};

module.exports = {
  getDashboard,
  getUploadReport,
  postUploadReport,
  getReportDetails,
  getReuploadReport,
  postReuploadReport
};
