let knex = require('knex')
let time = require('./time')
let { v4: uuid } = require('uuid')

let blockchainDb    = knex(getConfig("ae_middleware_testnet"))
let userDb          = knex(getConfig("user_service"))
let projectDb       = knex(getConfig("project_service"))
let walletDb       = knex(getConfig("wallet_service"))

const ORG_ADMIN_ROLE = 1
const COOP = 'ampnet'

async function cleanProject() {
    await projectDb.raw('TRUNCATE TABLE organization CASCADE')
    await projectDb.raw('TRUNCATE TABLE project CASCADE')
}

async function cleanWallet() {
    await walletDb.raw('TRUNCATE TABLE wallet CASCADE')
    await walletDb.raw('DELETE FROM deposit')
    await walletDb.raw('DELETE FROM withdraw')
    await walletDb.raw('DELETE FROM transaction_info')
}

async function cleanBlockchain() {
    await blockchainDb.raw('TRUNCATE TABLE coop CASCADE')
}

async function cleanUser() {
    await userDb.raw('TRUNCATE TABLE user_info CASCADE')
    await userDb.raw('TRUNCATE TABLE app_user CASCADE')
}

async function insertUser(user) {
    let userInfoUuid = uuid()
    
    await userDb('user_info')
        .insert({
            uuid: userInfoUuid,
            session_id: 'RqfdqXiaNhFyFLTN6g9YW5jp04aUWj+72muD6tStF6S79lL9nxloJdj4MCyr2neQ',
            first_name: 'First',
            last_name: 'Last',
            id_number: 'lWO5Anwl4P6C+5QlyX7luQ==',
            date_of_birth: 'zzr2yxeGrQ0uV3x8Qu/iSw==',
            place_of_birth: 'oI/HQ/wt2U3Fqe05Y2C2XQ==',
            document_type: 'mGgpYSV0FMS+3GRhHW4mdA==',
            document_number: 'EvLEhD+yfyXPQ73aIKqPSw==',
            document_country: 'ZPw5erzBrOhafbyu7LRfHQ==',
            document_valid_from: 'M0a3KyBekCUTCsjcjh0YeA==',
            document_valid_until: 'zJLd7VTpJRXwdxuQTf+TcA==',
            nationality: 'zJLd7VTpJRXwdxuQTf+TcA==',
            created_at: new Date(),
            connected: true,
            deactivated: false
        })
    
    await userDb('app_user')
        .insert({
            uuid: user.uuid,
            first_name: 'First',
            last_name: 'Last',
            email: user.email,
            password: user.passwordSalted,
            role_id: user.role,
            created_at: new Date(),
            auth_method: 'EMAIL',
            enabled: true,
            user_info_uuid: userInfoUuid,
            coop: COOP
        })
}

async function insertOrganization(name, owner) {
    let generatedUuid = uuid()
    await projectDb('organization')
        .insert({
            uuid: generatedUuid,
            name: name,
            created_by_user_uuid: owner.uuid,
            created_at: new Date(),
            updated_at: null,
            approved: true,
            approved_by_user_uuid: owner.uuid,
            coop: COOP
        })
    return generatedUuid
}

async function insertOrganizationMembership(member, orgUuid) {
    let id = getRandomInt()
    await projectDb('organization_membership')
        .insert({
            id: id,
            organization_uuid: orgUuid,
            user_uuid: member.uuid,
            role_id: ORG_ADMIN_ROLE,
            created_at: new Date()
        })
}

async function insertProject(name, owner, orgUuid) {
    let generatedUuid = uuid()
    await projectDb('project')
        .insert({
            uuid: generatedUuid,    
            organization_uuid: orgUuid,
            name: name,
            description: 'description',
            location_lat: 45.81,
            location_long: 15.98,
            roi_from: 4.44,
            roi_to: 11.22,
            start_date: time.nowWithDaysBefore(1),
            end_date: time.nowWithDaysOffset(10),
            expected_funding: 1000000,
            currency: 'EUR',
            min_per_user: 100,
            max_per_user: 1000000,
            created_by_user_uuid: owner.uuid,
            created_at: new Date(),
            active: true,
            coop: COOP
        })
    return generatedUuid
}

async function insertDeposit(ownerUuid, userUuid, amount, type) {
    let id = getRandomInt()
    await walletDb('deposit')
        .insert({
            id: id,
            owner_uuid: ownerUuid,
            reference: 'reference',
            amount: amount,
            approved_by_user_uuid: userUuid,
            approved_at: new Date(),
            created_at: new Date(),
            created_by: userUuid,
            type: type,
            coop: COOP
        })
    return id
}

async function insertUnapprovedDeposit(ownerUuid, type) {
    let id = getRandomInt()
    await walletDb('deposit')
        .insert({
            id: id,
            owner_uuid: ownerUuid,
            reference: 'reference',
            amount: 0,
            created_at: new Date(),
            created_by: ownerUuid,
            type: type,
            coop: COOP,
            approved_by_user_uuid: null,
            approved_at: null,
        })
    return id
}

async function insertWithdraw(ownerUuid, user, amount, type) {
    let id = getRandomInt()
    await walletDb('withdraw')
        .insert({
            id: id,
            owner_uuid: ownerUuid,
            amount: amount,
            created_at: new Date(),
            created_by: user.uuid,
            bank_account: 'HR1210010051863000160',
            type: type,
            coop: COOP
        })
    return id
}

function getConfig(db) {
    return {
        client: 'postgresql',
        connection: {
            host: "localhost",
            user: db,
            password: "password",
            port: 5432,
            database: db
        },
        pool: {
            min: 0,
            max: 10,
            idleTimeoutMillis: 500
        }
    }
}

function getRandomInt() {
    min = 1;
    max = 100000;
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

module.exports = {
    cleanWallet,
    cleanProject,
    cleanBlockchain,
    cleanUser,
    insertUser,
    insertOrganization,
    insertOrganizationMembership,
    insertProject,
    insertDeposit,
    insertUnapprovedDeposit,
    insertWithdraw
}
