let chai = require('chai')
let assert = chai.assert
let expect = chai.expect

let docker = require('./util/docker')
let db = require('./util/db')
let ae = require('./util/ae')
let time = require('./util/time')

let projectSvc = require('./service/project-svc')
let walletSvc = require('./service/wallet-svc')

let TestUser = require('./model/user').TestUser

describe('Complete flow test', function () {

    let keyPairs = {
        bob: {
            publicKey: "ak_FHZrEbRmanKUe9ECPXVNTLLpRP2SeQCLCT6Vnvs9JuVu78J7V",
            secretKey: "1509d7d0e113528528b7ce4bf72c3a027bcc98656e46ceafcfa63e56597ec0d8206ff07f99ea517b7a028da8884fb399a2e3f85792fe418966991ba09b192c91"
        },
        alice: {
            publicKey: "ak_RYkcTuYcyxQ6fWZsL2G3Kj3K5WCRUEXsi76bPUNkEsoHc52Wp",
            secretKey: "58bd39ded1e3907f0b9c1fbaa4456493519995d524d168e0b04e86400f4aa13937bcec56026494dcf9b19061559255d78deea3281ac649ca307ead34346fa621"
        }
    }

    before(async () => {
        await docker.up()
        await ae.init()
    })

    beforeEach(async () => {
        await db.cleanBlockchain()
        await db.cleanUser()
        await db.cleanProject()
        await db.cleanWallet()
    })

    it('Validate Project service connection to User service', async () => {
        let owner = await TestUser.createRegular('owner@org.com')
        await db.insertUser(owner)
        await owner.getJwtToken()

        let member = await TestUser.createRegular('member@org.com')
        await db.insertUser(member)
        await member.getJwtToken()

        let orgUuid = await db.insertOrganization('Uber org', owner)
        await db.insertOrganizationMembership(owner, orgUuid)
        await db.insertOrganizationMembership(member, orgUuid)

        let members = (await projectSvc.getOrganizationMemberships(owner, orgUuid)).members
        expect(members).to.have.lengthOf(1)
        let orgMember = members[0]
        expect(orgMember.uuid).to.equal(member.uuid)
    })

    it('Validate Wallet service connection to User service', async () => {
        // Get all users with un-activated wallets

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
        await createUserWithWallet(alice)

        let unactivatedUserWallets = await walletSvc.getUnactivatedUserWallets(admin)
        expect(unactivatedUserWallets.users).to.have.lengthOf(1)
        let user = unactivatedUserWallets.users[0].user
        expect(user.uuid).to.equal(alice.uuid)
    })

    it('Must be able to execute complete flow', async () => {
        // Create Admin
        let admin = await TestUser.createAdmin('admin@email.com')
        await db.insertUser(admin)
        await admin.getJwtToken()

        // Create user Alice with wallet
        let alice = await TestUser.createRegular('alice@email.com', keyPairs.alice)
        await createUserWithWallet(alice)
        await activateWallet(alice.walletUuid, admin)

        // Alice creates Organization with wallet
        let orgUuid = await createOrganizationWithWallet('ZEF', alice, admin)

        // Alice Project with wallet
        let projUuid = await createProjectWithWallet('Projekt', alice, orgUuid, admin)

        // Create user Bob with wallet and mint tokens
        let bob = await TestUser.createRegular('bob@email.com', keyPairs.bob)
        let bobDepositAmount = 100000
        await createUserWithWallet(bob)
        await activateWallet(bob.walletUuid, admin)
        await mint(bob, bobDepositAmount, admin)

        // Check bob balance
        let bobBalance = (await walletSvc.getUserWallet(bob)).balance
        expect(bobBalance).to.equal(bobDepositAmount)
        
        // Bob invests in Alice's project
        let bobInvestAmount = 100000
        await invest(bob, projUuid, bobInvestAmount)

        let projectBalance = (await walletSvc.getProjectWallet(projUuid)).balance
        expect(projectBalance).to.equal(bobInvestAmount)
    })

    async function createUserWithWallet(user) {
        await db.insertUser(user)
        await user.getJwtToken()
        await walletSvc.getUserWallet(user).catch(err => {
            expect(err.response.status).to.equal(404)
        })
        let wallet = await walletSvc.createUserWallet(user)
        expect(wallet).to.not.be.undefined

        user.setWalletUuid(wallet.uuid)
    }

    async function createOrganizationWithWallet(name, owner, admin) {
        let orgUuid = await db.insertOrganization(name, owner)
        await db.insertOrganizationMembership(owner, orgUuid)

        let createOrgTx = await walletSvc.generateCreateOrgTx(owner, orgUuid)
        let signedCreateOrgTx = await owner.client.signTransaction(createOrgTx.tx)
        let createOrgTxHash = await walletSvc.broadcastTx(signedCreateOrgTx, createOrgTx.tx_id)
        expect(createOrgTxHash.tx_hash).to.not.be.undefined

        await ae.waitTxProcessed(createOrgTxHash.tx_hash).catch(err => { fail(err) })
        
        let unactivatedOrgWallets = await walletSvc.getUnactivatedOrgWallets(admin)
        expect(unactivatedOrgWallets.organizations).to.have.lengthOf(1)
        await activateWallet(unactivatedOrgWallets.organizations[0].wallet.uuid, admin)
        
        let activatedOrgWallet = await walletSvc.getOrganizationWallet(owner, orgUuid)
        expect(activatedOrgWallet.balance).to.equal(0)

        return orgUuid
    }

    async function createProjectWithWallet(name, owner, orgUuid, admin) {
        let projUuid = await db.insertProject(name, owner, orgUuid)

        let createProjTx = await walletSvc.generateCreateProjTx(owner, projUuid)
        let signedCreateProjTx = await owner.client.signTransaction(createProjTx.tx)
        let createProjTxHash = await walletSvc.broadcastTx(signedCreateProjTx, createProjTx.tx_id)

        await ae.waitTxProcessed(createProjTxHash.tx_hash).catch(err => { fail(err) })

        let unactivatedProjWallets = await walletSvc.getUnactivatedProjWallets(admin)
        expect(unactivatedProjWallets.projects).to.have.lengthOf(1)
        await activateWallet(unactivatedProjWallets.projects[0].wallet.uuid, admin)

        let activatedProjWallet = await walletSvc.getProjectWallet(projUuid)
        expect(activatedProjWallet.balance).to.equal(0)

        return projUuid
    }

    async function activateWallet(walletUuid, admin) {
        let walletActivationTx = await walletSvc.generateWalletActivationTx(admin, walletUuid)
        let signedWalletActivationTx = await admin.client.signTransaction(walletActivationTx.tx)
        let walletActivationTxHash = await walletSvc.broadcastTx(signedWalletActivationTx, walletActivationTx.tx_id)
        expect(walletActivationTxHash.tx_hash).to.not.be.undefined

        await ae.waitTxProcessed(walletActivationTxHash.tx_hash).catch(err => { fail(err) })
    }

    async function mint(user, amount, admin) {
        let depositId = await db.insertDeposit(user, amount)
        let mintTx = await walletSvc.generateMintTx(admin, depositId)
        let mintTxSigned = await admin.client.signTransaction(mintTx.tx)
        let mintTxHash = await walletSvc.broadcastTx(mintTxSigned, mintTx.tx_id)

        await ae.waitTxProcessed(mintTxHash.tx_hash).catch(err => { fail(err) })
    }

    async function invest(investor, projUuid, amount) {
        let investTx = await walletSvc.generateInvestTx(investor, projUuid, amount)
        let investTxSigned = await investor.client.signTransaction(investTx.tx)
        let investTxHash = await walletSvc.broadcastTx(investTxSigned, investTx.tx_id)

        await ae.waitTxProcessed(investTxHash.tx_hash).catch(err => { fail(err) })
    }

    after(async() => {
        await docker.down()
    })

})
