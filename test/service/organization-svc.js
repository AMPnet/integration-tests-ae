const axios = require('axios')
const url = require('url')

let baseUrl = "http://localhost:8124"

async function getProject(uuid) {
    return (
        await axios
            .get(url.resolve(baseUrl, `public/project/${uuid}`))
            .catch(err => {
                console.log(err.response)
            })
    ).data
}

module.exports = {
    getOrganization
}
