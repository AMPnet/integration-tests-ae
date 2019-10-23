let path = require('path')
let protoLoader = require('@grpc/proto-loader')
let grpc = require('grpc')

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
    }
}