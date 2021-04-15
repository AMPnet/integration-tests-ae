const axios = require('axios')
const url = require('url')

const baseUrl = "http://localhost:8300"

async function getImage(imageUrl) {
    return (
        await axios
            .get(url.resolve(baseUrl, imageUrl))
            .catch(err => {
                console.log(err.response)
            })
    )
}

module.exports = {
    getImage
}
