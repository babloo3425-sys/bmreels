const mongoose = require("mongoose");

// 👉 apna MongoDB URI
mongoose.connect("mongodb+srv://bblkumar8_db_user:BBlk1973MMkrSH@cluster0.baicjxm.mongodb.net/?retryWrites=true&w=majority");

// 👇 schema define karo (ONLY ONCE)
const videoSchema = new mongoose.Schema({
  url: String,
  username: String,
  caption: String,
});

const Video = mongoose.model("Video", videoSchema);

// 🔥 update logic
async function updateVideos() {
  try {
    const videos = await Video.find();

    for (let video of videos) {

      if (video.url && video.url.includes("/upload/") && !video.url.includes("q_auto")) {

        video.url = video.url.replace(
          "/upload/",
          "/upload/q_auto:low,f_auto/"
        );

        await video.save();
        console.log("Updated:", video.url);
      }
    }

    console.log("✅ All videos updated");
    process.exit();

  } catch (err) {
    console.log("ERROR:", err);
    process.exit(1);
  }
}

updateVideos();