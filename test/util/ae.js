let { Universal: Ae, Crypto } = require('@aeternity/aepp-sdk')

let client

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function init() {
    client = await Ae({
        url: 'https://sdk-testnet.aepps.com/',
        internalUrl: 'https://sdk-testnet.aepps.com',
        keypair: Crypto.generateKeyPair(),
        networkId: 'ae_uat',
        compilerUrl: 'https://compiler.aepps.com'
    })
}

async function waitMined(txHash) {
    return new Promise(async (resolve) => {
        client.poll(txHash).then(async _ => {
            client.getTxInfo(txHash).then(async (info) => {
                console.log(`\nTransaction ${txHash} mined! Status: ${info.returnType}`)
                await sleep(1000)
                resolve()
            })
        })
    })
}

module.exports = { init, waitMined }