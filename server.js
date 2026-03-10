const express = require("express");
const path = require("path");
const fileupload = require("express-fileupload");

let initial_path = path.join(__dirname, "public");

const app = express();

app.use(express.json());
app.use(fileupload());

// Routes (must come before static to handle custom routes)
app.get("/", (req, res) => res.sendFile(path.join(initial_path, "home.html")));
app.get("/login", (req, res) => res.sendFile(path.join(initial_path, "login.html")));
app.get("/signup", (req, res) => res.sendFile(path.join(initial_path, "signup.html")));
app.get("/editor", (req, res) => res.sendFile(path.join(initial_path, "editor.html")));
app.get("/profile", (req, res) => res.sendFile(path.join(initial_path, "profile.html")));
app.get("/blog", (req, res) => res.sendFile(path.join(initial_path, "blog.html")));
app.get("/blog/:id", (req, res) => res.sendFile(path.join(initial_path, "blog-details.html")));
app.get("/author/:id", (req, res) => res.sendFile(path.join(initial_path, "author.html")));

// Serve static files after routes
app.use(express.static(initial_path));

app.post("/upload", (req, res) => {
  let file = req.files.image;
  let date = new Date();
  let imagename = date.getDate() + date.getTime() + file.name;
  let uploadPath = path.join(__dirname, "public", "uploads", imagename);

  file.mv(uploadPath, (err) => {
    if (err) return res.status(500).json("Error occurred during upload");
    res.json(`uploads/${imagename}`);
  });
});

app.listen(3000, () =>
  console.log("Server is running on http://localhost:3000"),
);

