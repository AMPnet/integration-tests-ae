let axios = require('axios')
let url = require('url')
let qs = require('querystring')

let baseUrl = "http://localhost:8128"

async function createUserWallet(user) {
    return (await axios.post(url.resolve(baseUrl, "wallet"), {
        public_key: user.keypair.publicKey
    }, getBearer(user.token))).data
}

async function getUserWallet(user) {
    return (await axios.get(url.resolve(baseUrl, "wallet"), getBearer(user.token))).data
}

async function getOrganizationWallet(owner, orgUuid) {
    return (await axios.get(url.resolve(baseUrl, `wallet/organization/${orgUuid}`), getBearer(owner.token))).data
}

async function getProjectWallet(projUuid) {
    return (await axios.get(url.resolve(baseUrl, `public/wallet/project/${projUuid}`))).data
}

async function getUnactivatedUserWallets(admin) {
    return (await axios.get(url.resolve(baseUrl, 'cooperative/wallet/user'), getBearer(admin.token))).data
}

async function getUnactivatedOrgWallets(admin) {
    return (await axios.get(url.resolve(baseUrl, 'cooperative/wallet/organization'), getBearer(admin.token))).data
}

async function getUnactivatedProjWallets(admin) {
    return (await axios.get(url.resolve(baseUrl, 'cooperative/wallet/project'), getBearer(admin.token))).data
}

async function generateWalletActivationTx(admin, walletUuid) {
    return (await axios.post(url.resolve(baseUrl, `cooperative/wallet/${walletUuid}/transaction`), {}, getBearer(admin.token))).data
}

async function generateCreateOrgTx(user, orgUuid) {
    return (await axios.get(url.resolve(baseUrl, `wallet/organization/${orgUuid}/transaction`), getBearer(user.token))).data
}

async function generateCreateProjTx(user, projUuid) {
    return (await axios.get(url.resolve(baseUrl, `wallet/project/${projUuid}/transaction`), getBearer(user.token))).data
}

async function generateMintTx(admin, depositId) {
    return (await axios.post(url.resolve(baseUrl, `deposit/${depositId}/transaction`), {}, getBearer(admin.token))).data
}

async function generateInvestTx(investor, projUuid, amount) {
    return (await axios.get(
        url.resolve(baseUrl, `invest/project/${projUuid}?amount=${amount}`),
        getBearer(investor.token)
    ).catch(err => {
        console.log(err)
    })).data
}

async function broadcastTx(signedTx, txId) {
    let params = qs.stringify({
        tx_sig: signedTx,
        tx_id: txId
    })
    return (await axios.post(url.resolve(baseUrl, 'tx_broadcast'), params, getUrlEncodedContentType())).data
}

function getBearer(token) {
    return {
        headers: {
            Authorization: `Bearer ${token}`
        }
    }
}

function getUrlEncodedContentType() {
    return {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }
}

module.exports = { 
    createUserWallet,
    getUserWallet,
    getOrganizationWallet,
    getProjectWallet,
    getUnactivatedUserWallets,
    getUnactivatedOrgWallets,
    getUnactivatedProjWallets,
    generateWalletActivationTx,
    generateCreateOrgTx,
    generateCreateProjTx,
    generateMintTx,
    generateInvestTx,
    broadcastTx
}