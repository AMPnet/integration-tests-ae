let axios = require('axios')
let url = require('url')

let baseUrl = "http://localhost:8123"

async function getOrganizationMemberships(user, orgUuid) {
    return (
        await axios
            .get(url.resolve(baseUrl, `organization/${orgUuid}/members`), getBearer(user.token))
            .catch(err => {
                console.log(err.response)
            })
    ).data
}

async function getActiveProjects() {
    return (
        await axios
            .get(url.resolve(baseUrl, `public/project/active`))
            .catch(err => {
                console.log(err.response)
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
    getOrganizationMemberships,
    getActiveProjects
}
