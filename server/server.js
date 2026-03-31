const express = require("express");
const cors = require("cors");
const path = require("path");

const fs = require("fs");
const multer = require("multer");
const mongoose = require("mongoose");

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

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
app.use("/videos", express.static(path.join(__dirname, "../public/videos")));
const PORT = 3001;



app.get("/api/videos", async (req, res) => {
  const offset = parseInt(req.query.offset) || 0;

  const videos = await Video.find()
    .sort({ _id: -1 })
    .skip(offset)
    .limit(5);

  res.json(videos);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/videos");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
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
  const fileUrl = `/videos/${req.file.filename}`;
  const { caption, username } = req.body;

  await Video.create({
    url: fileUrl,
    username,
    caption,
    userId: username
  });

  res.json({ success: true });
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