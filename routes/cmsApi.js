const express = require('express');
const router = express.Router();
const { authenticateCmsToken } = require('../middleware/auth');
const { requireAdmin, requireAdminPermission } = require('../middleware/adminAuth');
const { uploadCmsSettings, uploadCmsQr, handleUploadError } = require('../middleware/upload');
const cmsController = require('../controllers/cmsController');

// Health check (ไม่ต้อง auth) — ใช้ตรวจว่า request ถึง Express แล้ว
router.get('/health', (req, res) => res.json({ ok: true, api: 'cms' }));

// CMS Login (ไม่ต้อง auth)
router.post('/login', cmsController.cmsLogin);

// ตั้งค่า Login (สาธารณะ — หน้า login ดึง logo/พื้นหลัง)
router.get('/login-settings', cmsController.getLoginSettings);

// ทุก route ด้านล่างต้อง authenticate + admin
// ใส่ route ที่เป็น path เต็ม (ไม่มี :id) ก่อน route ที่มี :id เพื่อไม่ให้ถูกดักผิด
router.get('/dashboard', authenticateCmsToken, requireAdmin, cmsController.getDashboard);
router.get('/me', authenticateCmsToken, requireAdmin, cmsController.getCmsMe);
router.get('/users', authenticateCmsToken, requireAdmin, cmsController.getUsers);
router.get('/users/stats', authenticateCmsToken, requireAdmin, cmsController.getUsersStats);
router.get('/users/:id', authenticateCmsToken, requireAdmin, cmsController.getUserById);
router.get('/users/:id/payment-channels', authenticateCmsToken, requireAdmin, cmsController.getUserPaymentChannels);
router.get('/users/:id/pending-payments', authenticateCmsToken, requireAdmin, cmsController.getUserPendingPayments);
router.get('/users/:id/saved-coupon-next-payment', authenticateCmsToken, requireAdmin, cmsController.getUserSavedCouponNextPayment);
router.get('/users/:id/payment-history', authenticateCmsToken, requireAdmin, cmsController.getUserPaymentHistory);
router.patch('/pending-payments/:id/verify', authenticateCmsToken, requireAdmin, requireAdminPermission('can_manage_users'), cmsController.verifyPendingPayment);
router.get('/admins', authenticateCmsToken, requireAdmin, cmsController.getAdmins);
router.post('/admins', authenticateCmsToken, requireAdmin, cmsController.createAdmin);
router.put('/admins/:id', authenticateCmsToken, requireAdmin, requireAdminPermission('can_manage_users'), cmsController.updateAdmin);
router.delete('/admins/:id', authenticateCmsToken, requireAdmin, requireAdminPermission('can_delete_admins'), cmsController.deleteAdmin);
router.get('/login-history', authenticateCmsToken, requireAdmin, cmsController.getLoginHistory);
router.get('/notifications', authenticateCmsToken, requireAdmin, cmsController.getNotifications);

// ตั้งค่า CMS (โลโก้ + พื้นหลังหน้า Login)
router.get('/settings', authenticateCmsToken, requireAdmin, cmsController.getSettings);
router.put('/settings', authenticateCmsToken, requireAdmin, cmsController.updateSettings);
// อัปโหลดรูปตั้งค่า (แยกโฟลเดอร์ cms/settings กับ cms/qr, แปลงเป็น WebP)
router.post('/upload/settings/logo', authenticateCmsToken, requireAdmin, uploadCmsSettings, handleUploadError, cmsController.uploadSettingsImage);
router.post('/upload/settings/bg', authenticateCmsToken, requireAdmin, uploadCmsSettings, handleUploadError, cmsController.uploadSettingsImage);
router.post('/upload/qr', authenticateCmsToken, requireAdmin, uploadCmsQr, handleUploadError, cmsController.uploadQrImage);

// แทมเพลต (route มี :id อยู่หลัง)
router.get('/templates', authenticateCmsToken, requireAdmin, cmsController.getTemplates);
router.get('/templates/:id', authenticateCmsToken, requireAdmin, cmsController.getTemplateById);
router.post('/templates', authenticateCmsToken, requireAdmin, cmsController.createTemplate);
router.put('/templates/:id', authenticateCmsToken, requireAdmin, cmsController.updateTemplate);
router.patch('/templates/:id/toggle', authenticateCmsToken, requireAdmin, cmsController.toggleTemplate);
router.delete('/templates/:id', authenticateCmsToken, requireAdmin, cmsController.deleteTemplate);

router.patch('/users/:id/active', authenticateCmsToken, requireAdmin, requireAdminPermission('can_manage_users'), cmsController.setUserActive);
router.patch('/users/:id/membership', authenticateCmsToken, requireAdmin, requireAdminPermission('can_manage_users'), cmsController.updateUserMembership);

// แพ็กเกจ (สร้าง/แก้ไข)
router.get('/packages', authenticateCmsToken, requireAdmin, cmsController.getPackages);
router.get('/packages/:id', authenticateCmsToken, requireAdmin, cmsController.getPackageById);
router.post('/packages', authenticateCmsToken, requireAdmin, cmsController.createPackage);
router.put('/packages/:id', authenticateCmsToken, requireAdmin, cmsController.updatePackage);

// คูปอง
router.get('/coupons', authenticateCmsToken, requireAdmin, cmsController.getCoupons);
router.get('/coupons/:id', authenticateCmsToken, requireAdmin, cmsController.getCouponById);
router.post('/coupons', authenticateCmsToken, requireAdmin, cmsController.createCoupon);
router.put('/coupons/:id', authenticateCmsToken, requireAdmin, cmsController.updateCoupon);
router.delete('/coupons/:id', authenticateCmsToken, requireAdmin, cmsController.deleteCoupon);

module.exports = router;
