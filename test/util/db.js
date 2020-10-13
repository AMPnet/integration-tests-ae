let knex = require('knex')
let time = require('./time')
let { v4: uuid } = require('uuid')

let blockchainDb    = knex(getConfig("ae_middleware_testnet"))
let userDb          = knex(getConfig("user_service"))
let projectDb       = knex(getConfig("project_service"))
let walletDb       = knex(getConfig("wallet_service"))

const ORG_ADMIN_ROLE = 1

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
    await blockchainDb('transaction').truncate()
}

async function cleanUser() {
    await userDb.raw('TRUNCATE TABLE user_info CASCADE')
    await userDb.raw('TRUNCATE TABLE app_user CASCADE')
}

async function insertUser(user) {
    let id = getRandomInt()
    
    await userDb('user_info')
        .insert({
            id: id,
            client_session_uuid: 'client_session_uuid',
            identyum_user_uuid: 'identyum_user_uuid',
            first_name: 'First',
            last_name: 'Last',
            verified_email: 'verified_email@mail.com',
            phone_number: '+385',
            date_of_birth: '1978-03-02',
            personal_number: 'personal_num',
            document_type: 'ID_CARD',
            document_number: '48077962579',
            document_date_of_expiry: '2022-02-02',
            document_issuing_country: 'HRV',
            document_issued_by: 'document_issued_by',
            nationality: 'HRV',
            address: 'address',
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
            user_info_id: id
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
            approved_by_user_uuid: owner.uuid
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
            active: true
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
            type: type
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
            type: type
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
    insertWithdraw
}
