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
      students: studentsWithAssignments,
      supervisors,
      level: userLevel
    });
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
    res.redirect('/coordinator/dashboard');
  }
};

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
    res.redirect('/coordinator/dashboard');
  }
};

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
  }
};

module.exports = {
  getDashboard,
  assignStudent,
  unassignStudent,
  getProgressOverview
};
