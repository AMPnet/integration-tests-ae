let knex = require('knex')
let time = require('./time')

let backendDb       = knex(getConfig("crowdfunding_ae"))
let blockchainDb    = knex(getConfig("ae_middleware_testnet"))
let userDb          = knex(getConfig("user_service"))

const ORG_ADMIN_ROLE = 1

async function cleanBackend() {
    await backendDb.raw('TRUNCATE TABLE wallet CASCADE')
    await backendDb.raw('TRUNCATE TABLE organization CASCADE')
    await backendDb.raw('TRUNCATE TABLE project CASCADE')
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
            web_session_uuid: 'web_session_uuid',
            verified_email: 'verified_email@mail.com',
            phone_number: '+385',
            country: 'HRV',
            date_of_birth: '1978-03-02',
            identyum_number: 'ae1ee02d-8a2d-4c50-a6ca-8f0454e19f6d',
            document_type: 'PERSONAL_ID_CARD',
            document_number: '48077962579',
            first_name: 'First',
            last_name: 'Last',
            citizenship: 'HRV',
            resident: true,
            address_city: 'city',
            address_county: 'county',
            address_street: 'street',
            created_at: new Date(),
            connected: true
        })
    
    await userDb('app_user')
        .insert({
            uuid: user.uuid,
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
    let id = getRandomInt()
    await backendDb('organization')
        .insert({
            id: id,
            name: name,
            created_by_user_uuid: owner.uuid,
            created_at: new Date(),
            updated_at: null,
            approved: true,
            approved_by_user_uuid: owner.uuid,
            legal_info: null,
            wallet_id: null
        })
    return id
}

async function insertOrganizationMembership(member, orgId) {
    let id = getRandomInt()
    await backendDb('organization_membership')
        .insert({
            id: id,
            organization_id: orgId,
            user_uuid: member.uuid,
            role_id: ORG_ADMIN_ROLE,
            created_at: new Date()
        })
}

async function insertProject(name, owner, orgId) {
    let id = getRandomInt()
    await backendDb('project')
        .insert({
            id: id,
            organization_id: orgId,
            name: name,
            description: 'description',
            location: 'location',
            location_text: 'location',
            return_on_investment: 'never',
            start_date: new Date(),
            end_date: time.nowWithDaysOffset(10),
            expected_funding: 1000000,
            currency: 'EUR',
            min_per_user: 100,
            max_per_user: 1000000,
            created_by_user_uuid: owner.uuid,
            created_at: new Date(),
            active: true
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
    cleanBackend,
    cleanBlockchain,
    cleanUser,
    insertUser,
    insertOrganization,
    insertOrganizationMembership,
    insertProject
}