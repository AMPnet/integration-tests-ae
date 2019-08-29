let axios = require('axios')
let url = require('url')
let qs = require('querystring')

let baseUrl = "http://localhost:8123"

async function createUserWallet(user) {
    return (await axios.post(url.resolve(baseUrl, "wallet"), {
        public_key: user.keypair.publicKey
    }, getBearer(user.token))).data
}

async function getOrganizationMemberships(user, orgId) {
    return (await axios.get(url.resolve(baseUrl, `organization/${orgId}/members`), getBearer(user.token))).data
}

async function getUserWallet(user) {
    return (await axios.get(url.resolve(baseUrl, "wallet"), getBearer(user.token))).data
}

async function getOrganizationWallet(owner, orgId) {
    return (await axios.get(url.resolve(baseUrl, `wallet/organization/${orgId}`), getBearer(owner.token))).data
}

async function getProjectWallet(projId) {
    return (await axios.get(url.resolve(baseUrl, `public/wallet/project/${projId}`))).data
}

async function getUnactivatedOrgWallets(admin) {
    return (await axios.get(url.resolve(baseUrl, 'cooperative/wallet/organization'), getBearer(admin.token))).data
}

async function getUnactivatedProjWallets(admin) {
    return (await axios.get(url.resolve(baseUrl, 'cooperative/wallet/project'), getBearer(admin.token))).data
}

async function generateWalletActivationTx(admin, walletId) {
    return (await axios.post(url.resolve(baseUrl, `cooperative/wallet/${walletId}/transaction`), {}, getBearer(admin.token))).data
}

async function generateCreateOrgTx(user, orgId) {
    return (await axios.get(url.resolve(baseUrl, `wallet/organization/${orgId}/transaction`), getBearer(user.token))).data
}

async function generateCreateProjTx(user, projId) {
    return (await axios.get(url.resolve(baseUrl, `wallet/project/${projId}/transaction`), getBearer(user.token))).data
}

async function generateMintTx(admin, depositId) {
    return (await axios.post(url.resolve(baseUrl, `api/v1/deposit/${depositId}/transaction`), {}, getBearer(admin.token))).data
}

async function generateInvestTx(investor, projId, amount) {
    return (await axios.get(
        url.resolve(baseUrl, `project/${projId}/invest?amount=${amount}`),
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
    getOrganizationMemberships,
    getUserWallet,
    getOrganizationWallet,
    getProjectWallet,
    getUnactivatedOrgWallets,
    getUnactivatedProjWallets,
    generateWalletActivationTx,
    generateCreateOrgTx,
    generateCreateProjTx,
    generateMintTx,
    generateInvestTx,
    broadcastTx
}
