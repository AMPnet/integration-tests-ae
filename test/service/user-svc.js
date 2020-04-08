let axios = require('axios')
let url = require('url')
let baseUrl = "http://localhost:8125"

async function getJwtToken(user) {
    return axios.post(url.resolve(baseUrl, "token"), {
        login_method: "EMAIL",
        credentials: {
            email: user.email,
            password: user.password
        }
    }).catch(err => {
        console.log("getJwtToken error: ", err)
    })
}

async function getProfile(user) {
    return (
        await axios
            .get(url.resolve(baseUrl, "me"), getBearer(user.token))
            .catch(err => { console.log(err.response) })
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
    getJwtToken,
    getProfile
}
