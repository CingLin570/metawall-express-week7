const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });
const usersRouter = require('./routes/users');
const postRouter = require('./routes/posts');
const filesRouter = require('./routes/files');
const swaggerUI = require('swagger-ui-express');
const swaggerFile = require('./swagger-output.json');

const app = express();
require('./connection');
// 程式出現重大錯誤時
process.on('uncaughtException', (err) => {
  // 記錄錯誤下來，等到服務都處理完後，停掉該 process
  console.error('Uncaughted Exception！');
  console.error(err);
  process.exit(1);
});

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// 調整 RESTful api
app.use('/', usersRouter);
app.use('/', postRouter);
app.use('/', filesRouter);
app.use('/api-doc', swaggerUI.serve, swaggerUI.setup(swaggerFile));

// 404 錯誤
app.use(function (req, res, next) {
  res.status(404).json({
    status: 'error',
    message: '無此路由資訊',
  });
});

// express 錯誤處理
// 自己設定的 err 錯誤
const resErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      message: err.message,
    });
  } else {
    // log 紀錄
    console.error('出現重大錯誤', err);
    // 送出罐頭預設訊息
    res.status(500).json({
      status: 'error',
      message: '系統錯誤，請恰系統管理員',
    });
  }
};
// 開發環境錯誤
const resErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    message: err.message,
    error: err,
    stack: err.stack,
  });
};
// 錯誤處理
app.use(function (err, req, res, next) {
  // dev
  err.statusCode = err.statusCode || 500;
  if (process.env.NODE_ENV === 'dev') {
    return resErrorDev(err, res);
  }
  // production
  if (err.name === 'ValidationError') {
    err.message = '資料欄位未填寫正確，請重新輸入！';
    err.isOperational = true;
    return resErrorProd(err, res);
  }
  resErrorProd(err, res);
});

// 未捕捉到的 catch
process.on('unhandledRejection', (err, promise) => {
  console.error('未捕捉到的 rejection：', promise, '原因：', err);
});
module.exports = app;
