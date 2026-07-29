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
    const wNone = toNum(req.body.weight_none);
    const wLow = toNum(req.body.weight_low);
    const wMedium = toNum(req.body.weight_medium);
    const wHigh = toNum(req.body.weight_high);
    const wUrgent = toNum(req.body.weight_urgent);

    const existing = await db.get('SELECT id FROM kpi_plans WHERE employee_id = ?', [employeeId]);
    if (existing) {
      await db.run(
        `UPDATE kpi_plans SET target_points=?, weight_none=?, weight_low=?, weight_medium=?, weight_high=?, weight_urgent=?, updated_at=NOW()
         WHERE employee_id=?`,
        [target, wNone, wLow, wMedium, wHigh, wUrgent, employeeId]
      );
    } else {
      await db.run(
        `INSERT INTO kpi_plans (employee_id, target_points, weight_none, weight_low, weight_medium, weight_high, weight_urgent, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [employeeId, target, wNone, wLow, wMedium, wHigh, wUrgent, req.user.userId]
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

// GET /api/kpi/stats?month=YYYY-MM — har bir reja bor xodim uchun tanlangan
// oyda bajarilgan vazifalar asosida hisoblangan KPI (ball, foiz, vazifalar ro'yxati)
router.get('/stats', auth.requireAuth, requireKpiView, async (req, res) => {
  try {
    const month = /^\d{4}-\d{2}$/.test(req.query.month || '') ? req.query.month : currentMonthStr();
    const range = monthRange(month);
    const plans = await db.all(`
      SELECT p.*, u.name AS employee_name, u.role AS employee_role
      FROM kpi_plans p JOIN admin_users u ON u.id = p.employee_id
      ORDER BY u.name
    `);

    const result = [];
    for (const p of plans) {
      const tasks = await db.all(
        `SELECT id, title, priority, updated_at FROM tasks
         WHERE assigned_to = ? AND status = 'done' AND updated_at >= ? AND updated_at < ?
         ORDER BY updated_at DESC`,
        [p.employee_id, range.start, range.end]
      );
      const weightMap = {
        none: Number(p.weight_none), low: Number(p.weight_low),
        medium: Number(p.weight_medium), high: Number(p.weight_high), urgent: Number(p.weight_urgent)
      };
      let earned = 0;
      const taskList = tasks.map((t) => {
        const pts = weightMap[t.priority] !== undefined ? weightMap[t.priority] : 0;
        earned += pts;
        return { id: t.id, title: t.title, priority: t.priority, points: pts, completed_at: t.updated_at };
      });
      const target = Number(p.target_points) || 0;
      result.push({
        employee_id: p.employee_id,
        employee_name: p.employee_name,
        employee_role: p.employee_role,
        target_points: target,
        weights: weightMap,
        earned_points: earned,
        percent: target > 0 ? Math.round((earned / target) * 1000) / 10 : 0,
        completed_count: taskList.length,
        tasks: taskList
      });
    }
    res.json({ success: true, month, kpis: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
