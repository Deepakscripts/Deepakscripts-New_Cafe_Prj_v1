// // backend/middleware/admin.js
// export default function adminOnly(req, res, next) {
//   const key = req.headers["x-admin-key"];
//   if (!key || key !== process.env.ADMIN_KEY) {
//     return res.status(401).json({ success: false, message: "Admin only" });
//   }
//   next();
// }
