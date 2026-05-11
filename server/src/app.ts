import express, { Application } from "express";
import morgan from "morgan";
import cors from "cors";
import path from "path";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import errorHandler from "./middlewares/errorHandler";
import authRoutes from "./routes/authRoutes";
import adminsRoutes from "./routes/adminsRoutes";
import bannerRoutes from "./routes/bannerRoutes";
import settingsRoutes from "./routes/settingsRoutes";
import socialSettingsRoutes from "./routes/socialSettingsRoutes";
import activityDomainRoutes from "./routes/activityDomainRoutes";
import projectRoutes from "./routes/projectsRoutes";
import articleRoutes from "./routes/articleRoutes";
import eventRoutes from "./routes/eventsRoutes";
import partnerCompanyRoutes from "./routes/partnerCompanyRoutes";
import viewRoutes from "./routes/viewRoutes";
import contactRouter from "./routes/contactRouter";

const app: Application = express();

// Middleware
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

// app.use(
//   cors({
//     origin: ["https://pouyeshjameh.ir", "https://www.pouyeshjameh.ir"],
//     credentials: true,
//   }),
// );

app.use(bodyParser.json({ limit: "100mb" })); // به جای 10mb میتونی کمتر/بیشتر بگیری
app.use(bodyParser.urlencoded({ extended: true, limit: "100mb" }));

app.use(morgan("dev"));

app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

app.use(
  "/uploads/socialIcons",
  express.static(path.join(__dirname, "public/uploads/socialIcons")),
);
app.use(
  "/uploads/bannerImages",
  express.static(path.join(__dirname, "public/uploads/bannerImages")),
);

app.use(
  "/uploads/activityDomains",
  express.static(path.join(__dirname, "public/uploads/activityDomains")),
);
// مسیر درست و case-sensitive
app.use(
  "/uploads/projects",
  express.static(path.join(__dirname, "public/uploads/projects")),
);
app.use(
  "/uploads/articles",
  express.static(path.join(__dirname, "public/uploads/articles")),
);
app.use(
  "/uploads/events",
  express.static(path.join(__dirname, "public/uploads/events")),
);
app.use(
  "/uploads/partners",
  express.static(path.join(__dirname, "public/uploads/partners")),
);

// app.use("/uploads", express.static("uploads"));

app.get("/api/test", (_, res) => {
  res.send("API OK");
});

// Routes
app.use("/api", authRoutes);
app.use("/api/admins", adminsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/socials", socialSettingsRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/activity-domains", activityDomainRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/articles", articleRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/partners", partnerCompanyRoutes);
app.use("/api/views", viewRoutes);
app.use("/api/contact", contactRouter);

// Root route
app.get("/", (req, res) => {
  res.send("Server of officeWeb is running...");
});

// Error handling
app.use(errorHandler);

export default app;
