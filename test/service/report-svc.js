let axios = require('axios')
let url = require('url')
let baseUrl = "http://localhost:8129"

async function getTransactionsReport(user) {
    return (
        await axios
            .get(url.resolve(baseUrl, "/report/user/transactions"), getBearer(user.token))
            .catch(err => { console.log(err.response) })
    )
}

function getBearer(token) {
    return {
        headers: {
            Authorization: `Bearer ${token}`
        }
    }
}

module.exports = {
    getTransactionsReport
}
