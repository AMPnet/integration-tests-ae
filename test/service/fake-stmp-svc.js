const url = require('url');
const axios = require('axios');

const baseUrl = "http://localhost:1080";

async function getMails() {
    return (await axios.get(url.resolve(baseUrl, "api/emails"))).data
}

async function deleteAll() {
    return (await axios.delete(url.resolve(baseUrl, "api/emails")))
}

module.exports = {
    getMails,
    deleteAll
}
