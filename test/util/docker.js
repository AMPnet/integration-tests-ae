let path = require('path')

let compose = require('docker-compose')
let Healthcheck = require('@danielwpz/health-check')
let HTTPChecker = Healthcheck.HTTPChecker

const dockerComposeLocation = path.join(__dirname, '..')

const sleep = time => new Promise(resolve => setTimeout(resolve, time))

async function up() {
    await compose.upAll({
        cwd: dockerComposeLocation,
        log: true
    }).catch(err => {
        console.log("docker-compose up error: ", err)
    })
    await healthcheck()
}

async function down() {
    await compose.down({
        cwd: dockerComposeLocation,
        log: true
    }).catch(err => {
        console.log("docker-compose down error: ", err)
    })
}

async function healthcheck() {
    let blockchainServiceChecker = new HTTPChecker('Blockchain Service checker', 'http://localhost:8124/metrics')
    let backendServiceChecker = new HTTPChecker('Backend Service checker', 'http://localhost:8123/actuator/health')
    let userServiceChecker = new HTTPChecker('User Service checker', 'http://localhost:8125/actuator/health')
    let healthcheck = new Healthcheck([blockchainServiceChecker, backendServiceChecker, userServiceChecker])
    do {
        await sleep(7000)
        status = await healthcheck.run()
        console.log(status)
    } while(
        !status
            .map(s => { return s.healthy })
            .reduce((prev, current) => { return prev && current })
    )
}

module.exports = {
    up, down
}