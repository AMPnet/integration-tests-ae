let axios = require('axios')
let url = require('url')
let qs = require('querystring')

let baseUrl = "http://localhost:8123"

async function getOrganizationMemberships(user, orgUuid) {
    return (await axios.get(url.resolve(baseUrl, `organization/${orgUuid}/members`), getBearer(user.token))).data
}

function getBearer(token) {
    return {
        headers: {
            Authorization: `Bearer ${token}`
        }
    }
}

module.exports = { 
    getOrganizationMemberships
}
