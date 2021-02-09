const amqp = require('amqplib/callback_api');
let accountActivatedCount = 0;
let depositCount = 0;
let withdrawCount = 0;

function init() {
    amqp.connect('amqp://user:password@localhost', function(error0, connection) {
        if (error0) {
            throw error0;
        }
        handleChannel(connection, 'mail.wallet.activated', function() { accountActivatedCount++; });
        handleChannel(connection, 'mail.wallet.deposit', function() { depositCount++; });
        handleChannel(connection, 'mail.wallet.withdraw-info', function() { withdrawCount++; });
    });
}

function handleChannel(connection, queue, handle) {
    connection.createChannel(function(error1, channel) {
        if (error1) {
            throw error1;
        }

        channel.assertQueue(queue, {
            durable: true
        });

        channel.consume(queue, function(msg) {
            handle();
        }, {
            noAck: true
        });
    });
}

function getWalletActivatedAccount() {
    return accountActivatedCount;
}

function getDepositCount() {
    return depositCount;
}

function getWithdrawCount() {
    return withdrawCount;
}

module.exports = {
    init, getWalletActivatedAccount, getDepositCount, getWithdrawCount
}
