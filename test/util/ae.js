let { Universal: Ae, Crypto, MemoryAccount, Node } = require('@aeternity/aepp-sdk')
let blockchainSvc = require('../service/blockchain-svc/blockchain-svc')

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function init() {
    let keypair = Crypto.generateKeyPair()

    let node = await Node({
        url: 'http://localhost:3013',
        internalUrl: 'http://localhost:3113'
    })

    aeSender = await Ae({
        nodes: [
            { name: "node", instance: node } 
        ],
        compilerUrl: 'http://localhost:3080',
        accounts: [
            MemoryAccount({ keypair: keypair })
        ],
        address: keypair.publicKey,
        networkId: 'ae_docker'
    })

    await blockchainSvc.init()
}

async function waitMined(txHash) {
    let interval = 1000 //ms
    let maxChecks = 10
    return new Promise(async (resolve) => {
        var attempts = 0
        var state = 'PENDING'
        while(attempts < maxChecks) {
            await sleep(interval)
            info = await blockchainSvc.getTxInfo(txHash)
            if (info.state != 'PENDING') { 
                state = info.state
                break
            }
            attempts++
        }
        if (state == 'PENDING') {
            throw new Error(`Waiting for transaction ${txHash} to be mined timed out.`)
        } else {
            console.log(`Transaction ${txHash} processed. State: ${state}`)
            resolve()
        }
    })
}

function waitTxProcessed(txHash) {
    return new Promise(async (resolve) => {
        let interval = 3000 //ms
        let maxChecks = 50
        var attempts = 0
        let pendingState = 1
        let requiredState = "REQUIRED"
        var txState = pendingState
        var supervisorState = requiredState
        while(attempts < maxChecks) {
            await sleep(interval)
            info = await grpc.getTransactionInfo(txHash)
            if (info.state !== pendingState && info.supervisorStatus !== requiredState) { 
                txState = info.state
                supervisorState = info.supervisorStatus
                break
            }
            attempts++
        }
        if (txState === pendingState) {
            throw new Error(`Waiting for transaction ${txHash} to be mined timed out.`)
        } else if (supervisorState === requiredState) {
            throw new Error(`Waiting for supervisor to process transaction ${txHash} timed out.`)
        } else {
            console.log(`Transaction ${txHash} processed. \n\tTx status: ${txState}\n\tSupervisor status: ${supervisorState}`)
            resolve()
        }
    })
}

module.exports = { init, waitMined, waitTxProcessed, sleep }
