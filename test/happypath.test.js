let chai = require('chai')
let expect = chai.expect

let docker = require('./util/docker')
let db = require('./util/db')
let ae = require('./util/ae')
let timeUtil = require('./util/time')
let amqp = require('./util/amqp')

let projectSvc = require('./service/project-svc')
let walletSvc = require('./service/wallet-svc')
let userSvc = require('./service/user-svc')
let reportSvc = require('./service/report-svc')
let blockchainSvc = require('./service/blockchain-svc/blockchain-svc')

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
        },
        eve: {
            publicKey: "ak_nN1V2bBR3sWBM6h5waLJf8LdfPHJRU5zuASsyVVzNBdSHk5w5",
            secretKey: "b46d0dbb1d90be3f1bb6cb293d0feda2033b45b322db7d4915790548ed77711067001db0addd573717fad2ac34a3ec59e8f45c84aeb62a576b02a37e39af0205"
        }
    }

    before(async () => {
        await docker.up()
        await ae.init()
        await amqp.init()
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

        // Alice has an unapproved deposit
        let alice = await TestUser.createRegular('alice@email.com')
        await db.insertUser(alice)
        await db.insertUnapprovedDeposit(alice.uuid, 'USER')

        let unapprovedDeposits = await walletSvc.getUnapprovedDeposits(admin)
        expect(unapprovedDeposits.deposits).to.have.lengthOf(1)
        let user = unapprovedDeposits.deposits[0].user
        expect(user.uuid).to.equal(alice.uuid)
    })

    it('Validate Project service connection to Wallet service', async () => {
        // Create Admin
        let admin = await TestUser.createAdmin('admin@email.com')
        await db.insertUser(admin)
        await admin.getJwtToken()

        // Admin creates Project with unapproved deposit
        let orgUuid = await db.insertOrganization('Organization', admin)
        let projUuid = await db.insertProject('Project', admin, orgUuid)
        await db.insertUnapprovedDeposit(projUuid, 'PROJECT')

        let unapprovedDeposits = await walletSvc.getUnapprovedDeposits(admin)
        expect(unapprovedDeposits.deposits).to.have.lengthOf(1)
        let project = unapprovedDeposits.deposits[0].project
        expect(project.uuid).to.equal(projUuid)
    })

    it('Must be able to execute complete flow', async () => {
        // Create Admin
        let admin = await TestUser.createAdmin('admin@email.com')
        await db.insertUser(admin)
        await admin.getJwtToken()
        await walletSvc.createUserWallet(admin)
        await waitForWalletActivation(admin)

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
        let bobDepositAmount = 1000000
        await createUserWithWallet(bob)
        await activateWallet(bob.walletUuid, admin)
        await mint(bob.uuid, bob.uuid, bobDepositAmount, 'USER', admin)

        // Check bob balance
        let bobBalance = (await walletSvc.getUserWallet(bob)).balance
        expect(bobBalance).to.equal(bobDepositAmount)
        
        // Bob invests in Alice's project
        let bobInvestAmount = 100000
        await invest(bob, projUuid, bobInvestAmount)

        let projectBalance = (await walletSvc.getProjectWallet(projUuid)).balance
        expect(projectBalance).to.equal(bobInvestAmount)

        // Create user Eve with wallet and mint tokens
        let eve = await TestUser.createRegular('eve@email.com', keyPairs.eve)
        let eveDepositAmount = 50000
        await createUserWithWallet(eve)
        await activateWallet(eve.walletUuid, admin)
        await mint(eve.uuid, eve.uuid, eveDepositAmount, 'USER', admin)

        // Eve invests twice in Alice's project
        await invest(eve, projUuid, eveDepositAmount / 2)
        await invest(eve, projUuid, eveDepositAmount / 2)
        projectBalance = (await walletSvc.getProjectWallet(projUuid)).balance
        expect(projectBalance).to.equal(bobInvestAmount + eveDepositAmount)

        // Eve cancels investment in Alice's project
        await cancelInvestments(eve, projUuid)
        projectBalance = (await walletSvc.getProjectWallet(projUuid)).balance
        expect(projectBalance).to.equal(bobInvestAmount)
        let eveBalance = (await walletSvc.getUserWallet(eve)).balance
        expect(eveBalance).to.equal(eveDepositAmount)

        //Eve can withdraw funds
        let withdrawId = await(withdrawFunds(eve.uuid, eve, eveDepositAmount, 'USER'))
        await burnWithdraw(admin, withdrawId)
        eveBalance = (await walletSvc.getUserWallet(eve)).balance
        expect(eveBalance).to.equal(0)

        // Bob fully funds the project
        await invest(bob, projUuid, bobDepositAmount - bobInvestAmount)
        projectBalance = (await walletSvc.getProjectWallet(projUuid)).balance
        expect(projectBalance).to.equal(bobDepositAmount)

        // Project can withdraw the funds
        let projectWithdrawId = await(withdrawFunds(projUuid, alice, bobDepositAmount, 'PROJECT'))
        await burnWithdraw(admin, projectWithdrawId)
        projectBalance = (await walletSvc.getProjectWallet(projUuid)).balance
        expect(projectBalance).to.equal(0)

        // Project can deposit funds
        let projectDepositAmount = 1000000
        await mint(projUuid, alice.uuid, projectDepositAmount, 'PROJECT', admin)
        projectBalance = (await walletSvc.getProjectWallet(projUuid)).balance
        expect(projectBalance).to.equal(projectDepositAmount)

        // Project can payout revenue shares to investors
        await revenuePayout(alice, projUuid, projectDepositAmount)
        projectBalance = (await walletSvc.getProjectWallet(projUuid)).balance
        expect(projectBalance).to.equal(0)
        let investorBalance = (await walletSvc.getUserWallet(bob)).balance
        expect(investorBalance).to.equal(projectDepositAmount)

        // Bob can sell shares
        let bobPortfolio = await walletSvc.getPortfolio(bob)
        expect(bobPortfolio.portfolio).to.have.length(1)
        let projectWalletHash = (await walletSvc.getProjectWallet(projUuid)).hash
        await sellShares(bob, projectWalletHash, 10, 10000)
        let activeSellOffers = await walletSvc.getActiveSellOffers(bob)
        expect(activeSellOffers.projects).to.have.length(1)
        expect(activeSellOffers.projects[0].sell_offers).to.have.length(1)
        // Other options for selling shares are covered in blockchain-service

        // Generate PDF report for Bob
        let reportResponse = await reportSvc.getTransactionsReport(bob)
        expect(reportResponse.status).to.equal(200)

        // Generate PDF report for Coop users
        const usersReportResponse = await reportSvc.getUsersReport(admin)
        expect(usersReportResponse.status).to.equal(200)

        // Test transfer ownership feature
        // Set Bob as token issuer
        let tokenIssuerTx = await walletSvc.generateTransferWalletTx(admin, bob.uuid, "TOKEN_ISSUER")
        let signedTokenIssuerTx = await admin.client.signTransaction(tokenIssuerTx.tx)
        let tokenIssuerTxHash = await walletSvc.broadcastTx(signedTokenIssuerTx, tokenIssuerTx.tx_id)
        expect(tokenIssuerTxHash.tx_hash).to.not.be.undefined
        await ae.waitTxProcessed(tokenIssuerTxHash.tx_hash).catch(err => { fail(err) })

        // Verify Admin is now Platform Manager
        let adminResponse = await userSvc.getProfile(admin)
        if (adminResponse.role == "ADMIN") {
            await ae.sleep(6000)
            adminResponse = await userSvc.getProfile(admin)
        }
        expect(adminResponse.role).to.equal("PLATFORM_MANAGER")

        // Verify Alice is now Token Issuer
        let bobResponse = await userSvc.getProfile(bob)
        expect(bobResponse.role).to.equal("TOKEN_ISSUER")

        // Verify AMQP messages
        expect(amqp.getWalletActivations()).to.have.lengthOf(5)
        const userWalletAddresses = amqp.getWalletActivations()
            .map(item => JSON.parse(item))
            .filter(item => item.type === 'USER')
            .map(item => item.activation_data);
        expect(userWalletAddresses).to.have.lengthOf(3);
        expect(userWalletAddresses)
            .to.have.members([keyPairs.alice.publicKey, keyPairs.bob.publicKey, keyPairs.eve.publicKey]);

        expect(amqp.getDeposits()).to.have.lengthOf(3);
        expect(amqp.getDeposits().map(item => JSON.parse(item).user))
            .to.have.members([bob.uuid, eve.uuid, projUuid]);

        expect(amqp.getWithdraws()).to.have.lengthOf(2);
        expect(amqp.getWithdraws().map(item => JSON.parse(item).user)).to.have.members([eve.uuid, projUuid]);

        console.log("Projects funded", amqp.getProjectsFunded().toString())
        expect(amqp.getProjectsFunded()).to.have.lengthOf(1);
        expect(amqp.getProjectsFunded().map(item => JSON.parse(item).tx_hash)).to.have.members([projectWalletHash]);

        expect(amqp.getProjectInvestments()).to.have.lengthOf(4);
        expect(amqp.getProjectInvestments().map(item => JSON.parse(item).project_wallet_tx_hash))
            .to.contain.members([projectWalletHash]);
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

    async function mint(ownerUuid, userUuid, amount, type, admin) {
        let depositId = await db.insertDeposit(ownerUuid, userUuid, amount, type)
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

    async function cancelInvestments(investor, projectUuid) {
        let cancelTx = await walletSvc.generateCancelInvestmentsTx(investor, projectUuid)
        let cancelTxSigned = await investor.client.signTransaction(cancelTx.tx)
        let cancelTxHash = await walletSvc.broadcastTx(cancelTxSigned, cancelTx.tx_id)

        await ae.waitTxProcessed(cancelTxHash.tx_hash).catch(err => { fail(err) })
    }

    async function withdrawFunds(ownerUuid, user, amount, type) {
        let withdrawId = await db.insertWithdraw(ownerUuid, user, amount, type)
        let withdrawTx = await walletSvc.generateWithdrawTx(user, withdrawId)
        let signedWithdrawTx = await user.client.signTransaction(withdrawTx.tx)
        let withdrawTxHash = await walletSvc.broadcastTx(signedWithdrawTx, withdrawTx.tx_id)

        await ae.waitTxProcessed(withdrawTxHash.tx_hash).catch(err => { fail(err) })
        return withdrawId
    }

    async function burnWithdraw(admin, withdrawId) {
        let burnTx = await walletSvc.generateBurnTx(admin, withdrawId)
        let signedBurnTx = await admin.client.signTransaction(burnTx.tx)
        let burnTxHash = await walletSvc.broadcastTx(signedBurnTx, burnTx.tx_id)

        await ae.waitTxProcessed(burnTxHash.tx_hash).catch(err => { fail(err) })
    }

    async function revenuePayout(admin, projectUuid, amount) {
        let revenuePayoutTx = await walletSvc.generateRevenuePayoutTx(admin, projectUuid, amount)
        let signedRevenuePayoutTx = await admin.client.signTransaction(revenuePayoutTx.tx)
        let revenuePayoutTxHash = await walletSvc.broadcastTx(signedRevenuePayoutTx, revenuePayoutTx.tx_id)

        await ae.waitTxProcessed(revenuePayoutTxHash.tx_hash).catch(err => { fail(err) })
    }

    async function sellShares(user, projectTxHash, shares, price) {
        let userWalletHash = (await walletSvc.getUserWallet(user)).hash
        let sellTx = await blockchainSvc.createSellOffer(userWalletHash, projectTxHash, shares, price)
        let signedSellTx = await user.client.signTransaction(sellTx)
        let userData = await userSvc.getProfile(user)
        let sellTxHash = await blockchainSvc.postTransaction(signedSellTx, userData.coop)
        await ae.waitTxProcessed(sellTxHash).catch(err => { fail(err) })
    }

    function waitForWalletActivation(user) {
        return new Promise(async (resolve, reject) => {
            let interval = 3000 //ms
            let maxChecks = 20
            let attempts = 0

            while(attempts < maxChecks) {
                await timeUtil.sleep(interval)
                let [userWallet, err] = await handle(walletSvc.getUserWallet(user))
                console.log("Attempt: ", attempts)
                if (err) {
                    attempts++
                } else {
                    if (userWallet.hash !== null && userWallet.balance === 0) {
                        console.log("### Success ###")
                        resolve()
                        break
                    }
                    attempts++
                }
            }

            reject("Waiting for wallet activation timed out!")
        })
    }

    const handle = (promise) => {
        return promise
          .then(data => ([data, undefined]))
          .catch(error => Promise.resolve([undefined, error]));
    }

    after(async() => {
        await amqp.stop();
        await docker.down();
    })

})
