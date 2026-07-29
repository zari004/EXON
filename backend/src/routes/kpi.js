const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../services/auth');

// KPI rejalarini yaratish/tahrirlash/o'chirish huquqi — bosh menejer, superadmin, IT bo'limi
const KPI_MANAGE_ROLES = ['superadmin', 'it_bolimi', 'menejer_bosh'];
// Ko'rish huquqi — yuqoridagilar + SEO (faqat ko'radi, tahrirlay olmaydi)
const KPI_VIEW_ROLES = KPI_MANAGE_ROLES.concat(['seo']);

function canManageKpi(role) { return KPI_MANAGE_ROLES.includes(role); }
function canViewKpi(role) { return KPI_VIEW_ROLES.includes(role); }

function requireKpiView(req, res, next) {
  if (!canViewKpi(req.user.role)) {
    return res.status(403).json({ success: false, error: "Bu bo'limni ko'rishga ruxsat yo'q" });
  }
  next();
}
function requireKpiManage(req, res, next) {
  if (!canManageKpi(req.user.role)) {
    return res.status(403).json({ success: false, error: "Bu amalni faqat bosh menejer yoki superadmin bajarishi mumkin" });
  }
  next();
}

function pad2(n) { return n < 10 ? '0' + n : String(n); }

function currentMonthStr() {
  const d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1);
}

// "YYYY-MM" ni [oy boshi, keyingi oy boshi) oralig'iga aylantiradi
function monthRange(monthStr) {
  const m = /^(\d{4})-(\d{2})$/.exec(monthStr || '');
  const now = new Date();
  const y = m ? Number(m[1]) : now.getFullYear();
  const mon = m ? Number(m[2]) : now.getMonth() + 1;
  const start = new Date(Date.UTC(y, mon - 1, 1));
  const end = new Date(Date.UTC(y, mon, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

// Baholash uchun "hozir" nuqtasi: joriy oy tanlangan bo'lsa — haqiqiy hozirgi vaqt,
// o'tgan oy bo'lsa — oy oxiri (shu oy ichida bajarilmagan vazifalar muddati o'tgan hisoblanadi)
function evalNow(range) {
  const now = new Date();
  const rangeEnd = new Date(range.end);
  return now < rangeEnd ? now : new Date(rangeEnd.getTime() - 1);
}

function dueAt(dueDate, dueTime) {
  const d = new Date(dueDate);
  if (dueTime) {
    const parts = String(dueTime).split(':');
    d.setHours(Number(parts[0]) || 0, Number(parts[1]) || 0, 0, 0);
  } else {
    d.setHours(23, 59, 0, 0);
  }
  return d;
}

// Bir xodim uchun tanlangan oyda KPI'ni hisoblaydi: boshlang'ich ball (odatda 100)dan
// muddatida bajarilmagan/kechiktirilgan har bir vazifa uchun muhimlik darajasiga qarab
// ball ayiriladi. Qolgan foizga mutanosib ravishda oylik bonus summasi belgilanadi.
async function computeEmployeeKpi(plan, month) {
  const range = monthRange(month);
  const nowRef = evalNow(range);
  const tasks = await db.all(
    `SELECT id, title, priority, status, due_date, due_time, updated_at FROM tasks
     WHERE assigned_to = ? AND due_date >= ? AND due_date < ?
     ORDER BY due_date ASC`,
    [plan.employee_id, range.start, range.end]
  );
  const weightMap = {
    none: Number(plan.weight_none), low: Number(plan.weight_low),
    medium: Number(plan.weight_medium), high: Number(plan.weight_high), urgent: Number(plan.weight_urgent)
  };

  let deducted = 0;
  let onTimeCount = 0;
  let pendingCount = 0;
  const lateTasks = [];

  for (const t of tasks) {
    const due = dueAt(t.due_date, t.due_time);
    if (t.status === 'done') {
      const completedAt = new Date(t.updated_at);
      if (completedAt > due) {
        const pts = weightMap[t.priority] !== undefined ? weightMap[t.priority] : 0;
        deducted += pts;
        lateTasks.push({ id: t.id, title: t.title, priority: t.priority, points: pts, due_date: t.due_date, completed_at: t.updated_at, reason: 'late_done' });
      } else {
        onTimeCount++;
      }
    } else if (due < nowRef) {
      const pts = weightMap[t.priority] !== undefined ? weightMap[t.priority] : 0;
      deducted += pts;
      lateTasks.push({ id: t.id, title: t.title, priority: t.priority, points: pts, due_date: t.due_date, completed_at: null, reason: 'overdue' });
    } else {
      pendingCount++;
    }
  }

  const target = Number(plan.target_points) || 0;
  const earned = Math.max(0, target - deducted);
  const percent = target > 0 ? Math.max(0, Math.min(100, Math.round((earned / target) * 1000) / 10)) : 0;
  const bonusAmount = Number(plan.bonus_amount) || 0;
  const bonusEarned = Math.round(bonusAmount * percent) / 100;

  return {
    employee_id: plan.employee_id,
    target_points: target,
    bonus_amount: bonusAmount,
    weights: weightMap,
    deducted_points: deducted,
    earned_points: earned,
    percent: percent,
    bonus_earned: bonusEarned,
    on_time_count: onTimeCount,
    pending_count: pendingCount,
    late_count: lateTasks.length,
    late_tasks: lateTasks
  };
}

// GET /api/kpi/employees — KPI rejasi biriktirilishi mumkin bo'lgan xodimlar
router.get('/employees', auth.requireAuth, requireKpiView, async (req, res) => {
  try {
    const rows = await db.all("SELECT id, name, role FROM admin_users WHERE status = 'approved' ORDER BY name");
    res.json({ success: true, employees: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/kpi/plans — barcha mavjud KPI rejalari
router.get('/plans', auth.requireAuth, requireKpiView, async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT p.*, u.name AS employee_name, u.role AS employee_role
      FROM kpi_plans p JOIN admin_users u ON u.id = p.employee_id
      ORDER BY u.name
    `);
    res.json({ success: true, plans: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/kpi/plans/:employeeId — reja yaratish yoki yangilash (upsert)
router.put('/plans/:employeeId', auth.requireAuth, requireKpiManage, async (req, res) => {
  try {
    const employeeId = Number(req.params.employeeId);
    const employee = await db.get('SELECT id FROM admin_users WHERE id = ?', [employeeId]);
    if (!employee) return res.status(404).json({ success: false, error: 'Xodim topilmadi' });

    const toNum = (v) => (v === undefined || v === null || v === '' ? 0 : Number(v));
    const target = toNum(req.body.target_points);
    const bonus = toNum(req.body.bonus_amount);
    const wNone = toNum(req.body.weight_none);
    const wLow = toNum(req.body.weight_low);
    const wMedium = toNum(req.body.weight_medium);
    const wHigh = toNum(req.body.weight_high);
    const wUrgent = toNum(req.body.weight_urgent);

    const existing = await db.get('SELECT id FROM kpi_plans WHERE employee_id = ?', [employeeId]);
    if (existing) {
      await db.run(
        `UPDATE kpi_plans SET target_points=?, bonus_amount=?, weight_none=?, weight_low=?, weight_medium=?, weight_high=?, weight_urgent=?, updated_at=NOW()
         WHERE employee_id=?`,
        [target, bonus, wNone, wLow, wMedium, wHigh, wUrgent, employeeId]
      );
    } else {
      await db.run(
        `INSERT INTO kpi_plans (employee_id, target_points, bonus_amount, weight_none, weight_low, weight_medium, weight_high, weight_urgent, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [employeeId, target, bonus, wNone, wLow, wMedium, wHigh, wUrgent, req.user.userId]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/kpi/plans/:employeeId
router.delete('/plans/:employeeId', auth.requireAuth, requireKpiManage, async (req, res) => {
  try {
    await db.run('DELETE FROM kpi_plans WHERE employee_id = ?', [req.params.employeeId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/kpi/stats?month=YYYY-MM — barcha reja bor xodimlarning tanlangan oydagi KPI'si
router.get('/stats', auth.requireAuth, requireKpiView, async (req, res) => {
  try {
    const month = /^\d{4}-\d{2}$/.test(req.query.month || '') ? req.query.month : currentMonthStr();
    const plans = await db.all(`
      SELECT p.*, u.name AS employee_name, u.role AS employee_role
      FROM kpi_plans p JOIN admin_users u ON u.id = p.employee_id
      ORDER BY u.name
    `);
    const result = [];
    for (const p of plans) {
      const stat = await computeEmployeeKpi(p, month);
      result.push(Object.assign({ employee_name: p.employee_name, employee_role: p.employee_role }, stat));
    }
    res.json({ success: true, month, kpis: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/kpi/my-stats?month=YYYY-MM — joriy foydalanuvchining o'z KPI'si
// (rol cheklovisiz — har bir xodim faqat o'zinikini ko'radi)
router.get('/my-stats', auth.requireAuth, async (req, res) => {
  try {
    const month = /^\d{4}-\d{2}$/.test(req.query.month || '') ? req.query.month : currentMonthStr();
    const plan = await db.get('SELECT * FROM kpi_plans WHERE employee_id = ?', [req.user.userId]);
    if (!plan) return res.json({ success: true, month, hasPlan: false });
    const stat = await computeEmployeeKpi(plan, month);
    res.json({ success: true, month, hasPlan: true, kpi: stat });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
