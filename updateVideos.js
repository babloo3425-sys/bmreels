const mongoose = require("mongoose");

// 👉 अपना MongoDB URL डालो
mongoose.connect("YOUR_MONGO_URI");

const Video = require("./models/Video"); // path check करो

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