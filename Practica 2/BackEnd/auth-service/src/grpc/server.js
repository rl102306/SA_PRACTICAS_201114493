const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const AuthService = require('../services/auth.service');

const packageDef = protoLoader.loadSync(__dirname + '/../../proto/auth.proto');
const proto = grpc.loadPackageDefinition(packageDef).auth;

const service = new AuthService();

const server = new grpc.Server();
server.addService(proto.AuthService.service, {
  Register: async (call, callback) => {
    const res = await service.register(call.request);
    callback(null, res);
  },
  Login: async (call, callback) => {
    const res = await service.login(call.request);
    callback(null, res);
  }
});

server.bindAsync(
  '0.0.0.0:50051',
  grpc.ServerCredentials.createInsecure(),
  () => {
    console.log('Auth gRPC Service running on port 50051');
  }
);