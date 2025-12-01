// backend/routes/analyticsRoute.js
import express from "express";
// import adminOnly from "../middleware/admin.js";
import {
  newCustomers,
  repeatRate,
  dishRank,
  revenueByWeek,
  popularCombos,
  revenueTotal,
  dishNameMap,
  contactsByRange, // NEW
} from "../controllers/analyticsController.js";

const router = express.Router();

router.get("/new-customers", newCustomers);
router.get("/repeat-rate", repeatRate);
router.get("/top-dishes", (req, res, next) => { req.query.order = "desc"; next(); }, dishRank);
router.get("/least-dishes", (req, res, next) => { req.query.order = "asc"; next(); }, dishRank);
router.get("/revenue-month", revenueByWeek);
router.get("/popular-combos", popularCombos);
router.get("/revenue-total", revenueTotal);
router.get("/dish-name-map", dishNameMap);

// NEW: export unique contacts for a date range (based on orders)
router.get("/contacts", contactsByRange);

export default router;
