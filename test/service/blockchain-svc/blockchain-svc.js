let path = require('path')
let protoLoader = require('@grpc/proto-loader')
let grpc = require('grpc')
const url = require('url');
const axios = require('axios');

const baseUrl = "http://localhost:8124";

module.exports = {
    init: async function() {
        let protoPath = path.resolve(__dirname, 'blockchain_service.proto');
        let protoDefinition = protoLoader.loadSync(protoPath);
        let packageDefinition = grpc.loadPackageDefinition(protoDefinition).com.ampnet.crowdfunding.proto;
        client = await new packageDefinition.BlockchainService('localhost:8224', grpc.credentials.createInsecure());
        return client
    },
    getTxInfo: async function(txHash) {
        return new Promise(resolve => {
            client.getTransactionInfo({
                txHash
            }, (err, result) => {
                if (err != null) {
                    resolve(err)
                } else {
                    resolve(result)
                }
            })
        })
    },
    createSellOffer: async function(fromTxHash, projectTxHash, shares, price) {
        return (await axios.get(
            url.resolve(baseUrl, `market/create-offer`),
            {
                params: {
                    fromTxHash: fromTxHash,
                    projectTxHash: projectTxHash,
                    shares: shares,
                    price: price
                }
            }
        ).catch(err => {
            console.log(err)
        })).data.tx
    },
    postTransaction: async function(tx) {
        return (await axios.post(
            url.resolve(baseUrl, `transactions`),
            {  data: tx }
        ).catch(err => {
            console.log(err)
        })).data.tx_hash
    },
    getProjectInfo: async function(projectHash) {
        return (await axios.get(
            url.resolve(baseUrl, `projects/${projectHash}`)
        ).catch(err => {
            console.log(err)
        })).data
    }
}
