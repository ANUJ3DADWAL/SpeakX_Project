require('dotenv').config();
const PROTO_PATH = __dirname + '/proto/questions.proto';
const mongoose = require('mongoose');

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

const questionsProto = protoDescriptor.questions;

const { MONGODB_URI, DB_NAME } = process.env;
if (!MONGODB_URI || !DB_NAME) {
    console.error('Environment variables not defined');
    process.exit(-1);
}

mongoose
    .connect(MONGODB_URI, { dbName: DB_NAME })
    .then(() => console.log('MongoDB is connected'))
    .catch(() => process.exit(1));

const questionSchema = new mongoose.Schema({
    type: String,
    title: String,
    siblingId: mongoose.Schema.Types.ObjectId,
});

const Question = mongoose.model('Question', questionSchema);

function getServer() {
    const server = new grpc.Server();
    server.addService(questionsProto.QuestionService.service, {
        searchQuestions: async (call, callback) => {
            try {
                const query = call.request.query;
                const page = call.request.page || 1;
                const pageSize = call.request.pageSize || 10;
                const skip = (page - 1) * pageSize;

                const docs = await Question.find({ title: new RegExp(query, 'i') })
                    .skip(skip)
                    .limit(pageSize);

                const count = await Question.countDocuments({ title: new RegExp(query, 'i') });

                const questions = docs.map((doc) => ({
                    id: doc._id.toString(),
                    type: doc.type,
                    title: doc.title,
                    siblingId: doc.siblingId ? doc.siblingId.toString() : null,
                }));

                callback(null, {
                    questions,
                    totalResults: count,
                    totalPages: Math.ceil(count / pageSize),
                });
            } catch (err) {
                callback(err, null);
            }
        },
    });
    return server;
}

if (require.main === module) {
    const server = getServer();
    server.bindAsync('0.0.0.0:9090', grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(`Server running at http://0.0.0.0:9090`);
    });
}

exports.getServer = getServer;