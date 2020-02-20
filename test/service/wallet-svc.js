let axios = require('axios')
let url = require('url')
let qs = require('querystring')

let baseUrl = "http://localhost:8128"

async function createUserWallet(user) {
    return (
        await axios
            .post(url.resolve(baseUrl, "wallet"), { public_key: user.keypair.publicKey }, getBearer(user.token))
            .catch(err => {
                console.log(err.response)
            })
    ).data
}

async function getUserWallet(user) {
    return (await axios.get(url.resolve(baseUrl, "wallet"), getBearer(user.token))).data
}

async function getOrganizationWallet(owner, orgUuid) {
    return (
        await axios
            .get(url.resolve(baseUrl, `wallet/organization/${orgUuid}`), getBearer(owner.token))
            .catch(err => {
                console.log(err.response)
            })
    ).data
}

async function getProjectWallet(projUuid) {
    return (
        await axios
            .get(url.resolve(baseUrl, `public/wallet/project/${projUuid}`))
            .catch(err => {
                console.log(err.response)
            })
    ).data
}

async function getUnactivatedUserWallets(admin) {
    return (
        await axios
            .get(url.resolve(baseUrl, 'cooperative/wallet/user'), getBearer(admin.token))
            .catch(err => {
                console.log(err.response)
            })
    ).data
}

async function getUnactivatedOrgWallets(admin) {
    return (
        await axios
            .get(url.resolve(baseUrl, 'cooperative/wallet/organization'), getBearer(admin.token))
            .catch(err => {
                console.log(err.response)
            })
    ).data
}

async function getUnactivatedProjWallets(admin) {
    return (
        await axios
            .get(url.resolve(baseUrl, 'cooperative/wallet/project'), getBearer(admin.token))
            .catch(err => {
                console.log(err.response)
            })
    ).data
}

async function generateWalletActivationTx(admin, walletUuid) {
    return (
        await axios
            .post(url.resolve(baseUrl, `cooperative/wallet/${walletUuid}/transaction`), {}, getBearer(admin.token))
            .catch(err => {
                console.log(err.response)
            })
    ).data
}

async function generateCreateOrgTx(user, orgUuid) {
    return (
        await axios
            .get(url.resolve(baseUrl, `wallet/organization/${orgUuid}/transaction`), getBearer(user.token))
            .catch(err => {
                console.log(err.response)
            })
    ).data
}

async function generateCreateProjTx(user, projUuid) {
    return (
        await axios
            .get(url.resolve(baseUrl, `wallet/project/${projUuid}/transaction`), getBearer(user.token))
            .catch(err => {
                console.log(err.response)
            })
    ).data
}

async function generateMintTx(admin, depositId) {
    return (
        await axios
            .post(url.resolve(baseUrl, `deposit/${depositId}/transaction`), {}, getBearer(admin.token))
            .catch(err => {
                console.log(err.response)
            })
    ).data
}

async function generateInvestTx(investor, projUuid, amount) {
    return (await axios.get(
        url.resolve(baseUrl, `invest/project/${projUuid}?amount=${amount}`),
        getBearer(investor.token)
    ).catch(err => {
        console.log(err)
    })).data
}

async function generateCancelInvestmentsTx(investor, projectUuid) {
    return (await axios.get(
        url.resolve(baseUrl, `invest/project/${projectUuid}/cancel`),
        getBearer(investor.token)
    ).catch(err => {
        console.log(err)
    })).data
}

async function generateWithdrawTx(user, withdrawId) {
    return (await axios.post(
        url.resolve(baseUrl, `withdraw/${withdrawId}/transaction/approve`),
        {},
        getBearer(user.token)
    ).catch(err => {
        console.log(err)
    })).data
}

// TODO: change path: cooperative/withdraw
async function generateBurnTx(admin, withdrawId) {
    return (await axios.post(
        url.resolve(baseUrl, `withdraw/${withdrawId}/transaction/burn`),
        {},
        getBearer(admin.token)
    ).catch(err => {
        console.log(err)
    })).data
}

async function broadcastTx(signedTx, txId) {
    return (await axios.post(
        url.resolve(baseUrl, 'tx_broadcast'), { tx_sig: signedTx, tx_id: txId })
    ).data
}

function getBearer(token) {
    return {
        headers: {
            Authorization: `Bearer ${token}`
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
    generateCancelInvestmentsTx,
    generateWithdrawTx,
    generateBurnTx,
    broadcastTx
}
