const amqp = require('amqplib/callback_api');

let walletActivations = [];
let deposits = [];
let withdraws = [];
let projectsFunded = [];
let projectInvestments = [];

function init() {
    amqp.connect('amqp://user:password@localhost', function(error0, connection) {
        if (error0) {
            throw error0;
        }
        handleChannel(connection, 'mail.wallet.activated', function(message) { walletActivations.push(message); });
        handleChannel(connection, 'mail.wallet.deposit', function(message) { deposits.push(message); });
        handleChannel(connection, 'mail.wallet.withdraw-info', function(message) { withdraws.push(message); });
        handleChannel(connection, 'mail.middleware.project-funded', function(message) { projectsFunded.push(message); });
        handleChannel(connection, 'mail.middleware.project-invested', function(message) { projectInvestments.push(message); });
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

        channel.consume(queue, function(message) {
            handle(message.content.toString());
        }, {
            noAck: true
        });
    });
}

function getWalletActivations() {
    return walletActivations
}

function getProjectInvestments() {
    return projectInvestments;
}

function getProjectsFunded() {
    return projectsFunded;
}

function getDeposits() {
    return deposits;
}

function getWithdraws() {
    return withdraws;
}

module.exports = {
    init, getWalletActivations, getDeposits, getWithdraws, getProjectInvestments, getProjectsFunded
}
