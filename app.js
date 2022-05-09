const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
var http = require("http");
var socketio = require("socket.io");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();

const server = require("http").createServer(app);

const io = new Server(server);

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const usernameMap = new Map();

app.post("/user", (req, res) => {
  const { username } = req.body;
  if (usernameMap.has(username)) {
    res.status(400).send("Username already exists");
  } else {
    res.sendStatus(200);
  }
});

//Socket IO
io.on("connection", (socket) => {
  const username = socket.handshake.query.username;
  console.log(username + " connected");

  usernameMap.set(username, socket.id);

  io.emit("userlist", Array.from(usernameMap.keys()));

  //when user disconnects
  socket.on("disconnect", () => {
    console.log(username + " disconnected");
    usernameMap.delete(username);
    io.emit("userlist", usernameMap.keys());
  });

  socket.on("establishConnection", (params) => {
    console.log(params);
    const { toUsername, publicKey, fromUsername } = params;
    const toUsernameSocket = socket.to(usernameMap.get(toUsername));
    if (toUsernameSocket) {
      toUsernameSocket.emit("establishConnection", {
        publicKey,
        fromUsername,
      });
    }
  });

  socket.on("respondConnection", (params) => {
    console.log(params);
    const { toUsername, publicKey, fromUsername } = params;
    const toUsernameSocket = socket.to(usernameMap.get(toUsername));
    if (toUsernameSocket) {
      toUsernameSocket.emit("respondConnection", {
        publicKey,
        fromUsername,
      });
    }
  });

  socket.on("message", (params) => {
    console.log(params);
    const { toUsername, message } = params;
    const toUsernameSocket = socket.to(usernameMap.get(toUsername));
    if (toUsernameSocket) {
      toUsernameSocket.emit("message", params);
    }
  });
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = { app, server };
