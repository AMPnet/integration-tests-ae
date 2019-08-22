let chai = require('chai')
let assert = chai.assert
let expect = chai.expect

let docker = require('./util/docker')
let db = require('./util/db')
let ae = require('./util/ae')

let userSvc = require('./service/user-svc')
let backendSvc = require('./service/backend-svc')

let TestUser = require('./model/user').TestUser

describe('Complete flow test', function () {

    before(async () => {
        // await docker.up()

        await db.cleanBackend()
        await db.cleanBlockchain()
        await db.cleanUser()

        await ae.init()
    })

    it('Must be able to execute complete flow', async () => {
        // Create Admin
        let admin = await TestUser.createAdmin('admin@email.com')
        await db.insertUser(admin)
        await admin.getJwtToken()

        // Create user Alice with wallet
        let alice = await TestUser.createRegular('alice@email.com')
        await createUserWithWallet(alice, admin)

        // Create Organization with wallet
        let orgId = await createOrganizationWithWallet('ZEF', alice, admin)

        // Create Project with wallet
        let projId = await createProjectWithWallet('Projekt', alice, orgId, admin)
    })

    async function createUserWithWallet(user, admin) {
        await db.insertUser(user)
        await user.getJwtToken()
        await backendSvc.getUserWallet(user).catch(err => {
            expect(err.response.status).to.equal(404)
        })
        let wallet = await backendSvc.createUserWallet(user)
        expect(wallet).to.not.be.undefined

        // Admin activates Alice's wallet
        await activateWallet(wallet.id, admin)

        // Fetch Alice's balance
        let activatedWallet = await backendSvc.getUserWallet(user)
        expect(activatedWallet.balance).to.equal(0)
    }

    async function createOrganizationWithWallet(name, owner, admin) {
        let orgId = await db.insertOrganization(name, owner)
        await db.insertOrganizationMembership(owner, orgId)

        let createOrgTx = await backendSvc.generateCreateOrgTx(owner, orgId)
        let signedCreateOrgTx = await owner.client.signTransaction(createOrgTx.tx.tx)
        let createOrgTxHash = await backendSvc.broadcastTx(signedCreateOrgTx, createOrgTx.tx_id)
        expect(createOrgTxHash.tx_hash).to.not.be.undefined

        await ae.waitMined(createOrgTxHash.tx_hash)
        
        let unactivatedOrgWallets = await backendSvc.getUnactivatedOrgWallets(admin)
        expect(unactivatedOrgWallets.organizations).to.have.lengthOf(1)
        await activateWallet(unactivatedOrgWallets.organizations[0].wallet.id, admin)
        
        let activatedOrgWallet = await backendSvc.getOrganizationWallet(owner, orgId)
        expect(activatedOrgWallet.balance).to.equal(0)

        return orgId
    }

    async function createProjectWithWallet(name, owner, orgId, admin) {
        let projId = await db.insertProject(name, owner, orgId)

        let createProjTx = await backendSvc.generateCreateProjTx(owner, projId)
        let signedCreateProjTx = await owner.client.signTransaction(createProjTx.tx.tx)
        let createProjTxHash = await backendSvc.broadcastTx(signedCreateProjTx, createProjTx.tx_id)

        await ae.waitMined(createProjTxHash.tx_hash)

        let unactivatedProjWallets = await backendSvc.getUnactivatedProjWallets(admin)
        expect(unactivatedProjWallets.projects).to.have.lengthOf(1)
        await activateWallet(unactivatedOrgWallets.projects[0].wallet.id, admin)

        let activatedProjWallet = await backendSvc.getProjectWallet(owner, projId)
        expect(activatedProjWallet.balance).to.equal(0)

        return projId
    }

    async function activateWallet(walletId, admin) {
        let walletActivationTx = await backendSvc.generateWalletActivationTx(admin, walletId)
        let signedWalletActivationTx = await admin.client.signTransaction(walletActivationTx.tx.tx)
        let walletActivationTxHash = await backendSvc.broadcastTx(signedWalletActivationTx, walletActivationTx.tx_id)
        expect(walletActivationTxHash.tx_hash).to.not.be.undefined

        await ae.waitMined(walletActivationTxHash.tx_hash)
    }

    after(async() => {
        // await docker.down()
    })

})