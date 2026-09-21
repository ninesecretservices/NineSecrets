import express from 'express';
const router = express.Router();
import { auth, requireRole, optionalAuth } from './middleware/auth.js';
import { responsedata } from './methods.js';

// ---------------------------------------------------------
// Controller Imports
// ---------------------------------------------------------
import AuthController from './controller/auth.js';
import UserController from './controller/user.js';
import DepartmentController from './controller/department.js';
import ItemController from './controller/item.js';
import DesignController from './controller/design.js';
import ColourController from './controller/colour.js';
import FabricController from './controller/fabric.js';
import FitController from './controller/fit.js';
import SizeController from './controller/size.js';
import ProductController from './controller/product.js';
import CartController from './controller/cart.js';
import OrderController from './controller/order.js';
import UploadController from './controller/upload.js';
import ReviewController from './controller/review.js';
import CouponController from './controller/coupon.js';
import SettingController from './controller/setting.js';
import DescriptionTemplateController from './controller/descriptionTemplate.js';
import AiDescriptionController from './controller/aiDescription.js';
import AuditLogController from './controller/auditLog.js';
import WishlistController from './controller/wishlist.js';
import CustomerController from './controller/customer.js';
import ReportController from './controller/report.js';

// ---------------------------------------------------------
// Controller Instances
// ---------------------------------------------------------
const authController = new AuthController();
const userController = new UserController();
const departmentController = new DepartmentController();
const itemController = new ItemController();
const designController = new DesignController();
const colourController = new ColourController();
const fabricController = new FabricController();
const fitController = new FitController();
const sizeController = new SizeController();
const productController = new ProductController();
const cartController = new CartController();
const orderController = new OrderController();
const uploadController = new UploadController();
const reviewController = new ReviewController();
const couponController = new CouponController();
const settingController = new SettingController();
const descriptionTemplateController = new DescriptionTemplateController();
const aiDescriptionController = new AiDescriptionController();
const auditLogController = new AuditLogController();
const wishlistController = new WishlistController();
const customerController = new CustomerController();
const reportController = new ReportController();

// ---------------------------------------------------------
// Auth Routes
// ---------------------------------------------------------
router.post('/auth/login', authController.login, responsedata);
router.post('/auth/signup', authController.signup, responsedata);
router.post('/auth/refresh-token', authController.refreshToken, responsedata);
router.post('/auth/forgot-password', authController.forgotPassword, responsedata);
router.post('/auth/reset-password', authController.resetPassword, responsedata);
router.post('/auth/logout', auth, authController.logout, responsedata);
router.post('/auth/profile', auth, authController.profile, responsedata);
router.post('/auth/profile-update', auth, authController.profileUpdate, responsedata);
router.post('/auth/delete-account', auth, authController.deleteAccount, responsedata);

// ---------------------------------------------------------
// User (Admin) Routes
// ---------------------------------------------------------
router.post('/user/list', auth, requireRole(['superadmin']), userController.userList, responsedata);
router.post('/user/create', auth, requireRole(['superadmin']), userController.userCreate, responsedata);
router.post('/user/update', auth, requireRole(['superadmin']), userController.userUpdate, responsedata);
router.post('/user/delete', auth, requireRole(['superadmin']), userController.userDelete, responsedata);
router.post('/user/detail', auth, requireRole(['superadmin']), userController.userDetail, responsedata);

// ---------------------------------------------------------
// Audit Log Routes (superadmin only — oversight of every other role's actions)
// ---------------------------------------------------------
router.post('/audit-log/list', auth, requireRole(['superadmin']), auditLogController.auditLogList, responsedata);

// ---------------------------------------------------------
// Customer Management Routes (customer-role accounts only — separate from staff Users)
// ---------------------------------------------------------
router.post('/customer/list', auth, requireRole(['superadmin', 'admin']), customerController.customerList, responsedata);
router.post('/customer/update', auth, requireRole(['superadmin', 'admin']), customerController.customerUpdate, responsedata);

// ---------------------------------------------------------
// Reporting Routes
// ---------------------------------------------------------
router.post('/report/sales', auth, requireRole(['superadmin', 'admin']), reportController.reportSales, responsedata);
router.post('/report/returns', auth, requireRole(['superadmin', 'admin']), reportController.reportReturns, responsedata);

// ---------------------------------------------------------
// Department Routes
// ---------------------------------------------------------
router.post('/department/list', auth, departmentController.departmentList, responsedata);
router.post('/department/create', auth, requireRole(['superadmin','admin','catalog']), departmentController.departmentCreate, responsedata);
router.post('/department/update', auth, requireRole(['superadmin','admin','catalog']), departmentController.departmentUpdate, responsedata);
router.post('/department/delete', auth, requireRole(['superadmin']), departmentController.departmentDelete, responsedata);
router.post('/department/detail', auth, departmentController.departmentDetail, responsedata);

// ---------------------------------------------------------
// Item Routes
// ---------------------------------------------------------
router.post('/item/public-list', itemController.itemList, responsedata); // storefront nav & category carousels
router.post('/item/list', auth, itemController.itemList, responsedata);
router.post('/item/create', auth, requireRole(['superadmin','admin','catalog']), itemController.itemCreate, responsedata);
router.post('/item/update', auth, requireRole(['superadmin','admin','catalog']), itemController.itemUpdate, responsedata);
router.post('/item/delete', auth, requireRole(['superadmin']), itemController.itemDelete, responsedata);
router.post('/item/detail', auth, itemController.itemDetail, responsedata);

// ---------------------------------------------------------
// Design Routes
// ---------------------------------------------------------
router.post('/design/list', auth, designController.designList, responsedata);
router.post('/design/create', auth, requireRole(['superadmin','admin','catalog']), designController.designCreate, responsedata);
router.post('/design/update', auth, requireRole(['superadmin','admin','catalog']), designController.designUpdate, responsedata);
router.post('/design/delete', auth, requireRole(['superadmin']), designController.designDelete, responsedata);
router.post('/design/detail', auth, designController.designDetail, responsedata);

// ---------------------------------------------------------
// Colour Routes
// ---------------------------------------------------------
router.post('/colour/public-list', colourController.colourList, responsedata); // storefront collection filter swatches
router.post('/colour/list', auth, colourController.colourList, responsedata);
router.post('/colour/create', auth, requireRole(['superadmin','admin','catalog']), colourController.colourCreate, responsedata);
router.post('/colour/update', auth, requireRole(['superadmin','admin','catalog']), colourController.colourUpdate, responsedata);
router.post('/colour/delete', auth, requireRole(['superadmin']), colourController.colourDelete, responsedata);
router.post('/colour/detail', auth, colourController.colourDetail, responsedata);

// ---------------------------------------------------------
// Fabric Routes
// ---------------------------------------------------------
router.post('/fabric/list', auth, fabricController.fabricList, responsedata);
router.post('/fabric/create', auth, requireRole(['superadmin','admin','catalog']), fabricController.fabricCreate, responsedata);
router.post('/fabric/update', auth, requireRole(['superadmin','admin','catalog']), fabricController.fabricUpdate, responsedata);
router.post('/fabric/delete', auth, requireRole(['superadmin']), fabricController.fabricDelete, responsedata);
router.post('/fabric/detail', auth, fabricController.fabricDetail, responsedata);

// ---------------------------------------------------------
// Fit Routes
// ---------------------------------------------------------
router.post('/fit/public-list', fitController.fitList, responsedata); // storefront collection filter pills
router.post('/fit/list', auth, fitController.fitList, responsedata);
router.post('/fit/create', auth, requireRole(['superadmin','admin','catalog']), fitController.fitCreate, responsedata);
router.post('/fit/update', auth, requireRole(['superadmin','admin','catalog']), fitController.fitUpdate, responsedata);
router.post('/fit/delete', auth, requireRole(['superadmin']), fitController.fitDelete, responsedata);
router.post('/fit/detail', auth, fitController.fitDetail, responsedata);

// ---------------------------------------------------------
// Size Routes
// ---------------------------------------------------------
router.post('/size/public-list', sizeController.sizeList, responsedata); // storefront collection filter pills
router.post('/size/list', auth, sizeController.sizeList, responsedata);
router.post('/size/create', auth, requireRole(['superadmin','admin','catalog']), sizeController.sizeCreate, responsedata);
router.post('/size/update', auth, requireRole(['superadmin','admin','catalog']), sizeController.sizeUpdate, responsedata);
router.post('/size/delete', auth, requireRole(['superadmin']), sizeController.sizeDelete, responsedata);
router.post('/size/detail', auth, sizeController.sizeDetail, responsedata);

// ---------------------------------------------------------
// Product Routes
// ---------------------------------------------------------
// Some product list routes might be public (optionalAuth) on storefront
router.post('/product/public-list', optionalAuth, productController.productList, responsedata);
router.post('/product/public-detail', optionalAuth, productController.productDetail, responsedata);

// Admin product routes
router.post('/product/list', auth, productController.productList, responsedata);
router.post('/product/create', auth, requireRole(['superadmin','admin','catalog']), productController.productCreate, responsedata);
router.post('/product/update', auth, requireRole(['superadmin','admin','catalog']), productController.productUpdate, responsedata);
router.post('/product/delete', auth, requireRole(['superadmin']), productController.productDelete, responsedata);
router.post('/product/duplicate', auth, requireRole(['superadmin','admin','catalog']), productController.productDuplicate, responsedata);
router.post('/product/bulk-price-update', auth, requireRole(['superadmin','admin','catalog']), productController.bulkPriceUpdate, responsedata);
router.post('/product/detail', auth, productController.productDetail, responsedata);
router.post('/product/stock-import', auth, requireRole(['superadmin','admin','catalog']), productController.stockImport, responsedata);
router.post('/product/bulk-import', auth, requireRole(['superadmin','admin','catalog']), productController.bulkImport, responsedata);
router.post('/product/ai-description', auth, requireRole(['superadmin','admin','catalog']), aiDescriptionController.generateDescription, responsedata);

// ---------------------------------------------------------
// Description Template Routes (reusable snippets for the product Description field)
// ---------------------------------------------------------
router.post('/description-template/list', auth, descriptionTemplateController.descriptionTemplateList, responsedata);
router.post('/description-template/create', auth, requireRole(['superadmin','admin','catalog']), descriptionTemplateController.descriptionTemplateCreate, responsedata);
router.post('/description-template/update', auth, requireRole(['superadmin','admin','catalog']), descriptionTemplateController.descriptionTemplateUpdate, responsedata);
router.post('/description-template/delete', auth, requireRole(['superadmin']), descriptionTemplateController.descriptionTemplateDelete, responsedata);
router.post('/description-template/detail', auth, descriptionTemplateController.descriptionTemplateDetail, responsedata);

// ---------------------------------------------------------
// Cart Routes
// ---------------------------------------------------------
router.post('/cart/detail', auth, cartController.cartDetail, responsedata);
router.post('/cart/update', auth, cartController.cartUpdate, responsedata);

// ---------------------------------------------------------
// Wishlist Routes
// ---------------------------------------------------------
router.post('/wishlist/list', auth, wishlistController.wishlistList, responsedata);
router.post('/wishlist/toggle', auth, wishlistController.wishlistToggle, responsedata);
router.post('/wishlist/merge', auth, wishlistController.wishlistMerge, responsedata);

// ---------------------------------------------------------
// Order Routes
// ---------------------------------------------------------
router.post('/order/list', auth, orderController.orderList, responsedata);
router.post('/order/razorpay-order', auth, orderController.paymentCreateRazorpayOrder, responsedata);
router.post('/order/create', auth, orderController.orderCreate, responsedata);
router.post('/order/create-manual', auth, requireRole(['superadmin','admin','fulfillment']), orderController.orderCreateManual, responsedata);
router.post('/order/detail', auth, orderController.orderDetail, responsedata);
router.post('/order/invoice', auth, orderController.orderInvoice); // binary PDF response — no responsedata wrapper
router.post('/order/update', auth, requireRole(['superadmin','admin','fulfillment']), orderController.orderUpdate, responsedata);
router.post('/order/cancel', auth, orderController.orderCancel, responsedata);
router.post('/order/return-request', auth, orderController.returnRequest, responsedata);
router.post('/order/return-update', auth, requireRole(['superadmin','admin','fulfillment']), orderController.returnUpdate, responsedata);
router.post('/order/stats', auth, requireRole(['superadmin','admin','fulfillment']), orderController.orderStats, responsedata);

// ---------------------------------------------------------
// Review Routes
// ---------------------------------------------------------
router.post('/review/list', reviewController.reviewList, responsedata);
router.post('/review/stats', reviewController.reviewStats, responsedata); // aggregate rating for the storefront
router.post('/review/featured', reviewController.reviewFeatured, responsedata); // top quotes for the homepage testimonials strip
router.post('/review/create', auth, reviewController.reviewCreate, responsedata);
router.post('/review/delete', auth, requireRole(['superadmin','admin']), reviewController.reviewDelete, responsedata);

// ---------------------------------------------------------
// Coupon Routes
// ---------------------------------------------------------
router.post('/coupon/list', auth, requireRole(['superadmin','admin']), couponController.couponList, responsedata);
router.post('/coupon/create', auth, requireRole(['superadmin','admin']), couponController.couponCreate, responsedata);
router.post('/coupon/update', auth, requireRole(['superadmin','admin']), couponController.couponUpdate, responsedata);
router.post('/coupon/delete', auth, requireRole(['superadmin']), couponController.couponDelete, responsedata);
router.post('/coupon/apply', auth, couponController.couponApply, responsedata);

// ---------------------------------------------------------
// Setting Routes (storefront content)
// ---------------------------------------------------------
router.post('/setting/public-detail', settingController.settingPublicDetail, responsedata);
router.post('/setting/preview-detail', auth, requireRole(['superadmin','admin']), settingController.settingPreviewDetail, responsedata);
// Editing storefront content & store config is superadmin-only.
router.post('/setting/detail', auth, requireRole(['superadmin']), settingController.settingDetail, responsedata);
router.post('/setting/save-draft', auth, requireRole(['superadmin']), settingController.settingSaveDraft, responsedata);
router.post('/setting/publish', auth, requireRole(['superadmin']), settingController.settingPublish, responsedata);
router.post('/setting/revert', auth, requireRole(['superadmin']), settingController.settingRevert, responsedata);

// ---------------------------------------------------------
// Upload Routes
// ---------------------------------------------------------
import upload from './middleware/upload.js';
router.post('/upload/image', auth, upload.single('image'), uploadController.uploadImage, responsedata);
router.post('/upload/delete', auth, requireRole(['superadmin', 'admin', 'catalog']), uploadController.deleteImage, responsedata);

export default router;
