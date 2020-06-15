const url = require('url');
const axios = require('axios');

const baseUrl = "http://localhost:8128";

axios.interceptors.response.use(undefined, function axiosRetryInterceptor(err) {
    var config = err.config;
    config.retry = 3;
    config.retryDelay = 2000;

    // Retry only middleware
    if(err.response.status != 502) return Promise.reject(err);

    // Set the variable for keeping track of the retry count
    config.__retryCount = config.__retryCount || 0;

    // Check if we've maxed out the total number of retries
    if(config.__retryCount >= config.retry) {
        return Promise.reject(err);
    }
    config.__retryCount += 1;
    console.log(`--- Retry request #${config.__retryCount} ---`);

    // Create new promise to handle exponential backoff
    var backoff = new Promise(function(resolve) {
        setTimeout(function() {
            resolve();
        }, config.retryDelay || 1);
    });

    // Return the promise in which recalls axios to retry the request
    return backoff.then(function() {
        return axios(config);
    });
});

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
            .post(url.resolve(baseUrl, `/cooperative/deposit/${depositId}/transaction`), {}, getBearer(admin.token))
            .catch(err => {
                console.log(err.response)
            })
    ).data
}

async function generateInvestTx(investor, projUuid, amount) {
    return (
        await axios
            .post(url.resolve(baseUrl, `invest/project/${projUuid}`),
                { amount: amount },
                getBearer(investor.token))
            .catch(err => {
                console.log(err)
            })
    ).data
}

async function generateCancelInvestmentsTx(investor, projectUuid) {
    return (await axios.post(
        url.resolve(baseUrl, `invest/project/${projectUuid}/cancel`),
        {},
        getBearer(investor.token)
    ).catch(err => {
        console.log(err)
    })).data
}

async function generateWithdrawTx(user, withdrawId) {
    return (await axios
        .post(url.resolve(baseUrl, `withdraw/${withdrawId}/transaction/approve`), {}, getBearer(user.token))
        .catch(err => {
            console.log(err)
        })
    ).data
}

async function generateBurnTx(admin, withdrawId) {
    return (await axios
        .post(url.resolve(baseUrl, `cooperative/withdraw/${withdrawId}/transaction/burn`), {}, getBearer(admin.token))
        .catch(err => {
            console.log(err)
        })
    ).data
}

async function generateRevenuePayoutTx(admin, projectUuid, amount) {
    return (await axios
        .post(url.resolve(baseUrl, `revenue/payout/project/${projectUuid}`), { amount: amount }, getBearer(admin.token))
        .catch(err => {
            console.log(err)
        })
    ).data
}

async function generateTransferWalletTx(admin, walletAddress, type) {
    return (await axios
        .post(url.resolve(baseUrl, `cooperative/wallet/transfer/transaction`),
            { wallet_address: walletAddress, type: type },
            getBearer(admin.token))
        .catch(err => {
            console.log(err)
        })
    ).data
}

async function broadcastTx(signedTx, txId) {
    return (await axios
        .post(url.resolve(baseUrl, 'tx_broadcast'), { tx_sig: signedTx, tx_id: txId })
    ).data
}

async function getPortfolio(user) {
    return (
        await axios
            .get(url.resolve(baseUrl, `portfolio`), getBearer(user.token))
            .catch(err => {
                console.log(err)
            })
    ).data
}

async function getActiveSellOffers(user) {
    return (
        await axios
            .get(url.resolve(baseUrl, `sell/offer`), getBearer(user.token))
            .catch(err => {
                console.log(err)
            })
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
    generateRevenuePayoutTx,
    generateTransferWalletTx,
    broadcastTx,
    getPortfolio,
    getActiveSellOffers
}
