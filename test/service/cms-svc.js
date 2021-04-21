let axios = require('axios')
let url = require('url')

let baseUrl = "http://localhost:8131"

async function getMail(coop, mailType, lang) {
    return (
        await axios
            .get(url.resolve(baseUrl, `mail/${coop}?type=${mailType}&lang=${lang}`))
            .catch(err => {
                console.log(err.response)
            })
    ).data
}

async function updateMail(admin, coop, mailType, lang, content, title) {
    return (
        await axios
            .post(url.resolve(baseUrl, `mail/${coop}/${mailType}/${lang}`),
                generateMailUpdateRequest(title, content), getBearer(admin.token)
            )
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

function generateMailUpdateRequest(title, content) {
    return {
        title: title,
        content: content
    }
}

module.exports = { getMail, updateMail }
