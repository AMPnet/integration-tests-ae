let { Universal: Ae, Crypto, Node, MemoryAccount } = require('@aeternity/aepp-sdk')
let { v4: uuid } = require('uuid')

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
        let node = await Node({
            url: 'http://localhost:3013',
            internalUrl: 'http://localhost:3113'
        })

        this.client = await Ae({
            nodes: [
                { name: "node", instance: node } 
            ],
            compilerUrl: 'http://localhost:3080',
            accounts: [
                MemoryAccount({ keypair: this.keypair })
            ],
            address: this.keypair.publicKey,
            networkId: 'ae_docker'
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
            publicKey: "ak_fUq2NesPXcYZ1CcqBcGC3StpdnQw3iVxMA3YSeCNAwfN4myQk",
            secretKey: "7c6e602a94f30e4ea7edabe4376314f69ba7eaa2f355ecedb339df847b6f0d80575f81ffb0a297b7725dc671da0b1769b1fc5cbe45385c7b5ad1fc2eaf1d609d"
        })
        await user.initClient()
        return user
    }

}

module.exports = { TestUser }