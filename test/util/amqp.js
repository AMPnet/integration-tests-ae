const amqp = require('amqplib');

let connection;

let walletActivations = [];
let deposits = [];
let withdraws = [];
let projectsFunded = [];
let projectInvestments = [];

async function init() {
    connection = await amqp.connect('amqp://user:password@localhost');
    const channel = await connection.createChannel();
    await handleChannel(channel, 'mail.wallet.activated', function(message) { walletActivations.push(message); });
    await handleChannel(channel, 'mail.wallet.deposit', function(message) { deposits.push(message); });
    await handleChannel(channel, 'mail.wallet.withdraw-info', function(message) { withdraws.push(message); });
    await handleChannel(channel, 'mail.middleware.project-funded', function(message) { projectsFunded.push(message); });
    await handleChannel(channel, 'mail.middleware.project-invested', function(message) { projectInvestments.push(message); });
}

async function stop() {
    return connection.close();
}

async function handleChannel(channel, queue, handle) {
    await channel.assertQueue(queue, {
        durable: true
    })
    await channel.purgeQueue(queue)
    return channel.consume(queue, (msg) => {
        handle(msg.content.toString());
    }, {
        noAck: true
    })
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
    init, stop, getWalletActivations, getDeposits, getWithdraws, getProjectInvestments, getProjectsFunded
}
