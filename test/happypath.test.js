let chai = require('chai')
let assert = chai.assert
let expect = chai.expect

let docker = require('./util/docker')
let db = require('./util/db')
let ae = require('./util/ae')
let time = require('./util/time')

let backendSvc = require('./service/backend-svc')

let TestUser = require('./model/user').TestUser

describe('Complete flow test', function () {

    before(async () => {
        await docker.up()
        await ae.init()
    })

    beforeEach(async () => {
        await db.cleanBackend()
        await db.cleanBlockchain()
        await db.cleanUser()
    })

    it('Must be able to execute complete flow', async () => {
        // Create Admin
        let admin = await TestUser.createAdmin('admin@email.com')
        await db.insertUser(admin)
        await admin.getJwtToken()

        // Create user Alice with wallet
        let aliceKeypair = {
            publicKey: 'ak_2RixP34RH4CtWQvy5TkKmxACjMYcvEjwPqxXz5V6kxHsuzhPD9',
            secretKey: 'a03e0135c1d9a3352900f667b4dc57e688381cd34e72fa70e5aff30dadb37a77bbd560afdbc683ba818ac94b5893947e9977edd7ee92b659080c8f1658621618'
        }
        let alice = await TestUser.createRegular('alice@email.com', aliceKeypair)
        await createUserWithWallet(alice, admin)

        // Alice creates Organization with wallet
        let orgId = await createOrganizationWithWallet('ZEF', alice, admin)

        // Alice Project with wallet
        let projId = await createProjectWithWallet('Projekt', alice, orgId, admin)

        // Create user Bob with wallet and mint tokens
        let bobKeypair = {
            publicKey: 'ak_252DNaXH299yuTGA2Bmq6i6ZEtWEkSGxyQCFyk5WQKC3sWnxiM',
            secretKey: 'b91ba1f0e4479194c10bd964610a394f02d8ecf693819e3767b65328a39152598cd37a40294e5fc7faaa7b469f447fc724d0a2b28dcdc167032dcd4a1d90d8af'
        }
        let bob = await TestUser.createRegular('bob@email.com', bobKeypair)
        let bobDepositAmount = 100000
        await createUserWithWallet(bob, admin)
        await mint(bob, bobDepositAmount, admin)

        // Check bob balance
        let bobBalance = (await backendSvc.getUserWallet(bob)).balance
        expect(bobBalance).to.equal(bobDepositAmount)
        
        // Bob invests in Alice's project
        let bobInvestAmount = 100000
        await invest(bob, projId, bobInvestAmount)

        // Assert that investment was transferred to project wallet
        console.log("Sleeping 5 seconds")
        await time.sleep(5000)

        let projectBalance = (await backendSvc.getProjectWallet(projId)).balance
        expect(projectBalance).to.equal(bobInvestAmount)
    })

    it('User service integration', async () => {
        let owner = await TestUser.createRegular('owner@org.com')
        await db.insertUser(owner)
        await owner.getJwtToken()

        let member = await TestUser.createRegular('member@org.com')
        await db.insertUser(member)
        await member.getJwtToken()

        let orgId = await db.insertOrganization('Uber org', owner)
        await db.insertOrganizationMembership(owner, orgId)
        await db.insertOrganizationMembership(member, orgId)

        let members = (await backendSvc.getOrganizationMemberships(owner, orgId)).members
        expect(members).to.have.lengthOf(1)
        let orgMember = members[0]
        expect(orgMember.uuid).to.equal(member.uuid)
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
        let signedCreateOrgTx = await owner.client.signTransaction(createOrgTx.tx)
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
        let signedCreateProjTx = await owner.client.signTransaction(createProjTx.tx)
        let createProjTxHash = await backendSvc.broadcastTx(signedCreateProjTx, createProjTx.tx_id)

        await ae.waitMined(createProjTxHash.tx_hash)

        let unactivatedProjWallets = await backendSvc.getUnactivatedProjWallets(admin)
        expect(unactivatedProjWallets.projects).to.have.lengthOf(1)
        await activateWallet(unactivatedProjWallets.projects[0].wallet.id, admin)

        let activatedProjWallet = await backendSvc.getProjectWallet(projId)
        expect(activatedProjWallet.balance).to.equal(0)

        return projId
    }

    async function activateWallet(walletId, admin) {
        let walletActivationTx = await backendSvc.generateWalletActivationTx(admin, walletId)
        let signedWalletActivationTx = await admin.client.signTransaction(walletActivationTx.tx)
        let walletActivationTxHash = await backendSvc.broadcastTx(signedWalletActivationTx, walletActivationTx.tx_id)
        expect(walletActivationTxHash.tx_hash).to.not.be.undefined

        await ae.waitMined(walletActivationTxHash.tx_hash)
    }

    async function mint(user, amount, admin) {
        let depositId = await db.insertDeposit(user, amount)
        let mintTx = await backendSvc.generateMintTx(admin, depositId)
        let mintTxSigned = await admin.client.signTransaction(mintTx.tx)
        let mintTxHash = await backendSvc.broadcastTx(mintTxSigned, mintTx.tx_id)

        await ae.waitMined(mintTxHash.tx_hash)
    }

    async function invest(investor, projId, amount) {
        let investTx = await backendSvc.generateInvestTx(investor, projId, amount)
        let investTxSigned = await investor.client.signTransaction(investTx.tx)
        let investTxHash = await backendSvc.broadcastTx(investTxSigned, investTx.tx_id)

        await ae.waitMined(investTxHash.tx_hash)
    }

    after(async() => {
        await docker.down()
    })

})
