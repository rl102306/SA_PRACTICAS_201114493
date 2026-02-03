const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = path.join(
  __dirname,
  '../../../auth-service/proto/auth.proto'
);

const packageDef = protoLoader.loadSync(PROTO_PATH);
const proto = grpc.loadPackageDefinition(packageDef).auth;

module.exports = new proto.AuthService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);