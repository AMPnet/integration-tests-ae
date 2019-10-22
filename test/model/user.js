let { Universal: Ae, Crypto } = require('@aeternity/aepp-sdk')
let uuid = require('uuid/v4')

let userSvc = require('../service/user-svc')

let Role = {
    ADMIN: 1,
    USER: 2
}

class TestUser {

    constructor(email, role, keypair) {
        this.email = email
        this.keypair = keypair || Crypto.generateKeyPair()
        this.uuid = uuid()
        this.password = 'abcdefgh'
        this.passwordSalted = '$2a$10$cHyZss0hacXYrqxmVgsZ2.43ZbnW/Fey2wh1zOUtjfeOZ20loEFyq'
        this.role = role
    }

    async getJwtToken() {
        this.token = (await userSvc.getJwtToken(this)).data.access_token
    }

    async initClient() {
        this.client = await Ae({
            url: 'http://localhost:3013',
            internalUrl: 'http://localhost:3113',
            keypair: this.keypair,
            compilerUrl: 'http://localhost:3080'
        })
    }

    setWalletUuid(walletUuid) {
        this.walletUuid = walletUuid
    }
    
    static async createRegular(email, keypair) {
        let user = new TestUser(email, Role.USER, keypair)
        await user.initClient()
        return user
    }
    
    static async createAdmin(email) {
        let user = new TestUser(email, Role.ADMIN, {
            publicKey: 'ak_2rTfmU3BQHohJvLPoHzRKWijgqbFi4dwYmzVjyqgQrQAQmkhr6',
            secretKey: '2826a2b18d1bb2530341eb28e4e582613cd9d0687e7681c89a34159f39d554c3f40028b9aa6ee6fbcb53135799866edf08b8eb838fe9e56d9691d0963951358f'
        })
        await user.initClient()
        return user
    }

}

module.exports = { TestUser }