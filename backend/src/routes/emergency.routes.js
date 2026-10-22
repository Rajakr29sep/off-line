import { Router } from "express";
const router = Router();
const categories = [
  { id:"medical", facilityType:"hospital" }, { id:"fire", facilityType:"fire_station" },
  { id:"flood", facilityType:"shelter" }, { id:"natural-disasters", facilityType:"shelter" },
  { id:"transport", facilityType:"hospital" }, { id:"personal-safety", facilityType:"police" },
  { id:"hazardous-materials", facilityType:"fire_station" }, { id:"infrastructure", facilityType:"hospital" },
  { id:"search-rescue", facilityType:"shelter" }, { id:"community", facilityType:"hospital" }
];
router.get("/", (_req, res) => res.json({ categories }));
export default router;
