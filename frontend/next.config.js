/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['firebase', '@firebase/firestore', '@firebase/app', '@grpc/proto-loader'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent server-only modules leaking into client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    } else {
      // Ignore grpc protobuf json requires that break Webpack build
      config.externals.push({
        'protobufjs/google/protobuf/api.json': 'commonjs protobufjs/google/protobuf/api.json',
        'protobufjs/google/protobuf/descriptor.json': 'commonjs protobufjs/google/protobuf/descriptor.json',
        'protobufjs/google/protobuf/source_context.json': 'commonjs protobufjs/google/protobuf/source_context.json',
        'protobufjs/google/protobuf/type.json': 'commonjs protobufjs/google/protobuf/type.json',
      });
    }
    return config;
  },
};

module.exports = nextConfig;
