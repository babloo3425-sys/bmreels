 const express = require("express");
 const cors = require("cors");
 const path = require("path");
 const fs = require("fs");
 const multer = require("multer");
 const mongoose = require("mongoose");
 const app = express();
 const cloudinary = require("cloudinary").v2;
 const { CloudinaryStorage } = require("multer-storage-cloudinary");

app.use(cors());
 app.use(express.json());
 app.use(express.json({ limit: "100mb" }));
 app.use(express.urlencoded({ limit: "100mb", extended: true }));

 app.use((req, res, next) => {
  req.setTimeout(0);
  res.setTimeout(0);
  next();
 });


 cloudinary.config({
  cloud_name: "dzbzbljod",
  api_key: "841846866177438",
  api_secret: "xOtiPO18An2gpd3Ep8CZylvI2dU"
});

console.log("CLOUD:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("KEY:", process.env.CLOUDINARY_API_KEY);
console.log("SECRET:", process.env.CLOUDINARY_API_SECRET);

require("dotenv").config();
  mongoose.connect(process.env.MONGO_URI || "mongodb+srv://bblkumar8_db_user:BBlk1973MMkrSH@cluster0.baicjxm.mongodb.net/?retryWrites=true&w=majority")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("Mongo Error:", err));

 const videoSchema = new mongoose.Schema({
  url: String,
  username: String,
  caption: String,
  userId: String,
  likes: { type: Number, default: 0 },
  comments: { type: [String], default: [] }
 });

 const Video = mongoose.model("Video", videoSchema);

 // ================= FOLLOW MODEL =================

 const followSchema = new mongoose.Schema({
  follower: String,   // kaun follow kar raha
  following: String   // kisko follow kar raha
 });

 const Follow = mongoose.model("Follow", followSchema);

 // ================= USER MODEL =================

 const userSchema = new mongoose.Schema({
  username: String,
  dp: String   // base64 image
 });

 const User = mongoose.model("User", userSchema);

 
 let likesData = {};
 let commentsData = {};
 let reels = []; // अगर पहले से है तो same use करो

 app.post("/deleteReel", (req, res) => {
  const { id } = req.body;

  reels = reels.filter(r => r.id !== id);

  res.json({ success: true });
 });

 app.post("/api/delete-video/:id", async (req, res) => {
  const { username } = req.body;

  const video = await Video.findById(req.params.id);

  if (!video) {
    return res.json({ success: false });
  }

  // 🔐 only owner allowed
  if (video.username !== username) {
    return res.json({ success: false, message: "Not allowed" });
  }

  await Video.findByIdAndDelete(req.params.id);

  res.json({ success: true });
 });

 // 👇 static frontend serve
app.use(express.static(path.join(__dirname, "../public")));


// ✅ FIX HERE
const PORT = process.env.PORT || 3001;
 
app.get("/api/videos", async (req, res) => {
  try {
    // ✅ offset frontend se aayega (scroll ke time increase hoga)
    const offset = parseInt(req.query.offset) || 0;

    // ✅ limit thoda increase kar dete hain (smooth UX ke liye)
    const limit = 10;

    // ✅ MongoDB se videos fetch
    const videos = await Video.find()
      .sort({ _id: -1 }) // latest first
      .skip(offset)      // pagination
      .limit(limit);

    // ✅ IMPORTANT: always array return ho
    res.json({
      success: true,
      count: videos.length,
      data: videos
    });

  } catch (err) {
    console.error("Error fetching videos:", err);
    res.status(500).json({ success: false });
  }
 });

 app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
 // storage config
 const uploadPath = path.join(__dirname, "../public/videos");

 // folder auto create
 if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
 }

 const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: "bmreels",
      resource_type: "video"
    };
  }
});

const upload = multer({ storage });

// get likes
 app.get("/api/likes", (req, res) => {
  res.json(likesData);
 });

 // update like
 app.post("/api/like/:id", async (req, res) => {
  const video = await Video.findById(req.params.id);

  video.likes += 1;
  await video.save();

  res.json({ likes: video.likes });
 });

 // UNLIKE
 app.post("/api/unlike/:id", async (req, res) => {
  const video = await Video.findById(req.params.id);

  if (video.likes > 0) {
    video.likes -= 1;
    await video.save();
  }

  res.json({ likes: video.likes });
 });

 // get comments
 app.get("/api/comments", (req, res) => {
  res.json(commentsData);
 });

 // add comment
 app.post("/api/comment/:id", async (req, res) => {
  const { text } = req.body;

  const video = await Video.findById(req.params.id);

  if (!video.comments) video.comments = [];

  video.comments.push(text);

  await video.save();

  res.json(video.comments);
 });

 // delete comment
 app.post("/api/delete-comment/:id", async (req, res) => {
  const { text } = req.body;

  const video = await Video.findById(req.params.id);

  if (!video.comments) video.comments = [];

  video.comments = video.comments.filter(c => c !== text);

  await video.save();

  res.json(video.comments);
 });

 app.post("/api/upload", upload.single("video"), async (req, res) => {
  try {
    console.log("FILE RECEIVED:", req.file);

    if (!req.file) {
      return res.status(400).json({ error: "File not received" });
    }

    const fileUrl = req.file.path;
    const { caption, username } = req.body;

    await Video.create({
      url: fileUrl,
      username,
      caption,
      userId: username
    });

    res.json({ success: true });

  } catch (err) {
    console.log("UPLOAD ERROR:", err);
    res.status(500).json({ error: "Upload failed" });
  }
 });
 // ================= PROFILE ROUTE =================

 // Get profile data + user videos
   app.get("/api/profile/:username", async (req, res) => {
   try {
    const username = req.params.username;

    // user ke videos
    const videos = await Video.find({ username }).sort({ createdAt: -1 });

    res.json({
      username,
      totalVideos: videos.length,
      videos
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
 });

 // ================= FOLLOW TOGGLE =================

  app.post("/api/follow", async (req, res) => {
  const { follower, following } = req.body;

  if (follower === following) {
    return res.json({ success: false });
  }

  const existing = await Follow.findOne({ follower, following });

  if (existing) {
    // unfollow
    await Follow.deleteOne({ follower, following });
    return res.json({ following: false });
  } else {
    // follow
    await Follow.create({ follower, following });
    return res.json({ following: true });
  }
 });

 // ================= FOLLOW STATUS =================

  app.get("/api/follow-status", async (req, res) => {
  const { follower, following } = req.query;

  const existing = await Follow.findOne({ follower, following });

  res.json({ following: !!existing });
 });

 // followers count
  app.get("/api/followers/:username", async (req, res) => {
  const username = req.params.username;

  const count = await Follow.countDocuments({ following: username });

  res.json({ followers: count });
 });

 // ================= DP UPLOAD =================

  app.post("/api/upload-dp", async (req, res) => {
  const { username, dp } = req.body;

  let user = await User.findOne({ username });

  if (user) {
    user.dp = dp;
    await user.save();
  } else {
    user = await User.create({ username, dp });
  }

  res.json({ success: true });
 });

 // ================= GET DP =================

 app.get("/api/user/:username", async (req, res) => {
  const user = await User.findOne({ username: req.params.username });

  res.json({
    dp: user?.dp || null
  });
 });