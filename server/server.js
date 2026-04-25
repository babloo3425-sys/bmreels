 // ================= IMPORTS =================
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const multer = require("multer");
require("dotenv").config();

const app = express();

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ================= TIMEOUT FIX =================
app.use((req, res, next) => {
  req.setTimeout(0);
  res.setTimeout(0);
  next();
});

// ================= CLOUDINARY CONFIG =================
// ❗ BM FIX: env use karo (security)
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ================= MONGODB =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("Mongo Error:", err));


// ================= SCHEMAS =================

// 🔥 VIDEO
const videoSchema = new mongoose.Schema({
  url: String,
  username: String,
  caption: String,
  userId: String,

  likes: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  comments: { type: [String], default: [] }
  
}, { timestamps: true }); // BM UPDATE

const Video = mongoose.model("Video", videoSchema);


// 🔥 FOLLOW
const followSchema = new mongoose.Schema({
  follower: String,
  following: String
});

const Follow = mongoose.model("Follow", followSchema);


// 🔥 USER
const userSchema = new mongoose.Schema({
  username: String,
  dp: String
});

const User = mongoose.model("User", userSchema);

// ================= LIKE MODEL =================
const likeSchema = new mongoose.Schema({
  user: String,     // kisne like kiya
  videoId: String   // kis video ko like kiya
});

const Like = mongoose.model("Like", likeSchema);

// ================= VIEW MODEL =================
const viewSchema = new mongoose.Schema({
  user: String,
  videoId: String
});

const View = mongoose.model("View", viewSchema);

// ================= API =================

// 🔥 GET VIDEOS (PAGINATION)
app.get("/api/videos", async (req, res) => {
  try {
    const offset = parseInt(req.query.offset) || 0;
    const limit = 10;

    const videos = await Video.find()
    .sort({ views: -1, likes: -1, _id: -1 }) // 🔥 trending logic
    .skip(offset)
    .limit(limit);

    res.json({
      success: true,
      count: videos.length,
      data: videos
    });

  } catch (err) {
    
    console.error("VIDEO FETCH ERROR:", err);
    res.status(500).json({ success: false });
  }
});


// 🔥 SAVE VIDEO
app.post("/api/save-video", async (req, res) => {
  try {

    let { url, username, caption } = req.body;

    if (!url || !username) {
      return res.status(400).json({ success: false });
    }

    // 🔥 CLOUDINARY OPTIMIZATION (MAIN FIX)
    url = url.replace(
      "/upload/",
      "/upload/q_auto:low,f_auto/"
    );

    const newVideo = new Video({
      url,
      username,
      caption
    });

    await newVideo.save();

    res.json({ success: true, video: newVideo });

  } catch (err) {
    console.log("SAVE VIDEO ERROR:", err);
    res.status(500).json({ success: false });
  }
});

// 🔥 DELETE VIDEO (SECURE)
app.post("/api/delete-video/:id", async (req, res) => {
  try {

    const { username } = req.body;
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.json({ success: false });
    }

    if (video.username !== username) {
      return res.json({ success: false, message: "Not allowed" });
    }

    await Video.findByIdAndDelete(req.params.id);

    res.json({ success: true });

  } catch (err) {
    console.log("DELETE ERROR:", err);
    res.status(500).json({ success: false });
  }
});

// ================= COMMENT SYSTEM =================

// ADD COMMENT
app.post("/api/comment/:id", async (req, res) => {
  try {
    const { text } = req.body;

    const video = await Video.findById(req.params.id);
    if (!video) return res.json([]);

    video.comments.push(text);
    await video.save();

    res.json(video.comments);

  } catch (err) {
    console.log("COMMENT ERROR:", err);
    res.status(500).json([]);
  }
});


// DELETE COMMENT
app.post("/api/delete-comment/:id", async (req, res) => {
  try {
    const { text } = req.body;

    const video = await Video.findById(req.params.id);
    if (!video) return res.json([]);

    video.comments = video.comments.filter(c => c !== text);
    await video.save();

    res.json(video.comments);

  } catch (err) {
    console.log("COMMENT DELETE ERROR:", err);
    res.status(500).json([]);
  }
});


// ================= STATIC =================
app.use(express.static(path.join(__dirname, "../public")));


// ================= SERVER =================
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ================= CLOUDINARY STORAGE =================
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => ({
    folder: "bmreels",
    resource_type: "video"
  })
});

const upload = multer({ storage: multer.memoryStorage() });

  // ================= LIKE TOGGLE =================
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

// ================= GET USER LIKES =================
app.get("/api/user-likes/:username", async (req, res) => {
  try {

    const username = req.params.username;

    const likes = await Like.find({ user: username });

    const likedIds = likes.map(l => l.videoId);

    res.json({ liked: likedIds });

  } catch (err) {
    console.log("GET LIKES ERROR:", err);
    res.status(500).json({ liked: [] });
  }
});

// ================= COMMENT SYSTEM =================

// ADD COMMENT
app.post("/api/comment/:id", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) return res.json([]);

    const video = await Video.findById(req.params.id);

    if (!video) return res.json([]);

    video.comments.push(text);
    await video.save();

    res.json(video.comments);

  } catch (err) {
    console.log("COMMENT ERROR:", err);
    res.status(500).json([]);
  }
});


// DELETE COMMENT
app.post("/api/delete-comment/:id", async (req, res) => {
  try {
    const { text } = req.body;

    const video = await Video.findById(req.params.id);

    if (!video) return res.json([]);

    video.comments = video.comments.filter(c => c !== text);
    await video.save();

    res.json(video.comments);

  } catch (err) {
    console.log("COMMENT DELETE ERROR:", err);
    res.status(500).json([]);
  }
});


// ================= SAVE VIDEO =================
app.post("/api/save-video", async (req, res) => {
  try {
    const { url, username, caption } = req.body;

    if (!url || !username) {
      return res.status(400).json({ success: false });
    }

    const video = await Video.create({
      url,
      username,
      caption,
      userId: username
    });

    res.json({ success: true, video });

  } catch (err) {
    console.log("SAVE ERROR:", err);
    res.status(500).json({ success: false });
  }
});

// ================= PROFILE ROUTE =================

// Get profile data + stats + videos
app.get("/api/profile/:username", async (req, res) => {
  try {

    const username = req.params.username;

    // ================= USER VIDEOS =================
    const videos = await Video.find({ username })
      .sort({ createdAt: -1 });

    // ================= FOLLOW STATS =================
    const followers = await Follow.countDocuments({ following: username });
    const following = await Follow.countDocuments({ follower: username });

    res.json({
      success: true,
      username,
      totalVideos: videos.length,
      followers,
      following,
      videos
    });

  } catch (err) {
    console.log("PROFILE ERROR:", err);
    res.status(500).json({ success: false });
  }
});


// ================= FOLLOW TOGGLE =================
app.post("/api/follow", async (req, res) => {
  try {

    const { follower, following } = req.body;

    if (!follower || !following || follower === following) {
      return res.json({ success: false });
    }

    const existing = await Follow.findOne({ follower, following });

    if (existing) {
      // UNFOLLOW
      await Follow.deleteOne({ follower, following });
      return res.json({ following: false });

    } else {
      // FOLLOW
      await Follow.create({ follower, following });
      return res.json({ following: true });
    }

  } catch (err) {
    console.log("FOLLOW ERROR:", err);
    res.status(500).json({ success: false });
  }
});


// ================= FOLLOW STATUS =================
app.get("/api/follow-status", async (req, res) => {
  try {

    const { follower, following } = req.query;

    if (!follower || !following) {
      return res.json({ following: false });
    }

    const existing = await Follow.findOne({ follower, following });

    res.json({ following: !!existing });

  } catch (err) {
    console.log("FOLLOW STATUS ERROR:", err);
    res.status(500).json({ following: false });
  }
});


// ================= FOLLOWERS COUNT =================
app.get("/api/followers/:username", async (req, res) => {
  try {

    const username = req.params.username;

    const count = await Follow.countDocuments({ following: username });

    res.json({ followers: count });

  } catch (err) {
    console.log("FOLLOWERS ERROR:", err);
    res.status(500).json({ followers: 0 });
  }
});


// ================= DP UPLOAD =================
app.post("/api/upload-dp", async (req, res) => {
  try {

    const { username, dp } = req.body;

    if (!username || !dp) {
      return res.json({ success: false });
    }

    let user = await User.findOne({ username });

    if (user) {
      user.dp = dp;
      await user.save();
    } else {
      user = await User.create({ username, dp });
    }

    res.json({ success: true });

  } catch (err) {
    console.log("DP UPLOAD ERROR:", err);
    res.status(500).json({ success: false });
  }
});


// ================= GET USER DP =================
app.get("/api/user/:username", async (req, res) => {
  try {

    const user = await User.findOne({ username: req.params.username });

    res.json({
      dp: user?.dp || null
    });

  } catch (err) {
    console.log("GET DP ERROR:", err);
    res.status(500).json({ dp: null });
  }
});

// ================= VIEW API =================
  app.post("/api/view/:id", async (req, res) => {
  try {

    const { username } = req.body;
    const videoId = req.params.id;

    if (!username) return res.json({ views: 0 });

    const existing = await View.findOne({ user: username, videoId });

    const video = await Video.findById(videoId);
    if (!video) return res.json({ views: 0 });

    if (!existing) {
      await View.create({ user: username, videoId });

      video.views += 1;
      await video.save();
    }

    res.json({ views: video.views });

  } catch (err) {
    console.log("VIEW ERROR:", err);
    res.status(500).json({ views: 0 });
  }
});