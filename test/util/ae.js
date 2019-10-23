let { Universal: Ae, Crypto } = require('@aeternity/aepp-sdk')

let client

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function init() {
    client = await Ae({
        url: 'http://localhost:3013',
        internalUrl: 'http://localhost:3113',
        keypair: Crypto.generateKeyPair(),
        compilerUrl: 'http://localhost:3080'
    })
}

async function waitMined(txHash) {
    return new Promise(async (resolve) => {
        client.poll(txHash).then(async _ => {
            client.getTxInfo(txHash).then(async (info) => {
                console.log(`\nTransaction ${txHash} mined! Status: ${info.returnType}`)
                await sleep(2000)
                resolve()
            })
        })
    })
}

module.exports = { init, waitMined }