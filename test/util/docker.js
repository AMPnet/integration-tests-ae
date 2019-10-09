let path = require('path')

let compose = require('docker-compose')
let Healthcheck = require('@danielwpz/health-check')
let HTTPChecker = Healthcheck.HTTPChecker

const dockerComposeLocation = path.join(__dirname, '..')

const intervalBetweenChecks = 6000 // 6 seconds between every new healthcheck
const maxNumberOfChecks = 30       // maximum of 30 checks after giving up which makes total of 3 minutes waiting time at the worst case

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
    let projectServiceChecker = new HTTPChecker('Project Service checker', 'http://localhost:8123/actuator/health')
    let walletServiceChecker = new HTTPChecker('Wallet Service checker', 'http://localhost:8128/actuator/health')
    let userServiceChecker = new HTTPChecker('User Service checker', 'http://localhost:8125/actuator/health')
    let healthcheck = new Healthcheck([blockchainServiceChecker, projectServiceChecker, walletServiceChecker, userServiceChecker])
    var numberOfChecks = 0
    do {
        if (numberOfChecks >= maxNumberOfChecks) {
            throw new Error('Timeout error: Some docker services failed to start.')
        }
        await sleep(intervalBetweenChecks)
        status = await healthcheck.run()
        numberOfChecks++
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