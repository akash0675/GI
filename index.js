const express = require('express')
const bodyParser = require('body-parser')
const moment = require('moment')
const connection = require('./config/db')
const constants = require('./constants')


const app = express()
const PORT = 3000
app.use(bodyParser.json())

connection.connect((err) => {
  if(err) {
    console.log("error connecting database")
  }
  console.log("database connected")
})

app.get('/', (req, res) => {
  res.json({
    message: "Here Here"
  })
})

app.get('/user', (req, res) => {
  connection.promise().query("SELECT * FROM `users`")
  .then( ([rows,fields]) => {
    console.log(rows);
    res.json(rows)
  })
  .catch(console.log)
})

app.post('/transact', (req, res) => {
  var fromAccountId = req.body.fromAccountId
  var toAccountId = req.body.toAccountId
  var amount = req.body.amount/100
  var getFromAccountPromise = connection.promise().query('SELECT * FROM `accounts` WHERE `accountId` = ?', [fromAccountId])
  var getToAccountPromise = connection.promise().query('SELECT * FROM `accounts` WHERE `accountId` = ?', [toAccountId])

  Promise.all([getFromAccountPromise, getToAccountPromise]).then(result => {
    var fromAccountInfo = result[0][0][0]
    var toAccountInfo = result[1][0][0]

    if(fromAccountInfo.userId === toAccountInfo.userId) {
      res.send({
        message: "Cannot send amount between accounts of the same user"
      })
    }

    if(toAccountInfo.accountType === constants.BASIC_SAVINGS && toAccountInfo.balance + amount >= 50000) {
      res.send({
        message: "Basic Savings Account cannot have balance more than Rs. 50000"
      })
    }

    if(fromAccountInfo.balance < amount) {
      res.send({
        message: "Insufficient Balance"
      })
    }

    else {
      var currentTime = moment().format('YYYY-MM-DD hh:mm:ss')
      var transactionPromise = connection.promise().query('INSERT INTO `transactions` (`accountId`, `credit`, `debit`, `createdAt`) VALUES (?, 0, ?, ?), (?, ?, 0, ?)', [fromAccountId, amount, currentTime, toAccountId, amount, currentTime])
      var updateFromAccountBalancePromise = connection.promise().query('UPDATE `accounts` SET `balance` = ? WHERE `accountId` = ?', [fromAccountInfo.balance-amount, fromAccountId])
      var updateToAccountBalancePromise = connection.promise().query('UPDATE `accounts` SET `balance` = ? WHERE `accountId` = ?', [toAccountInfo.balance+amount, toAccountId])
      var getDestinationUserTotalBalance = connection.promise().query('SELECT SUM(`balance`) AS totalBalance FROM `accounts` WHERE `userId` = ?', [toAccountInfo.userId])
      var getSourceAccountBalance = connection.promise().query('SELECT * FROM `accounts` WHERE `accountId`=?', [fromAccountInfo.userId])

      Promise.all([transactionPromise, updateFromAccountBalancePromise, updateToAccountBalancePromise]).then(transactionResult => {
        Promise.all([getDestinationUserTotalBalance, getSourceAccountBalance]).then(balanceResult => {
          console.log(balanceResult[0][0][0])
          console.log(balanceResult[1][0][0])
          res.send({
            newSrcBalance: balanceResult[1][0][0].balance * 100,
            totalDestBalance: balanceResult[0][0][0].totalBalance * 100,
            transferedAt: currentTime
          })
        })
      }).catch(err => console.log(err))
    }
  })
})



app.listen(PORT, () => {
  console.log("server listening on port 3000")
})
