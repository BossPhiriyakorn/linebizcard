const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');
const { uploadCmsSettings, uploadCmsQr, handleUploadError } = require('../middleware/upload');
const cmsController = require('../controllers/cmsController');

// CMS Login (ไม่ต้อง auth)
router.post('/login', cmsController.cmsLogin);

// ตั้งค่า Login (สาธารณะ — หน้า login ดึง logo/พื้นหลัง)
router.get('/login-settings', cmsController.getLoginSettings);

// ทุก route ด้านล่างต้อง authenticate + admin
// ใส่ route ที่เป็น path เต็ม (ไม่มี :id) ก่อน route ที่มี :id เพื่อไม่ให้ถูกดักผิด
router.get('/dashboard', authenticateToken, requireAdmin, cmsController.getDashboard);
router.get('/users', authenticateToken, requireAdmin, cmsController.getUsers);
router.get('/users/:id', authenticateToken, requireAdmin, cmsController.getUserById);
router.get('/users/:id/payment-channels', authenticateToken, requireAdmin, cmsController.getUserPaymentChannels);
router.get('/users/:id/pending-payments', authenticateToken, requireAdmin, cmsController.getUserPendingPayments);
router.get('/users/:id/saved-coupon-next-payment', authenticateToken, requireAdmin, cmsController.getUserSavedCouponNextPayment);
router.get('/users/:id/payment-history', authenticateToken, requireAdmin, cmsController.getUserPaymentHistory);
router.patch('/pending-payments/:id/verify', authenticateToken, requireAdmin, cmsController.verifyPendingPayment);
router.get('/admins', authenticateToken, requireAdmin, cmsController.getAdmins);
router.get('/login-history', authenticateToken, requireAdmin, cmsController.getLoginHistory);
router.get('/notifications', authenticateToken, requireAdmin, cmsController.getNotifications);

// ตั้งค่า CMS (โลโก้ + พื้นหลังหน้า Login)
router.get('/settings', authenticateToken, requireAdmin, cmsController.getSettings);
router.put('/settings', authenticateToken, requireAdmin, cmsController.updateSettings);
// อัปโหลดรูปตั้งค่า (แยกโฟลเดอร์ cms/settings กับ cms/qr, แปลงเป็น WebP)
router.post('/upload/settings/logo', authenticateToken, requireAdmin, uploadCmsSettings, handleUploadError, cmsController.uploadSettingsImage);
router.post('/upload/settings/bg', authenticateToken, requireAdmin, uploadCmsSettings, handleUploadError, cmsController.uploadSettingsImage);
router.post('/upload/qr', authenticateToken, requireAdmin, uploadCmsQr, handleUploadError, cmsController.uploadQrImage);

// แทมเพลต (route มี :id อยู่หลัง)
router.get('/templates', authenticateToken, requireAdmin, cmsController.getTemplates);
router.get('/templates/:id', authenticateToken, requireAdmin, cmsController.getTemplateById);
router.post('/templates', authenticateToken, requireAdmin, cmsController.createTemplate);
router.put('/templates/:id', authenticateToken, requireAdmin, cmsController.updateTemplate);
router.patch('/templates/:id/toggle', authenticateToken, requireAdmin, cmsController.toggleTemplate);

router.patch('/users/:id/active', authenticateToken, requireAdmin, cmsController.setUserActive);
router.patch('/users/:id/membership', authenticateToken, requireAdmin, cmsController.updateUserMembership);
router.post('/admins', authenticateToken, requireAdmin, cmsController.createAdmin);

// แพ็กเกจ (สร้าง/แก้ไข)
router.get('/packages', authenticateToken, requireAdmin, cmsController.getPackages);
router.get('/packages/:id', authenticateToken, requireAdmin, cmsController.getPackageById);
router.post('/packages', authenticateToken, requireAdmin, cmsController.createPackage);
router.put('/packages/:id', authenticateToken, requireAdmin, cmsController.updatePackage);

// คูปอง
router.get('/coupons', authenticateToken, requireAdmin, cmsController.getCoupons);
router.get('/coupons/:id', authenticateToken, requireAdmin, cmsController.getCouponById);
router.post('/coupons', authenticateToken, requireAdmin, cmsController.createCoupon);
router.put('/coupons/:id', authenticateToken, requireAdmin, cmsController.updateCoupon);
router.delete('/coupons/:id', authenticateToken, requireAdmin, cmsController.deleteCoupon);

module.exports = router;
